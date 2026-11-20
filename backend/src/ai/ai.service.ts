import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  InternalServerErrorException,
  Logger,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  DeliveryDraft,
  PaymentItem,
  PaymentMethod,
} from '../common/interfaces/delivery.interface.js';
import { CustomersService } from '../customers/customers.service.js';
import { ProductsService } from '../products/products.service.js';

interface OllamaTagModel {
  name: string;
  model: string;
}

interface OllamaTagsResponse {
  models?: OllamaTagModel[];
}

interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaChatResponse {
  model: string;
  created_at: string;
  message?: {
    role: string;
    content: string;
  };
  done: boolean;
  done_reason?: string;
  error?: string;
}

export interface MatchedCustomerSummary {
  id: string;
  name: string;
  phone: string | null;
  area: string | null;
}

export interface EnhancedDeliveryDraft extends DeliveryDraft {
  matched_customer?: MatchedCustomerSummary | null;
  requires_customer_selection?: boolean;
  candidate_customers?: MatchedCustomerSummary[];
  confirmation_preview?: {
    customerId: string | null;
    customerName: string | null;
    outerBoxes: number | null;
    totalAmountRupees: number | null;
    payments: PaymentItem[];
    ready_to_confirm: boolean;
  } | null;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly provider: 'ollama' | 'groq' | 'openai';
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly customersService?: CustomersService,
    @Optional() private readonly productsService?: ProductsService,
  ) {
    const aiConfig = this.configService.get('ai');
    this.provider =
      aiConfig?.provider ||
      (this.configService.get<string>('ai.provider') as 'ollama' | 'groq' | 'openai') ||
      'ollama';
    this.apiKey =
      aiConfig?.apiKey ||
      this.configService.get<string>('ai.apiKey') ||
      '';
    this.baseUrl = (
      aiConfig?.baseUrl ||
      this.configService.get<string>('ai.baseUrl') ||
      this.configService.get<string>('ollama.baseUrl') ||
      'http://localhost:11434'
    ).replace(/\/+$/, '');
    this.model =
      aiConfig?.model ||
      this.configService.get<string>('ai.model') ||
      this.configService.get<string>('ollama.model') ||
      'qwen3:4b';
    this.timeoutMs =
      aiConfig?.timeoutMs ||
      this.configService.get<number>('ai.timeoutMs') ||
      this.configService.get<number>('ollama.timeoutMs') ||
      30000;
  }

  getProvider(): string {
    return this.provider;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getModel(): string {
    return this.model;
  }

  /**
   * Health check to test if AI server is reachable and configured model is available.
   */
  async checkHealth(): Promise<{
    reachable: boolean;
    baseUrl: string;
    model: string;
    modelAvailable: boolean;
    latencyMs?: number;
    error?: string;
    provider?: string;
  }> {
    const startTime = Date.now();

    // 1. Cloud AI Provider (Groq / OpenAI / Cloudflare)
    if (this.provider !== 'ollama' && this.apiKey) {
      try {
        const response = await fetch(`${this.baseUrl}/models`, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
          signal: AbortSignal.timeout(5000),
        });

        const latencyMs = Date.now() - startTime;
        if (response.ok) {
          return {
            reachable: true,
            baseUrl: this.baseUrl,
            model: this.model,
            modelAvailable: true,
            latencyMs,
            provider: this.provider,
          };
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Cloud AI health check failed: ${message}`);
      }
    }

    // 2. Local Ollama Provider
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return {
          reachable: false,
          baseUrl: this.baseUrl,
          model: this.model,
          modelAvailable: false,
          error: `Ollama returned HTTP status ${response.status} ${response.statusText}`,
          provider: this.provider,
        };
      }

      const data = (await response.json()) as OllamaTagsResponse;
      const latencyMs = Date.now() - startTime;
      const models = data.models || [];
      const modelAvailable = models.some(
        (m) =>
          m.name === this.model ||
          m.name.startsWith(`${this.model}:`) ||
          m.model === this.model,
      );

      return {
        reachable: true,
        baseUrl: this.baseUrl,
        model: this.model,
        modelAvailable,
        latencyMs,
        provider: this.provider,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Ollama health check failed: ${message}`);
      return {
        reachable: false,
        baseUrl: this.baseUrl,
        model: this.model,
        modelAvailable: false,
        error: `Could not connect to AI service at ${this.baseUrl}: ${message}`,
        provider: this.provider,
      };
    }
  }

  /**
   * Parses natural language command into structured DeliveryDraft using Ollama.
   * If customer service is available, also performs database customer matching
   * and prepares a confirmation preview.
   */
  async parseDeliveryCommand(message: string): Promise<EnhancedDeliveryDraft> {
    const systemPrompt = `You are the AI assistant for MST Tengapal, a coconut milk business.
Your only task is to extract structured delivery information from the user's message into a strict JSON object.

Follow these strict rules:
1. Extract ONLY information explicitly stated by the user.
2. NEVER invent or assume customer names, quantities, amounts, or dates.
3. If an item is missing or not mentioned, set its value to null (or empty array [] for payments).
4. Payments:
   - If no payment was received, or the user says 'no payment' or 'unpaid', or no payment is mentioned: payments MUST be an empty array [].
   - NEVER output a payment item with a null, undefined, or 0 amount.
   - Set "method" to one of: "CASH", "UPI", "CHEQUE", "BANK_TRANSFER", "OTHER".
   - Normalize "GPay", "Google Pay", "PhonePe", "Paytm", "BHIM" to method "UPI", and record the application name in "provider" (e.g., provider: "GPay").
   - If payment method is Cash, method is "CASH" and provider is null.
5. Do NOT calculate outstanding balances or remaining dues.
6. Do NOT determine payment status (such as paid, unpaid, or partial).
7. If the user's message is a delivery command, set "action" to "record_delivery".
8. If the message is NOT a delivery command (e.g. greeting, random question, unrelated text), set "action" to "unknown" and all other fields to null (payments to []).

Output format:
Return ONLY a valid JSON object matching this schema:
{
  "action": "record_delivery" | "unknown",
  "recipient_name": string | null,
  "boxes_delivered": number | null,
  "total_amount": number | null,
  "payments": [
    {
      "amount": number,
      "method": "CASH" | "UPI" | "CHEQUE" | "BANK_TRANSFER" | "OTHER",
      "provider": string | null
    }
  ],
  "delivery_date": string | null,
  "area_name": string | null,
  "notes": string | null
}`;

    const rawResponse = await this.invokeChat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ]);

    const baseDraft = this.sanitizeAndValidateDraft(rawResponse);
    return this.enrichDraftWithDatabaseContext(baseDraft);
  }

  /**
   * Enriches parsed delivery draft with database customer lookup and confirmation preview.
   * Never automatically writes to the database.
   */
  private async enrichDraftWithDatabaseContext(
    draft: DeliveryDraft,
  ): Promise<EnhancedDeliveryDraft> {
    if (!this.customersService || !draft.recipient_name) {
      return {
        ...draft,
        matched_customer: null,
        requires_customer_selection: Boolean(draft.recipient_name),
        candidate_customers: [],
        confirmation_preview: null,
      };
    }

    const match = await this.customersService.matchCustomer(
      draft.recipient_name,
    );

    let matchedCustomer: MatchedCustomerSummary | null = null;
    let requiresSelection = false;

    if (match.matched && match.customer) {
      matchedCustomer = {
        id: match.customer.id,
        name: match.customer.name,
        phone: match.customer.phone,
        area: match.customer.area?.name || null,
      };
      requiresSelection = false;
    } else {
      requiresSelection = true;
    }

    const candidates: MatchedCustomerSummary[] = match.candidates.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      area: c.area?.name || null,
    }));

    const isReadyToConfirm = Boolean(
      matchedCustomer &&
      draft.action === 'record_delivery' &&
      draft.total_amount !== null &&
      draft.total_amount > 0,
    );

    const confirmationPreview = {
      customerId: matchedCustomer ? matchedCustomer.id : null,
      customerName: matchedCustomer
        ? matchedCustomer.name
        : draft.recipient_name,
      outerBoxes: draft.boxes_delivered,
      totalAmountRupees: draft.total_amount,
      payments: draft.payments,
      ready_to_confirm: isReadyToConfirm,
    };

    return {
      ...draft,
      matched_customer: matchedCustomer,
      requires_customer_selection: requiresSelection,
      candidate_customers: candidates,
      confirmation_preview: confirmationPreview,
    };
  }

  private async invokeChat(messages: OllamaChatMessage[]): Promise<string> {
    if (this.provider !== 'ollama' && this.apiKey) {
      return this.invokeOpenAiCompatibleChat(messages);
    }
    return this.invokeOllamaChat(messages);
  }

  /**
   * Dispatches chat request to OpenAI/Groq-compatible cloud API with timeout and error handling.
   */
  private async invokeOpenAiCompatibleChat(
    messages: OllamaChatMessage[],
  ): Promise<string> {
    const url = `${this.baseUrl}/chat/completions`;
    const payload = {
      model: this.model,
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.1,
    };

    let response: Response;
    try {
      this.logger.debug(
        `Calling Cloud AI API at ${url} with model ${this.model}`,
      );
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.name === 'TimeoutError' || err.name === 'AbortError') {
          this.logger.error(
            `Cloud AI request timed out after ${this.timeoutMs}ms`,
          );
          throw new GatewayTimeoutException(
            `Cloud AI request timed out after ${this.timeoutMs}ms`,
          );
        }
        this.logger.error(`Failed to reach Cloud AI at ${url}: ${err.message}`);
      }
      throw new ServiceUnavailableException(
        `Cloud AI service is unavailable at ${this.baseUrl}. Please verify your API key and connection.`,
      );
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      this.logger.error(
        `Cloud AI returned HTTP error ${response.status} ${response.statusText}: ${errorText}`,
      );
      throw new BadGatewayException(
        `Cloud AI returned an error (status ${response.status}): ${response.statusText}`,
      );
    }

    let parsedResponse: {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };
    try {
      parsedResponse = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        error?: { message?: string };
      };
    } catch (err: unknown) {
      this.logger.error(
        `Failed to parse Cloud AI response as JSON: ${String(err)}`,
      );
      throw new BadGatewayException(
        'Malformed response received from Cloud AI server.',
      );
    }

    if (parsedResponse.error) {
      this.logger.error(`Cloud AI error: ${parsedResponse.error.message}`);
      throw new BadGatewayException(
        `Cloud AI error: ${parsedResponse.error.message}`,
      );
    }

    const content = parsedResponse.choices?.[0]?.message?.content;
    if (!content) {
      this.logger.error('Cloud AI response did not contain message content.');
      throw new BadGatewayException('Cloud AI response missing message content.');
    }

    return content;
  }

  /**
   * Dispatches chat request to Ollama HTTP API with timeout and error handling.
   */
  private async invokeOllamaChat(
    messages: OllamaChatMessage[],
  ): Promise<string> {
    const url = `${this.baseUrl}/api/chat`;
    const payload = {
      model: this.model,
      messages,
      format: 'json',
      stream: false,
      think: false, // Disables thinking tokens in Qwen3 to ensure instant responses
      options: {
        temperature: 0.1,
      },
    };

    let response: Response;
    try {
      this.logger.debug(
        `Calling Ollama API at ${url} with model ${this.model}`,
      );
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.name === 'TimeoutError' || err.name === 'AbortError') {
          this.logger.error(
            `Ollama request timed out after ${this.timeoutMs}ms`,
          );
          throw new GatewayTimeoutException(
            `Ollama request timed out after ${this.timeoutMs}ms`,
          );
        }
        this.logger.error(`Failed to reach Ollama at ${url}: ${err.message}`);
      }
      throw new ServiceUnavailableException(
        `Ollama service is unavailable or unreachable at ${this.baseUrl}. Please verify that Ollama is running.`,
      );
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      this.logger.error(
        `Ollama returned HTTP error ${response.status} ${response.statusText}: ${errorText}`,
      );
      throw new BadGatewayException(
        `Ollama returned an error (status ${response.status}): ${response.statusText}`,
      );
    }

    let parsedResponse: OllamaChatResponse;
    try {
      parsedResponse = (await response.json()) as OllamaChatResponse;
    } catch (err: unknown) {
      this.logger.error(
        `Failed to parse Ollama response as JSON: ${String(err)}`,
      );
      throw new BadGatewayException(
        'Malformed response received from Ollama server.',
      );
    }

    if (parsedResponse.error) {
      this.logger.error(`Ollama error in response: ${parsedResponse.error}`);
      throw new BadGatewayException(`Ollama error: ${parsedResponse.error}`);
    }

    const content = parsedResponse.message?.content;
    if (!content) {
      this.logger.error('Ollama response did not contain message content.');
      throw new BadGatewayException('Ollama response missing message content.');
    }

    return content;
  }

  /**
   * Parses JSON string and cleans fields to guarantee conformity to DeliveryDraft.
   */
  private sanitizeAndValidateDraft(rawJson: string): DeliveryDraft {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      const jsonMatch = rawJson.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          this.logger.error(
            `Failed to parse extracted JSON substring: ${rawJson}`,
          );
          throw new InternalServerErrorException(
            'Failed to parse AI output into structured delivery draft.',
          );
        }
      } else {
        this.logger.error(`AI did not return valid JSON: ${rawJson}`);
        throw new InternalServerErrorException(
          'Failed to parse AI output into structured delivery draft.',
        );
      }
    }

    const action =
      typeof parsed['action'] === 'string' && parsed['action'].trim() !== ''
        ? parsed['action'].trim()
        : 'unknown';

    const recipientName =
      typeof parsed['recipient_name'] === 'string' &&
      parsed['recipient_name'].trim() !== ''
        ? parsed['recipient_name'].trim()
        : null;

    let boxesDelivered: number | null = null;
    if (
      typeof parsed['boxes_delivered'] === 'number' &&
      !Number.isNaN(parsed['boxes_delivered'])
    ) {
      boxesDelivered = parsed['boxes_delivered'];
    }

    let totalAmount: number | null = null;
    if (
      typeof parsed['total_amount'] === 'number' &&
      !Number.isNaN(parsed['total_amount'])
    ) {
      totalAmount = parsed['total_amount'];
    }

    const validMethods: PaymentMethod[] = [
      'CASH',
      'UPI',
      'CHEQUE',
      'BANK_TRANSFER',
      'OTHER',
    ];

    const payments: PaymentItem[] = [];
    if (Array.isArray(parsed['payments'])) {
      for (const item of parsed['payments']) {
        if (typeof item === 'object' && item !== null) {
          const rawItem = item as Record<string, unknown>;
          const amount =
            typeof rawItem['amount'] === 'number' ? rawItem['amount'] : null;

          if (amount === null || Number.isNaN(amount) || amount <= 0) {
            continue;
          }

          let method: PaymentMethod = 'OTHER';
          const rawMethod =
            typeof rawItem['method'] === 'string'
              ? rawItem['method'].toUpperCase().trim()
              : '';

          if (validMethods.includes(rawMethod as PaymentMethod)) {
            method = rawMethod as PaymentMethod;
          } else if (
            rawMethod.includes('UPI') ||
            rawMethod.includes('GPAY') ||
            rawMethod.includes('PHONEPE')
          ) {
            method = 'UPI';
          } else if (rawMethod.includes('CASH')) {
            method = 'CASH';
          }

          const provider =
            typeof rawItem['provider'] === 'string' &&
            rawItem['provider'].trim() !== ''
              ? rawItem['provider'].trim()
              : null;

          payments.push({
            amount,
            method,
            provider,
          });
        }
      }
    }

    const deliveryDate =
      typeof parsed['delivery_date'] === 'string' &&
      parsed['delivery_date'].trim() !== ''
        ? parsed['delivery_date'].trim()
        : null;

    const areaName =
      typeof parsed['area_name'] === 'string' &&
      parsed['area_name'].trim() !== ''
        ? parsed['area_name'].trim()
        : null;

    const notes =
      typeof parsed['notes'] === 'string' && parsed['notes'].trim() !== ''
        ? parsed['notes'].trim()
        : null;

    return {
      action,
      recipient_name: recipientName,
      boxes_delivered: boxesDelivered,
      total_amount: totalAmount,
      payments,
      delivery_date: deliveryDate,
      area_name: areaName,
      notes,
    };
  }

  /**
   * Transcribes an uploaded audio recording into text using Whisper Large v3.
   * Optimized with Malayalam and Kerala local vocabulary prompts.
   */
  async transcribeAudio(
    fileBuffer: Buffer,
    mimeType: string,
    originalFilename = 'audio.webm',
  ): Promise<string> {
    const apiKey =
      this.apiKey ||
      this.configService.get<string>('ai.apiKey') ||
      process.env.GROQ_API_KEY ||
      '';

    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Speech-to-text audio transcription requires a Groq API key (GROQ_API_KEY).',
      );
    }

    const form = new FormData();
    const blob = new Blob([new Uint8Array(fileBuffer)], {
      type: mimeType || 'audio/webm',
    });
    form.append('file', blob, originalFilename || 'recording.webm');
    form.append('model', 'whisper-large-v3-turbo');
    form.append(
      'prompt',
      'MST Tengapal, Coconut Milk, Coconut Milk 1kg, 500g, 200ml, Malappuram, Manjeri, Tirur, Perinthalmanna, Kottakkal, Kondotty, Ponnani, Parappanangadi, Tanur, Valanchery, Nilambur, Edappal, Areekode, Wandoor, boxes, packet, cash, GPay, UPI',
    );
    form.append('temperature', '0');

    try {
      const response = await fetch(
        'https://api.groq.com/openai/v1/audio/transcriptions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          body: form,
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Whisper transcription failed: ${response.status} ${errorText}`,
        );
        throw new BadGatewayException(
          `Audio transcription service error (${response.status}): ${errorText}`,
        );
      }

      const data = (await response.json()) as { text?: string };
      const transcript = (data.text || '').trim();
      this.logger.log(
        `Transcribed audio (${fileBuffer.length} bytes): "${transcript}"`,
      );
      return transcript;
    } catch (err: unknown) {
      if (
        err instanceof BadGatewayException ||
        err instanceof ServiceUnavailableException
      ) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to transcribe audio: ${message}`);
      throw new BadGatewayException(`Audio transcription failed: ${message}`);
    }
  }

  /**
   * Transcribes voice audio and immediately extracts delivery structure in one step.
   */
  async parseVoiceCommand(
    fileBuffer: Buffer,
    mimeType: string,
    originalFilename = 'audio.webm',
  ): Promise<{ transcript: string; draft: EnhancedDeliveryDraft }> {
    const transcript = await this.transcribeAudio(
      fileBuffer,
      mimeType,
      originalFilename,
    );
    const draft = await this.parseDeliveryCommand(transcript);
    return { transcript, draft };
  }
}
