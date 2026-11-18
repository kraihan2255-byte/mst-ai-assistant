import React, { useState } from 'react';
import { Modal } from '../../components/ui/modal';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { useCreateProduct } from '../../hooks/use-products';
import { useToast } from '../../components/ui/toast';

export interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateProductModal({ isOpen, onClose }: CreateProductModalProps) {
  const toast = useToast();
  const createProductMutation = useCreateProduct();

  const [name, setName] = useState('');
  const [size, setSize] = useState('');
  const [sku, setSku] = useState('');
  const [initialPriceRupees, setInitialPriceRupees] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setSize('');
    setSku('');
    setInitialPriceRupees('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !size.trim()) {
      setError('Product name and size (e.g. 250g, 500g, 1kg) are required.');
      return;
    }

    const priceNum = typeof initialPriceRupees === 'number' ? initialPriceRupees : 0;
    if (priceNum <= 0) {
      setError('Initial unit price must be greater than zero.');
      return;
    }

    try {
      const created = await createProductMutation.mutateAsync({
        name: name.trim(),
        size: size.trim(),
        sku: sku.trim() || undefined,
        initialPriceRupees: priceNum,
      });

      toast.success(`Product "${created.name}" created at ₹${priceNum}!`);
      resetForm();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create product.';
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title="Add New Catalog Product"
      description="Create a product packaging size and assign its base wholesale price."
    >
      <form onSubmit={handleSubmit} className="space-y-4 mt-2">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        <Input
          label="Product Name *"
          placeholder="e.g. Coconut Milk 250g Tetra"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Pack Size *"
            placeholder="e.g. 250g, 500g, 1kg"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            required
          />

          <Input
            label="SKU Code"
            placeholder="e.g. CM-250G"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
          />
        </div>

        <Input
          label="Initial Price (₹) *"
          type="number"
          min="1"
          placeholder="e.g. 85"
          value={initialPriceRupees}
          onChange={(e) =>
            setInitialPriceRupees(e.target.value === '' ? '' : Number(e.target.value))
          }
          required
        />

        <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              resetForm();
              onClose();
            }}
            disabled={createProductMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={createProductMutation.isPending}
          >
            Add Product
          </Button>
        </div>
      </form>
    </Modal>
  );
}
