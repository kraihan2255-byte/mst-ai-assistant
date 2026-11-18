import { useState } from 'react';
import { Modal } from '../../components/ui/modal';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { useAddPrice } from '../../hooks/use-products';
import { useToast } from '../../components/ui/toast';
import { formatRupees } from '../../lib/formatters';
import type { Product } from '../../types/api';
import { AlertCircle } from 'lucide-react';

export interface UpdatePriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export function UpdatePriceModal({
  isOpen,
  onClose,
  product,
}: UpdatePriceModalProps) {
  const toast = useToast();
  const addPriceMutation = useAddPrice(product?.id || '');

  const [priceRupees, setPriceRupees] = useState<number | ''>('');
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().slice(0, 16),
  );
  const [error, setError] = useState<string | null>(null);

  if (!product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const priceNum = typeof priceRupees === 'number' ? priceRupees : 0;
    if (priceNum <= 0) {
      setError('New price must be greater than zero.');
      return;
    }

    try {
      await addPriceMutation.mutateAsync({
        priceRupees: priceNum,
        effectiveFrom: new Date(effectiveFrom).toISOString(),
      });

      toast.success(
        `Updated price for ${product.name} to ₹${priceNum} effective from ${new Date(effectiveFrom).toLocaleDateString()}!`,
      );
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update price.';
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Update Price: ${product.name}`}
      description={`Currently ₹${product.currentPriceRupees}. Historical deliveries will retain their original rate.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 mt-2">
        <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs flex justify-between">
          <span className="text-stone-500 font-medium">Current Active Price:</span>
          <span className="font-bold text-brand-dark">
            {formatRupees(product.currentPriceRupees)} / unit
          </span>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Input
          label="New Price (₹) *"
          type="number"
          min="1"
          placeholder="e.g. 165"
          value={priceRupees}
          onChange={(e) =>
            setPriceRupees(e.target.value === '' ? '' : Number(e.target.value))
          }
          required
        />

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
            Effective From (Date & Time)
          </label>
          <input
            type="datetime-local"
            className="w-full h-10 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
          />
          <p className="mt-1 text-[11px] text-stone-400">
            Set today for immediate effect, or choose a future date for scheduled rate changes.
          </p>
        </div>

        <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={addPriceMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={addPriceMutation.isPending}
          >
            Apply Price Change
          </Button>
        </div>
      </form>
    </Modal>
  );
}
