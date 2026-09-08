import { IsNotEmpty, IsString, IsOptional, IsDateString, IsUUID } from 'class-validator';

export class CreateAppointmentDto {
    @IsUUID()
    @IsOptional()
    clientId?: string;

    @IsUUID()
    @IsNotEmpty()
    serviceId: string;

    @IsUUID()
    @IsOptional()
    staffId?: string;

    @IsDateString()
    @IsNotEmpty()
    startTime: string;

    @IsDateString()
    @IsNotEmpty()
    endTime: string;

    @IsString()
    @IsOptional()
    notes?: string;

    @IsString()
    @IsOptional()
    guestName?: string;

    @IsString()
    @IsOptional()
    guestEmail?: string;

    @IsString()
    @IsOptional()
    guestPhone?: string;
}
