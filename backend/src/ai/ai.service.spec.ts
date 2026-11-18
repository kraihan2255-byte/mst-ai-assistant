import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import {
  BadGatewayException,
  GatewayTimeoutException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AiService } from './ai.service.js';

describe('AiService', () => {
  let service: AiService;
  let configService: ConfigService;
  const originalFetch = global.fetch;

  beforeEach(() => {
    configService = new ConfigService({
      ollama: {
        baseUrl: 'http://localhost:11434',
        model: 'qwen3:4b',
        timeoutMs: 5000,
      },
    });
    service = new AiService(configService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('checkHealth', () => {
    it('should report healthy when Ollama is running and model exists', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [{ name: 'qwen3:4b', model: 'qwen3:4b' }],
        }),
      } as unknown as Response);

      const health = await service.checkHealth();
      expect(health.reachable).toBe(true);
      expect(health.modelAvailable).toBe(true);
      expect(health.model).toBe('qwen3:4b');
      expect(health.latencyMs).toBeTypeOf('number');
    });

    it('should report modelAvailable: false when model is missing from tags', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [{ name: 'llama3:8b', model: 'llama3:8b' }],
        }),
      } as unknown as Response);

      const health = await service.checkHealth();
      expect(health.reachable).toBe(true);
      expect(health.modelAvailable).toBe(false);
    });

    it('should report unreachable when Ollama connection fails', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const health = await service.checkHealth();
      expect(health.reachable).toBe(false);
      expect(health.modelAvailable).toBe(false);
      expect(health.error).toContain('Connection refused');
    });
  });

  describe('parseDeliveryCommand', () => {
    it('should extract partial payment draft correctly', async () => {
      const mockAiResponse = {
        model: 'qwen3:4b',
        created_at: new Date().toISOString(),
        message: {
          role: 'assistant',
          content: JSON.stringify({
            action: 'record_delivery',
            recipient_name: 'ABC Catering',
            boxes_delivered: 10,
            total_amount: 5000,
            payments: [
              {
                amount: 2000,
                method: 'UPI',
                provider: 'GPay',
              },
            ],
            delivery_date: null,
            area_name: null,
            notes: null,
          }),
        },
        done: true,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockAiResponse,
      } as unknown as Response);

      const draft = await service.parseDeliveryCommand(
        'I delivered 10 boxes to ABC Catering for 5000 rupees and received 2000 through GPay.',
      );

      expect(draft.action).toBe('record_delivery');
      expect(draft.recipient_name).toBe('ABC Catering');
      expect(draft.boxes_delivered).toBe(10);
      expect(draft.total_amount).toBe(5000);
      expect(draft.payments).toHaveLength(1);
      expect(draft.payments[0].amount).toBe(2000);
      expect(draft.payments[0].method).toBe('UPI');
      expect(draft.payments[0].provider).toBe('GPay');
    });

    it('should extract cash payment and normalize method', async () => {
      const mockAiResponse = {
        model: 'qwen3:4b',
        message: {
          role: 'assistant',
          content: JSON.stringify({
            action: 'record_delivery',
            recipient_name: 'ABC Supermarket',
            boxes_delivered: 5,
            total_amount: 3000,
            payments: [
              {
                amount: 3000,
                method: 'cash',
                provider: null,
              },
            ],
            delivery_date: null,
            area_name: null,
            notes: null,
          }),
        },
        done: true,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockAiResponse,
      } as unknown as Response);

      const draft = await service.parseDeliveryCommand(
        'Delivered 5 boxes to ABC Supermarket for ₹3,000. Received the full amount in cash.',
      );

      expect(draft.recipient_name).toBe('ABC Supermarket');
      expect(draft.payments[0].method).toBe('CASH');
      expect(draft.payments[0].provider).toBeNull();
    });

    it('should sanitize payments by dropping invalid null/0 payment amounts', async () => {
      const mockAiResponse = {
        model: 'qwen3:4b',
        message: {
          role: 'assistant',
          content: JSON.stringify({
            action: 'record_delivery',
            recipient_name: 'XYZ Catering',
            boxes_delivered: 8,
            total_amount: 4000,
            payments: [
              {
                amount: null,
                method: 'UPI',
                provider: 'GPay',
              },
              {
                amount: 0,
                method: 'CASH',
                provider: null,
              },
            ],
            delivery_date: null,
            area_name: null,
            notes: 'No payment received',
          }),
        },
        done: true,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockAiResponse,
      } as unknown as Response);

      const draft = await service.parseDeliveryCommand(
        'Delivered 8 boxes to XYZ Catering for ₹4,000. No payment received.',
      );

      expect(draft.recipient_name).toBe('XYZ Catering');
      expect(draft.payments).toEqual([]);
      expect(draft.notes).toBe('No payment received');
    });

    it('should throw ServiceUnavailableException when Ollama cannot be reached', async () => {
      global.fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed'));

      await expect(
        service.parseDeliveryCommand('Delivered 10 boxes'),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should throw GatewayTimeoutException when Ollama times out', async () => {
      const timeoutError = new Error('The operation was aborted');
      timeoutError.name = 'TimeoutError';
      global.fetch = vi.fn().mockRejectedValue(timeoutError);

      await expect(
        service.parseDeliveryCommand('Delivered 10 boxes'),
      ).rejects.toThrow(GatewayTimeoutException);
    });

    it('should throw BadGatewayException when Ollama returns non-200 HTTP status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        text: async () => 'Service down',
      } as unknown as Response);

      await expect(
        service.parseDeliveryCommand('Delivered 10 boxes'),
      ).rejects.toThrow(BadGatewayException);
    });

    it('should throw InternalServerErrorException when response is completely unparseable', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          model: 'qwen3:4b',
          message: {
            role: 'assistant',
            content: 'Not a JSON text at all',
          },
        }),
      } as unknown as Response);

      await expect(
        service.parseDeliveryCommand('Delivered 10 boxes'),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should recover JSON wrapped in markdown code blocks', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          model: 'qwen3:4b',
          message: {
            role: 'assistant',
            content:
              '```json\n{"action": "record_delivery", "recipient_name": "Wrap Store", "boxes_delivered": 2, "total_amount": 100, "payments": []}\n```',
          },
        }),
      } as unknown as Response);

      const draft = await service.parseDeliveryCommand(
        'Delivered 2 boxes to Wrap Store for 100',
      );
      expect(draft.recipient_name).toBe('Wrap Store');
      expect(draft.boxes_delivered).toBe(2);
      expect(draft.total_amount).toBe(100);
    });
  });
});
