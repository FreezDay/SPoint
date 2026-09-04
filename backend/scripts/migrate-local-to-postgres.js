const { execFileSync } = require('child_process');
const path = require('path');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const SQLITE_DB = process.argv[2] || path.join(__dirname, '..', 'dev.db');
const prisma = new PrismaClient();

const DATE_COLS = {
    User: ['createdAt', 'updatedAt'],
    StaffProfile: [],
    ClientProfile: [],
    Service: [],
    ServiceCategory: [],
    Product: [],
    Sale: ['createdAt'],
    SalesItem: [],
    Appointment: ['startTime', 'endTime'],
    Availability: [],
    ServiceRecord: ['serviceDate', 'createdAt'],
    GlobalSetting: [],
    Message: ['createdAt'],
    News: ['createdAt', 'updatedAt'],
};

const BOOL_COLS = {
    Service: ['isPublic'],
    Product: ['isPublic'],
    Message: ['read'],
    News: ['published'],
};

const TABLES = [
    'User', 'StaffProfile', 'ClientProfile', 'Service', 'ServiceCategory',
    'Product', 'Appointment', 'Availability', 'Sale', 'SalesItem',
    'ServiceRecord', 'GlobalSetting', 'Message', 'News',
];

function readTable(name) {
    const out = execFileSync('sqlite3', [SQLITE_DB, '-json', `SELECT * FROM "${name}"`], { encoding: 'utf8' });
    if (!out.trim()) return [];
    return JSON.parse(out).map((r) => {
        const clean = {};
        for (const [k, v] of Object.entries(r)) {
            if (v === null) { clean[k] = null; continue; }
            if ((DATE_COLS[name] || []).includes(k)) { clean[k] = toDate(v); continue; }
            if ((BOOL_COLS[name] || []).includes(k)) { clean[k] = v === true || v === 1 || v === '1' || v === 'true'; continue; }
            clean[k] = v;
        }
        return clean;
    });
}

function toDate(v) {
    if (v instanceof Date) return v;
    const n = Number(v);
    if (typeof v === 'number' || (typeof v === 'string' && /^\d{10,13}$/.test(v))) return new Date(n);
    if (typeof v === 'string') {
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(v)) return new Date(v.replace(' ', 'T') + 'Z');
        return new Date(v);
    }
    return null;
}

async function upsertRow(model, row, updateOverride = {}) {
    const { id, ...data } = row;
    await prisma[model].upsert({
        where: { id },
        update: { ...data, ...updateOverride },
        create: row,
    });
}

async function main() {
    const summary = {};

    const existingUsers = await prisma.user.findMany({ select: { id: true, email: true } });
    const emailToId = new Map(existingUsers.map((u) => [u.email, u.id]));
    const userMap = new Map(existingUsers.map((u) => [u.id, u.id]));

    const users = readTable('User');
    summary.User = { source: users.length, skipped: 0 };
    for (const u of users) {
        const existingId = emailToId.get(u.email);
        if (existingId && existingId !== u.id) {
            userMap.set(u.id, existingId);
            summary.User.skipped++;
            continue;
        }
        await upsertRow('user', u);
        userMap.set(u.id, u.id);
        emailToId.set(u.email, u.id);
    }

    const FK_SOURCES = [
        { table: 'ClientProfile', col: 'userId' },
        { table: 'StaffProfile', col: 'userId' },
        { table: 'Appointment', col: 'clientId' },
        { table: 'Sale', col: 'clientId' },
        { table: 'ServiceRecord', col: 'clientId' },
        { table: 'ServiceRecord', col: 'staffId' },
    ];
    const targetIds = new Set((await prisma.user.findMany({ select: { id: true } })).map((u) => u.id));
    const orphanIds = new Set();
    for (const { table, col } of FK_SOURCES) {
        for (const r of readTable(table)) {
            if (r[col] && !targetIds.has(r[col])) orphanIds.add(r[col]);
        }
    }
    const placeholderHash = await bcrypt.hash(Math.random().toString(36), 10);
    for (const oid of orphanIds) {
        await prisma.user.upsert({
            where: { id: oid },
            update: {},
            create: { id: oid, email: `deleted-${oid}@localhost`, password: placeholderHash, name: 'Deleted user', role: 'CLIENT' },
        });
        userMap.set(oid, oid);
        summary.User.source++;
    }
    summary.User.placeholders = orphanIds.size;

    const userCol = (v) => (v ? userMap.get(v) || v : v);

    const staffRows = readTable('StaffProfile');
    summary.StaffProfile = { source: staffRows.length };
    for (const s of staffRows) await upsertRow('staffProfile', { ...s, userId: userCol(s.userId) });

    const clientRows = readTable('ClientProfile');
    summary.ClientProfile = { source: clientRows.length };
    for (const c of clientRows) await upsertRow('clientProfile', { ...c, userId: userCol(c.userId) });

    for (const t of ['ServiceCategory', 'Service', 'Product']) {
        const rows = readTable(t);
        summary[t] = { source: rows.length };
        const model = t.charAt(0).toLowerCase() + t.slice(1);
        for (const r of rows) await upsertRow(model, r);
    }

    const appts = readTable('Appointment');
    summary.Appointment = { source: appts.length };
    for (const a of appts) await upsertRow('appointment', { ...a, clientId: userCol(a.clientId) });

    const sales = readTable('Sale');
    summary.Sale = { source: sales.length };
    for (const s of sales) await upsertRow('sale', { ...s, clientId: s.clientId ? userCol(s.clientId) : null });

    const items = readTable('SalesItem');
    summary.SalesItem = { source: items.length };
    for (const i of items) await upsertRow('salesItem', i);

    const records = readTable('ServiceRecord');
    summary.ServiceRecord = { source: records.length };
    for (const r of records) await upsertRow('serviceRecord', { ...r, staffId: userCol(r.staffId), clientId: r.clientId ? userCol(r.clientId) : null });

    const settings = readTable('GlobalSetting');
    summary.GlobalSetting = { source: settings.length };
    for (const s of settings) await prisma.globalSetting.upsert({ where: { key: s.key }, update: { value: s.value }, create: { id: s.id, key: s.key, value: s.value } });

    for (const t of ['Message', 'News', 'Availability']) {
        const rows = readTable(t);
        summary[t] = { source: rows.length, note: rows.length ? 'copied' : 'empty - skipped' };
        const model = t.charAt(0).toLowerCase() + t.slice(1);
        if (t === 'Message') for (const r of rows) await upsertRow(model, { ...r, senderId: userCol(r.senderId), receiverId: userCol(r.receiverId) });
        else if (t === 'News') for (const r of rows) await upsertRow(model, r);
        else for (const r of rows) await upsertRow(model, r);
    }

    console.log(JSON.stringify(summary, null, 2));
}

main()
    .catch((e) => { console.error('COPY FAILED:', e); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
