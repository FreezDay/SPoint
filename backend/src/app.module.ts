import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { ServicesModule } from './services/services.module';
import { ServiceCategoriesModule } from './service-categories/service-categories.module';
import { StaffModule } from './staff/staff.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { ProductsModule } from './products/products.module';
import { SalesModule } from './sales/sales.module';
import { ReportsModule } from './reports/reports.module';
import { PrismaModule } from './prisma.module';
import { AuthModule } from './auth/auth.module';
import { SettingsModule } from './settings/settings.module';
import { NewsModule } from './news/news.module';
import { ServiceRecordsModule } from './service-records/service-records.module';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, ClientsModule, ServicesModule, ServiceCategoriesModule, StaffModule, AppointmentsModule, ProductsModule, SalesModule, ReportsModule, SettingsModule, NewsModule, ServiceRecordsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
