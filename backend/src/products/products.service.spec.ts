import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProductsService } from './products.service.js';

const testDbUrl =
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/mst_tengapal_test?schema=public';

describe('ProductsService (Pricing & History)', () => {
  let prisma: PrismaService;
  let service: ProductsService;

  beforeEach(async () => {
    prisma = new PrismaClient({
      datasources: { db: { url: testDbUrl } },
    }) as PrismaService;
    await prisma.$connect();
    service = new ProductsService(prisma);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  it('should create a product with initial price in paise', async () => {
    const product = await service.create({
      name: `Special Milk ${Date.now()}`,
      size: '500g',
      sku: `SP-500-${Date.now()}`,
      initialPriceRupees: 160,
    });

    expect(product.id).toBeDefined();
    expect(product.currentPricePaise).toBe(16000);
    expect(product.currentPriceRupees).toBe(160);
  });

  it('should support scheduled future price changes without modifying current effective price', async () => {
    const product = await service.create({
      name: `Scheduled Milk ${Date.now()}`,
      size: '1kg',
      sku: `SCH-1K-${Date.now()}`,
      initialPriceRupees: 300, // Current price ₹300
    });

    // Schedule a future price increase to ₹320 effective next week
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await service.addPrice(product.id, {
      priceRupees: 320,
      effectiveFrom: nextWeek.toISOString(),
    });

    // Price today should still be ₹300 (30000 paise)
    const priceToday = await service.getEffectivePrice(product.id, new Date());
    expect(priceToday).toBe(30000);

    // Price at future date should be ₹320 (32000 paise)
    const futureDate = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
    const priceNextWeek = await service.getEffectivePrice(
      product.id,
      futureDate,
    );
    expect(priceNextWeek).toBe(32000);
  });

  it('should reject negative price', async () => {
    const product = await service.create({
      name: `Guardrail Milk ${Date.now()}`,
      size: '500g',
      sku: `GD-${Date.now()}`,
      initialPriceRupees: 150,
    });

    await expect(
      service.addPrice(product.id, {
        priceRupees: -50,
      }),
    ).rejects.toThrow(/greater than zero/i);
  });
});
