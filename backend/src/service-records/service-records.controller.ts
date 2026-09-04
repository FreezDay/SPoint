import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateServiceRecordDto } from './dto/create-service-record.dto';
import { UpdateServiceRecordDto } from './dto/update-service-record.dto';
import { ServiceRecordsService } from './service-records.service';

@Controller('service-records')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN', 'STAFF')
export class ServiceRecordsController {
  constructor(private readonly serviceRecordsService: ServiceRecordsService) {}

  @Post()
  create(@Body() dto: CreateServiceRecordDto, @Request() req: any) {
    return this.serviceRecordsService.create(dto, req.user);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.serviceRecordsService.findAll(req.user);
  }

  @Get('earnings')
  getEarnings(@Request() req: any) {
    return this.serviceRecordsService.getEarnings(req.user);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateServiceRecordDto) {
    return this.serviceRecordsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.serviceRecordsService.remove(id);
  }
}