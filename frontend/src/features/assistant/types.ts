import type { DeliveryDraft, Delivery, MatchedCustomerSummary } from '../../types/api';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: Date;
  draft?: DeliveryDraft;
  delivery?: Delivery;
  requiresSelection?: boolean;
  candidates?: MatchedCustomerSummary[];
  isConfirmed?: boolean;
  error?: string;
}
