import type {
  DeliveryValidationResult,
  PaymentStatus,
} from '../../common/interfaces/delivery.interface.js';

export class DeliveryValidationResultDto implements DeliveryValidationResult {
  valid!: boolean;
  total_amount!: number | null;
  total_received!: number;
  outstanding!: number | null;
  payment_status!: PaymentStatus;
  requires_confirmation!: boolean;
  missing_fields!: string[];
  errors!: string[];
}
