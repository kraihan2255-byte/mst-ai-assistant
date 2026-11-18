import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ProductsService,
  ProductWithCurrentPrice,
} from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { CreatePriceDto } from './dto/create-price.dto.js';
import type { ProductPriceHistory } from '@prisma/client';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(
    @Query('activeOnly') activeOnly?: string,
  ): Promise<ProductWithCurrentPrice[]> {
    const isActiveOnly = activeOnly !== 'false';
    return this.productsService.findAll(isActiveOnly);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateProductDto): Promise<ProductWithCurrentPrice> {
    return this.productsService.create(dto);
  }

  @Get(':id/prices')
  getPriceHistory(@Param('id') id: string): Promise<ProductPriceHistory[]> {
    return this.productsService.getPriceHistory(id);
  }

  @Post(':id/prices')
  @HttpCode(HttpStatus.CREATED)
  addPrice(
    @Param('id') id: string,
    @Body() dto: CreatePriceDto,
  ): Promise<ProductPriceHistory> {
    return this.productsService.addPrice(id, dto);
  }
}
