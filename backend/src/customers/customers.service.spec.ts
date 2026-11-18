import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CustomersService } from './customers.service.js';

const testDbUrl =
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/mst_tengapal_test?schema=public';

describe('CustomersService (Database Integration)', () => {
  let prisma: PrismaService;
  let service: CustomersService;

  beforeEach(async () => {
    prisma = new PrismaClient({
      datasources: { db: { url: testDbUrl } },
    }) as PrismaService;
    await prisma.$connect();
    service = new CustomersService(prisma);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  it('should create a customer with optional area and address', async () => {
    const customer = await service.create({
      name: `Test Customer ${Date.now()}`,
      phone: '9988776655',
      address: 'Bypass Road, Manjeri',
      notes: 'VIP customer',
    });

    expect(customer.id).toBeDefined();
    expect(customer.name).toContain('Test Customer');
    expect(customer.phone).toBe('9988776655');
    expect(customer.address).toBe('Bypass Road, Manjeri');
  });

  it('should search customers by name and phone', async () => {
    const uniquePhone = `91${Math.floor(10000000 + Math.random() * 90000000)}`;
    const created = await service.create({
      name: 'Searchable Kitchens',
      phone: uniquePhone,
    });

    const searchByName = await service.findAll({ search: 'Searchable' });
    expect(searchByName.some((c) => c.id === created.id)).toBe(true);

    const searchByPhone = await service.findAll({
      phone: uniquePhone.slice(-6),
    });
    expect(searchByPhone.some((c) => c.id === created.id)).toBe(true);
  });

  it('should match customer by exact name with high confidence', async () => {
    const uniqueName = `Exact Catering ${Date.now()}`;
    await service.create({ name: uniqueName });

    const match = await service.matchCustomer(uniqueName);
    expect(match.matched).toBe(true);
    expect(match.confidence).toBe('high');
    expect(match.customer?.name).toBe(uniqueName);
  });

  it('should return multiple candidates when duplicate customer names exist', async () => {
    const duplicateName = `Duplicate Diner ${Date.now()}`;
    await service.create({ name: duplicateName, phone: '1111111111' });
    await service.create({ name: duplicateName, phone: '2222222222' });

    const match = await service.matchCustomer(duplicateName);
    expect(match.matched).toBe(false);
    expect(match.confidence).toBe('medium');
    expect(match.candidates.length).toBe(2);
  });

  it('should never automatically link an ambiguous partial substring match', async () => {
    const timestamp = Date.now();
    await service.create({ name: `Malabar Spice House ${timestamp}` });

    // Partial search for "Spice"
    const match = await service.matchCustomer('Spice');
    expect(match.matched).toBe(false);
    expect(match.customer).toBeUndefined();
    expect(match.candidates.length).toBeGreaterThanOrEqual(1);
  });
});
