import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateServiceRecordDto {
  @IsString()
  @IsNotEmpty()
  serviceName: string;

  @IsNumber()
  amount: number;

  @IsDateString()
  serviceDate: string;

  @IsString()
  @IsNotEmpty()
  clientName: string;

  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @IsUUID()
  @IsOptional()
  staffId?: string;

  @IsUUID()
  @IsOptional()
  clientId?: string;
}