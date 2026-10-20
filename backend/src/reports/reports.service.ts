import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { calculateEarningsSplit } from '../service-records/earnings-calculation';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) { }

  async getDashboardStats(currentUser: { id: string; role: string }) {
    const totalClients = await this.prisma.user.count({ where: { role: 'CLIENT' } });
    const totalStaff = await this.prisma.user.count({ where: { role: 'STAFF' } });
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - ((startOfDay.getDay() + 6) % 7));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const ownership = currentUser.role === 'ADMIN' ? {} : { staffId: currentUser.id };
    const [recentServices, commissionSetting, records] = await Promise.all([
      this.prisma.serviceRecord.findMany({ where: ownership, take: 8, orderBy: { serviceDate: 'desc' }, include: { staff: { select: { name: true, role: true } } } }),
      this.prisma.globalSetting.findUnique({ where: { key: 'staff_commission_rates' } }),
      this.prisma.serviceRecord.findMany({ where: ownership, select: { serviceName: true, amount: true, staffId: true, serviceDate: true, keepPercent: true, staff: { select: { name: true, role: true } } } }),
    ]);
    const rates = commissionSetting ? JSON.parse(commissionSetting.value) as Record<string, number> : {};
    const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
    const grossFor = (from: Date) => records.filter((record) => record.serviceDate >= from).reduce((total, record) => total + Number(record.amount), 0);
    const split = (record: { amount: unknown; staffId: string; keepPercent?: unknown; staff?: { role?: string } | null }) =>
      calculateEarningsSplit({ ...record, isAdminArtist: record.staff?.role === 'ADMIN' }, Number(rates[record.staffId]) || 0);
    const staffAmount = (record: { amount: unknown; staffId: string; keepPercent?: unknown }) => split(record).staffAmount;
    const netFor = (from: Date) => roundMoney(records.filter((record) => record.serviceDate >= from).reduce((total, record) => {
      const shares = split(record);
      return total + (currentUser.role === 'ADMIN' ? shares.studioAmount : shares.staffAmount);
    }, 0));
    const displayedAmount = (record: { amount: unknown; staffId: string; keepPercent?: unknown }) =>
      currentUser.role === 'ADMIN' ? roundMoney(Number(record.amount)) : staffAmount(record);
    const netAmount = (record: { amount: unknown; staffId: string; keepPercent?: unknown }) => staffAmount(record);
    const breakdownFor = (from: Date) => {
      const totals = new Map<string, number>();
      records.filter((record) => record.serviceDate >= from).forEach((record) => {
        totals.set(record.serviceName, (totals.get(record.serviceName) || 0) + netAmount(record));
      });
      return Array.from(totals.entries()).map(([serviceName, total]) => ({ serviceName, total: roundMoney(total) }));
    };
    const staffBreakdownFor = (from: Date) => {
      const totals = new Map<string, number>();
      records.filter((record) => record.serviceDate >= from).forEach((record) => {
        const staffName = record.staff?.name || 'Admin';
        totals.set(staffName, (totals.get(staffName) || 0) + netAmount(record));
      });
      return Array.from(totals.entries()).map(([staffName, total]) => ({ staffName, total: roundMoney(total) }));
    };
    const staffServiceCountFor = (from: Date) => {
      const services = new Map<string, { count: number; names: string[] }>();
      records.filter((record) => record.serviceDate >= from).forEach((record) => {
        const staffName = record.staff?.name || 'Admin';
        const current = services.get(staffName) || { count: 0, names: [] };
        current.count += 1;
        current.names.push(record.serviceName);
        services.set(staffName, current);
      });
      return Array.from(services.entries()).map(([staffName, value]) => ({ staffName, ...value }));
    };
    const serviceCountFor = (from: Date) => {
      const counts = new Map<string, number>();
      records.filter((record) => record.serviceDate >= from).forEach((record) => {
        counts.set(record.serviceName, (counts.get(record.serviceName) || 0) + 1);
      });
      return Array.from(counts.entries()).map(([serviceName, count]) => ({ serviceName, count }));
    };
    const chart = Array.from({ length: 30 }, (_, index) => {
      const date = new Date(startOfDay);
      date.setDate(startOfDay.getDate() - (29 - index));
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);
      return {
        date: date.toISOString().slice(0, 10),
        total: roundMoney(records.filter((record) => record.serviceDate >= date && record.serviceDate < nextDate).reduce((sum, record) => sum + displayedAmount(record), 0)),
      };
    });

    return {
      totalClients,
      totalStaff,
      totalServices: records.length,
      servicesToday: records.filter((record) => record.serviceDate >= startOfDay).length,
      totalRevenue: netFor(startOfMonth),
      revenueToday: netFor(startOfDay),
      revenueThisWeek: netFor(startOfWeek),
      revenueThisMonth: netFor(startOfMonth),
      grossToday: grossFor(startOfDay),
      grossThisWeek: grossFor(startOfWeek),
      grossThisMonth: grossFor(startOfMonth),
      recentServices: recentServices.map((service) => ({ ...service, amount: displayedAmount(service) })),
      chart,
      serviceBreakdown: {
        day: breakdownFor(startOfDay),
        week: breakdownFor(startOfWeek),
        month: breakdownFor(startOfMonth),
      },
      staffBreakdown: {
        day: staffBreakdownFor(startOfDay),
        week: staffBreakdownFor(startOfWeek),
        month: staffBreakdownFor(startOfMonth),
      },
      staffServiceCounts: {
        day: staffServiceCountFor(startOfDay),
        week: staffServiceCountFor(startOfWeek),
        month: staffServiceCountFor(startOfMonth),
      },
      serviceCounts: {
        day: serviceCountFor(startOfDay),
        week: serviceCountFor(startOfWeek),
        month: serviceCountFor(startOfMonth),
      },
    };
  }
}
