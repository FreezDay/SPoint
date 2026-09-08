import { Injectable } from '@nestjs/common';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) { }

  async create(createAppointmentDto: CreateAppointmentDto) {
    // In a real app, perform availability check here
    let clientId = createAppointmentDto.clientId;

    if (!clientId && createAppointmentDto.guestEmail) {
      // Find or create guest user
      const guestName = createAppointmentDto.guestName || 'Guest';
      let user = await this.prisma.user.findUnique({
        where: { email: createAppointmentDto.guestEmail },
      });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            email: createAppointmentDto.guestEmail,
            name: guestName,
            password: Math.random().toString(36).slice(-8), // Dummy password
            role: 'CLIENT',
            clientProfile: {
              create: {
                phone: createAppointmentDto.guestPhone || '',
              },
            },
          },
        });
      }
      clientId = user.id;
    }

    if (!clientId) {
      throw new Error('ClientId or Guest Email is required');
    }

    const start = new Date(createAppointmentDto.startTime);
    const end = new Date(createAppointmentDto.endTime);

    // 1. Validate time range
    if (end <= start) {
      throw new Error('End time must be after start time');
    }

    // 2. Prevent past appointments
    if (start.getTime() < Date.now()) {
      throw new Error('Cannot book an appointment in the past');
    }

    // 3. Use transaction to prevent race conditions
    return this.prisma.$transaction(async (tx) => {
      let staffIdToUse = createAppointmentDto.staffId;

      // If no staff specified, try to find an available one from the service
      if (!staffIdToUse) {
        const service = await tx.service.findUnique({
          where: { id: createAppointmentDto.serviceId },
          include: { staff: true },
        });

        if (service && service.staff.length > 0) {
          // Find first available staff member
          for (const staffProfile of service.staff) {
            const overlap = await tx.appointment.findFirst({
              where: {
                staffId: staffProfile.id,
                status: { not: 'CANCELLED' },
                AND: [
                  { startTime: { lt: end } },
                  { endTime: { gt: start } },
                ],
              },
            });

            if (!overlap) {
              staffIdToUse = staffProfile.id;
              break;
            }
          }
        }

        // If still no staff found, proceed without assignment
        // (appointments can be manually assigned later by admin)
      }

      // Check for overlaps if staff is assigned
      if (staffIdToUse) {
        const overlap = await tx.appointment.findFirst({
          where: {
            staffId: staffIdToUse,
            status: { not: 'CANCELLED' },
            AND: [
              { startTime: { lt: end } },
              { endTime: { gt: start } },
            ],
          },
        });

        if (overlap) {
          throw new Error('The selected staff is already booked for this time period');
        }
      }

      // Create the appointment
      return tx.appointment.create({
        data: {
          startTime: start,
          endTime: end,
          status: 'CONFIRMED',
          notes: createAppointmentDto.notes,
          client: { connect: { id: clientId } },
          service: { connect: { id: createAppointmentDto.serviceId } },
          staff: staffIdToUse ? { connect: { id: staffIdToUse } } : undefined,
        },
        include: {
          client: true,
          service: true,
          staff: { include: { user: true } },
        },
      });
    });
  }

  async findAll() {
    return this.prisma.appointment.findMany({
      include: {
        client: true,
        service: true,
        staff: { include: { user: true } },
      },
    });
  }

  async findByClient(clientId: string) {
    return this.prisma.appointment.findMany({
      where: { clientId },
      include: {
        service: true,
        staff: { include: { user: true } },
      },
      orderBy: { startTime: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.appointment.findUnique({
      where: { id },
      include: {
        client: true,
        service: true,
        staff: { include: { user: true } },
      },
    });
  }

  async update(id: string, updateAppointmentDto: UpdateAppointmentDto) {
    return this.prisma.appointment.update({
      where: { id },
      data: {
        ...updateAppointmentDto,
        startTime: updateAppointmentDto.startTime ? new Date(updateAppointmentDto.startTime) : undefined,
        endTime: updateAppointmentDto.endTime ? new Date(updateAppointmentDto.endTime) : undefined,
      },
      include: {
        client: true,
        service: true,
        staff: { include: { user: true } },
      },
    });
  }

  async remove(id: string) {
    return this.prisma.appointment.delete({
      where: { id },
    });
  }

  async getAvailability(date: string, serviceId: string, staffId?: string, duration?: number) {
    // Get service to know the duration
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      throw new Error('Service not found');
    }

    // Get settings for working hours
    const settingsRecords = await this.prisma.globalSetting.findMany();
    const settings = settingsRecords.reduce((acc, curr) => {
      try {
        acc[curr.key] = JSON.parse(curr.value);
      } catch {
        acc[curr.key] = curr.value;
      }
      return acc;
    }, {} as any);

    const workingHours = settings.working_hours || { start: '09:00', end: '19:00' };
    const nonWorkingHours = settings.non_working_hours;
    const closedDays = settings.closed_days || [];

    // Parse the date "YYYY-MM-DD"
    const [year, month, day] = date.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day);
    const dayOfWeek = targetDate.getDay();

    // Check if the date is a closed day
    if (closedDays.includes(dayOfWeek)) {
      return { date, slots: [], message: 'Closed on this day' };
    }

    // Generate time slots
    const [startH] = (workingHours.start as string).split(':').map(Number);
    const [endH] = (workingHours.end as string).split(':').map(Number);

    const slots: string[] = [];
    for (let h = startH; h < endH; h++) {
      for (let m of [0, 30]) {
        const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

        // Filter non-working hours (break)
        if (nonWorkingHours) {
          const breakStart = nonWorkingHours.start;
          const breakEnd = nonWorkingHours.end;
          if (timeStr >= breakStart && timeStr < breakEnd) continue;
        }

        slots.push(timeStr);
      }
    }

    // Fetch appointments with a buffer to handle timezone differences
    // We want appointments that could possibly overlap with 'date' in Lisbon time.
    // 'date' 00:00 Lisbon could be 'date-1' 23:00 UTC.
    // So we fetch UTC Range: [date-1 00:00, date+1 23:59] to be safe.
    const searchStart = new Date(year, month - 1, day - 1, 0, 0, 0);
    const searchEnd = new Date(year, month - 1, day + 1, 23, 59, 59);

    const whereClause: any = {
      startTime: {
        gte: searchStart,
        lte: searchEnd,
      },
      status: { not: 'CANCELLED' },
    };

    if (staffId) {
      whereClause.staffId = staffId;
    }

    const appointments = await this.prisma.appointment.findMany({
      where: whereClause,
      select: {
        startTime: true,
        endTime: true,
        staffId: true,
      },
    });

    // Helper to converting Date to Lisbon Minutes from Midnight on target Date
    // Returns < 0 for previous day, > 1440 for next day
    const getLisbonMinutes = (d: Date) => {
      const parts = new Intl.DateTimeFormat('pt-PT', {
        timeZone: 'Europe/Lisbon',
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: false
      }).formatToParts(d);

      const p = parts.reduce((acc, curr) => ({ ...acc, [curr.type]: Number(curr.value) }), {} as any);

      // Calculate diff in days from target date
      // We compare Y-M-D. 
      // Note: simplistic comparison, assuming no month/year boundary issues for the small buffer.
      // Better: Create "Lisbon Date" string and compare.
      const dDate = new Date(p.year, p.month - 1, p.day);
      const tDate = new Date(year, month - 1, day);
      const dayDiff = Math.round((dDate.getTime() - tDate.getTime()) / 86400000);

      return (dayDiff * 1440) + (p.hour * 60) + p.minute;
    };

    // Check availability for each slot
    const availableSlots = slots.map((timeStr) => {
      const [h, m] = timeStr.split(':').map(Number);
      const slotStartMins = h * 60 + m;

      // Calculate slot end based on duration (override or service default)
      const durationToUse = duration || service.duration;
      const slotEndMins = slotStartMins + durationToUse;

      // Check if this slot overlaps with any appointment
      const isBooked = appointments.some((apt) => {
        const aptStartMins = getLisbonMinutes(new Date(apt.startTime));
        const aptEndMins = getLisbonMinutes(new Date(apt.endTime));

        // Check for overlap
        return (
          (slotStartMins >= aptStartMins && slotStartMins < aptEndMins) ||  // Slot starts inside Apt
          (slotEndMins > aptStartMins && slotEndMins <= aptEndMins) ||      // Slot ends inside Apt
          (slotStartMins <= aptStartMins && slotEndMins >= aptEndMins)      // Slot engulfs Apt
        );
      });

      // Check if in the past
      // For "past" check, we can just compare current UTC time with estimated slot UTC start?
      // Or better, convert "Now" to Lisbon Minutes.
      const now = new Date();
      const nowMins = getLisbonMinutes(now);
      const isPast = slotStartMins < nowMins;

      return {
        time: timeStr,
        available: !isBooked && !isPast,
        booked: isBooked,
        past: isPast,
      };
    });

    return {
      date,
      slots: availableSlots,
    };
  }

  async getLoyaltyStats(userId: string) {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        clientId: userId,
        status: 'COMPLETED',
        service: {
          OR: [
            { name: { contains: 'hair', } },
            { name: { contains: 'beard', } },
            { name: { contains: 'Bearb', } }, // User's typo in DB
            { name: { contains: 'Corte', } },
          ],
        },
      },
      include: { service: true },
    });

    const count = appointments.length;
    const goal = 10;
    const progress = Math.min(count, goal);

    let rewardCode: string | null = null;
    if (count >= goal) {
      // Simple deterministic reward code based on userId and goal reached
      rewardCode = `BARBER-GOLD-${userId.slice(0, 4).toUpperCase()}`;
    }

    return {
      count,
      goal,
      progress,
      rewardCode,
      nextRewardAt: goal > count ? goal - count : 0
    };
  }
}
