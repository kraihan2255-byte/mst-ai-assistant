/**
 * Formatting utilities for MST Tengapal financial and operational data
 */

export function formatRupees(amountRupees: number | null | undefined): string {
  if (amountRupees === null || amountRupees === undefined || isNaN(amountRupees)) {
    return '₹0';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(amountRupees) ? 0 : 2,
  }).format(amountRupees);
}

export function formatPaise(paise: number | null | undefined): string {
  if (paise === null || paise === undefined || isNaN(paise)) {
    return '₹0';
  }
  return formatRupees(paise / 100);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function getPaymentStatusColor(status: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID'): {
  bg: string;
  text: string;
  border: string;
  label: string;
} {
  switch (status) {
    case 'PAID':
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        label: 'Paid',
      };
    case 'PARTIALLY_PAID':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        label: 'Partially Paid',
      };
    case 'UNPAID':
    default:
      return {
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200',
        label: 'Unpaid',
      };
  }
}
