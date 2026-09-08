import { Controller, Get, Post, Body, UseGuards, Req, Param, Patch, Request } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('messages')
@UseGuards(AuthGuard('jwt'))
export class MessagesController {
    constructor(private readonly messagesService: MessagesService) { }

    @Get()
    findAll(@Req() req) {
        return this.messagesService.findForUser(req.user.id);
    }

    @Post()
    create(@Req() req, @Body() body: { content: string; receiverId: string }) {
        return this.messagesService.create({
            content: body.content,
            senderId: req.user.id,
            receiverId: body.receiverId,
        });
    }

    @Get('contact')
    getContact() {
        return this.messagesService.getContactForClient();
    }

    @Get('conversations')
    getConversations() {
        return this.messagesService.getConversations();
    }

    @Patch(':id/read')
    markAsRead(@Param('id') id: string) {
        return this.messagesService.markAsRead(id);
    }

    @Patch('read-all/:senderId')
    markAllAsRead(@Req() req: any, @Param('senderId') senderId: string) {
        return this.messagesService.markAllAsRead(req.user.id, senderId);
    }

    @Get('unread/count')
    async getUnreadCount(@Req() req: any) {
        return { count: await this.messagesService.getUnreadCount(req.user.id) };
    }
}
