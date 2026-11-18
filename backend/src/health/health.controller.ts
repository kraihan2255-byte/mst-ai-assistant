import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AiService } from '../ai/ai.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Public } from '../auth/decorators/public.decorator.js';

@Controller('health')
export class HealthController {
  constructor(
    private readonly aiService: AiService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get()
  async getHealth(@Res() res: Response): Promise<void> {
    const ollamaHealth = await this.aiService.checkHealth();

    let dbReachable = false;
    let dbLatencyMs: number | null = null;
    let dbError: string | null = null;

    try {
      const dbStart = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - dbStart;
      dbReachable = true;
    } catch (err: unknown) {
      dbError = err instanceof Error ? err.message : 'Database check failed';
    }

    const isHealthy = dbReachable && ollamaHealth.reachable;

    const payload = {
      status: isHealthy ? 'ok' : dbReachable ? 'degraded' : 'unhealthy',
      service: 'mst-tengapal-backend',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: dbReachable ? 'reachable' : 'unreachable',
        latencyMs: dbLatencyMs,
        ...(dbError ? { error: dbError } : {}),
      },
      ollama: {
        status: ollamaHealth.reachable ? 'reachable' : 'unreachable',
        baseUrl: ollamaHealth.baseUrl,
        model: ollamaHealth.model,
        modelAvailable: ollamaHealth.modelAvailable,
        latencyMs: ollamaHealth.latencyMs,
        ...(ollamaHealth.error ? { error: ollamaHealth.error } : {}),
      },
    };

    res
      .status(dbReachable ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
      .json(payload);
  }
}
