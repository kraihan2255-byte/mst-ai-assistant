import { Module } from '@nestjs/common';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { DeliveriesModule } from '../deliveries/deliveries.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { ProductsModule } from '../products/products.module.js';

@Module({
  imports: [DeliveriesModule, CustomersModule, ProductsModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
