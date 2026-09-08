import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PhotoKind, TattooSessionStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { CreatePhotoDto } from './dto/create-photo.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { RegisterTattooDto } from './dto/register-tattoo.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateSessionDto } from './dto/update-session.dto';

const optStr = (value?: string | null) => (value === undefined ? undefined : value === null || value === '' ? null : value.trim());
const toMoney = (value: unknown) => (value === null || value === undefined ? null : Number(value));

// Session rows carry Decimal fields; expose them as plain numbers to the API.
const sessionView = (session: any) => ({
  ...session,
  amount: toMoney(session.amount),
  keepPercent: toMoney(session.keepPercent),
});

@Injectable()
export class CrmService {
  constructor(private prisma: PrismaService) {}

  // The artist that records services by default: the studio owner is the
  // ADMIN account (Maksym). Falls back to the acting user when no admin exists.
  private async defaultArtistId(actorId?: string): Promise<string> {
    const admin = await this.prisma.user.findFirst({
      where: { role: 'ADMIN' },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    return admin ? admin.id : actorId || '';
  }

  // Rate the worker keeps when the client is their own ("own" scheme).
  private async ownKeepPercent(): Promise<number> {
    const setting = await this.prisma.globalSetting.findUnique({
      where: { key: 'rate_own_client_own_material' },
    });
    if (!setting) return 100;
    const parsed = Number(setting.value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 100;
  }

  // ---------- Clients ----------

  findAllClients() {
    return this.prisma.crmClient.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: { _count: { select: { projects: true } } },
    });
  }

  async findOneClient(clientId: string) {
    const client = await this.prisma.crmClient.findUnique({
      where: { id: clientId },
      include: {
        projects: {
          orderBy: { createdAt: 'desc' },
          include: { sessions: { orderBy: { sessionNumber: 'asc' } } },
        },
      },
    });
    if (!client) throw new NotFoundException('Client not found');
    return {
      ...client,
      projects: client.projects.map((project) => ({
        ...project,
        cost: toMoney(project.cost),
        sessions: project.sessions.map(sessionView),
      })),
    };
  }

  createClient(dto: CreateClientDto) {
    return this.prisma.crmClient.create({
      data: {
        name: dto.name.trim(),
        surname: dto.surname.trim(),
        phone: optStr(dto.phone),
        email: optStr(dto.email),
        country: optStr(dto.country),
        notes: optStr(dto.notes),
      },
      include: { _count: { select: { projects: true } } },
    });
  }

  async updateClient(clientId: string, dto: UpdateClientDto) {
    const existing = await this.prisma.crmClient.findUnique({ where: { id: clientId } });
    if (!existing) throw new NotFoundException('Client not found');
    return this.prisma.crmClient.update({
      where: { id: clientId },
      data: {
        name: dto.name !== undefined && dto.name.trim() !== '' ? dto.name.trim() : undefined,
        surname: dto.surname !== undefined && dto.surname.trim() !== '' ? dto.surname.trim() : undefined,
        phone: optStr(dto.phone),
        email: optStr(dto.email),
        country: optStr(dto.country),
        notes: optStr(dto.notes),
      },
    });
  }

  async removeClient(clientId: string) {
    const existing = await this.prisma.crmClient.findUnique({ where: { id: clientId } });
    if (!existing) throw new NotFoundException('Client not found');
    return this.prisma.crmClient.delete({ where: { id: clientId } });
  }

  // ---------- Projects ----------

  async createProject(clientId: string, dto: CreateProjectDto) {
    const client = await this.prisma.crmClient.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Client not found');

    const firstDate = dto.firstSessionDate ? new Date(dto.firstSessionDate) : null;
    if (!firstDate || Number.isNaN(firstDate.getTime())) {
      throw new BadRequestException('The first session of a project requires a valid date');
    }

    const project = await this.prisma.$transaction(async (tx) => {
      const created = await tx.tattooProject.create({
        data: {
          clientId,
          serviceName: optStr(dto.serviceName),
          description: optStr(dto.description),
          placement: optStr(dto.placement),
          size: optStr(dto.size),
          cost: dto.cost !== undefined && dto.cost !== null ? Number(dto.cost) : undefined,
          plannedSessions: dto.plannedSessions ?? 1,
        },
      });
      await tx.tattooSession.create({
        data: {
          projectId: created.id,
          sessionNumber: 1,
          date: firstDate,
          status: (dto.firstSessionStatus as TattooSessionStatus) || 'IN_PROGRESS',
          notes: optStr(dto.firstSessionNotes),
        },
      });
      return created;
    });

    return this.findProject(project.id);
  }

  async findProject(projectId: string) {
    const project = await this.prisma.tattooProject.findUnique({
      where: { id: projectId },
      include: {
        client: { select: { id: true, name: true, surname: true, phone: true, email: true, country: true } },
        sessions: { orderBy: { sessionNumber: 'asc' } },
        photos: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!project) throw new NotFoundException('Tattoo project not found');
    return { ...project, cost: toMoney(project.cost), sessions: project.sessions.map(sessionView) };
  }

  async updateProject(projectId: string, dto: UpdateProjectDto) {
    const existing = await this.prisma.tattooProject.findUnique({ where: { id: projectId } });
    if (!existing) throw new NotFoundException('Tattoo project not found');

    await this.prisma.tattooProject.update({
      where: { id: projectId },
      data: {
        serviceName: optStr(dto.serviceName),
        description: optStr(dto.description),
        placement: optStr(dto.placement),
        size: optStr(dto.size),
        cost: dto.cost !== undefined && dto.cost !== null ? Number(dto.cost) : null,
        plannedSessions: dto.plannedSessions !== undefined ? Math.min(48, Math.max(1, Number(dto.plannedSessions))) : undefined,
      },
    });
    return this.findProject(projectId);
  }

  async removeProject(projectId: string) {
    const existing = await this.prisma.tattooProject.findUnique({ where: { id: projectId } });
    if (!existing) throw new NotFoundException('Tattoo project not found');
    return this.prisma.tattooProject.delete({ where: { id: projectId } });
  }

  // ---------- Sessions ----------

  async createSession(projectId: string, dto: CreateSessionDto) {
    const project = await this.prisma.tattooProject.findUnique({
      where: { id: projectId },
      include: { sessions: { orderBy: { sessionNumber: 'desc' }, take: 1 } },
    });
    if (!project) throw new NotFoundException('Tattoo project not found');

    if (project.sessions.length === 0 && !dto.date) {
      throw new BadRequestException('The first session of a project requires a date');
    }

    const sessionNumber = project.sessions.length === 0 ? 1 : project.sessions[0].sessionNumber + 1;
    const created = await this.prisma.tattooSession.create({
      data: {
        projectId,
        sessionNumber,
        date: dto.date ? new Date(dto.date) : null,
        status: (dto.status as TattooSessionStatus) || 'IN_PROGRESS',
        notes: optStr(dto.notes),
      },
    });
    return sessionView(created);
  }

  async updateSession(
    sessionId: string,
    dto: UpdateSessionDto,
    actor: { id: string; role: string },
  ) {
    const existing = await this.prisma.tattooSession.findUnique({ where: { id: sessionId } });
    if (!existing) throw new NotFoundException('Session not found');

    let date: Date | null | undefined;
    if (dto.date !== undefined) {
      if (dto.date === null || dto.date === '') {
        if (existing.sessionNumber === 1) throw new BadRequestException('A date is required for the first session');
        date = null;
      } else {
        date = new Date(dto.date);
      }
    }

    let amount: number | null | undefined;
    if (dto.amount !== undefined && dto.amount !== null) {
      const parsed = Number(dto.amount);
      if (!Number.isFinite(parsed) || parsed < 0) throw new BadRequestException('Valor inválido');
      amount = parsed;
    } else if (dto.amount === null) {
      amount = null;
    }
    const paymentMethod = optStr(dto.paymentMethod);
    const status = dto.status ? (dto.status as TattooSessionStatus) : undefined;

    // A session only ever carries a value together with a payment method.
    const finalAmount = amount !== undefined ? amount : toMoney(existing.amount);
    const finalMethod = paymentMethod !== undefined ? paymentMethod : existing.paymentMethod;
    if (finalAmount !== null && finalAmount > 0 && !finalMethod) {
      throw new BadRequestException('Indique o método de pagamento (Dinheiro, MB WAY, Multibanco ou Cartão)');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.tattooSession.update({
        where: { id: sessionId },
        data: {
          date,
          status,
          notes: optStr(dto.notes),
          amount: amount !== undefined ? amount : undefined,
          paymentMethod,
        },
      });
      const fresh = await tx.tattooSession.findUniqueOrThrow({
        where: { id: sessionId },
        include: {
          project: { include: { client: true } },
          serviceRecord: true,
        },
      });
      await this.reconcileSessionLedger(tx as any, fresh, actor);
      const updated = await tx.tattooSession.findUniqueOrThrow({ where: { id: sessionId } });
      return sessionView(updated);
    });
  }

  // Keeps the earnings ledger (ServiceRecord) in sync with a session:
  // - session with a value + payment method keeps a linked record (created
  //   when the session is closed/COMPLETED, or updated afterwards);
  // - clearing the value removes the linked record from Ganhos;
  // - a value typed on an open (IN_PROGRESS) session is kept on the session
  //   but only posts once the session is closed.
  private async reconcileSessionLedger(
    tx: any,
    session: any,
    actor: { id: string; role: string },
  ) {
    const sessionAmount = toMoney(session.amount);
    const hasValue = sessionAmount !== null && sessionAmount > 0 && !!session.paymentMethod;
    const linked = await tx.serviceRecord.findUnique({ where: { sessionId: session.id } });

    if (!hasValue) {
      if (linked) await tx.serviceRecord.delete({ where: { id: linked.id } });
      return;
    }

    const project = session.project;
    const serviceDate = session.date ?? linked?.serviceDate ?? new Date();
    if (linked) {
      await tx.serviceRecord.update({
        where: { id: linked.id },
        data: {
          serviceName: project.serviceName || 'Tatuagem',
          amount: sessionAmount,
          serviceDate,
          clientName: `${project.client?.name || ''} ${project.client?.surname || ''}`.trim(),
          paymentMethod: session.paymentMethod,
        },
      });
      return;
    }

    if (session.status !== 'COMPLETED') return; // open session: only posts when closed

    const staffId = await this.defaultArtistId(actor.id);
    const keepPercent = await this.ownKeepPercent();
    const record = await tx.serviceRecord.create({
      data: {
        serviceName: project.serviceName || 'Tatuagem',
        amount: sessionAmount,
        serviceDate,
        clientName: `${project.client?.name || ''} ${project.client?.surname || ''}`.trim(),
        paymentMethod: session.paymentMethod,
        staffId,
        rateScheme: 'own',
        keepPercent,
        sessionId: session.id,
      },
    });
    await tx.tattooSession.update({
      where: { id: session.id },
      data: { keepPercent },
    });
  }

  async removeSession(sessionId: string) {
    const existing = await this.prisma.tattooSession.findUnique({ where: { id: sessionId } });
    if (!existing) throw new NotFoundException('Session not found');
    // The linked earnings record (if any) is removed by the FK cascade.
    return this.prisma.tattooSession.delete({ where: { id: sessionId } });
  }

  // ---------- One-shot tattoo registration (used by "Registar serviço") ----------

  async findClients(query?: string) {
    const trimmed = (query || '').trim();
    if (!trimmed) {
      return this.prisma.crmClient.findMany({
        orderBy: [{ name: 'asc' }, { surname: 'asc' }],
        take: 30,
        select: { id: true, name: true, surname: true, phone: true, email: true, country: true },
      });
    }
    return this.prisma.crmClient.findMany({
      where: {
        OR: [
          { name: { contains: trimmed, mode: 'insensitive' } },
          { surname: { contains: trimmed, mode: 'insensitive' } },
          { phone: { contains: trimmed } },
        ],
      },
      orderBy: [{ name: 'asc' }, { surname: 'asc' }],
      take: 30,
      select: { id: true, name: true, surname: true, phone: true, email: true, country: true },
    });
  }

  async registerTattoo(dto: RegisterTattooDto, currentUser: { id: string; role: string }) {
    const firstDate = dto.firstSessionDate ? new Date(dto.firstSessionDate) : null;
    if (!firstDate || Number.isNaN(firstDate.getTime())) {
      throw new BadRequestException('A data da 1ª sessão é obrigatória');
    }

    // Default artist is the studio owner (ADMIN = Maksym); an explicit
    // selection on the form overrides it.
    const staffId = dto.staffId || (await this.defaultArtistId(currentUser.id));
    const staff = await this.prisma.user.findUnique({ where: { id: staffId } });
    if (!staff) throw new BadRequestException('Profissional inválido');

    const amount = dto.amount === undefined || dto.amount === null ? null : Number(dto.amount);
    const rawAmount = amount !== null && Number.isFinite(amount) && amount > 0 ? amount : null;
    const paymentMethod = (dto.paymentMethod || '').trim();
    if (rawAmount !== null && !paymentMethod) {
      throw new BadRequestException('Indique o método de pagamento (Dinheiro, MB WAY, Multibanco ou Cartão)');
    }

    // Resolve the CRM client: the client must already exist in the CRM —
    // clients are only ever created inside the CRM pages.
    const clientId = (dto.clientId || '').trim();
    const known = await this.prisma.crmClient.findUnique({ where: { id: clientId } });
    if (!known) throw new NotFoundException('Cliente não encontrado no CRM');
    const clientName = known.name;
    const clientSurname = known.surname;

    const photos = (dto.photos || []).filter((photo) => photo && photo.dataUrl);
    const sessionDates = (dto.sessionDates || [])
      .filter((value) => value && !Number.isNaN(new Date(value).getTime()))
      .slice(0, 47);

    // Resolve the configurable keep-rates ("com que fico"): own client +
    // own material vs studio client + studio material. Snapshot the rate so
    // later setting changes never rewrite the history of a registration.
    const rateSettings = await this.prisma.globalSetting.findMany({
      where: { key: { in: ['rate_own_client_own_material', 'rate_studio_client_studio_material'] } },
    });
    const parseRate = (value: string | undefined, fallback: number) => {
      if (!value) return fallback;
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
    };
    const schemeRates = {
      own: parseRate(rateSettings.find((setting) => setting.key === 'rate_own_client_own_material')?.value, 100),
      studio: parseRate(rateSettings.find((setting) => setting.key === 'rate_studio_client_studio_material')?.value, 70),
    };

    const created = await this.prisma.$transaction(async (tx) => {
      const project = await tx.tattooProject.create({
        data: {
          clientId,
          serviceName: optStr(dto.serviceName),
          description: optStr(dto.description),
          placement: optStr(dto.placement),
          size: optStr(dto.size),
          cost: rawAmount,
          plannedSessions: dto.plannedSessions ? Math.min(48, Math.max(1, Number(dto.plannedSessions))) : 1,
        },
      });

      const first = await tx.tattooSession.create({
        data: {
          projectId: project.id,
          sessionNumber: 1,
          date: firstDate,
          status: (dto.firstSessionStatus as TattooSessionStatus) || 'IN_PROGRESS',
          notes: optStr(dto.sessionNotes),
        },
      });

      const sessions = [first];
      for (let index = 0; index < sessionDates.length; index += 1) {
        const session = await tx.tattooSession.create({
          data: {
            projectId: project.id,
            sessionNumber: index + 2,
            date: new Date(sessionDates[index]),
            status: 'IN_PROGRESS',
          },
        });
        sessions.push(session);
      }

      for (const photo of photos) {
        await tx.projectPhoto.create({
          data: {
            projectId: project.id,
            sessionId: photo.sessionId && sessions[0] ? sessions[0].id : null,
            kind: (photo.kind as PhotoKind) || 'DRAFT',
            dataUrl: photo.dataUrl,
          },
        });
      }

      let serviceRecordId: string | null = null;
      if (rawAmount !== null) {
        const keepPercent = Number(schemeRates[(dto.rateScheme === 'studio' ? 'studio' : 'own')] ?? 100);
        const record = await tx.serviceRecord.create({
          data: {
            serviceName: dto.serviceName || 'Tatuagem',
            amount: rawAmount,
            serviceDate: firstDate,
            clientName: `${clientName} ${clientSurname}`.trim(),
            paymentMethod,
            staffId,
            rateScheme: dto.rateScheme === 'studio' ? 'studio' : 'own',
            keepPercent: Number.isFinite(keepPercent) ? keepPercent : 100,
            sessionId: first.id,
          },
        });
        serviceRecordId = record.id;
        // The ledger row belongs to the 1st session: the session keeps the
        // value/method so that later edits on the session keep the record in
        // sync instead of posting a duplicate earning.
        await tx.tattooSession.update({
          where: { id: first.id },
          data: {
            amount: rawAmount,
            paymentMethod,
            keepPercent: Number.isFinite(keepPercent) ? keepPercent : 100,
          },
        });
      }

      return { project, sessions, serviceRecordId };
    });

    return {
      clientId,
      clientName: `${clientName} ${clientSurname}`.trim(),
      projectId: created.project.id,
      serviceRecordId: created.serviceRecordId,
      photos: photos.length,
      sessions: created.sessions.length,
    };
  }

  // ---------- Photos ----------

  async createPhoto(projectId: string, dto: CreatePhotoDto) {
    const project = await this.prisma.tattooProject.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Tattoo project not found');

    if (dto.sessionId) {
      const session = await this.prisma.tattooSession.findUnique({ where: { id: dto.sessionId } });
      if (!session || session.projectId !== projectId) {
        throw new BadRequestException('Session does not belong to this project');
      }
    }

    return this.prisma.projectPhoto.create({
      data: {
        projectId,
        sessionId: dto.sessionId || null,
        kind: (dto.kind as PhotoKind) || 'PROGRESS',
        dataUrl: dto.dataUrl,
      },
    });
  }

  async removePhoto(photoId: string) {
    const existing = await this.prisma.projectPhoto.findUnique({ where: { id: photoId } });
    if (!existing) throw new NotFoundException('Photo not found');
    return this.prisma.projectPhoto.delete({ where: { id: photoId } });
  }
}
