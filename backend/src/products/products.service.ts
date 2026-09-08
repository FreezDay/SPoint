import { Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) { }

  create(createProductDto: CreateProductDto) {
    const { ...data } = createProductDto;
    return this.prisma.product.create({
      data: {
        ...data,
        price: Number(data.price),
        stock: Number(data.stock),
      },
    });
  }

  findAll(isAdmin = false) {
    return this.prisma.product.findMany({
      where: isAdmin ? {} : { isPublic: true },
    });
  }

  findOne(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
    });
  }

  update(id: string, updateProductDto: UpdateProductDto) {
    const { id: _, ...data } = updateProductDto as any;

    // Ensure numbers are correctly typed
    if (data.price !== undefined) data.price = Number(data.price);
    if (data.stock !== undefined) data.stock = Number(data.stock);

    console.log('UPDATING PRODUCT:', id, data);
    return this.prisma.product.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.product.delete({
      where: { id },
    });
  }
}
