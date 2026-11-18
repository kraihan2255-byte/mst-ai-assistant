import { describe, it, expect, beforeEach } from 'vitest';
import { DeliveriesService } from './deliveries.service.js';
import type { DeliveryDraft } from '../common/interfaces/delivery.interface.js';

describe('DeliveriesService (Deterministic Business Validation)', () => {
  let service: DeliveriesService;

  beforeEach(() => {
    service = new DeliveriesService();
  });

  describe('Scenario 1: Partial payment', () => {
    it('should correctly calculate total, received, outstanding and PARTIALLY_PAID status', () => {
      const draft: DeliveryDraft = {
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
      };

      const result = service.validateDeliveryDraft(draft);

      expect(result.valid).toBe(true);
      expect(result.total_amount).toBe(5000);
      expect(result.total_received).toBe(2000);
      expect(result.outstanding).toBe(3000);
      expect(result.payment_status).toBe('PARTIALLY_PAID');
      expect(result.requires_confirmation).toBe(true);
      expect(result.missing_fields).toEqual([]);
      expect(result.errors).toEqual([]);
    });
  });

  describe('Scenario 2: Full payment', () => {
    it('should correctly calculate total, received, outstanding of 0 and PAID status', () => {
      const draft: DeliveryDraft = {
        action: 'record_delivery',
        recipient_name: 'ABC Supermarket',
        boxes_delivered: 5,
        total_amount: 3000,
        payments: [
          {
            amount: 3000,
            method: 'CASH',
            provider: null,
          },
        ],
        delivery_date: null,
        area_name: null,
        notes: null,
      };

      const result = service.validateDeliveryDraft(draft);

      expect(result.valid).toBe(true);
      expect(result.total_amount).toBe(3000);
      expect(result.total_received).toBe(3000);
      expect(result.outstanding).toBe(0);
      expect(result.payment_status).toBe('PAID');
      expect(result.requires_confirmation).toBe(true);
      expect(result.missing_fields).toEqual([]);
      expect(result.errors).toEqual([]);
    });
  });

  describe('Scenario 3: Unpaid delivery', () => {
    it('should correctly calculate total, received of 0, outstanding of full amount and UNPAID status', () => {
      const draft: DeliveryDraft = {
        action: 'record_delivery',
        recipient_name: 'XYZ Catering',
        boxes_delivered: 8,
        total_amount: 4000,
        payments: [],
        delivery_date: null,
        area_name: null,
        notes: 'No payment received',
      };

      const result = service.validateDeliveryDraft(draft);

      expect(result.valid).toBe(true);
      expect(result.total_amount).toBe(4000);
      expect(result.total_received).toBe(0);
      expect(result.outstanding).toBe(4000);
      expect(result.payment_status).toBe('UNPAID');
      expect(result.requires_confirmation).toBe(true);
      expect(result.missing_fields).toEqual([]);
      expect(result.errors).toEqual([]);
    });
  });

  describe('Scenario 4: Missing amount', () => {
    it('should identify total_amount as missing and mark draft as invalid', () => {
      const draft: DeliveryDraft = {
        action: 'record_delivery',
        recipient_name: 'ABC Catering',
        boxes_delivered: 10,
        total_amount: null,
        payments: [],
        delivery_date: null,
        area_name: null,
        notes: null,
      };

      const result = service.validateDeliveryDraft(draft);

      expect(result.valid).toBe(false);
      expect(result.total_amount).toBeNull();
      expect(result.total_received).toBe(0);
      expect(result.outstanding).toBeNull();
      expect(result.payment_status).toBe('UNPAID');
      expect(result.missing_fields).toContain('total_amount');
      expect(result.requires_confirmation).toBe(true);
    });
  });

  describe('Scenario 5: Invalid payment (payment exceeds total)', () => {
    it('should fail validation when payments received exceed the total amount', () => {
      const draft: DeliveryDraft = {
        action: 'record_delivery',
        recipient_name: 'ABC Catering',
        boxes_delivered: 10,
        total_amount: 5000,
        payments: [
          {
            amount: 6000,
            method: 'UPI',
            provider: 'GPay',
          },
        ],
        delivery_date: null,
        area_name: null,
        notes: null,
      };

      const result = service.validateDeliveryDraft(draft);

      expect(result.valid).toBe(false);
      expect(result.total_amount).toBe(5000);
      expect(result.total_received).toBe(6000);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toMatch(/exceed the total delivery amount/i);
      expect(result.requires_confirmation).toBe(true);
    });
  });

  describe('Financial Safety & Guardrails', () => {
    it('should reject negative box count', () => {
      const draft: DeliveryDraft = {
        action: 'record_delivery',
        recipient_name: 'Customer A',
        boxes_delivered: -5,
        total_amount: 1000,
        payments: [],
        delivery_date: null,
        area_name: null,
        notes: null,
      };

      const result = service.validateDeliveryDraft(draft);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'boxes_delivered cannot be negative (got -5).',
      );
    });

    it('should reject zero box count', () => {
      const draft: DeliveryDraft = {
        action: 'record_delivery',
        recipient_name: 'Customer A',
        boxes_delivered: 0,
        total_amount: 1000,
        payments: [],
        delivery_date: null,
        area_name: null,
        notes: null,
      };

      const result = service.validateDeliveryDraft(draft);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'boxes_delivered must be greater than zero.',
      );
    });

    it('should reject negative total amount', () => {
      const draft: DeliveryDraft = {
        action: 'record_delivery',
        recipient_name: 'Customer A',
        boxes_delivered: 10,
        total_amount: -500,
        payments: [],
        delivery_date: null,
        area_name: null,
        notes: null,
      };

      const result = service.validateDeliveryDraft(draft);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'total_amount cannot be negative (got -500).',
      );
    });

    it('should reject negative payment amounts', () => {
      const draft: DeliveryDraft = {
        action: 'record_delivery',
        recipient_name: 'Customer A',
        boxes_delivered: 10,
        total_amount: 1000,
        payments: [
          {
            amount: -200,
            method: 'CASH',
            provider: null,
          },
        ],
        delivery_date: null,
        area_name: null,
        notes: null,
      };

      const result = service.validateDeliveryDraft(draft);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Payment at index 0 cannot be negative (got -200).',
      );
    });

    it('should identify missing recipient_name and missing boxes_delivered', () => {
      const draft: DeliveryDraft = {
        action: 'record_delivery',
        recipient_name: null,
        boxes_delivered: null,
        total_amount: null,
        payments: [],
        delivery_date: null,
        area_name: null,
        notes: null,
      };

      const result = service.validateDeliveryDraft(draft);
      expect(result.valid).toBe(false);
      expect(result.missing_fields).toContain('recipient_name');
      expect(result.missing_fields).toContain('boxes_delivered');
      expect(result.missing_fields).toContain('total_amount');
    });

    it('should reject non-delivery actions', () => {
      const draft: DeliveryDraft = {
        action: 'unknown',
        recipient_name: 'Customer A',
        boxes_delivered: 10,
        total_amount: 1000,
        payments: [],
        delivery_date: null,
        area_name: null,
        notes: null,
      };

      const result = service.validateDeliveryDraft(draft);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/invalid action "unknown"/i);
    });

    it('should handle floating point rounding correctly', () => {
      const draft: DeliveryDraft = {
        action: 'record_delivery',
        recipient_name: 'Customer Float',
        boxes_delivered: 3,
        total_amount: 19.99,
        payments: [
          { amount: 10.05, method: 'CASH', provider: null },
          { amount: 9.94, method: 'UPI', provider: 'GPay' },
        ],
        delivery_date: null,
        area_name: null,
        notes: null,
      };

      const result = service.validateDeliveryDraft(draft);
      expect(result.valid).toBe(true);
      expect(result.total_received).toBe(19.99);
      expect(result.outstanding).toBe(0);
      expect(result.payment_status).toBe('PAID');
    });
  });
});
