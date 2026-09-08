import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class MessagesService {
    constructor(private prisma: PrismaService) { }

    async findForUser(userId: string) {
        return this.prisma.message.findMany({
            where: {
                OR: [
                    { senderId: userId },
                    { receiverId: userId },
                ],
            },
            include: {
                sender: { select: { name: true, email: true } },
                receiver: { select: { name: true, email: true } },
            },
            orderBy: { createdAt: 'asc' },
        });
    }

    async create(data: { content: string; senderId: string; receiverId: string }) {
        return this.prisma.message.create({
            data,
        });
    }

    async markAsRead(id: string) {
        return this.prisma.message.update({
            where: { id },
            data: { read: true },
        });
    }

    async getContactForClient() {
        // Find the first admin or staff to be the default contact
        return this.prisma.user.findFirst({
            where: {
                role: { in: ['ADMIN', 'STAFF'] }
            },
            orderBy: { role: 'asc' }, // Prioritize ADMIN (A before S)
            select: { id: true, name: true, email: true }
        });
    }

    async markAllAsRead(userId: string, senderId: string) {
        return this.prisma.message.updateMany({
            where: {
                receiverId: userId,
                senderId: senderId,
                read: false,
            },
            data: { read: true },
        });
    }

    async getConversations() {
        // Group messages by the non-admin user (client)
        const messages = await this.prisma.message.findMany({
            include: {
                sender: { select: { id: true, name: true, email: true, role: true } },
                receiver: { select: { id: true, name: true, email: true, role: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        const conversationsMap = new Map();

        messages.forEach(msg => {
            const client = msg.sender.role === 'CLIENT' ? msg.sender : msg.receiver;
            if (!conversationsMap.has(client.id)) {
                conversationsMap.set(client.id, {
                    client,
                    lastMessage: msg,
                    unreadCount: (!msg.read && msg.receiver.role === 'ADMIN') ? 1 : 0
                });
            } else if (!msg.read && msg.receiver.role === 'ADMIN') {
                const conv = conversationsMap.get(client.id);
                conv.unreadCount++;
            }
        });

        return Array.from(conversationsMap.values());
    }

    async getUnreadCount(userId: string) {
        return this.prisma.message.count({
            where: {
                receiverId: userId,
                read: false,
            },
        });
    }
}
