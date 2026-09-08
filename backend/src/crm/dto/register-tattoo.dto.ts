import { IsArray, IsDateString, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class RegistrationPhotoDto {
  @IsString()
  @IsNotEmpty()
  dataUrl: string;

  @IsIn(['DRAFT', 'PROGRESS', 'FINAL'])
  @IsOptional()
  kind?: string;

  @IsUUID()
  @IsOptional()
  sessionId?: string;
}

export class RegisterTattooDto {
  // The CRM client this tattoo is registered for. Clients are only ever
  // created inside the CRM pages — never from this endpoint.
  @IsUUID()
  @IsNotEmpty()
  clientId: string;

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

  // Gross price of the tattoo. When filled (and payment method given) the
  // value is posted to the earnings ledger on the date of the 1st session.
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsInt()
  @Min(1)
  @Max(48)
  @IsOptional()
  plannedSessions?: number;

  // Always required: the project's first session.
  @IsDateString()
  @IsNotEmpty()
  firstSessionDate: string;

  // Optional dates for sessions 2..N (appointments).
  @IsArray()
  @IsDateString({}, { each: true })
  @IsOptional()
  sessionDates?: string[];

  @IsIn(['IN_PROGRESS', 'COMPLETED'])
  @IsOptional()
  firstSessionStatus?: string;

  // Regime of the job: "own" = own client + own material,
  // "studio" = studio client + studio material. Defaults to "own".
  @IsIn(['own', 'studio'])
  @IsOptional()
  rateScheme?: string;

  @IsString()
  @IsOptional()
  sessionNotes?: string;

  // Compressed images (first draft etc.) sent as data URLs.
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RegistrationPhotoDto)
  photos?: RegistrationPhotoDto[];

  @IsUUID()
  @IsOptional()
  staffId?: string;
}
