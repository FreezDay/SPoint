import { Injectable } from '@nestjs/common';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) { }

  create(createServiceDto: CreateServiceDto) {
    const { ...data } = createServiceDto;
    return this.prisma.service.create({
      data: {
        ...data,
        price: Number(data.price),
        duration: Number(data.duration),
      },
    });
  }

  findAll(isAdmin = false) {
    return this.prisma.service.findMany({
      where: isAdmin ? {} : { isPublic: true },
      include: { category: true },
    });
  }

  findOne(id: string) {
    return this.prisma.service.findUnique({
      where: { id },
      include: { category: true },
    });
  }

  update(id: string, updateServiceDto: UpdateServiceDto) {
    const { id: _, ...data } = updateServiceDto as any;

    // Ensure numbers are correctly typed
    if (data.price !== undefined) data.price = Number(data.price);
    if (data.duration !== undefined) data.duration = Number(data.duration);

    console.log('UPDATING SERVICE:', id, data);
    return this.prisma.service.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.service.delete({
      where: { id },
    });
  }
}
