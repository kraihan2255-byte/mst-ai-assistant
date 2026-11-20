import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck,
  Search,
  Plus,
  Eye,
  Bot,
  FileText,
  Share2,
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { DeliveryDetailModal } from './DeliveryDetailModal';
import { RecordPaymentModal } from '../payments/RecordPaymentModal';
import { InvoiceModal } from '../invoices/InvoiceModal';
import { sendWhatsAppInvoice } from '../invoices/whatsapp-invoice';
import { useDeliveries } from '../../hooks/use-deliveries';
import {
  formatRupees,
  formatDate,
  getPaymentStatusColor,
} from '../../lib/formatters';
import { cn } from '../../lib/utils';
import type { Delivery } from '../../types/api';

export function DeliveryList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [paymentDelivery, setPaymentDelivery] = useState<Delivery | null>(null);
  const [invoiceDelivery, setInvoiceDelivery] = useState<Delivery | null>(null);

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

      {/* Deliveries Display (Mobile Card List + Desktop Table) */}
      {!isLoading && !error && filteredDeliveries.length > 0 && (
        <>
          {/* Mobile Delivery Cards (sm:hidden) */}
          <div className="block sm:hidden space-y-3">
            {filteredDeliveries.map((delivery) => {
              const status = getPaymentStatusColor(delivery.paymentStatus);
              const isUnsettled = delivery.outstandingRupees > 0;

              return (
                <Card key={delivery.id} padding="md" className="bg-white border-stone-200">
                  <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-stone-100">
                    <div>
                      <Link
                        to={`/customers/${delivery.customerId}`}
                        className="font-bold text-base text-brand-dark hover:text-brand-primary block"
                      >
                        {delivery.customerName}
                      </Link>
                      <span className="text-xs text-stone-500 font-medium">
                        {formatDate(delivery.deliveryDate)}
                      </span>
                    </div>
                    <span
                      className={`shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${status.bg} ${status.text} ${status.border}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  {/* Delivery Details & Financials */}
                  <div className="grid grid-cols-3 gap-2 py-2.5 text-xs border-b border-stone-100">
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase font-medium">Quantity</span>
                      <span className="font-semibold text-stone-800">
                        {delivery.outerBoxes !== null ? `${delivery.outerBoxes} boxes` : 'Bulk'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase font-medium">Total Billed</span>
                      <span className="font-bold text-brand-dark">
                        {formatRupees(delivery.totalAmountRupees)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase font-medium">Outstanding</span>
                      <span className={cn('font-bold', isUnsettled ? 'text-rose-600' : 'text-emerald-600')}>
                        {formatRupees(delivery.outstandingRupees)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons for Mobile */}
                  <div className="pt-2.5 flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedDelivery(delivery)}
                        className="h-8 px-2 text-xs"
                        title="View Details"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" /> View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setInvoiceDelivery(delivery)}
                        className="h-8 px-2 text-xs text-brand-primary"
                        title="Invoice"
                      >
                        <FileText className="h-3.5 w-3.5 mr-1" /> Bill
                      </Button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => sendWhatsAppInvoice(delivery)}
                        className="h-8 px-2 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-semibold"
                        title="WhatsApp Bill"
                      >
                        <Share2 className="h-3.5 w-3.5 mr-1" /> WhatsApp
                      </Button>
                      {isUnsettled && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setPaymentDelivery(delivery)}
                          className="h-8 px-2.5 text-xs font-bold"
                        >
                          <Plus className="h-3 w-3 mr-0.5" /> Pay
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Desktop Table View (hidden sm:block) */}
          <div className="hidden sm:block">
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

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setInvoiceDelivery(delivery)}
                                title="View / Print Invoice"
                                className="text-brand-primary hover:bg-brand-accent/50"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => sendWhatsAppInvoice(delivery)}
                                title="Send Bill on WhatsApp"
                                className="text-emerald-600 hover:bg-emerald-50"
                              >
                                <Share2 className="h-4 w-4" />
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
          </div>
        </>
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

      {/* Invoice Modal */}
      {invoiceDelivery && (
        <InvoiceModal
          isOpen={Boolean(invoiceDelivery)}
          onClose={() => setInvoiceDelivery(null)}
          delivery={invoiceDelivery}
        />
      )}
    </div>
  );
}
