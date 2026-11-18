import { useState } from 'react';
import {
  Package,
  Plus,
  History,
  Tag,
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { CreateProductModal } from './CreateProductModal';
import { UpdatePriceModal } from './UpdatePriceModal';
import { PriceHistoryModal } from './PriceHistoryModal';
import { useProducts } from '../../hooks/use-products';
import { formatRupees, formatDate } from '../../lib/formatters';
import type { Product } from '../../types/api';

export function ProductList() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [updatingProduct, setUpdatingProduct] = useState<Product | null>(null);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);

  const { data: products = [], isLoading, error, refetch } = useProducts(false);

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-brand-dark tracking-tight">
            Products & Pricing Catalog
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Manage wholesale packaging sizes, SKUs, and independent price histories
          </p>
        </div>

        <Button
          onClick={() => setIsCreateOpen(true)}
          variant="primary"
          size="md"
          className="shadow-sm shrink-0"
        >
          <Plus className="h-4 w-4 mr-1" /> Add Product
        </Button>
      </div>

      {/* Error state */}
      {error && <ErrorBanner message={error.message} onRetry={() => refetch()} />}

      {/* Loading state */}
      {isLoading && <LoadingSpinner label="Loading product catalog..." />}

      {/* Empty state */}
      {!isLoading && !error && products.length === 0 && (
        <EmptyState
          title="Catalog is empty"
          description="Add your first coconut milk product packaging size."
          icon={<Package className="h-8 w-8 text-brand-primary" />}
          actionLabel="Add Product"
          onAction={() => setIsCreateOpen(true)}
        />
      )}

      {/* Product Cards Grid */}
      {!isLoading && !error && products.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((product) => (
            <Card
              key={product.id}
              padding="lg"
              className="flex flex-col justify-between hover:shadow-md hover:border-teal-200 transition-all bg-white"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-brand-primary font-bold text-sm">
                    {product.size}
                  </div>
                  <Badge variant={product.isActive ? 'success' : 'neutral'} size="sm">
                    {product.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="mt-4">
                  <h3 className="font-extrabold text-lg text-brand-dark">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-stone-400 font-mono">
                    <span>SKU: {product.sku || 'N/A'}</span>
                    <span>•</span>
                    <span>Size: {product.size}</span>
                  </div>
                </div>

                {/* Price Display */}
                <div className="mt-5 p-4 rounded-xl bg-stone-50 border border-stone-100">
                  <span className="text-[11px] uppercase tracking-wider text-stone-400 font-bold block">
                    Current Wholesale Rate
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-brand-dark tracking-tight">
                      {formatRupees(product.currentPriceRupees)}
                    </span>
                    <span className="text-xs text-stone-500 font-medium">/ unit</span>
                  </div>
                  <span className="text-[10px] text-stone-400 mt-1 block">
                    Effective: {formatDate(product.effectivePriceDate)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHistoryProduct(product)}
                  className="text-xs font-semibold"
                >
                  <History className="h-3.5 w-3.5 mr-1 text-stone-400" />
                  Price History
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setUpdatingProduct(product)}
                  className="text-xs font-semibold"
                >
                  <Tag className="h-3.5 w-3.5 mr-1" />
                  Update Price
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Product Modal */}
      <CreateProductModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      {/* Update Price Modal */}
      <UpdatePriceModal
        isOpen={Boolean(updatingProduct)}
        onClose={() => setUpdatingProduct(null)}
        product={updatingProduct}
      />

      {/* Price History Modal */}
      <PriceHistoryModal
        isOpen={Boolean(historyProduct)}
        onClose={() => setHistoryProduct(null)}
        product={historyProduct}
      />
    </div>
  );
}
