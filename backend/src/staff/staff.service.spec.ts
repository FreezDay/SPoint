import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { StaffService } from './staff.service';

describe('StaffService role updates', () => {
  const transactionUser = {
    findUniqueOrThrow: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  };
  const prisma = {
    $transaction: jest.fn((callback: (tx: { user: typeof transactionUser }) => unknown) =>
      callback({ user: transactionUser }),
    ),
  };
  const service = new StaffService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('promotes a staff member to admin and omits the password from the response', async () => {
    transactionUser.findUniqueOrThrow.mockResolvedValue({ role: 'STAFF' });
    transactionUser.update.mockResolvedValue({
      id: 'staff-id',
      role: 'ADMIN',
      password: 'hashed-password',
    });

    const result = await service.update('staff-id', { role: 'ADMIN' }, 'admin-id');

    expect(transactionUser.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ role: 'ADMIN' }),
    }));
    expect(result).toEqual({ id: 'staff-id', role: 'ADMIN' });
  });

  it('prevents an admin from changing their own role', async () => {
    transactionUser.findUniqueOrThrow.mockResolvedValue({ role: 'ADMIN' });

    await expect(service.update('admin-id', { role: 'STAFF' }, 'admin-id'))
      .rejects.toThrow(ForbiddenException);
    expect(transactionUser.update).not.toHaveBeenCalled();
  });

  it('prevents demoting the last admin', async () => {
    transactionUser.findUniqueOrThrow.mockResolvedValue({ role: 'ADMIN' });
    transactionUser.count.mockResolvedValue(1);

    await expect(service.update('other-admin-id', { role: 'STAFF' }, 'admin-id'))
      .rejects.toThrow(ForbiddenException);
    expect(transactionUser.update).not.toHaveBeenCalled();
  });
});
