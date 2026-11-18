import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  size!: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  initialPriceRupees?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  initialPricePaise?: number;

  @IsOptional()
  @IsString()
  effectiveFrom?: string;
}
