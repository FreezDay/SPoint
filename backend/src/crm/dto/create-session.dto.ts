import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateSessionDto {
  // Optional for every session except the first one of a project.
  @IsDateString()
  @IsOptional()
  date?: string;

  @IsIn(['IN_PROGRESS', 'COMPLETED'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
