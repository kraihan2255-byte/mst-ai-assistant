import { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Edit2,
  XCircle,
  Truck,
  IndianRupee,
  CreditCard,
  User,
  Package,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { formatRupees, getPaymentStatusColor } from '../../lib/formatters';
import type { DeliveryDraft, PaymentMethod } from '../../types/api';
import { useCustomers } from '../../hooks/use-customers';

export interface DeliveryPreviewCardProps {
  draft: DeliveryDraft;
  onConfirm: (finalData: {
    customerId: string;
    outerBoxes: number | null;
    totalAmountRupees: number;
    items?: Array<{
      productId: string;
      quantity: number;
      unitPriceRupees?: number;
    }>;
    payments: Array<{
      amountRupees: number;
      method: PaymentMethod;
      provider?: string | null;
    }>;
    notes?: string;
  }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function DeliveryPreviewCard({
  draft,
  onConfirm,
  onCancel,
  isLoading = false,
}: DeliveryPreviewCardProps) {
  const { data: customers = [] } = useCustomers();

  // Selected customer ID
  const defaultCustomerId =
    draft.matched_customer?.id ||
    customers.find(
      (c) =>
        c.name.toLowerCase() ===
        (draft.recipient_name || '').trim().toLowerCase(),
    )?.id ||
    '';

  const [customerId, setCustomerId] = useState<string>(defaultCustomerId);
  const [outerBoxes, setOuterBoxes] = useState<number | ''>(
    draft.boxes_delivered !== null && draft.boxes_delivered !== undefined
      ? draft.boxes_delivered
      : '',
  );
  const [totalAmount, setTotalAmount] = useState<number | ''>(
    draft.total_amount !== null && draft.total_amount !== undefined
      ? draft.total_amount
      : '',
  );

  // Initial payment
  const initialPayment =
    draft.payments && draft.payments.length > 0
      ? draft.payments[0]
      : {
          amount: draft.payment_received || 0,
          method: draft.payment_method || 'CASH',
          provider: draft.payment_provider || null,
        };

  const [paymentAmount, setPaymentAmount] = useState<number | ''>(
    initialPayment.amount || '',
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    initialPayment.method || 'CASH',
  );
  const [paymentProvider, setPaymentProvider] = useState<string>(
    initialPayment.provider || '',
  );

  const [isEditing, setIsEditing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const customerDisplayName =
    selectedCustomer?.name || draft.recipient_name || 'Unknown Customer';

  const totalNum = typeof totalAmount === 'number' ? totalAmount : 0;
  const paidNum = typeof paymentAmount === 'number' ? paymentAmount : 0;
  const outstandingNum = Math.max(0, totalNum - paidNum);

  let paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' = 'PAID';
  if (totalNum > 0) {
    if (paidNum === 0) paymentStatus = 'UNPAID';
    else if (paidNum < totalNum) paymentStatus = 'PARTIALLY_PAID';
    else paymentStatus = 'PAID';
  }
  const statusColors = getPaymentStatusColor(paymentStatus);

  const handleConfirmClick = async () => {
    setValidationError(null);

    if (!customerId) {
      setValidationError('Please select or create a valid customer to proceed.');
      setIsEditing(true);
      return;
    }

    if (totalNum <= 0) {
      setValidationError('Delivery total amount must be greater than zero.');
      setIsEditing(true);
      return;
    }

    if (paidNum > totalNum) {
      setValidationError(
        `Received payment (₹${paidNum}) cannot exceed delivery total (₹${totalNum}).`,
      );
      setIsEditing(true);
      return;
    }

    const payments =
      paidNum > 0
        ? [
            {
              amountRupees: paidNum,
              method: paymentMethod,
              provider: paymentMethod === 'UPI' ? paymentProvider || null : null,
            },
          ]
        : [];

    const itemsToSave =
      draft.items && draft.items.length > 0
        ? draft.items
            .filter((it) => it.productId && it.productId.length > 10)
            .map((it) => ({
              productId: it.productId!,
              quantity: it.quantity || Number(outerBoxes) || 1,
              unitPriceRupees: it.unit_price,
            }))
        : undefined;

    await onConfirm({
      customerId,
      outerBoxes: outerBoxes === '' ? null : Number(outerBoxes),
      totalAmountRupees: totalNum,
      items: itemsToSave && itemsToSave.length > 0 ? itemsToSave : undefined,
      payments,
      notes: draft.notes || undefined,
    });
  };

  return (
    <div className="rounded-2xl border border-teal-200 bg-white p-5 shadow-sm max-w-xl w-full text-brand-dark animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-teal-50 text-brand-primary">
            <Truck className="h-4 w-4" />
          </div>
          <span className="font-bold text-sm">Delivery Confirmation Preview</span>
        </div>
        <Badge variant={draft.items && draft.items.length > 0 ? 'accent' : 'neutral'} size="sm">
          {draft.items && draft.items.length > 0 ? 'Itemized' : 'Non-Itemized'}
        </Badge>
      </div>

      {validationError && (
        <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Content Form or View */}
      <div className="mt-4 space-y-4 text-sm">
        {/* Customer Info */}
        <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/60">
          <div className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" /> Recipient Customer
          </div>

          {isEditing ? (
            <div className="mt-1">
              <label className="text-xs text-stone-600 font-medium">
                Select Customer:
              </label>
              <select
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white p-2 text-sm text-brand-dark focus:ring-2 focus:ring-brand-primary"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">-- Choose Existing Customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.area ? `(${c.area.name})` : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-brand-dark">
                  {customerDisplayName}
                </span>
                {selectedCustomer?.area && (
                  <span className="ml-2 text-xs text-stone-500">
                    • {selectedCustomer.area.name}
                  </span>
                )}
                {selectedCustomer?.phone && (
                  <span className="ml-2 text-xs text-stone-500">
                    ({selectedCustomer.phone})
                  </span>
                )}
              </div>
              {!customerId && (
                <Badge variant="warning" size="sm">
                  Unlinked Customer
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Delivery Details */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/60">
            <div className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1 flex items-center gap-1">
              <Package className="h-3.5 w-3.5" /> Outer Boxes
            </div>
            {isEditing ? (
              <Input
                type="number"
                min="0"
                value={outerBoxes}
                onChange={(e) =>
                  setOuterBoxes(e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="Boxes count"
              />
            ) : (
              <div className="text-base font-bold text-brand-dark">
                {outerBoxes !== '' ? `${outerBoxes} boxes` : 'Not specified'}
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/60">
            <div className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1 flex items-center gap-1">
              <IndianRupee className="h-3.5 w-3.5" /> Total Billed
            </div>
            {isEditing ? (
              <Input
                type="number"
                min="0"
                value={totalAmount}
                onChange={(e) =>
                  setTotalAmount(e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="Total in ₹"
              />
            ) : (
              <div className="text-base font-bold text-brand-dark">
                {formatRupees(totalNum)}
              </div>
            )}
          </div>
        </div>

        {/* Itemized list if draft items present */}
        {draft.items && draft.items.length > 0 && (
          <div className="p-3 rounded-xl bg-teal-50/50 border border-teal-100">
            <div className="text-xs font-bold uppercase tracking-wider text-brand-primary mb-2">
              Itemized Products
            </div>
            <div className="space-y-1.5 text-xs">
              {draft.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-stone-700">
                  <span>
                    {item.quantity}x {item.product_name || 'Coconut Milk'} ({item.size || 'Pack'})
                  </span>
                  {item.unit_price && (
                    <span className="font-semibold">
                      ₹{item.unit_price} / unit = ₹{(item.quantity || 1) * item.unit_price}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment Received Details */}
        <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/60">
          <div className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2 flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5" /> Initial Payment Collected
          </div>

          {isEditing ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] text-stone-500">Amount (₹)</label>
                <Input
                  type="number"
                  min="0"
                  value={paymentAmount}
                  onChange={(e) =>
                    setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-[11px] text-stone-500">Method</label>
                <select
                  className="w-full h-10 rounded-lg border border-stone-300 bg-white p-2 text-sm text-brand-dark"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                >
                  <option value="CASH">CASH</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">BANK TRANSFER</option>
                  <option value="CHEQUE">CHEQUE</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>
              {paymentMethod === 'UPI' && (
                <div>
                  <label className="text-[11px] text-stone-500">Provider</label>
                  <Input
                    value={paymentProvider}
                    onChange={(e) => setPaymentProvider(e.target.value)}
                    placeholder="GPay / PhonePe"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-brand-dark">
                  {formatRupees(paidNum)}
                </span>
                {paidNum > 0 && (
                  <span className="ml-2 text-xs text-stone-600">
                    via {paymentMethod} {paymentProvider ? `(${paymentProvider})` : ''}
                  </span>
                )}
              </div>
              <Badge variant={paidNum > 0 ? 'success' : 'neutral'} size="sm">
                {paidNum > 0 ? 'Payment Attached' : 'No Upfront Payment'}
              </Badge>
            </div>
          )}
        </div>

        {/* Financial Summary Box */}
        <div className="p-3.5 rounded-xl bg-brand-bg border border-stone-200">
          <div className="flex justify-between items-center text-xs pb-2 border-b border-stone-200/60">
            <span className="text-stone-500 font-medium">Billed:</span>
            <span className="font-bold text-brand-dark">{formatRupees(totalNum)}</span>
          </div>
          <div className="flex justify-between items-center text-xs py-1.5 border-b border-stone-200/60">
            <span className="text-stone-500 font-medium">Received:</span>
            <span className="font-bold text-emerald-700">{formatRupees(paidNum)}</span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-stone-600">Outstanding:</span>
              <span className="font-extrabold text-brand-dark text-base">
                {formatRupees(outstandingNum)}
              </span>
            </div>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}
            >
              {statusColors.label}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-5 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          variant="outline"
          size="sm"
          disabled={isLoading}
        >
          <Edit2 className="h-3.5 w-3.5 mr-1" />
          {isEditing ? 'Done Editing' : 'Edit Details'}
        </Button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={onCancel}
            variant="ghost"
            size="sm"
            disabled={isLoading}
          >
            <XCircle className="h-4 w-4 mr-1 text-stone-400" />
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleConfirmClick}
            variant="primary"
            size="md"
            isLoading={isLoading}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Confirm Delivery
          </Button>
        </div>
      </div>
    </div>
  );
}
