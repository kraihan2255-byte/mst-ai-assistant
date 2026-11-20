import { Link } from 'react-router-dom';
import {
  Truck,
  IndianRupee,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  Bot,
  Users,
} from 'lucide-react';
import { StatCard } from '../../components/common/StatCard';
import { Card, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { EmptyState } from '../../components/common/EmptyState';
import {
  useReportSummary,
  useReportOutstanding,
  useReportPayments,
} from '../../hooks/use-reports';
import { useDeliveries } from '../../hooks/use-deliveries';
import {
  formatRupees,
  formatDate,
  getPaymentStatusColor,
} from '../../lib/formatters';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';

export function DashboardOverview() {
  const {
    data: summary,
    isLoading: isSummaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useReportSummary();

  const {
    data: outstandingCustomers = [],
    isLoading: isOutstandingLoading,
  } = useReportOutstanding();

  const {
    data: paymentsReport,
    isLoading: isPaymentsLoading,
  } = useReportPayments();

  const {
    data: recentDeliveries = [],
    isLoading: isDeliveriesLoading,
  } = useDeliveries();

  const isLoading =
    isSummaryLoading ||
    isOutstandingLoading ||
    isPaymentsLoading ||
    isDeliveriesLoading;

  if (summaryError) {
    return (
      <div className="space-y-4">
        <ErrorBanner
          message={summaryError.message}
          onRetry={() => refetchSummary()}
        />
      </div>
    );
  }

  if (isLoading && !summary) {
    return <LoadingSpinner label="Loading business dashboard metrics..." />;
  }

  // Payment methods chart data
  const paymentMethodData = paymentsReport?.byMethod
    ? Object.entries(paymentsReport.byMethod).map(([method, data]) => ({
        method,
        totalRupees: data.totalRupees,
        count: data.count,
      }))
    : [];

  const METHOD_COLORS: Record<string, string> = {
    UPI: '#107B6C',
    CASH: '#8AC5AB',
    BANK_TRANSFER: '#2563EB',
    CHEQUE: '#F59E0B',
    OTHER: '#6B7280',
  };

  return (
    <div className="space-y-6">
      {/* Quick AI Action Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-primary to-[#0d6558] p-6 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider backdrop-blur-sm mb-2">
            <Bot className="h-3.5 w-3.5" /> AI Assistant Ready
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Record deliveries in seconds
          </h2>
          <p className="text-white/80 text-sm mt-1 max-w-xl">
            Type or paste natural language delivery details. The AI extracts boxes, customers, and payments for one-click verification.
          </p>
        </div>
        <Link to="/assistant">
          <Button
            variant="secondary"
            size="lg"
            className="bg-brand-accent text-brand-dark hover:bg-white shadow-sm font-bold shrink-0"
          >
            Open Assistant <ArrowUpRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>

      {/* 5 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Deliveries"
          value={formatRupees(summary?.totalDeliveryValueRupees || 0)}
          subtitle={`${summary?.totalDeliveries || 0} deliveries (${summary?.totalOuterBoxes || 0} boxes)`}
          icon={<Truck className="h-5 w-5" />}
          variant="primary"
        />

        <StatCard
          title="Collections"
          value={formatRupees(summary?.totalPaymentsReceivedRupees || 0)}
          subtitle="Total payments collected"
          icon={<IndianRupee className="h-5 w-5" />}
          variant="success"
        />

        <StatCard
          title="Outstanding Credit"
          value={formatRupees(summary?.totalOutstandingCreditRupees || 0)}
          subtitle={`${summary?.customersWithOutstandingCount || 0} customers with dues`}
          icon={<AlertTriangle className="h-5 w-5" />}
          variant="danger"
        />

        <StatCard
          title="Active Deliveries"
          value={summary?.totalDeliveries || 0}
          subtitle="Lifetime delivery orders"
          icon={<Clock className="h-5 w-5" />}
          variant="default"
        />

        <StatCard
          title="Credit Customers"
          value={summary?.customersWithOutstandingCount || 0}
          subtitle="Pending settlements"
          icon={<Users className="h-5 w-5" />}
          variant="warning"
        />
      </div>

      {/* Mid Section: Recent Deliveries & Collections Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Deliveries Table (2 cols) */}
        <Card className="lg:col-span-2" padding="none">
          <div className="p-5 border-b border-stone-100 flex items-center justify-between">
            <div>
              <CardTitle>Recent Deliveries</CardTitle>
              <p className="text-xs text-stone-500 mt-0.5">
                Latest customer drop-offs and billing status
              </p>
            </div>
            <Link to="/deliveries">
              <Button variant="ghost" size="sm">
                View all <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="overflow-x-auto">
            {recentDeliveries.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="No deliveries yet"
                  description="Use the AI Assistant to record your first delivery!"
                  actionLabel="Record Delivery"
                  onAction={() => {}}
                />
              </div>
            ) : (
              <>
                {/* Mobile Recent Deliveries (sm:hidden) */}
                <div className="block sm:hidden divide-y divide-stone-100 p-3 space-y-3">
                  {recentDeliveries.slice(0, 6).map((delivery) => {
                    const status = getPaymentStatusColor(delivery.paymentStatus);
                    return (
                      <div key={delivery.id} className="pt-2.5 first:pt-0 space-y-1.5">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-bold text-sm text-brand-dark block">
                              {delivery.customerName}
                            </span>
                            <span className="text-xs text-stone-500">
                              {formatDate(delivery.deliveryDate)}
                              {delivery.outerBoxes !== null ? ` • ${delivery.outerBoxes} boxes` : ''}
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${status.bg} ${status.text} ${status.border}`}
                          >
                            {status.label}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs bg-stone-50 p-2 rounded-lg font-medium">
                          <span className="text-stone-500">Billed: <strong className="text-brand-dark">{formatRupees(delivery.totalAmountRupees)}</strong></span>
                          <span className="text-stone-500">Paid: <strong className="text-emerald-700">{formatRupees(delivery.totalPaidRupees)}</strong></span>
                          <span className="text-stone-500">Due: <strong className="text-rose-600">{formatRupees(delivery.outstandingRupees)}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table View (hidden sm:table) */}
                <table className="hidden sm:table w-full text-left text-sm">
                  <thead className="bg-stone-50/70 text-[11px] font-bold uppercase tracking-wider text-stone-500 border-b border-stone-100">
                    <tr>
                      <th className="px-5 py-3">Customer</th>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3 text-right">Billed</th>
                      <th className="px-5 py-3 text-right">Paid</th>
                      <th className="px-5 py-3 text-right">Outstanding</th>
                      <th className="px-5 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {recentDeliveries.slice(0, 6).map((delivery) => {
                      const status = getPaymentStatusColor(delivery.paymentStatus);
                      return (
                        <tr
                          key={delivery.id}
                          className="hover:bg-stone-50/50 transition-colors"
                        >
                          <td className="px-5 py-3.5 font-bold text-brand-dark">
                            {delivery.customerName}
                            {delivery.outerBoxes !== null && (
                              <span className="block text-xs font-normal text-stone-500">
                                {delivery.outerBoxes} boxes
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-stone-600 text-xs">
                            {formatDate(delivery.deliveryDate)}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                delivery.deliveryType === 'ITEMIZED'
                                  ? 'bg-teal-50 text-brand-primary'
                                  : 'bg-stone-100 text-stone-600'
                              }`}
                            >
                              {delivery.deliveryType === 'ITEMIZED'
                                ? `${delivery.itemsCount} Items`
                                : 'Non-Itemized'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right font-semibold text-brand-dark">
                            {formatRupees(delivery.totalAmountRupees)}
                          </td>
                          <td className="px-5 py-3.5 text-right text-emerald-700 font-semibold">
                            {formatRupees(delivery.totalPaidRupees)}
                          </td>
                          <td className="px-5 py-3.5 text-right font-bold text-brand-dark">
                            {formatRupees(delivery.outstandingRupees)}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${status.bg} ${status.text} ${status.border}`}
                            >
                              {status.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </Card>

        {/* Payment Collections Breakdown Chart (1 col) */}
        <Card padding="md" className="flex flex-col justify-between">
          <div>
            <CardTitle>Collections by Method</CardTitle>
            <p className="text-xs text-stone-500 mt-0.5 mb-4">
              Real-time cash vs digital collection distribution
            </p>

            {paymentMethodData.length === 0 ? (
              <div className="py-12 text-center text-xs text-stone-400">
                No payment collection records available yet.
              </div>
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paymentMethodData} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <XAxis type="number" tickFormatter={(val) => `₹${val}`} stroke="#9CA3AF" fontSize={11} />
                    <YAxis dataKey="method" type="category" stroke="#4B5563" fontSize={11} width={80} />
                    <Tooltip
                      formatter={(val: number) => [formatRupees(val), 'Total Collected']}
                      contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: 8, borderColor: '#E5E7EB' }}
                    />
                    <Bar dataKey="totalRupees" radius={[0, 6, 6, 0]}>
                      {paymentMethodData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={METHOD_COLORS[entry.method] || '#107B6C'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-stone-100 text-xs text-stone-600 flex justify-between items-center">
            <span>Total Payments:</span>
            <span className="font-bold text-emerald-700">
              {formatRupees(paymentsReport?.totalPaymentsRupees || 0)} ({paymentsReport?.totalPaymentsCount || 0} txn)
            </span>
          </div>
        </Card>
      </div>

      {/* Bottom Section: Top Outstanding Customers */}
      <Card padding="none">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <div>
            <CardTitle>Customers with Outstanding Balances</CardTitle>
            <p className="text-xs text-stone-500 mt-0.5">
              Customers requiring follow-up or payment collection
            </p>
          </div>
          <Link to="/reports">
            <Button variant="ghost" size="sm">
              View Detailed Report <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
        </div>

        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {outstandingCustomers.length === 0 ? (
            <div className="col-span-full py-8 text-center text-xs text-stone-500">
              🎉 All customer accounts are fully paid! Zero outstanding dues.
            </div>
          ) : (
            outstandingCustomers.slice(0, 6).map((item) => (
              <div
                key={item.customerId}
                className="p-4 rounded-xl border border-stone-200 bg-white hover:border-amber-300 hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-brand-dark truncate">
                      {item.customerName}
                    </h4>
                    <span className="text-xs font-extrabold text-rose-600">
                      {formatRupees(item.outstandingRupees)}
                    </span>
                  </div>
                  <div className="text-xs text-stone-500 mt-1 flex items-center gap-2">
                    {item.areaName && <span>{item.areaName}</span>}
                    {item.phone && <span>• {item.phone}</span>}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs">
                  <span className="text-stone-400">
                    {item.unpaidDeliveriesCount} pending {item.unpaidDeliveriesCount === 1 ? 'order' : 'orders'}
                  </span>
                  <Link
                    to={`/customers/${item.customerId}`}
                    className="text-brand-primary font-bold hover:underline"
                  >
                    View Account →
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
