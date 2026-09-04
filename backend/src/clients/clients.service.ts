import { Injectable } from '@nestjs/common';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) { }

  async create(createClientDto: CreateClientDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: createClientDto.email },
    });
    if (existing) return existing;

    return this.prisma.user.create({
      data: {
        email: createClientDto.email,
        password: '$2b$10$EpOd.4yKkF8nQ...HASHED...', // Default or generated
        name: createClientDto.name,
        role: 'CLIENT',
        clientProfile: {
          create: {
            phone: createClientDto.phone,
            notes: createClientDto.notes,
          },
        },
      },
      include: {
        clientProfile: true,
      },
    });
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      where: { role: 'CLIENT' },
      include: { clientProfile: true },
    });
    return users.map(({ password: _pw, ...user }) => user);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { clientProfile: true },
    });
    if (!user) return null;
    const { password: _pw, ...safe } = user;
    return safe;
  }

  async update(id: string, updateClientDto: UpdateClientDto) {
    console.log('UPDATING CLIENT:', id, updateClientDto);
    return this.prisma.user.update({
      where: { id },
      data: {
        name: updateClientDto.name,
        clientProfile: {
          update: {
            phone: updateClientDto.phone,
            notes: updateClientDto.notes,
          },
        },
      },
      include: { clientProfile: true },
    });
  }

  async remove(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
