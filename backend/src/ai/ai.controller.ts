import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AiService } from './ai.service.js';
import { DeliveriesService } from '../deliveries/deliveries.service.js';
import { ParseCommandDto } from './dto/parse-command.dto.js';
import { DeliveryDraftDto } from './dto/delivery-draft.dto.js';
import type {
  DeliveryDraft,
  DeliveryValidationResult,
} from '../common/interfaces/delivery.interface.js';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly deliveriesService: DeliveriesService,
  ) {}

  /**
   * Accepts natural language delivery message and returns an extracted DeliveryDraft.
   */
  @Post('parse-command')
  @HttpCode(HttpStatus.OK)
  async parseCommand(
    @Body() parseCommandDto: ParseCommandDto,
  ): Promise<DeliveryDraft> {
    return this.aiService.parseDeliveryCommand(parseCommandDto.message);
  }

  /**
   * Accepts a delivery draft and returns deterministic validation and financial calculations.
   */
  @Post('validate-delivery')
  @HttpCode(HttpStatus.OK)
  validateDelivery(
    @Body() draftDto: DeliveryDraftDto,
  ): DeliveryValidationResult {
    return this.deliveriesService.validateDeliveryDraft(draftDto);
  }
}
