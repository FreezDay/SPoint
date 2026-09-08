import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePhotoDto {
  // Compressed image stored as a data URL (e.g. "data:image/jpeg;base64,...").
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
