import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class NewsService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.news.findMany({
            where: { published: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        return this.prisma.news.findUnique({ where: { id } });
    }

    async create(data: any) {
        return this.prisma.news.create({ data });
    }

    async update(id: string, data: any) {
        return this.prisma.news.update({
            where: { id },
            data,
        });
    }

    async remove(id: string) {
        return this.prisma.news.delete({ where: { id } });
    }
}
