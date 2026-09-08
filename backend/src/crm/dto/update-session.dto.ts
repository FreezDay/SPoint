import { PartialType } from '@nestjs/mapped-types';
import { CreateSessionDto } from './create-session.dto';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateSessionDto extends PartialType(CreateSessionDto) {
  // Value paid for this session. Together with the payment method this is
  // what gets posted to the earnings ledger (Ganhos) when the session is
  // closed. Send null/0 to remove the value (removes it from Ganhos too).
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number | null;

  @IsString()
  @IsOptional()
  paymentMethod?: string | null;
}
