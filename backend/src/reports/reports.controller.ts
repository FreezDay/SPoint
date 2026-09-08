import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('reports')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) { }

  @Get('dashboard')
  getDashboardStats(@Request() req: any) {
    return this.reportsService.getDashboardStats(req.user);
  }
}
