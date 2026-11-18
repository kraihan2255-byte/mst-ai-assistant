import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { AuthService } from '../src/auth/auth.service.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';

describe('MST Tengapal Phase 2 E2E Tests (Full API & Database)', () => {
  let app: INestApplication;
  let authToken: string;
  let testCustomerId: string;
  let testProductId: string;
  let testDeliveryId: string;

  const authReq = (req: request.Test) => req.set('Authorization', `Bearer ${authToken}`);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    const authService = app.get(AuthService);
    authToken = await authService.createToken({
      id: 'phase2-admin-uuid',
      username: 'phase2-admin',
      role: 'ADMIN',
    });
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('Security & Access Control', () => {
    it('should reject unauthenticated requests to business endpoints with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/customers')
        .expect(401);

      await request(app.getHttpServer())
        .post('/api/deliveries/confirm')
        .send({})
        .expect(401);
    });
  });

  describe('Customer APIs', () => {
    it('POST /api/customers - should create a new customer', async () => {
      const res = await authReq(request(app.getHttpServer())
        .post('/api/customers'))
        .send({
          name: `Phase2 Customer ${Date.now()}`,
          phone: '9876500001',
          address: 'Main Road, Malappuram',
          notes: 'Daily distributor',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toContain('Phase2 Customer');
      testCustomerId = res.body.id;
    });

    it('GET /api/customers - should search customers by name', async () => {
      const res = await authReq(request(app.getHttpServer())
        .get('/api/customers?q=Phase2'))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/customers/areas - should return Malappuram sample areas', async () => {
      const res = await authReq(request(app.getHttpServer())
        .get('/api/customers/areas'))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(15);
      const names = res.body.map((a: { name: string }) => a.name);
      expect(names).toContain('Malappuram');
      expect(names).toContain('Manjeri');
    });

    it('GET /api/customers/:id/balance - should return 0 balance for new customer', async () => {
      const res = await authReq(request(app.getHttpServer())
        .get(`/api/customers/${testCustomerId}/balance`))
        .expect(200);

      expect(res.body.customerId).toBe(testCustomerId);
      expect(res.body.totalDeliveries).toBe(0);
      expect(res.body.totalBilledRupees).toBe(0);
      expect(res.body.totalPaidRupees).toBe(0);
      expect(res.body.outstandingRupees).toBe(0);
      expect(res.body.paymentStatus).toBe('PAID');
    });
  });

  describe('Product APIs & Independent Pricing', () => {
    it('POST /api/products - should create a product with initial price', async () => {
      const res = await authReq(request(app.getHttpServer())
        .post('/api/products'))
        .send({
          name: 'E2E Coconut Milk',
          size: '500g',
          initialPriceRupees: 155,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.currentPricePaise).toBe(15500);
      expect(res.body.currentPriceRupees).toBe(155);
      testProductId = res.body.id;
    });

    it('POST /api/products - should reject duplicate SKU', async () => {
      const sku = `SKU-E2E-${Date.now()}`;
      await authReq(request(app.getHttpServer())
        .post('/api/products'))
        .send({
          name: 'Unique SKU Product 1',
          size: '1kg',
          sku,
          initialPriceRupees: 290,
        })
        .expect(201);

      const res = await authReq(request(app.getHttpServer())
        .post('/api/products'))
        .send({
          name: 'Unique SKU Product 2',
          size: '1kg',
          sku,
          initialPriceRupees: 300,
        })
        .expect(400);

      expect(res.body.message).toContain('already exists');
    });

    it('POST /api/products/:id/prices - should update product price independently', async () => {
      const res = await authReq(request(app.getHttpServer())
        .post(`/api/products/${testProductId}/prices`))
        .send({
          priceRupees: 165,
        })
        .expect(201);

      expect(res.body.pricePaise).toBe(16500);
    });

    it('GET /api/products/:id/prices - should return audit price history', async () => {
      const res = await authReq(request(app.getHttpServer())
        .get(`/api/products/${testProductId}/prices`))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
      expect(res.body[0].pricePaise).toBe(16500);
      expect(res.body[1].pricePaise).toBe(15500);
    });
  });

  describe('Deliveries & Financial Integrity', () => {
    it('POST /api/deliveries/confirm - should record an itemized delivery with partial payment', async () => {
      const idempotencyKey = `e2e-idem-${Date.now()}`;
      const res = await authReq(request(app.getHttpServer())
        .post('/api/deliveries/confirm'))
        .send({
          customerId: testCustomerId,
          outerBoxes: 5,
          isItemized: true,
          items: [
            {
              productId: testProductId,
              quantity: 10,
              unitPriceRupees: 165,
            },
          ],
          payments: [
            {
              amountRupees: 650,
              method: 'UPI',
              provider: 'GPay',
            },
          ],
          idempotencyKey,
          confirmed: true,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.totalAmountRupees).toBe(1650);
      expect(res.body.totalPaidRupees).toBe(650);
      expect(res.body.outstandingRupees).toBe(1000);
      expect(res.body.paymentStatus).toBe('PARTIALLY_PAID');
      expect(res.body.items).toHaveLength(1);
      expect(res.body.payments).toHaveLength(1);
      testDeliveryId = res.body.id;
    });

    it('POST /api/deliveries/confirm - should return existing delivery on duplicate idempotency key', async () => {
      const idempotencyKey = `e2e-idem-dup-${Date.now()}`;
      const first = await authReq(request(app.getHttpServer())
        .post('/api/deliveries/confirm'))
        .send({
          customerId: testCustomerId,
          totalAmountRupees: 1000,
          payments: [],
          idempotencyKey,
          confirmed: true,
        })
        .expect(201);

      const second = await authReq(request(app.getHttpServer())
        .post('/api/deliveries/confirm'))
        .send({
          customerId: testCustomerId,
          totalAmountRupees: 1000,
          payments: [],
          idempotencyKey,
          confirmed: true,
        })
        .expect(201);

      expect(second.body.id).toBe(first.body.id);
    });

    it('POST /api/deliveries/:id/payments - should record additional payment and update balance', async () => {
      const res = await authReq(request(app.getHttpServer())
        .post(`/api/deliveries/${testDeliveryId}/payments`))
        .send({
          amountRupees: 1000,
          method: 'CASH',
        })
        .expect(201);

      expect(res.body.totalAmountRupees).toBe(1650);
      expect(res.body.totalPaidRupees).toBe(1650);
      expect(res.body.outstandingRupees).toBe(0);
      expect(res.body.paymentStatus).toBe('PAID');
      expect(res.body.payments).toHaveLength(2);
    });

    it('POST /api/deliveries/:id/payments - should reject excess payment exceeding balance', async () => {
      const res = await authReq(request(app.getHttpServer())
        .post(`/api/deliveries/${testDeliveryId}/payments`))
        .send({
          amountRupees: 500,
          method: 'CASH',
        })
        .expect(400);

      expect(res.body.message).toContain('exceeds remaining outstanding balance');
    });

    it('GET /api/customers/:id/balance - should reflect updated balance from actual transactions', async () => {
      const res = await authReq(request(app.getHttpServer())
        .get(`/api/customers/${testCustomerId}/balance`))
        .expect(200);

      expect(res.body.totalDeliveries).toBe(2);
      expect(res.body.totalBilledRupees).toBe(2650);
      expect(res.body.totalPaidRupees).toBe(1650);
      expect(res.body.outstandingRupees).toBe(1000);
      expect(res.body.paymentStatus).toBe('PARTIALLY_PAID');
    });
  });

  describe('Financial Reports APIs', () => {
    it('GET /api/reports/summary - should return aggregated revenue, collected, and outstanding', async () => {
      const res = await authReq(request(app.getHttpServer())
        .get('/api/reports/summary'))
        .expect(200);

      expect(res.body.totalDeliveries).toBeGreaterThanOrEqual(1);
      expect(res.body.totalDeliveryValueRupees).toBeGreaterThan(0);
      expect(res.body.totalPaymentsReceivedRupees).toBeGreaterThan(0);
      expect(res.body.totalOutstandingCreditRupees).toBeGreaterThanOrEqual(0);
    });

    it('GET /api/reports/outstanding - should list customers with outstanding balance', async () => {
      const res = await authReq(request(app.getHttpServer())
        .get('/api/reports/outstanding'))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const found = res.body.find((c: { customerId: string }) => c.customerId === testCustomerId);
      expect(found).toBeDefined();
      expect(found.outstandingRupees).toBe(1000);
    });

    it('GET /api/reports/payments - should return collections by payment method', async () => {
      const res = await authReq(request(app.getHttpServer())
        .get('/api/reports/payments'))
        .expect(200);

      expect(res.body.byMethod).toBeDefined();
      expect(res.body.totalPaymentsRupees).toBeGreaterThan(0);
    });
  });
});
