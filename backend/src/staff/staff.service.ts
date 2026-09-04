import { Injectable } from '@nestjs/common';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { PrismaService } from '../prisma.service';

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) { }

  async create(createStaffDto: CreateStaffDto) {
    return this.prisma.user.create({
      data: {
        email: createStaffDto.email,
        password: '$2b$10$EpOd.4y...HASHED...', // Default password
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
    return this.prisma.user.findMany({
      where: { role: { in: ['STAFF', 'ADMIN'] } },
      include: { staffProfile: true },
    });
  }

  async findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { staffProfile: true },
    });
  }

  async update(id: string, updateStaffDto: UpdateStaffDto) {
    console.log('UPDATING STAFF:', id, updateStaffDto);
    const { bio, name, avatar } = updateStaffDto as any;

    return this.prisma.user.update({
      where: { id },
      data: {
        name: name,
        avatar: avatar,
        staffProfile: {
          upsert: {
            create: { bio: bio },
            update: { bio: bio },
          },
        },
      },
      include: { staffProfile: true },
    });
  }

  async remove(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
