import { useState } from 'react';
import {
  Printer,
  Share2,
  Copy,
  Check,
  Receipt,
  FileText,
  Phone,
  MapPin,
  Calendar,
  Building2,
  X,
} from 'lucide-react';
import { Modal } from '../../components/ui/modal';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  formatRupees,
  formatDate,
  formatDateTime,
  getPaymentStatusColor,
} from '../../lib/formatters';
import type { Delivery } from '../../types/api';
import {
  sendWhatsAppInvoice,
  buildWhatsAppInvoiceText,
  DEFAULT_BUSINESS_PROFILE,
} from './whatsapp-invoice';

export interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  delivery: Delivery | null;
}

export function InvoiceModal({ isOpen, onClose, delivery }: InvoiceModalProps) {
  const [viewMode, setViewMode] = useState<'standard' | 'thermal'>('standard');
  const [copied, setCopied] = useState(false);

  if (!delivery) return null;

  const invoiceNo =
    delivery.invoiceNumber ||
    `MST-INV-${delivery.id.slice(0, 8).toUpperCase()}`;

  const statusColors = getPaymentStatusColor(delivery.paymentStatus);
  const areaName = delivery.customer?.area?.name || '';
  const customerName = delivery.customerName || delivery.customer?.name || 'Customer';

  const handleCopyText = async () => {
    try {
      const text = buildWhatsAppInvoiceText(delivery, DEFAULT_BUSINESS_PROFILE);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore clipboard error
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    sendWhatsAppInvoice(delivery, DEFAULT_BUSINESS_PROFILE);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="xl"
      title={`Invoice ${invoiceNo}`}
      description={`Customer: ${customerName}${areaName ? ` • ${areaName}` : ''}`}
    >
      <div className="space-y-4">
        {/* Top Action Toolbar (Hidden during Print) */}
        <div className="print:hidden flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-stone-100 border border-stone-200">
          {/* Format Switcher */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-stone-200 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('standard')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition-colors ${
                viewMode === 'standard'
                  ? 'bg-brand-primary text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <FileText className="h-3.5 w-3.5" /> Standard Bill
            </button>
            <button
              type="button"
              onClick={() => setViewMode('thermal')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition-colors ${
                viewMode === 'thermal'
                  ? 'bg-brand-primary text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Receipt className="h-3.5 w-3.5" /> 80mm Slip
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 ml-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyText}
              className="text-xs h-8"
              title="Copy WhatsApp invoice text"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600 mr-1" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs h-8 text-stone-700 font-semibold"
              title="Print via AirPrint or save as PDF"
            >
              <Printer className="h-3.5 w-3.5 mr-1" /> Print / PDF
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleWhatsApp}
              className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
              title="Send bill directly to customer on WhatsApp"
            >
              <Share2 className="h-3.5 w-3.5 mr-1" /> WhatsApp
            </Button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div id="printable-invoice" className="bg-white">
          {viewMode === 'standard' ? (
            /* =========================================================================
             * Standard Wholesale Invoice Layout (A4 / A5)
             * ========================================================================= */
            <div className="p-5 sm:p-7 border border-stone-200 rounded-2xl bg-white shadow-xs space-y-6 print:border-none print:p-0 print:shadow-none">
              {/* Header: Company & Invoice Info */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-stone-200 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🥥</span>
                    <h1 className="text-xl sm:text-2xl font-black text-brand-dark tracking-tight uppercase">
                      {DEFAULT_BUSINESS_PROFILE.name}
                    </h1>
                  </div>
                  <p className="text-xs font-semibold text-brand-primary mt-0.5">
                    {DEFAULT_BUSINESS_PROFILE.tagline}
                  </p>
                  <p className="text-xs text-stone-500 mt-1">
                    {DEFAULT_BUSINESS_PROFILE.address}
                  </p>
                  <p className="text-xs text-stone-500 font-mono">
                    Ph: {DEFAULT_BUSINESS_PROFILE.phone} • FSSAI: {DEFAULT_BUSINESS_PROFILE.fssai}
                  </p>
                </div>

                <div className="sm:text-right">
                  <div className="inline-block bg-brand-bg px-3 py-1 rounded-lg border border-stone-200 text-right">
                    <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
                      Wholesale Delivery Bill
                    </span>
                    <span className="text-base font-extrabold text-brand-dark font-mono block">
                      {invoiceNo}
                    </span>
                  </div>

                  <div className="text-xs text-stone-500 mt-2 space-y-0.5">
                    <div>
                      <span className="font-semibold text-stone-700">Date:</span>{' '}
                      {formatDate(delivery.deliveryDate)}
                    </div>
                    <div>
                      <span className="font-semibold text-stone-700">Status:</span>{' '}
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}
                      >
                        {statusColors.label}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bill To Customer Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-xl bg-stone-50/80 border border-stone-200">
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-stone-400">
                    Billed To (Customer)
                  </div>
                  <div className="text-base font-extrabold text-brand-dark mt-0.5">
                    {customerName}
                  </div>
                  {areaName && (
                    <div className="flex items-center gap-1 text-xs text-stone-600 mt-0.5">
                      <MapPin className="h-3 w-3 text-stone-400" />
                      <span>{areaName}, Malappuram</span>
                    </div>
                  )}
                  {delivery.customer?.phone && (
                    <div className="flex items-center gap-1 text-xs text-stone-600 mt-0.5 font-mono">
                      <Phone className="h-3 w-3 text-stone-400" />
                      <span>{delivery.customer.phone}</span>
                    </div>
                  )}
                </div>

                <div className="sm:text-right flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400">
                      Delivery Details
                    </span>
                    <div className="text-xs text-stone-700 font-medium mt-0.5">
                      {delivery.outerBoxes !== null
                        ? `${delivery.outerBoxes} Outer Boxes`
                        : 'Standard Drop-off'}
                    </div>
                    {delivery.deliveryType === 'ITEMIZED' && (
                      <div className="text-xs text-stone-500">
                        {delivery.itemsCount} Products Itemized
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="border border-stone-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-100/80 text-stone-600 uppercase font-bold text-[11px] border-b border-stone-200">
                    <tr>
                      <th className="px-3.5 py-2.5 w-10">#</th>
                      <th className="px-3.5 py-2.5">Item Description</th>
                      <th className="px-3.5 py-2.5 text-center">Pack Size</th>
                      <th className="px-3.5 py-2.5 text-center">Quantity</th>
                      <th className="px-3.5 py-2.5 text-right">Rate</th>
                      <th className="px-3.5 py-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {delivery.items && delivery.items.length > 0 ? (
                      delivery.items.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-stone-50/50">
                          <td className="px-3.5 py-2.5 text-stone-400 font-mono">
                            {idx + 1}
                          </td>
                          <td className="px-3.5 py-2.5 font-bold text-stone-800">
                            {item.product?.name || 'Coconut Milk'}
                          </td>
                          <td className="px-3.5 py-2.5 text-center text-stone-600 font-medium">
                            {item.product?.size || '-'}
                          </td>
                          <td className="px-3.5 py-2.5 text-center font-bold text-stone-800">
                            {item.quantity} pkts
                          </td>
                          <td className="px-3.5 py-2.5 text-right text-stone-600 font-mono">
                            {formatRupees(item.unitPricePaise / 100)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-extrabold text-brand-dark font-mono">
                            {formatRupees(item.lineTotalPaise / 100)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-3.5 py-3 text-stone-400 font-mono">1</td>
                        <td className="px-3.5 py-3 font-bold text-stone-800">
                          Fresh Coconut Milk (Outer Boxes)
                        </td>
                        <td className="px-3.5 py-3 text-center text-stone-600">Bulk</td>
                        <td className="px-3.5 py-3 text-center font-bold text-stone-800">
                          {delivery.outerBoxes || 1}
                        </td>
                        <td className="px-3.5 py-3 text-right text-stone-600 font-mono">-</td>
                        <td className="px-3.5 py-3 text-right font-extrabold text-brand-dark font-mono">
                          {formatRupees(delivery.totalAmountRupees)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Financial Calculation & Payments Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
                {/* Payment History Log */}
                <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/50">
                  <div className="text-[11px] uppercase font-bold text-stone-500 mb-2">
                    Payment Receipts
                  </div>
                  {delivery.payments.length === 0 ? (
                    <p className="text-xs text-stone-400 italic">
                      No payment received yet (Full credit).
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {delivery.payments.map((p) => (
                        <div
                          key={p.id}
                          className="flex justify-between items-center text-xs p-1.5 rounded bg-white border border-stone-200/60"
                        >
                          <div>
                            <span className="font-bold text-stone-800">{p.method}</span>
                            {p.provider && (
                              <span className="text-stone-500 ml-1">({p.provider})</span>
                            )}
                          </div>
                          <span className="font-extrabold text-emerald-700 font-mono">
                            {formatRupees(p.amountPaise / 100)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {delivery.notes && (
                    <div className="mt-3 pt-2 border-t border-stone-200/60 text-xs text-stone-600">
                      <span className="font-semibold text-stone-700">Notes:</span>{' '}
                      {delivery.notes}
                    </div>
                  )}
                </div>

                {/* Final Totals Box */}
                <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-2">
                  <div className="flex justify-between text-xs text-stone-600">
                    <span>Subtotal / Billed Amount:</span>
                    <span className="font-bold text-stone-800 font-mono">
                      {formatRupees(delivery.totalAmountRupees)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-stone-600">
                    <span>Total Amount Received:</span>
                    <span className="font-bold text-emerald-700 font-mono">
                      (-) {formatRupees(delivery.totalPaidRupees)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-stone-200 flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-stone-800 block">
                        Net Balance Due:
                      </span>
                      <span className="text-[10px] text-stone-400">
                        {delivery.outstandingRupees === 0
                          ? 'Bill Fully Paid'
                          : 'Carried forward to balance'}
                      </span>
                    </div>
                    <span className="text-base sm:text-lg font-black text-rose-700 font-mono">
                      {formatRupees(delivery.outstandingRupees)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Declarations & Signature */}
              <div className="pt-6 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-400">
                <div className="text-center sm:text-left">
                  <p className="font-medium text-stone-600">
                    Thank you for choosing MST Tengapal!
                  </p>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Perishable fresh goods. Please store in clean refrigeration.
                  </p>
                </div>

                <div className="text-center sm:text-right mt-2 sm:mt-0">
                  <div className="w-36 border-b border-stone-300 pb-1 mb-1 mx-auto sm:ml-auto"></div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    Authorized Signatory
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* =========================================================================
             * 80mm Thermal Slip Receipt Layout (Compact POS / Bluetooth van printer)
             * ========================================================================= */
            <div className="max-w-xs mx-auto p-4 border border-stone-300 rounded-xl bg-white font-mono text-xs text-stone-900 space-y-3 shadow-xs print:border-none print:shadow-none print:max-w-none">
              <div className="text-center border-b border-dashed border-stone-400 pb-2">
                <div className="text-base font-black tracking-tight uppercase">
                  {DEFAULT_BUSINESS_PROFILE.name}
                </div>
                <div className="text-[10px] text-stone-600">
                  {DEFAULT_BUSINESS_PROFILE.tagline}
                </div>
                <div className="text-[10px] text-stone-500">
                  {DEFAULT_BUSINESS_PROFILE.address}
                </div>
                <div className="text-[10px] text-stone-500">
                  Ph: {DEFAULT_BUSINESS_PROFILE.phone}
                </div>
              </div>

              <div className="text-[11px] space-y-0.5 border-b border-dashed border-stone-400 pb-2">
                <div className="flex justify-between">
                  <span className="font-bold">INVOICE:</span>
                  <span>{invoiceNo}</span>
                </div>
                <div className="flex justify-between">
                  <span>DATE:</span>
                  <span>{formatDate(delivery.deliveryDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span>CUSTOMER:</span>
                  <span className="font-bold text-right truncate max-w-[150px]">
                    {customerName}
                  </span>
                </div>
                {areaName && (
                  <div className="flex justify-between">
                    <span>AREA:</span>
                    <span>{areaName}</span>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="border-b border-dashed border-stone-400 pb-2 space-y-1">
                <div className="flex justify-between font-bold text-[10px] text-stone-500">
                  <span>ITEM</span>
                  <span>QTY × RATE = TOTAL</span>
                </div>
                {delivery.items && delivery.items.length > 0 ? (
                  delivery.items.map((it) => (
                    <div key={it.id} className="text-[11px]">
                      <div className="font-semibold">
                        {it.product?.name || 'Coconut Milk'} {it.product?.size}
                      </div>
                      <div className="flex justify-between text-stone-600">
                        <span>
                          {it.quantity} @ ₹{it.unitPricePaise / 100}
                        </span>
                        <span className="font-bold text-stone-900">
                          {formatRupees(it.lineTotalPaise / 100)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between">
                    <span>Outer Boxes ({delivery.outerBoxes || 1})</span>
                    <span className="font-bold">
                      {formatRupees(delivery.totalAmountRupees)}
                    </span>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="space-y-1 text-[11px] border-b border-dashed border-stone-400 pb-2">
                <div className="flex justify-between">
                  <span>TOTAL BILL:</span>
                  <span className="font-bold">
                    {formatRupees(delivery.totalAmountRupees)}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-800">
                  <span>PAID AMOUNT:</span>
                  <span className="font-bold">
                    {formatRupees(delivery.totalPaidRupees)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-black text-rose-700 pt-1 border-t border-dashed border-stone-300">
                  <span>BALANCE DUE:</span>
                  <span>{formatRupees(delivery.outstandingRupees)}</span>
                </div>
              </div>

              {/* Thermal Slip Footer */}
              <div className="text-center text-[10px] text-stone-500 pt-1">
                <div>Thank you for your business!</div>
                <div>MST Tengapal • Malappuram</div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Close Button (Hidden during Print) */}
        <div className="print:hidden pt-2 border-t border-stone-100 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
