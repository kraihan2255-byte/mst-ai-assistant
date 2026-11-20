import React, { useState, useMemo, useEffect } from 'react';
import {
  Package,
  User,
  IndianRupee,
  Check,
  ChevronRight,
  Search,
  X,
  Sparkles,
  Plus,
  Minus,
  RotateCcw,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useCustomers } from '../../hooks/use-customers';
import { useProducts } from '../../hooks/use-products';
import type { DeliveryDraft, PaymentMethod, Product } from '../../types/api';

interface QuickDeliveryBuilderProps {
  onDraftCreated: (draft: DeliveryDraft, commandSummary: string) => void;
  onClose: () => void;
}

const COMMON_BOX_OPTIONS = [1, 2, 3, 5, 8, 10, 12, 15, 20, 25];

const FALLBACK_PRODUCTS: Array<{
  id: string;
  name: string;
  size: string;
  currentPriceRupees: number;
}> = [
  { id: 'cm-1kg-default', name: 'Coconut Milk 1kg', size: '1kg', currentPriceRupees: 290 },
  { id: 'cm-500g-default', name: 'Coconut Milk 500g', size: '500g', currentPriceRupees: 155 },
  { id: 'cm-200ml-default', name: 'Coconut Milk 200ml', size: '200ml', currentPriceRupees: 65 },
];

export function QuickDeliveryBuilder({
  onDraftCreated,
  onClose,
}: QuickDeliveryBuilderProps) {
  const { data: customers = [], isLoading: isLoadingCustomers } = useCustomers();
  const { data: products = [], isLoading: isLoadingProducts } = useProducts();

  // Unified available products list
  const availableProducts = useMemo(() => {
    if (products.length > 0) {
      return products.map((p) => ({
        id: p.id,
        name: p.name,
        size: p.size,
        currentPriceRupees: p.currentPriceRupees || (p.size === '1kg' ? 290 : p.size === '500g' ? 155 : 65),
      }));
    }
    return FALLBACK_PRODUCTS;
  }, [products]);

  // Identify default 1kg product
  const defaultProduct = useMemo(() => {
    const found1kg = availableProducts.find(
      (p) =>
        p.size?.toLowerCase() === '1kg' ||
        p.name?.toLowerCase().includes('1kg') ||
        p.name?.toLowerCase().includes('1 kg'),
    );
    return found1kg || availableProducts[0] || FALLBACK_PRODUCTS[0];
  }, [availableProducts]);

  // Step 1: Item / Product selection (Default: 1kg)
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  const activeProduct = useMemo(() => {
    return (
      availableProducts.find((p) => p.id === selectedProductId) ||
      defaultProduct
    );
  }, [availableProducts, selectedProductId, defaultProduct]);

  // Step 2: Number of boxes (Default: 10 boxes)
  const [boxes, setBoxes] = useState<number>(10);

  // Step 3: Customer selection
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customCustomerName, setCustomCustomerName] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState<string>('');

  // Step 4: Total amount & Payment (Calculated based on item price)
  const unitPrice = activeProduct.currentPriceRupees;
  const standardTotal = boxes * unitPrice;

  // Allows user manual override if they wish to adjust total
  const [customAmount, setCustomAmount] = useState<string | null>(null);
  const totalAmount = customAmount !== null ? customAmount : String(standardTotal);

  const [paymentType, setPaymentType] = useState<'cash' | 'upi' | 'unpaid' | 'partial'>('cash');
  const [partialAmount, setPartialAmount] = useState<string>('');
  const [partialMethod, setPartialMethod] = useState<PaymentMethod>('UPI');

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const query = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        (c.area?.name && c.area.name.toLowerCase().includes(query)) ||
        (c.phone && c.phone.includes(query)),
    );
  }, [customers, customerSearch]);

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  const effectiveCustomerName = selectedCustomer
    ? selectedCustomer.name
    : customCustomerName.trim();

  // Validate form
  const parsedTotal = parseFloat(totalAmount);
  const isValidAmount = !isNaN(parsedTotal) && parsedTotal > 0;
  const isValidBoxes = boxes > 0;
  const isValidCustomer = Boolean(effectiveCustomerName);
  const canSubmit = isValidBoxes && isValidCustomer && isValidAmount;

  // Handle box or product change
  const handleSelectProduct = (prodId: string) => {
    setSelectedProductId(prodId);
    setCustomAmount(null); // Recalculate based on newly chosen item
  };

  const handleBoxesChange = (newBoxes: number) => {
    const validBoxes = Math.max(1, newBoxes);
    setBoxes(validBoxes);
    setCustomAmount(null); // Recalculate based on new box count
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    let paymentReceived = 0;
    let paymentMethod: PaymentMethod | null = null;
    let paymentProvider: string | null = null;

    if (paymentType === 'cash') {
      paymentReceived = parsedTotal;
      paymentMethod = 'CASH';
      paymentProvider = null;
    } else if (paymentType === 'upi') {
      paymentReceived = parsedTotal;
      paymentMethod = 'UPI';
      paymentProvider = 'GPay';
    } else if (paymentType === 'partial') {
      paymentReceived = parseFloat(partialAmount) || 0;
      paymentMethod = partialMethod;
      paymentProvider = partialMethod === 'UPI' ? 'GPay' : null;
    } else {
      // unpaid
      paymentReceived = 0;
      paymentMethod = null;
      paymentProvider = null;
    }

    const payments =
      paymentReceived > 0 && paymentMethod
        ? [
            {
              amount: paymentReceived,
              method: paymentMethod,
              provider: paymentProvider,
            },
          ]
        : [];

    const paymentSummaryText =
      paymentType === 'unpaid'
        ? 'Unpaid / Credit'
        : paymentType === 'partial'
          ? `Received ₹${paymentReceived.toLocaleString('en-IN')} via ${paymentMethod}`
          : `Fully paid ₹${paymentReceived.toLocaleString('en-IN')} in ${paymentMethod === 'UPI' ? 'GPay/UPI' : 'Cash'}`;

    const commandSummary = `Delivered ${boxes} boxes of ${activeProduct.name} to ${effectiveCustomerName} for ₹${parsedTotal.toLocaleString('en-IN')} (${paymentSummaryText})`;

    const draft: DeliveryDraft = {
      action: 'record_delivery',
      recipient_name: effectiveCustomerName,
      boxes_delivered: boxes,
      total_amount: parsedTotal,
      payment_received: paymentReceived,
      payment_method: paymentMethod,
      payment_provider: paymentProvider,
      payments,
      items: [
        {
          productId: activeProduct.id,
          product_name: activeProduct.name,
          size: activeProduct.size,
          quantity: boxes,
          unit_price: unitPrice,
        },
      ],
      notes: null,
      missing_fields: [],
      matched_customer: selectedCustomer
        ? {
            id: selectedCustomer.id,
            name: selectedCustomer.name,
            phone: selectedCustomer.phone,
            area: selectedCustomer.area?.name || null,
          }
        : null,
      requires_customer_selection: false,
    };

    onDraftCreated(draft, commandSummary);
  };

  return (
    <div className="w-full text-brand-dark">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-brand-primary text-white flex items-center justify-center shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-brand-dark">
              Quick Delivery Builder
            </h3>
            <p className="text-xs text-stone-500">
              Auto-calculates bill based on 1kg rate (₹{unitPrice}/box)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
          title="Close quick delivery builder"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1: Select Item Sold (Default: 1kg) */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
            <span className="flex items-center justify-center h-4.5 w-4.5 rounded-full bg-teal-100 text-brand-primary text-[11px] font-bold">
              1
            </span>
            <Package className="h-3.5 w-3.5 text-brand-primary" />
            Select Item Sold
          </label>

          <div className="grid grid-cols-3 gap-2">
            {availableProducts.map((p) => {
              const isSelected = activeProduct.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectProduct(p.id)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl text-center transition-all border ${
                    isSelected
                      ? 'bg-teal-50 border-brand-primary text-brand-dark shadow-xs ring-2 ring-brand-primary/20'
                      : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700'
                  }`}
                >
                  <span className="font-extrabold text-sm">{p.size}</span>
                  <span className="text-[11px] font-bold text-brand-primary mt-0.5">
                    ₹{p.currentPriceRupees}/box
                  </span>
                  {p.size === '1kg' && (
                    <span className="text-[9px] uppercase px-1.5 py-0.2 rounded-full bg-teal-100 text-teal-800 font-bold mt-1">
                      Default
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Number of boxes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-1.5 text-xs font-bold text-stone-700 uppercase tracking-wider">
              <span className="flex items-center justify-center h-4.5 w-4.5 rounded-full bg-teal-100 text-brand-primary text-[11px] font-bold">
                2
              </span>
              <Package className="h-3.5 w-3.5 text-brand-primary" />
              Number of Boxes Delivered
            </label>
            <span className="text-xs text-brand-primary font-bold">
              {boxes} boxes × ₹{unitPrice} = ₹{(boxes * unitPrice).toLocaleString('en-IN')}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {COMMON_BOX_OPTIONS.map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleBoxesChange(num)}
                className={`h-9 min-w-[2.5rem] px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  boxes === num
                    ? 'bg-brand-primary text-white shadow-sm ring-2 ring-brand-primary/20 scale-105'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                }`}
              >
                {num}
              </button>
            ))}

            <div className="flex items-center ml-auto border border-stone-200 rounded-xl overflow-hidden bg-stone-50 h-9">
              <button
                type="button"
                onClick={() => handleBoxesChange(boxes - 1)}
                className="px-2.5 h-full hover:bg-stone-200 text-stone-600 flex items-center justify-center"
                title="Decrease boxes"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <input
                type="number"
                min="1"
                value={boxes}
                onChange={(e) => handleBoxesChange(parseInt(e.target.value, 10) || 1)}
                className="w-12 text-center text-sm font-bold bg-transparent border-none focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleBoxesChange(boxes + 1)}
                className="px-2.5 h-full hover:bg-stone-200 text-stone-600 flex items-center justify-center"
                title="Increase boxes"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Step 3: List of customers */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
            <span className="flex items-center justify-center h-4.5 w-4.5 rounded-full bg-teal-100 text-brand-primary text-[11px] font-bold">
              3
            </span>
            <User className="h-3.5 w-3.5 text-brand-primary" />
            Select Customer
          </label>

          {/* Quick search input */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search customer name or area..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs sm:text-sm rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          {/* Customer list chips/cards */}
          <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 border border-stone-100 rounded-xl p-1.5 bg-stone-50/50">
            {isLoadingCustomers ? (
              <p className="text-xs text-stone-400 p-2">Loading customers...</p>
            ) : filteredCustomers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {filteredCustomers.map((c) => {
                  const isSelected = selectedCustomerId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId(c.id);
                        setCustomCustomerName('');
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-xl text-left text-xs sm:text-sm transition-all border ${
                        isSelected
                          ? 'bg-teal-50/80 border-brand-primary text-brand-dark font-bold shadow-xs'
                          : 'bg-white border-stone-200/80 hover:bg-stone-50 text-stone-700'
                      }`}
                    >
                      <div className="truncate pr-1">
                        <span className="block truncate font-bold">{c.name}</span>
                        {c.area?.name && (
                          <span className="text-[11px] text-stone-400 block truncate">
                            {c.area.name} {c.phone ? `• ${c.phone}` : ''}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 text-brand-primary shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-2 text-xs text-stone-500">
                <p>No customer found.</p>
                <input
                  type="text"
                  placeholder="Or enter customer name..."
                  value={customCustomerName}
                  onChange={(e) => {
                    setCustomCustomerName(e.target.value);
                    setSelectedCustomerId('');
                  }}
                  className="mt-1 w-full h-9 px-3 text-xs sm:text-sm rounded-xl border border-stone-300 bg-white"
                />
              </div>
            )}
          </div>
        </div>

        {/* Step 4: Total Amount & Payment */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-1.5 text-xs font-bold text-stone-700 uppercase tracking-wider">
              <span className="flex items-center justify-center h-4.5 w-4.5 rounded-full bg-teal-100 text-brand-primary text-[11px] font-bold">
                4
              </span>
              <IndianRupee className="h-3.5 w-3.5 text-brand-primary" />
              Total Amount & Payment Method
            </label>
            {customAmount !== null && (
              <button
                type="button"
                onClick={() => setCustomAmount(null)}
                className="text-[11px] text-brand-primary hover:underline flex items-center gap-1 font-semibold"
              >
                <RotateCcw className="h-3 w-3" /> Reset to ₹{standardTotal}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Total Amount Input */}
            <div>
              <div className="flex items-center justify-between text-xs text-stone-500 mb-1 font-medium">
                <span>Calculated Bill Amount (₹)</span>
                <span className="text-[11px] text-stone-400 font-mono">
                  {boxes} × ₹{unitPrice}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm font-bold text-stone-500">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={totalAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="2900"
                  className="w-full h-10 pl-8 pr-3 text-sm font-bold rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <span className="block text-xs text-stone-500 mb-1 font-medium">
                Payment Status
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaymentType('cash')}
                  className={`h-10 px-2 rounded-xl text-xs sm:text-sm font-medium border flex items-center justify-center gap-1 transition-all ${
                    paymentType === 'cash'
                      ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-sm'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  💵 Cash
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType('upi')}
                  className={`h-10 px-2 rounded-xl text-xs sm:text-sm font-medium border flex items-center justify-center gap-1 transition-all ${
                    paymentType === 'upi'
                      ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-sm'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  📱 GPay
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType('unpaid')}
                  className={`h-10 px-2 rounded-xl text-xs sm:text-sm font-medium border flex items-center justify-center gap-1 transition-all ${
                    paymentType === 'unpaid'
                      ? 'bg-rose-600 text-white border-rose-600 font-bold shadow-sm'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  ⏳ Unpaid
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType('partial')}
                  className={`h-10 px-2 rounded-xl text-xs sm:text-sm font-medium border flex items-center justify-center gap-1 transition-all ${
                    paymentType === 'partial'
                      ? 'bg-amber-600 text-white border-amber-600 font-bold shadow-sm'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  🌓 Partial
                </button>
              </div>
            </div>
          </div>

          {/* Partial payment extra fields */}
          {paymentType === 'partial' && (
            <div className="mt-2.5 p-3 rounded-xl bg-amber-50/80 border border-amber-200 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="block text-[11px] font-semibold text-amber-900 mb-1">
                  Amount Received (₹)
                </span>
                <input
                  type="number"
                  min="0"
                  max={totalAmount || undefined}
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  placeholder="e.g. 1000"
                  className="w-full h-8 px-2.5 text-xs sm:text-sm font-bold rounded-lg border border-amber-300 bg-white"
                />
              </div>
              <div>
                <span className="block text-[11px] font-semibold text-amber-900 mb-1">
                  Payment Mode
                </span>
                <select
                  value={partialMethod}
                  onChange={(e) => setPartialMethod(e.target.value as PaymentMethod)}
                  className="w-full h-8 px-2 text-xs sm:text-sm rounded-lg border border-amber-300 bg-white"
                >
                  <option value="UPI">GPay / UPI</option>
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-stone-100">
          <div className="text-xs text-stone-500 truncate">
            {effectiveCustomerName ? (
              <span>
                Ready: <strong>{boxes} boxes</strong> of <strong>{activeProduct.size}</strong> to <strong>{effectiveCustomerName}</strong> (₹{parsedTotal || 0})
              </span>
            ) : (
              <span className="text-stone-400">Please select a customer</span>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={!canSubmit}
            className="w-full sm:w-auto font-bold shadow-md h-11"
          >
            Create Delivery Draft
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </form>
    </div>
  );
}
