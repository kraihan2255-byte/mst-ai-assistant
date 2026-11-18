export type PaymentMethod =
  'CASH' | 'UPI' | 'CHEQUE' | 'BANK_TRANSFER' | 'OTHER';

export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';

export interface PaymentItem {
  amount: number;
  method: PaymentMethod;
  provider?: string | null;
}

export interface DeliveryDraft {
  action: 'record_delivery' | 'unknown' | (string & {});
  recipient_name: string | null;
  boxes_delivered: number | null;
  total_amount: number | null;
  payments: PaymentItem[];
  delivery_date: string | null;
  area_name: string | null;
  notes: string | null;
}

export interface DeliveryValidationResult {
  valid: boolean;
  total_amount: number | null;
  total_received: number;
  outstanding: number | null;
  payment_status: PaymentStatus;
  requires_confirmation: boolean;
  missing_fields: string[];
  errors: string[];
}
