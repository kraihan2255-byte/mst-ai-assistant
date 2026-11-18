import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { AuthService } from '../src/auth/auth.service.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import type {
  DeliveryDraft,
  DeliveryValidationResult,
} from '../src/common/interfaces/delivery.interface.js';

describe('MST Tengapal Backend E2E Tests (with local Ollama)', () => {
  let app: INestApplication;
  let authToken: string;

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
      id: 'e2e-test-admin-uuid',
      username: 'e2e-admin',
      role: 'ADMIN',
    });
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('Security Guard', () => {
    it('should reject unauthenticated requests to protected endpoints with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/ai/validate-delivery')
        .send({})
        .expect(401);
    });
  });

  describe('GET /api/health', () => {
    it('should return 200 with service status and Ollama details without auth', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('mst-tengapal-backend');
      expect(response.body.ollama.status).toBe('reachable');
      expect(response.body.ollama.model).toBe('qwen3:4b');
      expect(response.body.ollama.modelAvailable).toBe(true);
    });
  });

  describe('POST /api/ai/validate-delivery', () => {
    it('should validate and calculate partial payment delivery correctly', async () => {
      const draft: DeliveryDraft = {
        action: 'record_delivery',
        recipient_name: 'ABC Catering',
        boxes_delivered: 10,
        total_amount: 5000,
        payments: [
          {
            amount: 2000,
            method: 'UPI',
            provider: 'GPay',
          },
        ],
        delivery_date: null,
        area_name: null,
        notes: null,
      };

      const response = await request(app.getHttpServer())
        .post('/api/ai/validate-delivery')
        .set('Authorization', `Bearer ${authToken}`)
        .send(draft)
        .expect(200);

      const result = response.body as DeliveryValidationResult;
      expect(result.valid).toBe(true);
      expect(result.total_amount).toBe(5000);
      expect(result.total_received).toBe(2000);
      expect(result.outstanding).toBe(3000);
      expect(result.payment_status).toBe('PARTIALLY_PAID');
      expect(result.requires_confirmation).toBe(true);
      expect(result.missing_fields).toEqual([]);
    });

    it('should reject draft where payment exceeds total amount', async () => {
      const draft: DeliveryDraft = {
        action: 'record_delivery',
        recipient_name: 'ABC Catering',
        boxes_delivered: 10,
        total_amount: 5000,
        payments: [
          {
            amount: 7000,
            method: 'UPI',
            provider: 'GPay',
          },
        ],
        delivery_date: null,
        area_name: null,
        notes: null,
      };

      const response = await request(app.getHttpServer())
        .post('/api/ai/validate-delivery')
        .set('Authorization', `Bearer ${authToken}`)
        .send(draft)
        .expect(200);

      const result = response.body as DeliveryValidationResult;
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.requires_confirmation).toBe(true);
    });
  });

  describe('POST /api/ai/parse-command (Local Ollama Inference)', () => {
    it('Test 1: Partial payment extraction', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/ai/parse-command')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message:
            'I delivered 10 boxes to ABC Catering for 5000 rupees and received 2000 through GPay.',
        })
        .expect(200);

      const draft = response.body as DeliveryDraft;
      expect(draft.action).toBe('record_delivery');
      expect(draft.recipient_name).toBe('ABC Catering');
      expect(draft.boxes_delivered).toBe(10);
      expect(draft.total_amount).toBe(5000);
      expect(draft.payments).toHaveLength(1);
      expect(draft.payments[0].amount).toBe(2000);
      expect(draft.payments[0].method).toBe('UPI');

      // Pass to validation service to verify complete pipeline
      const valRes = await request(app.getHttpServer())
        .post('/api/ai/validate-delivery')
        .set('Authorization', `Bearer ${authToken}`)
        .send(draft)
        .expect(200);

      const result = valRes.body as DeliveryValidationResult;
      expect(result.valid).toBe(true);
      expect(result.outstanding).toBe(3000);
      expect(result.payment_status).toBe('PARTIALLY_PAID');
    }, 30000);

    it('Test 2: Full cash payment extraction', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/ai/parse-command')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message:
            'Delivered 5 boxes to ABC Supermarket for ₹3,000. Received the full amount in cash.',
        })
        .expect(200);

      const draft = response.body as DeliveryDraft;
      expect(draft.action).toBe('record_delivery');
      expect(draft.recipient_name).toBe('ABC Supermarket');
      expect(draft.boxes_delivered).toBe(5);
      expect(draft.total_amount).toBe(3000);
      expect(draft.payments[0].amount).toBe(3000);
      expect(draft.payments[0].method).toBe('CASH');

      const valRes = await request(app.getHttpServer())
        .post('/api/ai/validate-delivery')
        .set('Authorization', `Bearer ${authToken}`)
        .send(draft)
        .expect(200);

      const result = valRes.body as DeliveryValidationResult;
      expect(result.valid).toBe(true);
      expect(result.outstanding).toBe(0);
      expect(result.payment_status).toBe('PAID');
    }, 30000);

    it('Test 3: Unpaid delivery extraction', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/ai/parse-command')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message:
            'Delivered 8 boxes to XYZ Catering for ₹4,000. No payment received.',
        })
        .expect(200);

      const draft = response.body as DeliveryDraft;
      expect(draft.action).toBe('record_delivery');
      expect(draft.recipient_name).toBe('XYZ Catering');
      expect(draft.boxes_delivered).toBe(8);
      expect(draft.total_amount).toBe(4000);
      expect(draft.payments).toEqual([]);

      const valRes = await request(app.getHttpServer())
        .post('/api/ai/validate-delivery')
        .set('Authorization', `Bearer ${authToken}`)
        .send(draft)
        .expect(200);

      const result = valRes.body as DeliveryValidationResult;
      expect(result.valid).toBe(true);
      expect(result.total_received).toBe(0);
      expect(result.outstanding).toBe(4000);
      expect(result.payment_status).toBe('UNPAID');
    }, 30000);

    it('Test 4: Missing amount extraction', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/ai/parse-command')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Delivered 10 boxes to ABC Catering.',
        })
        .expect(200);

      const draft = response.body as DeliveryDraft;
      expect(draft.recipient_name).toBe('ABC Catering');
      expect(draft.boxes_delivered).toBe(10);
      expect(draft.total_amount).toBeNull();

      const valRes = await request(app.getHttpServer())
        .post('/api/ai/validate-delivery')
        .set('Authorization', `Bearer ${authToken}`)
        .send(draft)
        .expect(200);

      const result = valRes.body as DeliveryValidationResult;
      expect(result.valid).toBe(false);
      expect(result.missing_fields).toContain('total_amount');
    }, 30000);

    it('should validate request body and reject empty message with 400 Bad Request', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/ai/parse-command')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ message: '' })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(response.body.error).toBe('Bad Request');
    });
  });
});
