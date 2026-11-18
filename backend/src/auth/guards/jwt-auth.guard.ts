import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { AuthService } from '../auth.service.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication required to access this resource');
    }

    // CSRF safeguard for cookie-based browser sessions
    if (request.cookies?.mst_auth_token && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      const customHeader = request.headers['x-requested-with'] || request.headers['x-csrf-protection'];
      const isJson = request.headers['content-type']?.includes('application/json');
      if (!customHeader && !isJson) {
        throw new UnauthorizedException('Missing CSRF validation header');
      }
    }

    const user = await this.authService.verifyToken(token);
    (request as unknown as { user: unknown }).user = user;
    return true;
  }

  private extractToken(request: Request): string | null {
    // 1. Check HTTP-only cookie first
    if (request.cookies && request.cookies.mst_auth_token) {
      return request.cookies.mst_auth_token;
    }

    // 2. Fall back to Bearer Authorization header
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7).trim();
    }

    return null;
  }
}
