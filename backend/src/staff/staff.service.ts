import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { PrismaService } from '../prisma.service';

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) { }

  async create(createStaffDto: CreateStaffDto) {
    if (!createStaffDto.password) {
      throw new BadRequestException('Password is required when creating staff');
    }
    const hashedPassword = await bcrypt.hash(createStaffDto.password, 10);
    return this.prisma.user.create({
      data: {
        email: createStaffDto.email,
        password: hashedPassword,
        name: createStaffDto.name,
        role: 'STAFF',
        avatar: createStaffDto.avatar,
        staffProfile: {
          create: {
            bio: createStaffDto.bio,
          },
        },
      },
      include: {
        staffProfile: true,
      },
    });
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      where: { role: { in: ['STAFF', 'ADMIN'] } },
      include: { staffProfile: true },
    });
    return users.map(({ password: _pw, ...user }) => user);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { staffProfile: true },
    });
    if (!user) return null;
    const { password: _pw, ...safe } = user;
    return safe;
  }

  async update(id: string, updateStaffDto: UpdateStaffDto, currentUserId: string) {
    const { bio, name, avatar, password, role } = updateStaffDto;
    if (role !== undefined && role !== 'ADMIN' && role !== 'STAFF') {
      throw new BadRequestException('Staff role must be ADMIN or STAFF');
    }
    const data: Prisma.UserUpdateInput = {
      name,
      avatar,
      ...(role ? { role } : {}),
      staffProfile: {
        upsert: {
          create: { bio },
          update: { bio },
        },
      },
    };
    if (password) data.password = await bcrypt.hash(password, 10);

    return this.prisma.$transaction(async (tx) => {
      const currentStaff = await tx.user.findUniqueOrThrow({
        where: { id },
        select: { role: true },
      });

      if (role && role !== currentStaff.role) {
        if (id === currentUserId) {
          throw new ForbiddenException('You cannot change your own role');
        }
        if (currentStaff.role === 'ADMIN' && role === 'STAFF') {
          const adminCount = await tx.user.count({ where: { role: 'ADMIN' } });
          if (adminCount <= 1) {
            throw new ForbiddenException('You cannot demote the last admin');
          }
        }
      }

      const { password: _password, ...updatedStaff } = await tx.user.update({
        where: { id },
        data,
        include: { staffProfile: true },
      });
      return updatedStaff;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async remove(id: string, currentUserId?: string) {
    if (id === currentUserId) {
      throw new ForbiddenException('You cannot delete your own account');
    }
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
