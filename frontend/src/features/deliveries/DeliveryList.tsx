import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck,
  Search,
  Plus,
  Eye,
  Bot,
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { DeliveryDetailModal } from './DeliveryDetailModal';
import { RecordPaymentModal } from '../payments/RecordPaymentModal';
import { useDeliveries } from '../../hooks/use-deliveries';
import {
  formatRupees,
  formatDate,
  getPaymentStatusColor,
} from '../../lib/formatters';
import type { Delivery } from '../../types/api';

export function DeliveryList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [paymentDelivery, setPaymentDelivery] = useState<Delivery | null>(null);

  const { data: deliveries = [], isLoading, error, refetch } = useDeliveries({
    paymentStatus: statusFilter || undefined,
  });

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((d) => {
      const matchesSearch =
        searchTerm.trim() === '' ||
        d.customerName.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  }, [deliveries, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-brand-dark tracking-tight">
            Deliveries & Orders
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Overview of completed drop-offs, itemizations, and collection statuses
          </p>
        </div>

        <Link to="/assistant">
          <Button variant="primary" size="md" className="shadow-sm shrink-0">
            <Bot className="h-4 w-4 mr-1.5" /> Record with AI Assistant
          </Button>
        </Link>
      </div>

      {/* Filter Bar */}
      <Card padding="sm" className="bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search deliveries by customer name..."
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div>
            <select
              className="w-full h-10 rounded-lg border border-stone-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Payment Statuses</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Fully Paid</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Error state */}
      {error && <ErrorBanner message={error.message} onRetry={() => refetch()} />}

      {/* Loading state */}
      {isLoading && <LoadingSpinner label="Loading deliveries..." />}

      {/* Empty state */}
      {!isLoading && !error && filteredDeliveries.length === 0 && (
        <EmptyState
          title="No deliveries found"
          description={
            searchTerm || statusFilter
              ? 'No deliveries match your filter criteria.'
              : 'Record your first delivery quickly using the natural language AI assistant.'
          }
          icon={<Truck className="h-8 w-8 text-brand-primary" />}
          actionLabel="Open AI Assistant"
          onAction={() => {}}
        />
      )}

      {/* Deliveries Table */}
      {!isLoading && !error && filteredDeliveries.length > 0 && (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-[11px] font-bold uppercase tracking-wider text-stone-500 border-b border-stone-100">
                <tr>
                  <th className="px-5 py-3">Delivery Date</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Type & Boxes</th>
                  <th className="px-5 py-3 text-right">Billed Amount</th>
                  <th className="px-5 py-3 text-right">Paid</th>
                  <th className="px-5 py-3 text-right">Outstanding</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredDeliveries.map((delivery) => {
                  const status = getPaymentStatusColor(delivery.paymentStatus);
                  const isUnsettled = delivery.outstandingRupees > 0;

                  return (
                    <tr
                      key={delivery.id}
                      className="hover:bg-stone-50/50 transition-colors"
                    >
                      <td className="px-5 py-3.5 text-xs text-stone-600 font-medium">
                        {formatDate(delivery.deliveryDate)}
                      </td>

                      <td className="px-5 py-3.5">
                        <Link
                          to={`/customers/${delivery.customerId}`}
                          className="font-bold text-brand-dark hover:text-brand-primary"
                        >
                          {delivery.customerName}
                        </Link>
                      </td>

                      <td className="px-5 py-3.5 text-xs">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            delivery.deliveryType === 'ITEMIZED'
                              ? 'bg-teal-50 text-brand-primary'
                              : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {delivery.deliveryType === 'ITEMIZED'
                            ? `${delivery.itemsCount} Items`
                            : 'Bulk'}
                        </span>
                        {delivery.outerBoxes !== null && (
                          <span className="ml-1.5 text-stone-500">
                            ({delivery.outerBoxes} boxes)
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right font-bold text-brand-dark">
                        {formatRupees(delivery.totalAmountRupees)}
                      </td>

                      <td className="px-5 py-3.5 text-right font-semibold text-emerald-700">
                        {formatRupees(delivery.totalPaidRupees)}
                      </td>

                      <td className="px-5 py-3.5 text-right font-bold text-rose-600">
                        {formatRupees(delivery.outstandingRupees)}
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${status.bg} ${status.text} ${status.border}`}
                        >
                          {status.label}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedDelivery(delivery)}
                            title="View Full Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {isUnsettled && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPaymentDelivery(delivery)}
                              className="text-xs"
                            >
                              <Plus className="h-3 w-3 mr-1" /> Pay
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Detail Modal */}
      <DeliveryDetailModal
        isOpen={Boolean(selectedDelivery)}
        onClose={() => setSelectedDelivery(null)}
        delivery={selectedDelivery}
      />

      {/* Record Payment Modal */}
      {paymentDelivery && (
        <RecordPaymentModal
          isOpen={Boolean(paymentDelivery)}
          onClose={() => setPaymentDelivery(null)}
          delivery={paymentDelivery}
        />
      )}
    </div>
  );
}
