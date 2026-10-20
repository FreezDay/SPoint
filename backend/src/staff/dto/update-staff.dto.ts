import { PartialType } from '@nestjs/mapped-types';
import { IsIn, IsOptional } from 'class-validator';
import { Role } from '@prisma/client';
import { CreateStaffDto } from './create-staff.dto';

export class UpdateStaffDto extends PartialType(CreateStaffDto) {
  @IsOptional()
  @IsIn(['ADMIN', 'STAFF'])
  role?: Role;
}
