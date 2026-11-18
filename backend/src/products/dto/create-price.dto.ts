import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePriceDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceRupees?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePaise?: number;

  @IsOptional()
  @IsString()
  effectiveFrom?: string;
}
