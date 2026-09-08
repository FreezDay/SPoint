import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateServiceRecordDto } from './dto/create-service-record.dto';
import { UpdateServiceRecordDto } from './dto/update-service-record.dto';

@Injectable()
export class ServiceRecordsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateServiceRecordDto, currentUser: { id: string; role: string }) {
    // Default artist is the studio owner (ADMIN = Maksym).
    const admin = await this.prisma.user.findFirst({
      where: { role: 'ADMIN' },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    const staffId = dto.staffId || admin?.id || currentUser.id;
    const staff = await this.prisma.user.findUnique({ where: { id: staffId } });
    if (!staff) throw new ForbiddenException('A valid staff member is required');

    return this.prisma.serviceRecord.create({
      data: {
        serviceName: dto.serviceName,
        amount: Number(dto.amount),
        serviceDate: new Date(dto.serviceDate),
        clientName: dto.clientName,
        paymentMethod: dto.paymentMethod,
        staffId,
        clientId: dto.clientId,
      },
      include: { staff: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, dto: UpdateServiceRecordDto) {
    const existing = await this.prisma.serviceRecord.findUnique({ where: { id } });
    if (!existing) throw new ForbiddenException('Service record not found');
    if (existing.sessionId) {
      throw new BadRequestException('Este valor vem de uma sessão do CRM — altere-o na sessão do projeto');
    }

    let staffId = dto.staffId ?? existing.staffId;
    if (dto.staffId && dto.staffId !== existing.staffId) {
      const staff = await this.prisma.user.findUnique({ where: { id: staffId } });
      if (!staff) throw new ForbiddenException('A valid staff member is required');
    }

    return this.prisma.serviceRecord.update({
      where: { id },
      data: {
        serviceName: dto.serviceName,
        amount: dto.amount !== undefined ? Number(dto.amount) : undefined,
        serviceDate: dto.serviceDate ? new Date(dto.serviceDate) : undefined,
        clientName: dto.clientName,
        paymentMethod: dto.paymentMethod,
        staffId,
        clientId: dto.clientId,
      },
      include: { staff: { select: { id: true, name: true } } },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.serviceRecord.findUnique({ where: { id } });
    if (!existing) throw new ForbiddenException('Service record not found');
    if (!existing.sessionId) {
      return this.prisma.serviceRecord.delete({ where: { id } });
    }
    // CRM-linked record: removing it from Ganhos voids the payment on the
    // session (value, method and link are cleared together).
    return this.prisma.$transaction(async (tx) => {
      await tx.tattooSession.update({
        where: { id: existing.sessionId! },
        data: { amount: null, paymentMethod: null, keepPercent: null },
      });
      return tx.serviceRecord.delete({ where: { id } });
    });
  }

  findAll(currentUser: { id: string; role: string }) {
    return this.prisma.serviceRecord.findMany({
      where: currentUser.role === 'ADMIN' ? {} : { staffId: currentUser.id },
      orderBy: { serviceDate: 'desc' },
      take: 100,
      include: { staff: { select: { id: true, name: true } } },
    });
  }

  async getEarnings(currentUser: { id: string; role: string }) {
    const setting = await this.prisma.globalSetting.findUnique({ where: { key: 'staff_commission_rates' } });
    const rates = setting ? JSON.parse(setting.value) as Record<string, number> : {};
    const records = await this.prisma.serviceRecord.findMany({
      where: currentUser.role === 'ADMIN' ? {} : { staffId: currentUser.id },
      orderBy: { serviceDate: 'desc' },
      take: 500,
      include: {
        staff: { select: { name: true } },
        session: { select: { id: true, sessionNumber: true, projectId: true } },
      },
    });
    const rate = currentUser.role === 'ADMIN' ? null : Number(rates[currentUser.id]) || 0;
    const commissionFor = (staffId: string) => Number(rates[staffId]) || 0;
    const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
    // New registrations carry a snapshot of the chosen keep-rate
    // (rateScheme 'own'/'studio'). Legacy records fall back to the old
    // per-staff commission formula.
    const netAmount = (record: { amount: unknown; staffId: string; keepPercent?: unknown }) =>
      record.keepPercent !== null && record.keepPercent !== undefined
        ? roundMoney(Number(record.amount) * (Number(record.keepPercent) / 100))
        : roundMoney(Number(record.amount) * (1 - commissionFor(record.staffId) / 100));
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const periods = [1, 7, 15, 30].map((days) => {
      const start = new Date(startOfToday);
      start.setDate(start.getDate() - days + 1);
      const periodRecords = records.filter((record) => record.serviceDate >= start);
      return {
        days,
        total: periodRecords.reduce((sum, record) => sum + netAmount(record), 0),
        count: periodRecords.length,
      };
    });
    const chart = Array.from({ length: 30 }, (_, index) => {
      const date = new Date(startOfToday);
      date.setDate(startOfToday.getDate() - (29 - index));
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);
      return {
        date: date.toISOString().slice(0, 10),
        total: records.filter((record) => record.serviceDate >= date && record.serviceDate < nextDate).reduce((sum, record) => sum + netAmount(record), 0),
      };
    });
    const paymentMethods = ['Cartão', 'Dinheiro', 'MB WAY', 'Multibanco'];
    const paymentBreakdown = paymentMethods.map((paymentMethod) => ({
      paymentMethod,
      count: records.filter((record) => record.paymentMethod === paymentMethod).length,
    }));

    return {
      commissionRate: rate,
      periods,
      chart,
      paymentBreakdown,
      records: records.map((record) => ({
        ...record,
        sessionId: record.session?.id ?? null,
        sessionNumber: record.session?.sessionNumber ?? null,
        projectId: record.session?.projectId ?? null,
        grossAmount: Number(record.amount),
        keepPercent: record.keepPercent !== null && record.keepPercent !== undefined ? Number(record.keepPercent) : null,
        commissionRate: record.keepPercent !== null && record.keepPercent !== undefined ? null : commissionFor(record.staffId),
        commissionAmount: record.keepPercent !== null && record.keepPercent !== undefined ? 0 : roundMoney(Number(record.amount) * commissionFor(record.staffId) / 100),
        netAmount: netAmount(record),
      })),
    };
  }
}