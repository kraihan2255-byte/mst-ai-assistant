import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { AiModule } from '../ai/ai.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [AiModule, PrismaModule],
  controllers: [HealthController],
})
export class HealthModule {}
