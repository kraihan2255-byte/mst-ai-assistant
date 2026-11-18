import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  DeliveriesService,
  DeliveryDetailResponse,
} from './deliveries.service.js';
import { ConfirmDeliveryDto } from './dto/confirm-delivery.dto.js';
import { RecordPaymentDto } from './dto/record-payment.dto.js';
import { ValidateDeliveryDto } from './dto/validate-delivery.dto.js';
import { DeliveryQueryDto } from './dto/delivery-query.dto.js';
import type { DeliveryValidationResult } from '../common/interfaces/delivery.interface.js';

@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  /**
   * Phase 1 in-memory validation endpoint (preserved).
   */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  validateDelivery(
    @Body() draft: ValidateDeliveryDto,
  ): DeliveryValidationResult {
    return this.deliveriesService.validateDeliveryDraft(draft);
  }

  /**
   * Phase 2: Explicitly confirms and persists a delivery with line items and payments.
   */
  @Post('confirm')
  @HttpCode(HttpStatus.CREATED)
  confirmDelivery(
    @Body() dto: ConfirmDeliveryDto,
  ): Promise<DeliveryDetailResponse> {
    return this.deliveriesService.confirmDelivery(dto);
  }

  @Get()
  findAll(@Query() query: DeliveryQueryDto): Promise<DeliveryDetailResponse[]> {
    return this.deliveriesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<DeliveryDetailResponse> {
    return this.deliveriesService.findOne(id);
  }

  @Post(':id/payments')
  @HttpCode(HttpStatus.CREATED)
  recordPayment(
    @Param('id') id: string,
    @Body() dto: RecordPaymentDto,
  ): Promise<DeliveryDetailResponse> {
    return this.deliveriesService.recordPayment(id, dto);
  }
}

/**
 * Controller mapping GET /api/customers/:id/deliveries
 */
@Controller('customers')
export class CustomerDeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get(':id/deliveries')
  findByCustomer(@Param('id') id: string): Promise<DeliveryDetailResponse[]> {
    return this.deliveriesService.findByCustomer(id);
  }
}
