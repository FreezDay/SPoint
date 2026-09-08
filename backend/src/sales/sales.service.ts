import { Injectable } from '@nestjs/common';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) { }

  async create(createSaleDto: CreateSaleDto) {
    return this.prisma.sale.create({
      data: {
        total: createSaleDto.total,
        clientId: createSaleDto.clientId,
        items: {
          create: createSaleDto.items.map((item) => ({
            productId: item.productId,
            serviceId: item.serviceId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: { items: true, client: true },
    });
  }

  async findAll() {
    return this.prisma.sale.findMany({
      include: { items: { include: { product: true, service: true } }, client: true },
    });
  }

  async findByClient(clientId: string) {
    return this.prisma.sale.findMany({
      where: { clientId },
      include: { items: { include: { product: true, service: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.sale.findUnique({
      where: { id },
      include: { items: { include: { product: true, service: true } }, client: true },
    });
  }

  async update(id: string, updateSaleDto: UpdateSaleDto) {
    return this.prisma.sale.update({
      where: { id },
      data: {
        total: updateSaleDto.total,
        // Updating items is complex, skipping for MVP
      },
    });
  }

  async remove(id: string) {
    return this.prisma.sale.delete({
      where: { id },
    });
  }
}
