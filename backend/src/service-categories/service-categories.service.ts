import { Injectable } from '@nestjs/common';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';
import { UpdateServiceCategoryDto } from './dto/update-service-category.dto';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ServiceCategoriesService {
  constructor(private prisma: PrismaService) { }

  create(createServiceCategoryDto: CreateServiceCategoryDto) {
    return this.prisma.serviceCategory.create({
      data: createServiceCategoryDto,
    });
  }

  findAll() {
    return this.prisma.serviceCategory.findMany({
      include: { services: true },
    });
  }

  findOne(id: string) {
    return this.prisma.serviceCategory.findUnique({
      where: { id },
      include: { services: true },
    });
  }

  update(id: string, updateServiceCategoryDto: UpdateServiceCategoryDto) {
    return this.prisma.serviceCategory.update({
      where: { id },
      data: updateServiceCategoryDto,
    });
  }

  remove(id: string) {
    return this.prisma.serviceCategory.delete({
      where: { id },
    });
  }
}
