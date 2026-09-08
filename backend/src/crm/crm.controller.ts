import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateClientDto } from './dto/create-client.dto';
import { CreatePhotoDto } from './dto/create-photo.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { RegisterTattooDto } from './dto/register-tattoo.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { CrmService } from './crm.service';

@Controller('crm')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  // ---------- Clients ----------

  @Get('clients')
  findAllClients() {
    return this.crmService.findAllClients();
  }

  @Get('client-search')
  searchClients(@Query('q') query?: string) {
    return this.crmService.findClients(query);
  }

  @Post('register')
  registerTattoo(@Body() dto: RegisterTattooDto, @Request() req: any) {
    return this.crmService.registerTattoo(dto, req.user);
  }

  @Post('clients')
  createClient(@Body() dto: CreateClientDto) {
    return this.crmService.createClient(dto);
  }

  @Get('clients/:clientId')
  findOneClient(@Param('clientId') clientId: string) {
    return this.crmService.findOneClient(clientId);
  }

  @Patch('clients/:clientId')
  updateClient(@Param('clientId') clientId: string, @Body() dto: UpdateClientDto) {
    return this.crmService.updateClient(clientId, dto);
  }

  @Delete('clients/:clientId')
  @Roles('ADMIN')
  removeClient(@Param('clientId') clientId: string) {
    return this.crmService.removeClient(clientId);
  }

  // ---------- Projects ----------

  @Post('clients/:clientId/projects')
  createProject(@Param('clientId') clientId: string, @Body() dto: CreateProjectDto) {
    return this.crmService.createProject(clientId, dto);
  }

  @Get('projects/:projectId')
  findProject(@Param('projectId') projectId: string) {
    return this.crmService.findProject(projectId);
  }

  @Patch('projects/:projectId')
  updateProject(@Param('projectId') projectId: string, @Body() dto: UpdateProjectDto) {
    return this.crmService.updateProject(projectId, dto);
  }

  @Delete('projects/:projectId')
  @Roles('ADMIN')
  removeProject(@Param('projectId') projectId: string) {
    return this.crmService.removeProject(projectId);
  }

  // ---------- Sessions ----------

  @Post('projects/:projectId/sessions')
  createSession(@Param('projectId') projectId: string, @Body() dto: CreateSessionDto) {
    return this.crmService.createSession(projectId, dto);
  }

  @Patch('sessions/:sessionId')
  updateSession(@Param('sessionId') sessionId: string, @Body() dto: UpdateSessionDto, @Request() req: any) {
    return this.crmService.updateSession(sessionId, dto, req.user);
  }

  @Delete('sessions/:sessionId')
  @Roles('ADMIN')
  removeSession(@Param('sessionId') sessionId: string) {
    return this.crmService.removeSession(sessionId);
  }

  // ---------- Photos ----------

  @Post('projects/:projectId/photos')
  createPhoto(@Param('projectId') projectId: string, @Body() dto: CreatePhotoDto) {
    return this.crmService.createPhoto(projectId, dto);
  }

  @Delete('photos/:photoId')
  @Roles('ADMIN')
  removePhoto(@Param('photoId') photoId: string) {
    return this.crmService.removePhoto(photoId);
  }
}
