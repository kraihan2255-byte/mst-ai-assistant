import { Module } from '@nestjs/common';
import {
  CustomerDeliveriesController,
  DeliveriesController,
} from './deliveries.controller.js';
import { DeliveriesService } from './deliveries.service.js';
import { ProductsModule } from '../products/products.module.js';

@Module({
  imports: [ProductsModule],
  controllers: [DeliveriesController, CustomerDeliveriesController],
  providers: [DeliveriesService],
  exports: [DeliveriesService],
})
export class DeliveriesModule {}
