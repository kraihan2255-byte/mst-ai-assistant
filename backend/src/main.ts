import * as path from 'node:path';
import * as fs from 'node:fs';
import express from 'express';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 3000;

  // Cookie parser for secure session cookies
  app.use(cookieParser());

  // Enable CORS for frontend integration
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Set global API route prefix
  app.setGlobalPrefix('api');

  // Input validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Global exception filter for secure error handling
  app.useGlobalFilters(new HttpExceptionFilter());

  // Serve static frontend SPA build if present (for cloud/Docker/Railway deployments)
  const candidateFrontendPaths = [
    process.env.FRONTEND_DIR,
    path.resolve(process.cwd(), '../frontend/dist'),
    path.resolve(process.cwd(), 'frontend/dist'),
    path.resolve(process.cwd(), 'public'),
  ].filter(Boolean) as string[];

  let frontendDist: string | null = null;
  for (const p of candidateFrontendPaths) {
    if (fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))) {
      frontendDist = p;
      break;
    }
  }

  if (frontendDist) {
    logger.log(`Serving frontend static SPA from: ${frontendDist}`);
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.use(express.static(frontendDist));
    expressApp.use(
      (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
      ) => {
        if (
          (req.method !== 'GET' && req.method !== 'HEAD') ||
          req.path.startsWith('/api')
        ) {
          return next();
        }
        res.sendFile(path.join(frontendDist, 'index.html'));
      },
    );
  }

  await app.listen(port, '0.0.0.0');
  logger.log(
    `MST Tengapal AI Backend is running on: http://0.0.0.0:${port}/api`,
  );
  logger.log(`Health check: http://0.0.0.0:${port}/api/health`);
}

await bootstrap();
