import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiService } from './ai.service.js';
import { DeliveriesService } from '../deliveries/deliveries.service.js';
import { ParseCommandDto } from './dto/parse-command.dto.js';
import { DeliveryDraftDto } from './dto/delivery-draft.dto.js';
import type {
  DeliveryDraft,
  DeliveryValidationResult,
} from '../common/interfaces/delivery.interface.js';

export interface UploadedAudioFile {
  buffer: Buffer;
  mimetype: string;
  originalname?: string;
  size?: number;
}

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
   * Transcribes an uploaded voice audio clip into text using Whisper Large v3.
   */
  @Post('transcribe')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }),
  )
  async transcribeAudio(
    @UploadedFile() file?: UploadedAudioFile,
  ): Promise<{ text: string }> {
    if (!file) {
      throw new BadRequestException('No audio file provided in "file" field.');
    }
    const text = await this.aiService.transcribeAudio(
      file.buffer,
      file.mimetype,
      file.originalname,
    );
    return { text };
  }

  /**
   * Transcribes a voice clip and immediately parses it into an extracted DeliveryDraft in one call.
   */
  @Post('parse-voice')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }),
  )
  async parseVoice(
    @UploadedFile() file?: UploadedAudioFile,
  ): Promise<{ transcript: string; draft: DeliveryDraft }> {
    if (!file) {
      throw new BadRequestException('No audio file provided in "file" field.');
    }
    return this.aiService.parseVoiceCommand(
      file.buffer,
      file.mimetype,
      file.originalname,
    );
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
