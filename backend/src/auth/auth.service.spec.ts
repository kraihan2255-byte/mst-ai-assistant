import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from './auth.service.js';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let authService: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        upsert: vi.fn(),
      },
    } as unknown as PrismaService;

    jwtService = new JwtService({
      secret: 'test-secret-key-for-unit-tests-2026',
      signOptions: { expiresIn: '1h' },
    });

    authService = new AuthService(prisma, jwtService);
  });

  it('hashes passwords with Argon2id and verifies match', async () => {
    const rawPassword = 'SuperSecretPassword123!';
    const passwordHash = await authService.hashPassword(rawPassword);

    expect(passwordHash).toMatch(/^\$argon2id\$/);

    const isMatch = await authService.verifyPassword(rawPassword, passwordHash);
    expect(isMatch).toBe(true);

    const isWrongMatch = await authService.verifyPassword('WrongPassword', passwordHash);
    expect(isWrongMatch).toBe(false);
  });

  it('validates user with correct credentials and returns payload', async () => {
    const rawPassword = 'ValidPassword88';
    const passwordHash = await authService.hashPassword(rawPassword);

    vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
      id: 'user-uuid-1',
      username: 'admin',
      passwordHash,
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const user = await authService.validateUser('admin', rawPassword);
    expect(user).toEqual({
      id: 'user-uuid-1',
      username: 'admin',
      role: 'ADMIN',
    });
  });

  it('rejects validation when username does not exist', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce(null);

    await expect(
      authService.validateUser('unknown', 'anypassword'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects validation when password is incorrect', async () => {
    const correctHash = await authService.hashPassword('CorrectPassword99');

    vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
      id: 'user-uuid-1',
      username: 'admin',
      passwordHash: correctHash,
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      authService.validateUser('admin', 'WrongPassword!'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('creates and verifies JWT tokens with proper claims', async () => {
    const userPayload = {
      id: 'u-123',
      username: 'manager',
      role: 'ADMIN' as const,
    };

    const token = await authService.createToken(userPayload);
    expect(typeof token).toBe('string');

    const decoded = await authService.verifyToken(token);
    expect(decoded.id).toBe('u-123');
    expect(decoded.username).toBe('manager');
    expect(decoded.role).toBe('ADMIN');
  });

  it('rejects invalid or tampered JWT tokens', async () => {
    await expect(
      authService.verifyToken('invalid.jwt.token.string'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('validates default passcode PIN and returns primary admin', async () => {
    vi.spyOn(prisma.user, 'findFirst').mockResolvedValueOnce({
      id: 'admin-uuid-1',
      username: 'raihan',
      passwordHash: 'dummy-hash',
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const user = await authService.validatePin('1234');
    expect(user).toEqual({
      id: 'admin-uuid-1',
      username: 'raihan',
      role: 'ADMIN',
    });
  });

  it('rejects incorrect passcode PIN', async () => {
    await expect(authService.validatePin('9999')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('allows quick unlock returning primary admin', async () => {
    vi.spyOn(prisma.user, 'findFirst').mockResolvedValueOnce({
      id: 'admin-uuid-1',
      username: 'raihan',
      passwordHash: 'dummy-hash',
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const user = await authService.quickUnlock();
    expect(user.username).toBe('raihan');
    expect(user.role).toBe('ADMIN');
  });

  it('throws UnauthorizedException if no admin account exists in database', async () => {
    vi.spyOn(prisma.user, 'findFirst').mockResolvedValueOnce(null);

    await expect(authService.getPrimaryAdmin()).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
