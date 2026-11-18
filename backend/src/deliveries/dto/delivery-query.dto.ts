import { IsOptional, IsString } from 'class-validator';
import type { PaymentStatus } from '../../common/interfaces/delivery.interface.js';

export class DeliveryQueryDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  paymentStatus?: PaymentStatus;
}
