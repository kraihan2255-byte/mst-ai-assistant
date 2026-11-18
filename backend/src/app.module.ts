import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { ProductsModule } from './products/products.module.js';
import { DeliveriesModule } from './deliveries/deliveries.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { AiModule } from './ai/ai.module.js';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './auth/auth.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PrismaModule,
    AuthModule,
    CustomersModule,
    ProductsModule,
    DeliveriesModule,
    ReportsModule,
    AiModule,
    HealthModule,
  ],
})
export class AppModule {}
