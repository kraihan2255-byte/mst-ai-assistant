import { useState } from 'react';
import { Modal } from '../../components/ui/modal';
import { Button } from '../../components/ui/button';
import { RecordPaymentModal } from '../payments/RecordPaymentModal';
import {
  formatRupees,
  formatDate,
  formatDateTime,
  getPaymentStatusColor,
} from '../../lib/formatters';
import type { Delivery } from '../../types/api';
import { Plus } from 'lucide-react';

export interface DeliveryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  delivery: Delivery | null;
}

export function DeliveryDetailModal({
  isOpen,
  onClose,
  delivery,
}: DeliveryDetailModalProps) {
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);

  if (!delivery) return null;

  const statusColors = getPaymentStatusColor(delivery.paymentStatus);
  const isUnsettled = delivery.outstandingRupees > 0;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        maxWidth="lg"
        title={`Delivery #${delivery.id.slice(0, 8)}`}
        description={`Recorded on ${formatDateTime(delivery.createdAt)}`}
      >
        <div className="space-y-4 mt-2">
          {/* Top Status & Customer Bar */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-stone-50 border border-stone-200">
            <div>
              <div className="text-xs uppercase font-semibold text-stone-400">
                Customer
              </div>
              <div className="text-base font-extrabold text-brand-dark">
                {delivery.customerName}
              </div>
              {delivery.customer?.phone && (
                <div className="text-xs text-stone-500 font-mono">
                  {delivery.customer.phone}
                </div>
              )}
            </div>

            <div className="text-right">
              <span
                className={`text-xs px-3 py-1 rounded-full font-bold border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}
              >
                {statusColors.label}
              </span>
              <div className="text-[11px] text-stone-400 mt-1">
                Delivered: {formatDate(delivery.deliveryDate)}
              </div>
            </div>
          </div>

          {/* Delivery Configuration Metadata */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/60">
              <span className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold block">
                Outer Box Count
              </span>
              <span className="text-sm font-extrabold text-brand-dark mt-0.5 block">
                {delivery.outerBoxes !== null
                  ? `${delivery.outerBoxes} outer boxes`
                  : 'Independent / Unspecified'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/60">
              <span className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold block">
                Delivery Structure
              </span>
              <span className="text-sm font-extrabold text-brand-dark mt-0.5 block">
                {delivery.deliveryType === 'ITEMIZED'
                  ? `Itemized (${delivery.itemsCount} products)`
                  : 'Non-Itemized Total'}
              </span>
            </div>
          </div>

          {/* Itemized Products Table (if any) */}
          {delivery.items && delivery.items.length > 0 && (
            <div className="rounded-xl border border-stone-200 overflow-hidden">
              <div className="bg-stone-50 px-4 py-2 border-b border-stone-200 text-xs font-bold text-stone-600 uppercase">
                Itemized Line Items
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50/50 text-stone-400 border-b border-stone-100">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Product</th>
                    <th className="px-4 py-2 font-semibold">Qty</th>
                    <th className="px-4 py-2 text-right font-semibold">Unit Price</th>
                    <th className="px-4 py-2 text-right font-semibold">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {delivery.items.map((it) => (
                    <tr key={it.id}>
                      <td className="px-4 py-2.5 font-medium text-stone-800">
                        {it.product?.name || 'Coconut Milk'} ({it.product?.size || ''})
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-stone-700">
                        {it.quantity}
                      </td>
                      <td className="px-4 py-2.5 text-right text-stone-600 font-mono">
                        {formatRupees(it.unitPricePaise / 100)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-brand-dark font-mono">
                        {formatRupees(it.lineTotalPaise / 100)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Payments Attached */}
          <div className="rounded-xl border border-stone-200 p-3.5">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100">
              <span className="text-xs font-bold uppercase text-stone-500">
                Payment History
              </span>
              <span className="text-xs font-semibold text-emerald-700">
                Total Paid: {formatRupees(delivery.totalPaidRupees)}
              </span>
            </div>

            {delivery.payments.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-1">
                No payments have been recorded yet.
              </p>
            ) : (
              <div className="space-y-1.5 text-xs">
                {delivery.payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-stone-50 text-stone-700"
                  >
                    <div>
                      <span className="font-semibold">{p.method}</span>
                      {p.provider && <span className="ml-1 text-stone-500">({p.provider})</span>}
                      {p.reference && (
                        <span className="ml-2 font-mono text-[11px] text-stone-400">
                          Ref: {p.reference}
                        </span>
                      )}
                    </div>
                    <span className="font-extrabold text-emerald-700">
                      {formatRupees(p.amountPaise / 100)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Financial Summary */}
          <div className="p-3.5 rounded-xl bg-brand-bg border border-stone-200">
            <div className="flex justify-between text-xs py-1">
              <span className="text-stone-500 font-medium">Delivery Total:</span>
              <span className="font-bold text-brand-dark">
                {formatRupees(delivery.totalAmountRupees)}
              </span>
            </div>
            <div className="flex justify-between text-xs py-1">
              <span className="text-stone-500 font-medium">Total Paid:</span>
              <span className="font-bold text-emerald-700">
                {formatRupees(delivery.totalPaidRupees)}
              </span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-stone-200/80">
              <span className="font-bold text-stone-700">Remaining Dues:</span>
              <span className="font-extrabold text-rose-700">
                {formatRupees(delivery.outstandingRupees)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
            <Button variant="ghost" onClick={onClose} size="sm">
              Close
            </Button>

            {isUnsettled && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsRecordPaymentOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" /> Record Additional Payment
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Record Payment Submodal */}
      {isRecordPaymentOpen && (
        <RecordPaymentModal
          isOpen={isRecordPaymentOpen}
          onClose={() => {
            setIsRecordPaymentOpen(false);
            onClose();
          }}
          delivery={delivery}
        />
      )}
    </>
  );
}
