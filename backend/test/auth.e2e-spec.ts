import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AuthService } from '../src/auth/auth.service.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';

describe('Authentication & Security E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;
  const testUsername = `testadmin_${Date.now()}`;
  const testPassword = 'Password123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    prisma = app.get(PrismaService);
    authService = app.get(AuthService);

    // Create a known test user in test DB
    const passwordHash = await authService.hashPassword(testPassword);
    await prisma.user.create({
      data: {
        username: testUsername,
        passwordHash,
        role: 'ADMIN',
      },
    });
  }, 30000);

  afterAll(async () => {
    // Clean up test user
    try {
      await prisma.user.deleteMany({
        where: { username: testUsername },
      });
    } catch {
      // Ignore
    }
    await app.close();
  });

  describe('POST /api/auth/login', () => {
    it('should reject invalid credentials with 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          username: testUsername,
          password: 'WrongPassword99',
        })
        .expect(401);

      expect(res.body.message).toContain('Invalid username or password');
    });

    it('should log in successfully, set HTTP-only cookie, and return user payload', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          username: testUsername,
          password: testPassword,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.user.username).toBe(testUsername);
      expect(res.body.user.role).toBe('ADMIN');
      expect(res.body.token).toBeDefined();

      // Check HTTP-only cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('mst_auth_token');
      expect(cookies[0]).toContain('HttpOnly');
    });
  });

  describe('GET /api/auth/me & Session Verification', () => {
    it('should return user profile when authenticated with cookie', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          username: testUsername,
          password: testPassword,
        })
        .expect(200);

      const cookie = loginRes.headers['set-cookie'];

      const meRes = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', cookie)
        .expect(200);

      expect(meRes.body.user.username).toBe(testUsername);
      expect(meRes.body.user.role).toBe('ADMIN');
    });

    it('should reject unauthenticated profile request with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .expect(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear the session cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .expect(200);

      expect(res.body.success).toBe(true);
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('mst_auth_token=;');
    });
  });
});
