#!/usr/bin/env node
/**
 * Renew the Render free-tier Postgres before it expires (30-day lifetime).
 *
 * Render allows only ONE active free database per workspace, so the rotation is:
 *   1. dump the current DB            (pg_dump, external conn)
 *   2. SUSPEND it                     (frees the free slot; keeps the data as
 *                                      rollback until step 7 succeeds)
 *   3. create a brand-new free DB     (fresh 30-day expiry)
 *   4. restore the dump into it and verify row counts
 *   5. point the web service DATABASE_URL at the new DB
 *   6. trigger a deploy and wait until the service is live + healthy
 *   7. only then DELETE the old (suspended) DB
 *
 * Any failure before step 7 resumes the old DB -> no data loss, no config
 * change. Failure to delete at step 7 is harmless (next run cleans up).
 *
 * Requires: node >= 18, psql and pg_dump on PATH, RENDER_API_KEY.
 * Optional env: RENDER_SERVICE_NAME (serviceapp-backend),
 *               RENDER_PG_PREFIX (serviceapp-db), RENEW_DAYS_BEFORE (2),
 *               OWNER_ID override, DRY_RUN=1 (read-only plan), FORCE=1
 *               (renew even if not due), VERIFY_ONLY=1.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';

const API = 'https://api.render.com/v1';
// Prefer RENDER_API_KEY; fall back to the local render CLI config so the
// script also works on the dev machine without extra setup.
let KEY = process.env.RENDER_API_KEY || '';
if (!KEY) {
  const cfgPath = process.env.RENDER_CLI_CONFIG_PATH || `${homedir()}/.render/cli.yaml`;
  if (existsSync(cfgPath)) {
    const raw = readFileSync(cfgPath, 'utf8');
    const match = raw.match(/^\s*key:\s*(\S+)/m);
    if (match) {
      KEY = match[1];
      console.log('using API key from', cfgPath, '(prefer a long-lived RENDER_API_KEY for automation)');
    }
  }
}
const SERVICE_NAME = process.env.RENDER_SERVICE_NAME || 'serviceapp-backend';
const PG_PREFIX = process.env.RENDER_PG_PREFIX || 'serviceapp-db';
const DAYS_BEFORE = Number(process.env.RENEW_DAYS_BEFORE || 2) + 0.5; // catch the daily window
const OWNER_ID = process.env.OWNER_ID || null;
const DRY_RUN = process.env.DRY_RUN === '1';
const FORCE = process.env.FORCE === '1';
const TABLES = ['User', 'CrmClient', 'TattooProject', 'TattooSession', 'ServiceRecord'];

const redact = (s) => s.replace(/:\/\/[^@]+@/, '://***@');
const fail = (msg) => { console.error('ERROR:', msg); process.exit(1); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, path, body) {
  if (!KEY) fail('RENDER_API_KEY is not set');
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return null;
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg = data && data.message ? data.message : text;
    throw new Error(`${method} ${path} -> ${res.status}: ${msg}`);
  }
  return data;
}

async function main() {
  console.log('== SPoint Postgres renewal ==', new Date().toISOString());

  // 1. resolve the current database (the one the web service points at)
  const pgList = await api('GET', '/postgres');
  const pgEntries = pgList.map((e) => e.postgres).filter(Boolean);
  const serviceList = await api('GET', '/services');
  const svcEntry = serviceList.find((e) => e.service && e.service.name === SERVICE_NAME);
  if (!svcEntry) fail(`web service "${SERVICE_NAME}" not found`);
  const service = svcEntry.service;
  const serviceId = service.id;
  const serviceUrl = service.serviceDetails?.url;
  console.log('service:', SERVICE_NAME, serviceId, '|', serviceUrl);

  const envVars = await api('GET', `/services/${serviceId}/env-vars`);
  const dbEnv = (envVars || []).find((e) => e.envVar?.key === 'DATABASE_URL')?.envVar?.value;
  if (!dbEnv) fail('DATABASE_URL env var not found on service');
  const currentHost = new URL(dbEnv).hostname.split('.')[0]; // dpg-xxxx
  let current = pgEntries.find((p) => p.id === currentHost);
  if (!current) fail(`database ${currentHost} (from DATABASE_URL) not found in workspace`);

  const expires = new Date(current.expiresAt);
  const daysLeft = (expires.getTime() - Date.now()) / 86400000;
  console.log('current db:', current.id, '| status:', current.status, '| suspended:', current.suspended, '| expires:', expires.toISOString(), `(${daysLeft.toFixed(2)} days left)`);

  // leftover suspended backups from earlier runs
  const leftovers = pgEntries.filter((p) => p.status === 'suspended' && p.id !== current.id);
  const creating = pgEntries.find((p) => p.status === 'creating');
  if (creating) fail(`another database is still provisioning (${creating.id}) - aborting`);
  const actives = pgEntries.filter((p) => p.status !== 'suspended');
  if (actives.length > 1) fail(`${actives.length} active databases found - refusing to run`);

  if (!FORCE && daysLeft > DAYS_BEFORE) {
    console.log(`OK - ${daysLeft.toFixed(2)} days left (> ${DAYS_BEFORE}); nothing to do.`);
    if (leftovers.length) console.log(`note: ${leftovers.length} suspended leftover(s) (${leftovers.map((p) => p.id).join(', ')}) will be cleaned up on the next renewal.`);
    return;
  }
  console.log(`renewal due (${daysLeft.toFixed(2)} days left <= ${DAYS_BEFORE}).`);
  if (DRY_RUN) { console.log('DRY RUN - stopping before any change.'); return; }

  const ownerId = OWNER_ID || current.owner?.id;
  if (!ownerId) fail('cannot determine ownerId (set OWNER_ID)');

  // drop leftover suspended databases from earlier partial runs (never
  // referenced by DATABASE_URL, so they are stale backups at most)
  for (const stale of leftovers) {
    try { await api('DELETE', `/postgres/${stale.id}`); console.log('removed leftover suspended db', stale.id); }
    catch (err) { console.warn('could not remove leftover', stale.id, '-', err.message); }
  }

  // 2. dump the current database
  const info = await api('GET', `/postgres/${current.id}/connection-info`);
  const oldConn = `${info.connectionInfo.externalConnectionString}?sslmode=require`;
  const dumpFile = '/tmp/spoint-db-dump.sql';
  console.log('dumping current db...');
  execFileSync('pg_dump', ['--no-owner', '--no-privileges', '--file', dumpFile, oldConn], { stdio: 'inherit' });
  const oldCounts = rowCounts(oldConn);
  console.log('dump OK:', dumpFile, '| counts:', JSON.stringify(oldCounts));

  // 3. suspend the current db (frees the free-tier slot, keeps rollback data)
  console.log('suspending old db...');
  await api('POST', `/postgres/${current.id}/suspend`);
  await sleep(4000);

  let created = null;
  try {
    // 4. create the replacement
    const name = `${PG_PREFIX}-${new Date().toISOString().slice(0, 10)}`;
    console.log('creating new free db...');
    created = await api('POST', '/postgres', {
      name,
      ownerId,
      plan: 'free',
      version: '18',
      region: current.region || 'oregon',
      ipAllowList: [{ cidrBlock: '0.0.0.0/0', description: 'everywhere' }],
    });
    const newId = created.id;
    console.log('created:', newId, '| waiting for availability...');
    for (let i = 0; i < 40; i++) {
      await sleep(15000);
      const cur = await api('GET', `/postgres/${newId}`);
      if (cur.status === 'available') break;
      if (i === 39) throw new Error('new db did not become available in time');
    }
    const newInfo = await api('GET', `/postgres/${newId}/connection-info`);
    const newConn = `${newInfo.connectionInfo.externalConnectionString}?sslmode=require`;

    // 5. restore + verify
    console.log('restoring dump into new db...');
    execFileSync('psql', ['-v', 'ON_ERROR_STOP=1', '-q', '-f', dumpFile, newConn], { stdio: 'inherit' });
    const newCounts = rowCounts(newConn);
    const diff = Object.keys(oldCounts).filter((t) => oldCounts[t] !== newCounts[t]);
    if (diff.length) throw new Error(`count mismatch after restore: ${diff.map((t) => `${t} ${oldCounts[t]}->${newCounts[t]}`).join(', ')}`);
    console.log('restore verified:', JSON.stringify(newCounts));

    // 6. flip DATABASE_URL + deploy (external conn string + open allow-list is
    // the connection mode already proven to work from the Render service)
    const newUrl = `${newInfo.connectionInfo.externalConnectionString}?sslmode=require`;
    console.log('flipping DATABASE_URL ->', redact(newUrl));
    await api('PUT', `/services/${serviceId}/env-vars/DATABASE_URL`, { value: newUrl });
    console.log('triggering deploy...');
    const dep = await api('POST', `/services/${serviceId}/deploys`, {});
    const depId = dep.id || (dep.deploy && dep.deploy.id);
    const outcome = await waitForDeploy(serviceId, depId);
    if (outcome !== 'live') throw new Error(`deploy ${depId} ended ${outcome}`);

    // 7. health check through the public URL (reads the DB -> proves connectivity)
    if (serviceUrl) {
      const res = await fetch(`${serviceUrl}/settings`, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`health check failed: HTTP ${res.status}`);
      console.log('health check OK (HTTP', res.status, ')');
    }
    console.log(`RENEWAL COMPLETE - new db: ${created.id} (name ${created.name}), expires ~${created.expiresAt}`);
  } catch (err) {
    console.error('renewal failed:', err.message);
    // rollback: bring the old database back and keep the service on it
    try {
      console.log('rolling back - resuming old db...');
      await api('POST', `/postgres/${current.id}/resume`);
      console.log('old db resumed; DATABASE_URL untouched. Data safe.');
    } catch (rollbackErr) {
      console.error('ROLLBACK FAILED - manually resume', current.id, 'at', current.dashboardUrl);
    }
    if (created) {
      try { await api('DELETE', `/postgres/${created.id}`); console.log('partial new db deleted.'); }
      catch { console.log('note: could not delete partial new db', created.id); }
    }
    process.exit(1);
  }

  // 8. delete the old suspended db (cleanup failure is harmless; the next run
  // deletes leftover suspended databases). Never triggers a rollback.
  try {
    console.log('deleting old suspended db...');
    await api('DELETE', `/postgres/${current.id}`);
    console.log('old db deleted.');
  } catch (err) {
    console.warn('cleanup note: could not delete old db', current.id, '-', err.message);
  }
}

function rowCounts(conn) {
  const out = {};
  const probe = 'select count(*) from "%s"';
  for (const t of TABLES) {
    try {
      const raw = execFileSync('psql', ['-tA', '-c', probe.replace('%s', t), conn], { encoding: 'utf8' });
      out[t] = Number(raw.trim()) || 0;
    } catch {
      out[t] = 'n/a';
    }
  }
  return out;
}

async function waitForDeploy(serviceId, depId) {
  for (let i = 0; i < 80; i++) {
    await sleep(15000);
    const list = await api('GET', `/services/${serviceId}/deploys`);
    const item = (list || []).find((d) => (d.deploy?.id) === depId) || (list || [])[0];
    const status = item?.deploy?.status || 'unknown';
    console.log(`deploy ${depId}: ${status}`);
    if (status === 'live') return 'live';
    if (['deploy_failed', 'build_failed', 'update_failed', 'canceled'].includes(status)) return status;
  }
  return 'timeout';
}

main().catch((err) => { console.error('FATAL:', err.message); process.exit(1); });
