import type { Delivery } from '../../types/api';
import { formatRupees, formatDate } from '../../lib/formatters';

export interface BusinessProfile {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  fssai?: string;
  gstin?: string;
}

export const DEFAULT_BUSINESS_PROFILE: BusinessProfile = {
  name: 'MST TENGAPAL',
  tagline: 'Wholesale Coconut Milk Suppliers',
  address: 'Malappuram, Kerala, India',
  phone: '+91 94470 00000',
  fssai: '21323134000123',
};

/**
 * Normalizes an Indian phone number into international WhatsApp format (e.g. 919876543210).
 */
export function normalizeWhatsAppPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return digits;
}

/**
 * Builds a clean, professional WhatsApp text invoice with emojis and markdown bolding.
 */
export function buildWhatsAppInvoiceText(
  delivery: Delivery,
  profile: BusinessProfile = DEFAULT_BUSINESS_PROFILE,
): string {
  const invoiceNo =
    delivery.invoiceNumber ||
    `MST-INV-${delivery.id.slice(0, 8).toUpperCase()}`;

  const customerName = delivery.customerName || delivery.customer?.name || 'Valued Customer';
  const areaName = delivery.customer?.area?.name || '';
  const customerDisplay = areaName ? `${customerName} (${areaName})` : customerName;

  const lines: string[] = [];

  // Header
  lines.push(`🥥 *${profile.name}*`);
  lines.push(`_${profile.tagline}_`);
  lines.push(`📍 ${profile.address}`);
  lines.push('');
  lines.push(`🧾 *DELIVERY INVOICE: ${invoiceNo}*`);
  lines.push(`📅 Date: ${formatDate(delivery.deliveryDate)}`);
  lines.push(`👤 Customer: *${customerDisplay}*`);
  lines.push('────────────────────────');

  // Items
  lines.push('📦 *ITEMS DELIVERED:*');
  if (delivery.items && delivery.items.length > 0) {
    delivery.items.forEach((item, idx) => {
      const prodName = item.product?.name || 'Coconut Milk';
      const size = item.product?.size ? `(${item.product.size})` : '';
      const unitPrice = formatRupees(item.unitPricePaise / 100);
      const lineTotal = formatRupees(item.lineTotalPaise / 100);
      lines.push(`${idx + 1}. *${prodName} ${size}*`);
      lines.push(`   ${item.quantity} pkts × ${unitPrice} = *${lineTotal}*`);
    });
  } else if (delivery.outerBoxes !== null && delivery.outerBoxes > 0) {
    lines.push(`• *Coconut Milk Outer Boxes:* ${delivery.outerBoxes} boxes`);
    lines.push(`  Total: *${formatRupees(delivery.totalAmountRupees)}*`);
  } else {
    lines.push(`• *Coconut Milk Delivery:* Total *${formatRupees(delivery.totalAmountRupees)}*`);
  }

  lines.push('────────────────────────');

  // Financial Breakdown
  lines.push(`💰 *Total Bill:* ${formatRupees(delivery.totalAmountRupees)}`);

  if (delivery.totalPaidRupees > 0) {
    const methods = delivery.payments && delivery.payments.length > 0
      ? ` (${delivery.payments.map((p) => p.method).join(', ')})`
      : '';
    lines.push(`💵 *Amount Paid:* ${formatRupees(delivery.totalPaidRupees)}${methods}`);
  } else {
    lines.push(`💵 *Amount Paid:* ₹0 (Unpaid)`);
  }

  if (delivery.outstandingRupees > 0) {
    lines.push(`⚠️ *Balance Due:* *${formatRupees(delivery.outstandingRupees)}*`);
  } else {
    lines.push(`✅ *Status:* *Fully Settled*`);
  }

  lines.push('────────────────────────');
  if (delivery.notes) {
    lines.push(`📝 *Notes:* ${delivery.notes}`);
    lines.push('');
  }

  lines.push('🙏 *Thank you for your business!*');
  lines.push(`📞 Contact: ${profile.phone}`);

  return lines.join('\n');
}

/**
 * Opens WhatsApp directly targeting customer's phone or WhatsApp share sheet.
 */
export function sendWhatsAppInvoice(
  delivery: Delivery,
  profile: BusinessProfile = DEFAULT_BUSINESS_PROFILE,
): void {
  const text = buildWhatsAppInvoiceText(delivery, profile);
  const targetPhone = normalizeWhatsAppPhone(delivery.customer?.phone);

  const encodedText = encodeURIComponent(text);

  let url = `https://api.whatsapp.com/send?text=${encodedText}`;
  if (targetPhone) {
    url = `https://wa.me/${targetPhone}?text=${encodedText}`;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}
