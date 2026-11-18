import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService, type UserPayload } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { PinLoginDto } from './dto/pin-login.dto.js';
import { Public } from './decorators/public.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateUser(
      loginDto.username,
      loginDto.password,
    );

    const token = await this.authService.createToken(user);
    const isSecure = this.configService.get<boolean>('auth.cookieSecure') ?? false;

    res.cookie('mst_auth_token', token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days for mobile standalone ease
    });

    return {
      success: true,
      user,
      token, // Also return token for clients that prefer Bearer Authorization header
    };
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @Post('pin-login')
  @HttpCode(HttpStatus.OK)
  async pinLogin(
    @Body() pinDto: PinLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validatePin(pinDto.pin);
    const token = await this.authService.createToken(user);
    const isSecure = this.configService.get<boolean>('auth.cookieSecure') ?? false;

    res.cookie('mst_auth_token', token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
    });

    return {
      success: true,
      user,
      token,
    };
  }

  @Public()
  @Post('quick-unlock')
  @HttpCode(HttpStatus.OK)
  async quickUnlock(@Res({ passthrough: true }) res: Response) {
    const user = await this.authService.quickUnlock();
    const token = await this.authService.createToken(user);
    const isSecure = this.configService.get<boolean>('auth.cookieSecure') ?? false;

    res.cookie('mst_auth_token', token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
    });

    return {
      success: true,
      user,
      token,
    };
  }

  @Public()
  @Get('config')
  getAuthConfig() {
    return {
      pinLoginEnabled: true,
      quickUnlockEnabled: this.configService.get<boolean>('auth.quickAccess') ?? true,
      defaultPinHint: '1234',
    };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    const isSecure = this.configService.get<boolean>('auth.cookieSecure') ?? false;

    res.clearCookie('mst_auth_token', {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
    });

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  @Get('me')
  async getProfile(@Req() req: Request & { user: UserPayload }) {
    const user = await this.authService.getUserById(req.user.id);
    return {
      user,
    };
  }
}
