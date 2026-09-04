import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
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

  async update(id: string, updateStaffDto: UpdateStaffDto) {
    console.log('UPDATING STAFF:', id, updateStaffDto);
    const { bio, name, avatar, password } = updateStaffDto as any;
    const data: any = {
      name: name,
      avatar: avatar,
      staffProfile: {
        upsert: {
          create: { bio: bio },
          update: { bio: bio },
        },
      },
    };
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      include: { staffProfile: true },
    });
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
