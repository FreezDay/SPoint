import { PrismaService } from '../prisma.service';
import { ServiceRecordsService } from './service-records.service';

describe('ServiceRecordsService.create', () => {
  const prisma = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    serviceRecord: {
      create: jest.fn(),
    },
  };
  const service = new ServiceRecordsService(prisma as unknown as PrismaService);
  const dto = {
    serviceName: 'Haircut',
    amount: 20,
    serviceDate: '2026-10-20T12:00:00.000Z',
    clientName: 'Client',
    paymentMethod: 'Cash',
    staffId: 'submitted-staff-id',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findFirst.mockResolvedValue({ id: 'admin-id' });
    prisma.user.findUnique.mockResolvedValue({ id: 'valid-staff-id' });
    prisma.serviceRecord.create.mockResolvedValue({ id: 'record-id' });
  });

  it('assigns a staff-created service record to the signed-in staff member', async () => {
    await service.create(dto, { id: 'signed-in-staff-id', role: 'STAFF' });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'signed-in-staff-id' },
    });
    expect(prisma.serviceRecord.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ staffId: 'signed-in-staff-id' }),
    }));
  });

  it('allows admins to select a staff member for the service record', async () => {
    await service.create(dto, { id: 'admin-id', role: 'ADMIN' });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'submitted-staff-id' },
    });
    expect(prisma.serviceRecord.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ staffId: 'submitted-staff-id' }),
    }));
  });
});
