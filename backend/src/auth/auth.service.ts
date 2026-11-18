import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { hash, verify } from '@node-rs/argon2';
import { PrismaService } from '../prisma/prisma.service.js';
import type { UserRole } from '@prisma/client';

export interface UserPayload {
  id: string;
  username: string;
  role: UserRole;
}

export interface JwtPayload {
  sub: string;
  username: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService?: ConfigService,
  ) {}

  async getPrimaryAdmin(): Promise<UserPayload> {
    const admin = await this.prisma.user.findFirst({
      where: { role: 'ADMIN' },
      orderBy: { createdAt: 'asc' },
    });

    if (!admin) {
      throw new UnauthorizedException('No admin account found to authenticate.');
    }

    return {
      id: admin.id,
      username: admin.username,
      role: admin.role,
    };
  }

  async validatePin(pin: string): Promise<UserPayload> {
    if (!pin || typeof pin !== 'string') {
      throw new UnauthorizedException('Passcode PIN is required');
    }

    const configuredPin =
      this.configService?.get<string>('auth.pin') ||
      process.env.APP_PIN ||
      '1234';

    if (pin.trim() !== configuredPin.trim()) {
      throw new UnauthorizedException('Incorrect passcode PIN. Please try again.');
    }

    return this.getPrimaryAdmin();
  }

  async quickUnlock(): Promise<UserPayload> {
    const isQuickAccessAllowed =
      this.configService?.get<boolean>('auth.quickAccess') ??
      (process.env.QUICK_ACCESS_ENABLED !== 'false');

    if (!isQuickAccessAllowed) {
      throw new UnauthorizedException('Quick unlock is disabled on this server');
    }

    return this.getPrimaryAdmin();
  }

  async hashPassword(password: string): Promise<string> {
    return hash(password);
  }

  async verifyPassword(password: string, hashStr: string): Promise<boolean> {
    try {
      return await verify(hashStr, password);
    } catch (err: unknown) {
      this.logger.error(`Error verifying password hash: ${(err as Error).message}`);
      return false;
    }
  }

  async validateUser(username: string, pass: string): Promise<UserPayload> {
    const user = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase().trim() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const isValid = await this.verifyPassword(pass, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid username or password');
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role,
    };
  }

  async createToken(user: UserPayload): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };
    return this.jwtService.signAsync(payload);
  }

  async verifyToken(token: string): Promise<UserPayload> {
    try {
      const decoded = await this.jwtService.verifyAsync<JwtPayload>(token);
      return {
        id: decoded.sub,
        username: decoded.username,
        role: decoded.role,
      };
    } catch {
      throw new UnauthorizedException('Session expired or invalid');
    }
  }

  async getUserById(id: string): Promise<UserPayload> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, role: true },
    });

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    return user;
  }
}
