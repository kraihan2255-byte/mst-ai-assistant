import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Product, ProductPriceHistory } from '@prisma/client';
import { CreateProductDto } from './dto/create-product.dto.js';
import { CreatePriceDto } from './dto/create-price.dto.js';

export interface ProductWithCurrentPrice extends Product {
  currentPricePaise: number | null;
  currentPriceRupees: number | null;
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(activeOnly = true): Promise<ProductWithCurrentPrice[]> {
    const products = await this.prisma.product.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { name: 'asc' },
    });

    const now = new Date();
    const result: ProductWithCurrentPrice[] = [];

    for (const p of products) {
      const price = await this.prisma.productPriceHistory.findFirst({
        where: {
          productId: p.id,
          effectiveFrom: { lte: now },
        },
        orderBy: { effectiveFrom: 'desc' },
      });

      result.push({
        ...p,
        currentPricePaise: price ? price.pricePaise : null,
        currentPriceRupees: price ? price.pricePaise / 100 : null,
      });
    }

    return result;
  }

  async findOne(id: string): Promise<ProductWithCurrentPrice> {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found.`);
    }

    const price = await this.prisma.productPriceHistory.findFirst({
      where: {
        productId: product.id,
        effectiveFrom: { lte: new Date() },
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    return {
      ...product,
      currentPricePaise: price ? price.pricePaise : null,
      currentPriceRupees: price ? price.pricePaise / 100 : null,
    };
  }

  async create(dto: CreateProductDto): Promise<ProductWithCurrentPrice> {
    let pricePaise = 0;
    if (dto.initialPricePaise !== undefined) {
      pricePaise = dto.initialPricePaise;
    } else if (dto.initialPriceRupees !== undefined) {
      pricePaise = Math.round(dto.initialPriceRupees * 100);
    }

    if (pricePaise <= 0) {
      throw new BadRequestException(
        'Initial product price must be greater than zero.',
      );
    }

    if (dto.sku?.trim()) {
      const existing = await this.prisma.product.findUnique({
        where: { sku: dto.sku.trim() },
      });
      if (existing) {
        throw new BadRequestException(
          `Product with SKU "${dto.sku.trim()}" already exists.`,
        );
      }
    }

    const effectiveDate = dto.effectiveFrom
      ? new Date(dto.effectiveFrom)
      : new Date();

    const product = await this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: dto.name.trim(),
          size: dto.size.trim(),
          sku: dto.sku?.trim() || null,
          isActive: dto.isActive !== undefined ? dto.isActive : true,
        },
      });

      await tx.productPriceHistory.create({
        data: {
          productId: created.id,
          pricePaise,
          effectiveFrom: effectiveDate,
        },
      });

      return created;
    });

    this.logger.log(
      `Created product "${product.name}" (${product.size}) at ₹${pricePaise / 100}`,
    );

    return {
      ...product,
      currentPricePaise: pricePaise,
      currentPriceRupees: pricePaise / 100,
    };
  }

  async getPriceHistory(productId: string): Promise<ProductPriceHistory[]> {
    await this.findOne(productId);

    return this.prisma.productPriceHistory.findMany({
      where: { productId },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async addPrice(
    productId: string,
    dto: CreatePriceDto,
  ): Promise<ProductPriceHistory> {
    await this.findOne(productId);

    let pricePaise = 0;
    if (dto.pricePaise !== undefined) {
      pricePaise = dto.pricePaise;
    } else if (dto.priceRupees !== undefined) {
      pricePaise = Math.round(dto.priceRupees * 100);
    }

    if (pricePaise <= 0) {
      throw new BadRequestException(
        'New product price must be greater than zero.',
      );
    }

    const effectiveDate = dto.effectiveFrom
      ? new Date(dto.effectiveFrom)
      : new Date();

    const record = await this.prisma.productPriceHistory.create({
      data: {
        productId,
        pricePaise,
        effectiveFrom: effectiveDate,
      },
    });

    this.logger.log(
      `Added price history for product ${productId}: ₹${pricePaise / 100} effective from ${effectiveDate.toISOString()}`,
    );

    return record;
  }

  /**
   * Retrieves the effective unit price in paise for a product at a specific delivery date.
   * Supports past and scheduled future price changes without modifying historical delivery prices.
   */
  async getEffectivePrice(
    productId: string,
    atDate: Date = new Date(),
  ): Promise<number> {
    const priceRecord = await this.prisma.productPriceHistory.findFirst({
      where: {
        productId,
        effectiveFrom: { lte: atDate },
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (!priceRecord) {
      throw new BadRequestException(
        `No effective price found for product ${productId} at date ${atDate.toISOString()}.`,
      );
    }

    return priceRecord.pricePaise;
  }
}
