import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { PaymentMethod } from '../../common/interfaces/delivery.interface.js';

export class PaymentItemDto {
  @IsNumber()
  amount!: number;

  @IsIn(['CASH', 'UPI', 'CHEQUE', 'BANK_TRANSFER', 'OTHER'])
  method!: PaymentMethod;

  @IsOptional()
  @IsString()
  provider?: string | null;
}

export class DeliveryDraftDto {
  @IsString()
  action!: string;

  @IsOptional()
  @IsString()
  recipient_name!: string | null;

  @IsOptional()
  @IsNumber()
  boxes_delivered!: number | null;

  @IsOptional()
  @IsNumber()
  total_amount!: number | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentItemDto)
  payments: PaymentItemDto[] = [];

  @IsOptional()
  @IsString()
  delivery_date!: string | null;

  @IsOptional()
  @IsString()
  area_name!: string | null;

  @IsOptional()
  @IsString()
  notes!: string | null;
}
