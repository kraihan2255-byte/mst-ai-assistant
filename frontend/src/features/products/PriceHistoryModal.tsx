import { Modal } from '../../components/ui/modal';
import { Button } from '../../components/ui/button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { formatRupees, formatDateTime } from '../../lib/formatters';
import { useProductPriceHistory } from '../../hooks/use-products';
import type { Product } from '../../types/api';

export interface PriceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export function PriceHistoryModal({
  isOpen,
  onClose,
  product,
}: PriceHistoryModalProps) {
  const { data: priceHistory = [], isLoading } = useProductPriceHistory(
    product?.id || '',
  );

  if (!product) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Price History: ${product.name}`}
      description="Auditable track record of effective price revisions over time."
    >
      <div className="space-y-4 mt-2">
        {isLoading ? (
          <LoadingSpinner label="Loading price history..." />
        ) : priceHistory.length === 0 ? (
          <p className="text-xs text-stone-400 py-4 text-center">
            No historical price records found.
          </p>
        ) : (
          <div className="divide-y divide-stone-100 rounded-xl border border-stone-200 overflow-hidden">
            {priceHistory.map((item, index) => {
              const effectiveDate = new Date(item.effectiveFrom);
              const isFuture = effectiveDate.getTime() > Date.now();
              const isLatest = index === 0 && !isFuture;

              return (
                <div
                  key={item.id}
                  className="p-3.5 flex items-center justify-between text-xs bg-white hover:bg-stone-50"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-brand-dark">
                        {formatRupees(item.pricePaise / 100)}
                      </span>
                      {isLatest && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                          Current Active
                        </span>
                      )}
                      {isFuture && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px]">
                          Scheduled Future
                        </span>
                      )}
                    </div>
                    <span className="text-stone-400 text-[11px] mt-0.5 block">
                      Effective: {formatDateTime(item.effectiveFrom)}
                    </span>
                  </div>

                  <span className="text-[10px] text-stone-400 font-mono">
                    Logged: {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-2 text-right">
          <Button variant="ghost" onClick={onClose} size="sm">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
