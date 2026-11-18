import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { DeliveriesService } from './deliveries.service.js';
import { ProductsService } from '../products/products.service.js';
import { CustomersService } from '../customers/customers.service.js';

const testDbUrl =
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/mst_tengapal_test?schema=public';

describe('Deliveries Persistence & Financial Integrity (Integration)', () => {
  let prisma: PrismaService;
  let deliveriesService: DeliveriesService;
  let productsService: ProductsService;
  let customersService: CustomersService;

  beforeEach(async () => {
    prisma = new PrismaClient({
      datasources: { db: { url: testDbUrl } },
    }) as PrismaService;
    await prisma.$connect();
    productsService = new ProductsService(prisma);
    deliveriesService = new DeliveriesService(prisma, productsService);
    customersService = new CustomersService(prisma);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  it('Scenario: Recording partial payments and verifying customer balance', async () => {
    // 1. Create customer
    const customer = await customersService.create({
      name: `Catering Co ${Date.now()}`,
      phone: '9840011223',
    });

    // 2. Confirm delivery with partial payment (₹5,000 total, ₹2,000 GPay)
    const delivery = await deliveriesService.confirmDelivery({
      customerId: customer.id,
      outerBoxes: 10,
      totalAmountRupees: 5000,
      payments: [
        {
          amountRupees: 2000,
          method: 'UPI',
          provider: 'GPay',
        },
      ],
      confirmed: true,
    });

    expect(delivery.id).toBeDefined();
    expect(delivery.totalAmountPaise).toBe(500000);
    expect(delivery.totalAmountRupees).toBe(5000);
    expect(delivery.totalPaidPaise).toBe(200000);
    expect(delivery.totalPaidRupees).toBe(2000);
    expect(delivery.outstandingPaise).toBe(300000);
    expect(delivery.outstandingRupees).toBe(3000);
    expect(delivery.paymentStatus).toBe('PARTIALLY_PAID');

    // 3. Customer balance should show ₹3,000 outstanding
    const balance = await customersService.getBalance(customer.id);
    expect(balance.totalDeliveries).toBe(1);
    expect(balance.totalBilledRupees).toBe(5000);
    expect(balance.totalPaidRupees).toBe(2000);
    expect(balance.outstandingRupees).toBe(3000);
    expect(balance.paymentStatus).toBe('PARTIALLY_PAID');
  });

  it('Scenario: Recording full payment in cash', async () => {
    const customer = await customersService.create({
      name: `Supermarket Cash ${Date.now()}`,
    });

    const delivery = await deliveriesService.confirmDelivery({
      customerId: customer.id,
      outerBoxes: 5,
      totalAmountRupees: 3000,
      payments: [
        {
          amountRupees: 3000,
          method: 'CASH',
        },
      ],
      confirmed: true,
    });

    expect(delivery.outstandingRupees).toBe(0);
    expect(delivery.paymentStatus).toBe('PAID');

    const balance = await customersService.getBalance(customer.id);
    expect(balance.outstandingRupees).toBe(0);
    expect(balance.paymentStatus).toBe('PAID');
  });

  it('Scenario: Recording unpaid delivery', async () => {
    const customer = await customersService.create({
      name: `Unpaid Hotel ${Date.now()}`,
    });

    const delivery = await deliveriesService.confirmDelivery({
      customerId: customer.id,
      outerBoxes: 8,
      totalAmountRupees: 4000,
      payments: [],
      confirmed: true,
    });

    expect(delivery.totalPaidRupees).toBe(0);
    expect(delivery.outstandingRupees).toBe(4000);
    expect(delivery.paymentStatus).toBe('UNPAID');

    const balance = await customersService.getBalance(customer.id);
    expect(balance.outstandingRupees).toBe(4000);
    expect(balance.paymentStatus).toBe('UNPAID');
  });

  it('Scenario: Recording multiple payments on confirmation', async () => {
    const customer = await customersService.create({
      name: `Split Payer ${Date.now()}`,
    });

    const delivery = await deliveriesService.confirmDelivery({
      customerId: customer.id,
      totalAmountRupees: 5000,
      payments: [
        { amountRupees: 2000, method: 'CASH' },
        { amountRupees: 1500, method: 'UPI', provider: 'PhonePe' },
      ],
      confirmed: true,
    });

    expect(delivery.totalPaidRupees).toBe(3500);
    expect(delivery.outstandingRupees).toBe(1500);
    expect(delivery.payments.length).toBe(2);
    expect(delivery.paymentStatus).toBe('PARTIALLY_PAID');
  });

  it('Scenario: Additional payments against an existing delivery', async () => {
    const customer = await customersService.create({
      name: `Installment Customer ${Date.now()}`,
    });

    const delivery = await deliveriesService.confirmDelivery({
      customerId: customer.id,
      totalAmountRupees: 5000,
      payments: [{ amountRupees: 2000, method: 'UPI', provider: 'GPay' }],
      confirmed: true,
    });

    expect(delivery.outstandingRupees).toBe(3000);

    // Record additional payment of ₹2,000
    const updated1 = await deliveriesService.recordPayment(delivery.id, {
      amountRupees: 2000,
      method: 'CASH',
    });
    expect(updated1.totalPaidRupees).toBe(4000);
    expect(updated1.outstandingRupees).toBe(1000);
    expect(updated1.paymentStatus).toBe('PARTIALLY_PAID');

    // Settle final ₹1,000
    const updated2 = await deliveriesService.recordPayment(delivery.id, {
      amountRupees: 1000,
      method: 'BANK_TRANSFER',
    });
    expect(updated2.totalPaidRupees).toBe(5000);
    expect(updated2.outstandingRupees).toBe(0);
    expect(updated2.paymentStatus).toBe('PAID');
  });

  it('Scenario: Rejecting payments that exceed delivery total', async () => {
    const customer = await customersService.create({
      name: `Excess Payment Tester ${Date.now()}`,
    });

    // 1. Initial confirmation with excess payment
    await expect(
      deliveriesService.confirmDelivery({
        customerId: customer.id,
        totalAmountRupees: 5000,
        payments: [{ amountRupees: 6000, method: 'CASH' }],
        confirmed: true,
      }),
    ).rejects.toThrow(/exceed total delivery amount/i);

    // 2. Additional payment exceeding remaining outstanding
    const validDelivery = await deliveriesService.confirmDelivery({
      customerId: customer.id,
      totalAmountRupees: 5000,
      payments: [{ amountRupees: 4000, method: 'CASH' }],
      confirmed: true,
    });

    await expect(
      deliveriesService.recordPayment(validDelivery.id, {
        amountRupees: 2000, // Remaining is only 1000
        method: 'CASH',
      }),
    ).rejects.toThrow(/exceeds remaining outstanding balance/i);
  });

  it('Scenario: Rejecting negative quantities and amounts', async () => {
    const customer = await customersService.create({
      name: `Negative Guard Tester ${Date.now()}`,
    });

    await expect(
      deliveriesService.confirmDelivery({
        customerId: customer.id,
        outerBoxes: -3,
        totalAmountRupees: 1000,
        payments: [],
        confirmed: true,
      }),
    ).rejects.toThrow(/cannot be negative/i);

    await expect(
      deliveriesService.confirmDelivery({
        customerId: customer.id,
        totalAmountRupees: -500,
        payments: [],
        confirmed: true,
      }),
    ).rejects.toThrow(/greater than zero/i);
  });

  it('Scenario: Idempotency protection prevents duplicate deliveries', async () => {
    const customer = await customersService.create({
      name: `Idempotency Customer ${Date.now()}`,
    });
    const key = `idem-key-${Date.now()}`;

    // First request
    const first = await deliveriesService.confirmDelivery({
      customerId: customer.id,
      totalAmountRupees: 2000,
      payments: [{ amountRupees: 2000, method: 'CASH' }],
      idempotencyKey: key,
      confirmed: true,
    });

    expect(first.isDuplicate).toBeFalsy();

    // Duplicate retry
    const retry = await deliveriesService.confirmDelivery({
      customerId: customer.id,
      totalAmountRupees: 2000,
      payments: [{ amountRupees: 2000, method: 'CASH' }],
      idempotencyKey: key,
      confirmed: true,
    });

    expect(retry.id).toBe(first.id);
    expect(retry.isDuplicate).toBe(true);

    // Ensure database only contains 1 record
    const count = await prisma.delivery.count({
      where: { idempotencyKey: key },
    });
    expect(count).toBe(1);
  });

  it('Scenario: Preserving historical prices on delivery items', async () => {
    const customer = await customersService.create({
      name: `Price Preservation Customer ${Date.now()}`,
    });

    // 1. Create product at price ₹155 (15500 paise)
    const product = await productsService.create({
      name: `Price Lock Coconut Milk ${Date.now()}`,
      size: '500g',
      sku: `PL-500-${Date.now()}`,
      initialPriceRupees: 155,
    });

    // 2. Record delivery with 10 packs of this product at ₹155 (₹1,550 total)
    const delivery = await deliveriesService.confirmDelivery({
      customerId: customer.id,
      items: [{ productId: product.id, quantity: 10 }],
      confirmed: true,
    });

    expect(delivery.totalAmountRupees).toBe(1550);
    expect(delivery.items[0].unitPricePaise).toBe(15500);

    // 3. Product price subsequently increases to ₹175
    await productsService.addPrice(product.id, {
      priceRupees: 175,
      effectiveFrom: new Date().toISOString(),
    });

    // 4. Historical delivery must retain unitPrice ₹155 and total ₹1,550
    const historicalDelivery = await deliveriesService.findOne(delivery.id);
    expect(historicalDelivery.totalAmountRupees).toBe(1550);
    expect(historicalDelivery.items[0].unitPricePaise).toBe(15500);

    // 5. A new delivery today uses the new price ₹175
    const newDelivery = await deliveriesService.confirmDelivery({
      customerId: customer.id,
      items: [{ productId: product.id, quantity: 10 }],
      confirmed: true,
    });
    expect(newDelivery.totalAmountRupees).toBe(1750);
    expect(newDelivery.items[0].unitPricePaise).toBe(17500);
  });

  it('Scenario: Rolling back failed database transactions', async () => {
    const customer = await customersService.create({
      name: `Rollback Tester ${Date.now()}`,
    });

    const initialDeliveryCount = await prisma.delivery.count();

    // Trigger confirmation with an invalid product ID in items
    await expect(
      deliveriesService.confirmDelivery({
        customerId: customer.id,
        items: [{ productId: 'non-existent-product-id', quantity: 5 }],
        confirmed: true,
      }),
    ).rejects.toThrow();

    // Ensure no partial delivery or payment record was persisted
    const finalDeliveryCount = await prisma.delivery.count();
    expect(finalDeliveryCount).toBe(initialDeliveryCount);
  });

  it('Scenario: Concurrent payment requests cannot overpay a delivery', async () => {
    const customer = await customersService.create({
      name: `Concurrency Customer ${Date.now()}`,
    });

    // Create a delivery with ₹3,000 total, 0 paid, outstanding = ₹3,000
    const delivery = await deliveriesService.confirmDelivery({
      customerId: customer.id,
      totalAmountRupees: 3000,
      isItemized: false,
      confirmed: true,
    });

    expect(delivery.outstandingRupees).toBe(3000);

    // Two concurrent requests attempt to pay ₹2,000 each (total ₹4,000 > ₹3,000)
    const results = await Promise.allSettled([
      deliveriesService.recordPayment(delivery.id, {
        amountRupees: 2000,
        method: 'UPI',
        provider: 'GPay',
      }),
      deliveriesService.recordPayment(delivery.id, {
        amountRupees: 2000,
        method: 'CASH',
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // Exactly one must succeed, and one must be rejected due to balance check
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    // Verify database integrity
    const refreshed = await deliveriesService.findOne(delivery.id);
    expect(refreshed.totalPaidRupees).toBe(2000);
    expect(refreshed.outstandingRupees).toBe(1000);
    expect(refreshed.paymentStatus).toBe('PARTIALLY_PAID');
  });

  it('Scenario: Itemized delivery calculates line totals and delivery totals on backend', async () => {
    const customer = await customersService.create({
      name: `Itemized Customer ${Date.now()}`,
    });

    const product500g = await productsService.create({
      name: `Milk 500g Itemized ${Date.now()}`,
      size: '500g',
      initialPriceRupees: 155,
    });

    const product1kg = await productsService.create({
      name: `Milk 1kg Itemized ${Date.now()}`,
      size: '1kg',
      initialPriceRupees: 290,
    });

    // 5 packs of 500g (₹155 * 5 = ₹775) and 3 packs of 1kg (₹290 * 3 = ₹870) = ₹1,645 total
    const delivery = await deliveriesService.confirmDelivery({
      customerId: customer.id,
      isItemized: true,
      outerBoxes: 3,
      items: [
        { productId: product500g.id, quantity: 5 },
        { productId: product1kg.id, quantity: 3 },
      ],
      confirmed: true,
    });

    expect(delivery.deliveryType).toBe('ITEMIZED');
    expect(delivery.isItemized).toBe(true);
    expect(delivery.itemsCount).toBe(2);
    expect(delivery.outerBoxes).toBe(3);
    expect(delivery.totalAmountPaise).toBe(164500);
    expect(delivery.totalAmountRupees).toBe(1645);
    expect(delivery.items[0].lineTotalPaise).toBe(77500);
    expect(delivery.items[1].lineTotalPaise).toBe(87000);
  });

  it('Scenario: Non-itemized delivery explicitly marked with isItemized: false', async () => {
    const customer = await customersService.create({
      name: `Bulk Non-Itemized ${Date.now()}`,
    });

    const delivery = await deliveriesService.confirmDelivery({
      customerId: customer.id,
      isItemized: false,
      outerBoxes: 12,
      totalAmountRupees: 6000,
      payments: [{ amountRupees: 6000, method: 'BANK_TRANSFER' }],
      confirmed: true,
    });

    expect(delivery.deliveryType).toBe('NON_ITEMIZED');
    expect(delivery.isItemized).toBe(false);
    expect(delivery.itemsCount).toBe(0);
    expect(delivery.outerBoxes).toBe(12);
    expect(delivery.totalAmountRupees).toBe(6000);
    expect(delivery.paymentStatus).toBe('PAID');
  });

  it('Scenario: Rejecting invalid itemized vs non-itemized configurations', async () => {
    const customer = await customersService.create({
      name: `Mismatch Guard ${Date.now()}`,
    });

    // 1. isItemized: true but empty items array
    await expect(
      deliveriesService.confirmDelivery({
        customerId: customer.id,
        isItemized: true,
        items: [],
        confirmed: true,
      }),
    ).rejects.toThrow('An itemized delivery must contain at least one delivery item.');

    // 2. isItemized: false but items provided
    const product = await productsService.create({
      name: `Sample Guard Product ${Date.now()}`,
      size: '500g',
      initialPriceRupees: 155,
    });

    await expect(
      deliveriesService.confirmDelivery({
        customerId: customer.id,
        isItemized: false,
        totalAmountRupees: 1000,
        items: [{ productId: product.id, quantity: 2 }],
        confirmed: true,
      }),
    ).rejects.toThrow('A non-itemized delivery cannot contain delivery items.');
  });

  it('Scenario: Financial records cannot be accidentally deleted (Foreign key Restrict constraint)', async () => {
    const customer = await customersService.create({
      name: `Financial Protection Customer ${Date.now()}`,
    });

    await deliveriesService.confirmDelivery({
      customerId: customer.id,
      totalAmountRupees: 2500,
      isItemized: false,
      confirmed: true,
    });

    // Attempting to delete a customer who has financial deliveries must fail
    await expect(
      prisma.customer.delete({
        where: { id: customer.id },
      }),
    ).rejects.toThrow();
  });
});
