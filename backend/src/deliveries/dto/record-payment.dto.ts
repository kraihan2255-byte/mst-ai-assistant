import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import type { PaymentMethod } from '../../common/interfaces/delivery.interface.js';

export class RecordPaymentDto {
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amountRupees?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  amountPaise?: number;

  @IsIn(['CASH', 'UPI', 'CHEQUE', 'BANK_TRANSFER', 'OTHER'])
  method!: PaymentMethod;

  @IsOptional()
  @IsString()
  provider?: string | null;

  @IsOptional()
  @IsString()
  paymentDate?: string;

  @IsOptional()
  @IsString()
  reference?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
