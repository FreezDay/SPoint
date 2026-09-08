import { IsDateString, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsOptional()
  serviceName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  placement?: string;

  @IsString()
  @IsOptional()
  size?: string;

  @IsNumber()
  @IsOptional()
  cost?: number;

  @IsInt()
  @Min(1)
  @Max(48)
  @IsOptional()
  plannedSessions?: number;

  // First session of the project always needs a date.
  @IsDateString()
  @IsNotEmpty()
  firstSessionDate: string;

  @IsIn(['IN_PROGRESS', 'COMPLETED'])
  @IsOptional()
  firstSessionStatus?: string;

  @IsString()
  @IsOptional()
  firstSessionNotes?: string;
}
