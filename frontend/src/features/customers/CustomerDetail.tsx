import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  MapPin,
  Phone,
  FileText,
  Truck,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { EmptyState } from '../../components/common/EmptyState';
import { RecordPaymentModal } from '../payments/RecordPaymentModal';
import {
  useCustomer,
  useCustomerBalance,
  useCustomerDeliveries,
} from '../../hooks/use-customers';
import {
  formatRupees,
  formatDate,
  getPaymentStatusColor,
} from '../../lib/formatters';
import type { Delivery } from '../../types/api';

export function CustomerDetail() {
  const { id = '' } = useParams<{ id: string }>();

  const { data: customer, isLoading: isCustomerLoading, error: customerError } = useCustomer(id);
  const { data: balance, isLoading: isBalanceLoading } = useCustomerBalance(id);
  const { data: deliveries = [], isLoading: isDeliveriesLoading } = useCustomerDeliveries(id);

  const [paymentDelivery, setPaymentDelivery] = useState<Delivery | null>(null);

  const isLoading = isCustomerLoading || isBalanceLoading || isDeliveriesLoading;

  if (customerError) {
    return (
      <div className="space-y-4">
        <Link to="/customers">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Customers
          </Button>
        </Link>
        <ErrorBanner message={customerError.message} />
      </div>
    );
  }

  if (isLoading && !customer) {
    return <LoadingSpinner label="Loading customer account..." />;
  }

  if (!customer) {
    return (
      <EmptyState
        title="Customer not found"
        description="The requested customer profile could not be located."
        actionLabel="Back to Customers"
        onAction={() => {}}
      />
    );
  }

  const statusColors = balance ? getPaymentStatusColor(balance.paymentStatus) : null;

  return (
    <div className="space-y-6">
      {/* Top Nav Back */}
      <div className="flex items-center justify-between">
        <Link to="/customers">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Customers
          </Button>
        </Link>
      </div>

      {/* Customer Header & Balance Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Profile Card */}
        <Card padding="md" className="lg:col-span-1">
          <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
            <div className="h-12 w-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-brand-primary">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-brand-dark">
                {customer.name}
              </h2>
              {customer.area && (
                <div className="flex items-center gap-1 text-xs text-stone-500 mt-0.5">
                  <MapPin className="h-3 w-3 text-stone-400" />
                  <span>{customer.area.name}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-3 text-xs">
            {customer.phone && (
              <div className="flex items-center gap-2 text-stone-600">
                <Phone className="h-4 w-4 text-stone-400 shrink-0" />
                <span className="font-mono text-sm">{customer.phone}</span>
              </div>
            )}

            {customer.address && (
              <div className="flex items-start gap-2 text-stone-600">
                <MapPin className="h-4 w-4 text-stone-400 shrink-0 mt-0.5" />
                <span>{customer.address}</span>
              </div>
            )}

            {customer.notes && (
              <div className="flex items-start gap-2 text-stone-500 bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                <FileText className="h-4 w-4 text-stone-400 shrink-0 mt-0.5" />
                <span>{customer.notes}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Live Financial Balance Card */}
        <Card padding="md" className="lg:col-span-2 flex flex-col justify-between bg-white border-teal-100">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <CardTitle>Account Financial Balance</CardTitle>
              {statusColors && (
                <span
                  className={`text-xs px-3 py-1 rounded-full font-bold border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}
                >
                  {statusColors.label}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/60">
                <span className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold block">
                  Total Billed
                </span>
                <span className="text-xl font-extrabold text-brand-dark mt-1 block">
                  {formatRupees(balance?.totalBilledRupees || 0)}
                </span>
                <span className="text-[11px] text-stone-400 mt-1 block">
                  Across {balance?.totalDeliveries || 0} deliveries
                </span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
                <span className="text-[11px] uppercase tracking-wider text-emerald-700 font-semibold block">
                  Total Paid
                </span>
                <span className="text-xl font-extrabold text-emerald-800 mt-1 block">
                  {formatRupees(balance?.totalPaidRupees || 0)}
                </span>
                <span className="text-[11px] text-emerald-600 mt-1 block">
                  All settled transactions
                </span>
              </div>

              <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-100">
                <span className="text-[11px] uppercase tracking-wider text-rose-700 font-semibold block">
                  Current Dues
                </span>
                <span className="text-xl font-extrabold text-rose-700 mt-1 block">
                  {formatRupees(balance?.outstandingRupees || 0)}
                </span>
                <span className="text-[11px] text-rose-600 mt-1 block">
                  Outstanding balance
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-100 text-xs text-stone-400">
            * Balances are dynamically calculated from immutable transaction receipts.
          </div>
        </Card>
      </div>

      {/* Deliveries & Transaction History */}
      <Card padding="none">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <div>
            <CardTitle>Delivery History</CardTitle>
            <p className="text-xs text-stone-500 mt-0.5">
              All drop-offs, itemizations, and payments for {customer.name}
            </p>
          </div>
        </div>

        {deliveries.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No deliveries recorded"
              description={`No delivery records exist for ${customer.name} yet.`}
              icon={<Truck className="h-8 w-8 text-brand-primary" />}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-[11px] font-bold uppercase tracking-wider text-stone-500 border-b border-stone-100">
                <tr>
                  <th className="px-5 py-3">Delivery Date</th>
                  <th className="px-5 py-3">Details / Items</th>
                  <th className="px-5 py-3 text-right">Billed</th>
                  <th className="px-5 py-3 text-right">Paid</th>
                  <th className="px-5 py-3 text-right">Outstanding</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {deliveries.map((delivery) => {
                  const status = getPaymentStatusColor(delivery.paymentStatus);
                  const isUnsettled = delivery.outstandingRupees > 0;

                  return (
                    <tr key={delivery.id} className="hover:bg-stone-50/50">
                      <td className="px-5 py-3.5 text-xs text-stone-600">
                        {formatDate(delivery.deliveryDate)}
                        {delivery.outerBoxes !== null && (
                          <span className="block font-semibold text-brand-dark">
                            {delivery.outerBoxes} outer boxes
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-xs">
                        {delivery.deliveryType === 'ITEMIZED' ? (
                          <div className="space-y-0.5">
                            {delivery.items.map((it) => (
                              <div key={it.id} className="text-stone-700">
                                {it.quantity}x {it.product?.name || 'Milk'} @ ₹{it.unitPricePaise / 100}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-stone-500">Non-itemized bulk</span>
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
                        {isUnsettled ? (
                          <Button
                            onClick={() => setPaymentDelivery(delivery)}
                            variant="primary"
                            size="sm"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Record Payment
                          </Button>
                        ) : (
                          <span className="text-xs text-emerald-700 font-semibold inline-flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" /> Settled
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

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
