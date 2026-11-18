import { describe, it, expect } from 'vitest';
import {
  formatRupees,
  formatPaise,
  formatDate,
  formatDateTime,
  getPaymentStatusColor,
} from '../lib/formatters';

describe('formatters', () => {
  it('should format whole rupees as Indian currency string without unnecessary decimals', () => {
    expect(formatRupees(5000)).toContain('5,000');
    expect(formatRupees(0)).toContain('0');
    expect(formatRupees(null)).toContain('0');
  });

  it('should format paise to rupees correctly', () => {
    expect(formatPaise(15500)).toContain('155');
    expect(formatPaise(29000)).toContain('290');
    expect(formatPaise(500000)).toContain('5,000');
  });

  it('should format dates properly', () => {
    const formatted = formatDate('2026-05-15T10:00:00Z');
    expect(formatted).toContain('2026');
    expect(formatDate(null)).toBe('—');

    const formattedTime = formatDateTime('2026-05-15T10:30:00Z');
    expect(formattedTime).toContain('2026');
    expect(formatDateTime(null)).toBe('—');
  });

  it('should return correct color styles for each payment status', () => {
    const paid = getPaymentStatusColor('PAID');
    expect(paid.label).toBe('Paid');
    expect(paid.text).toContain('emerald');

    const partial = getPaymentStatusColor('PARTIALLY_PAID');
    expect(partial.label).toBe('Partially Paid');
    expect(partial.text).toContain('amber');

    const unpaid = getPaymentStatusColor('UNPAID');
    expect(unpaid.label).toBe('Unpaid');
    expect(unpaid.text).toContain('rose');
  });
});
