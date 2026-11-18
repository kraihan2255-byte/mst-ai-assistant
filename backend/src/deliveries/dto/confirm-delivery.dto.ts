import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { PaymentMethod } from '../../common/interfaces/delivery.interface.js';

export class DeliveryItemInputDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPriceRupees?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPricePaise?: number;
}

export class PaymentInputDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountRupees?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
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

export class ConfirmDeliveryDto {
  @IsString()
  @IsNotEmpty()
  customerId!: string;

  @IsOptional()
  @IsString()
  deliveryDate?: string;

  @IsOptional()
  @IsBoolean()
  isItemized?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  outerBoxes?: number | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliveryItemInputDto)
  items?: DeliveryItemInputDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmountRupees?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmountPaise?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentInputDto)
  payments: PaymentInputDto[] = [];

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsString()
  idempotencyKey?: string | null;

  @IsBoolean()
  confirmed!: boolean;
}
