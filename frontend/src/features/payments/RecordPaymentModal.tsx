import React, { useState } from 'react';
import { Modal } from '../../components/ui/modal';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Button } from '../../components/ui/button';
import { useRecordPayment } from '../../hooks/use-deliveries';
import { useToast } from '../../components/ui/toast';
import { formatRupees } from '../../lib/formatters';
import type { Delivery, PaymentMethod } from '../../types/api';
import { CreditCard, AlertCircle } from 'lucide-react';

export interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  delivery: Delivery | null;
}

export function RecordPaymentModal({
  isOpen,
  onClose,
  delivery,
}: RecordPaymentModalProps) {
  const toast = useToast();
  const recordPaymentMutation = useRecordPayment(delivery?.id);

  const [amountRupees, setAmountRupees] = useState<number | ''>(
    delivery ? delivery.outstandingRupees : '',
  );
  const [method, setMethod] = useState<PaymentMethod>('UPI');
  const [provider, setProvider] = useState('GPay');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!delivery) return null;

  const outstanding = delivery.outstandingRupees;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amountNum = typeof amountRupees === 'number' ? amountRupees : 0;

    if (amountNum <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }

    if (amountNum > outstanding) {
      setError(
        `Payment amount (${formatRupees(amountNum)}) cannot exceed the outstanding balance of ${formatRupees(outstanding)}.`,
      );
      return;
    }

    try {
      await recordPaymentMutation.mutateAsync({
        id: delivery.id,
        payload: {
          amountRupees: amountNum,
          method,
          provider: method === 'UPI' ? provider.trim() || null : null,
          reference: reference.trim() || null,
          notes: notes.trim() || null,
        },
      });

      toast.success(
        `Payment of ${formatRupees(amountNum)} recorded for ${delivery.customerName}!`,
      );
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record payment.';
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Customer Payment"
      description={`Add a payment against delivery order #${delivery.id.slice(0, 8)}.`}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4 mt-2">
        {/* Outstanding Balance Banner */}
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs">
          <div>
            <span className="text-amber-800 font-semibold block">
              Customer: {delivery.customerName}
            </span>
            <span className="text-amber-700 mt-0.5 block">
              Delivery Total: {formatRupees(delivery.totalAmountRupees)} • Paid: {formatRupees(delivery.totalPaidRupees)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-amber-600 block">
              Outstanding Dues
            </span>
            <span className="text-base font-extrabold text-amber-900 block">
              {formatRupees(outstanding)}
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Payment Amount (₹) *"
            type="number"
            min="1"
            max={outstanding}
            value={amountRupees}
            onChange={(e) =>
              setAmountRupees(e.target.value === '' ? '' : Number(e.target.value))
            }
            required
          />

          <Select
            label="Payment Method *"
            options={[
              { value: 'UPI', label: 'UPI' },
              { value: 'CASH', label: 'CASH' },
              { value: 'BANK_TRANSFER', label: 'BANK TRANSFER' },
              { value: 'CHEQUE', label: 'CHEQUE' },
              { value: 'OTHER', label: 'OTHER' },
            ]}
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
          />
        </div>

        {method === 'UPI' && (
          <Input
            label="UPI Provider"
            placeholder="e.g. GPay, PhonePe, Paytm"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          />
        )}

        <Input
          label="Transaction Reference / Cheque #"
          placeholder="Optional transaction reference"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />

        <Textarea
          label="Notes"
          placeholder="Optional notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={recordPaymentMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={recordPaymentMutation.isPending}
          >
            <CreditCard className="h-4 w-4 mr-1" />
            Record Payment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
