import { useState } from 'react';
import {
  Calendar,
} from 'lucide-react';
import { Card, CardTitle } from '../../components/ui/card';
import { EmptyState } from '../../components/common/EmptyState';
import {
  useReportSummary,
  useReportOutstanding,
  useReportDeliveries,
  useReportPayments,
} from '../../hooks/use-reports';
import { formatRupees, formatDate } from '../../lib/formatters';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export function ReportsDashboard() {
  const [activeTab, setActiveTab] = useState<
    'summary' | 'outstanding' | 'deliveries' | 'payments'
  >('summary');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filterParams = {
    startDate: startDate ? new Date(startDate).toISOString() : undefined,
    endDate: endDate ? new Date(endDate).toISOString() : undefined,
  };

  const { data: summary } = useReportSummary(filterParams);
  const { data: outstandingList = [] } = useReportOutstanding();
  const { data: deliveriesReport } = useReportDeliveries(filterParams);
  const { data: paymentsReport } = useReportPayments(filterParams);

  const paymentByMethodData = paymentsReport?.byMethod
    ? Object.entries(paymentsReport.byMethod)
        .filter(([_, data]) => data.totalRupees > 0)
        .map(([method, data]) => ({
          name: method,
          value: data.totalRupees,
          count: data.count,
        }))
    : [];

  const paymentByProviderData = paymentsReport?.byProvider
    ? Object.entries(paymentsReport.byProvider).map(([provider, data]) => ({
        name: provider || 'Standard',
        value: data.totalRupees,
        count: data.count,
      }))
    : [];

  const PIE_COLORS = ['#107B6C', '#8AC5AB', '#2563EB', '#F59E0B', '#6B7280', '#EC4899'];

  return (
    <div className="space-y-6">
      {/* Top Header & Date Filters */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-brand-dark tracking-tight">
            Financial & Operational Reports
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Verified business metrics derived from transaction ledgers
          </p>
        </div>

        {/* Date Range Picker */}
        <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-xl border border-stone-200 text-xs shadow-sm">
          <Calendar className="h-4 w-4 text-stone-400 ml-1" />
          <div className="flex items-center gap-1">
            <span className="text-stone-400">From:</span>
            <input
              type="date"
              className="p-1 rounded border border-stone-200 text-stone-700 focus:outline-none"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-stone-400">To:</span>
            <input
              type="date"
              className="p-1 rounded border border-stone-200 text-stone-700 focus:outline-none"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="px-2 py-1 text-stone-500 hover:text-stone-800 text-[11px] font-bold"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl w-fit text-xs font-bold text-stone-600">
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-3.5 py-2 rounded-lg transition-all ${
            activeTab === 'summary'
              ? 'bg-white text-brand-dark shadow-sm'
              : 'hover:text-brand-dark'
          }`}
        >
          Overview Summary
        </button>
        <button
          onClick={() => setActiveTab('outstanding')}
          className={`px-3.5 py-2 rounded-lg transition-all ${
            activeTab === 'outstanding'
              ? 'bg-white text-brand-dark shadow-sm'
              : 'hover:text-brand-dark'
          }`}
        >
          Customer Outstanding
        </button>
        <button
          onClick={() => setActiveTab('deliveries')}
          className={`px-3.5 py-2 rounded-lg transition-all ${
            activeTab === 'deliveries'
              ? 'bg-white text-brand-dark shadow-sm'
              : 'hover:text-brand-dark'
          }`}
        >
          Deliveries Ledger
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-3.5 py-2 rounded-lg transition-all ${
            activeTab === 'payments'
              ? 'bg-white text-brand-dark shadow-sm'
              : 'hover:text-brand-dark'
          }`}
        >
          Payment Collections
        </button>
      </div>

      {/* TAB 1: Financial Summary */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card padding="md">
              <span className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold block">
                Total Invoiced Sales
              </span>
              <span className="text-2xl font-black text-brand-dark mt-1 block">
                {formatRupees(summary?.totalDeliveryValueRupees || 0)}
              </span>
              <span className="text-xs text-stone-500 mt-1 block">
                {summary?.totalDeliveries || 0} deliveries ({summary?.totalOuterBoxes || 0} outer boxes)
              </span>
            </Card>

            <Card padding="md">
              <span className="text-[11px] uppercase tracking-wider text-emerald-700 font-semibold block">
                Realized Collections
              </span>
              <span className="text-2xl font-black text-emerald-700 mt-1 block">
                {formatRupees(summary?.totalPaymentsReceivedRupees || 0)}
              </span>
              <span className="text-xs text-emerald-600 mt-1 block">
                Total cash & digital received
              </span>
            </Card>

            <Card padding="md">
              <span className="text-[11px] uppercase tracking-wider text-rose-700 font-semibold block">
                Outstanding Credit Dues
              </span>
              <span className="text-2xl font-black text-rose-700 mt-1 block">
                {formatRupees(summary?.totalOutstandingCreditRupees || 0)}
              </span>
              <span className="text-xs text-rose-600 mt-1 block">
                Pending collection from customers
              </span>
            </Card>

            <Card padding="md">
              <span className="text-[11px] uppercase tracking-wider text-amber-700 font-semibold block">
                Accounts with Dues
              </span>
              <span className="text-2xl font-black text-amber-800 mt-1 block">
                {summary?.customersWithOutstandingCount || 0} Customers
              </span>
              <span className="text-xs text-amber-600 mt-1 block">
                Require follow-up
              </span>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card padding="md">
              <CardTitle>Collections by Method Distribution</CardTitle>
              <div className="h-64 mt-4 flex items-center justify-center">
                {paymentByMethodData.length === 0 ? (
                  <p className="text-xs text-stone-400">No payment data in this period.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentByMethodData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {paymentByMethodData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: number) => formatRupees(val)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            <Card padding="md">
              <CardTitle>Collections by Digital Provider</CardTitle>
              <div className="h-64 mt-4 flex items-center justify-center">
                {paymentByProviderData.length === 0 ? (
                  <p className="text-xs text-stone-400">No provider data in this period.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={paymentByProviderData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                      <XAxis dataKey="name" fontSize={11} stroke="#6B7280" />
                      <YAxis tickFormatter={(val) => `₹${val}`} fontSize={11} stroke="#6B7280" />
                      <Tooltip formatter={(val: number) => [formatRupees(val), 'Collected']} />
                      <Bar dataKey="value" fill="#107B6C" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: Customer Outstanding */}
      {activeTab === 'outstanding' && (
        <Card padding="none">
          <div className="p-4 border-b border-stone-100 flex items-center justify-between">
            <CardTitle>Customer Outstanding Balances (Ranked)</CardTitle>
            <span className="text-xs font-semibold text-rose-700">
              Total Credit: {formatRupees(summary?.totalOutstandingCreditRupees || 0)}
            </span>
          </div>

          <div className="overflow-x-auto">
            {outstandingList.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="No outstanding balances"
                  description="All customer accounts are completely settled."
                />
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50 text-[11px] font-bold uppercase tracking-wider text-stone-500 border-b border-stone-100">
                  <tr>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Area / Phone</th>
                    <th className="px-5 py-3 text-right">Total Invoiced</th>
                    <th className="px-5 py-3 text-right">Total Settled</th>
                    <th className="px-5 py-3 text-right">Outstanding Due</th>
                    <th className="px-5 py-3 text-center">Pending Deliveries</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {outstandingList.map((item) => (
                    <tr key={item.customerId} className="hover:bg-stone-50/50">
                      <td className="px-5 py-3.5 font-bold text-brand-dark">
                        {item.customerName}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-stone-500">
                        {item.areaName && <span>{item.areaName}</span>}
                        {item.phone && <span> • {item.phone}</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-stone-700">
                        {formatRupees(item.totalBilledRupees)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-emerald-700">
                        {formatRupees(item.totalPaidRupees)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-black text-rose-700">
                        {formatRupees(item.outstandingRupees)}
                      </td>
                      <td className="px-5 py-3.5 text-center text-xs font-bold text-stone-600">
                        {item.unpaidDeliveriesCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}

      {/* TAB 3: Deliveries Ledger */}
      {activeTab === 'deliveries' && (
        <Card padding="none">
          <div className="p-4 border-b border-stone-100 flex items-center justify-between">
            <CardTitle>Deliveries Ledger</CardTitle>
            <span className="text-xs font-semibold text-brand-dark">
              Total Value: {formatRupees(deliveriesReport?.totalValueRupees || 0)} ({deliveriesReport?.totalDeliveries || 0} orders)
            </span>
          </div>

          <div className="overflow-x-auto">
            {!deliveriesReport || deliveriesReport.deliveries.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="No deliveries found"
                  description="No deliveries recorded for the selected filter range."
                />
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50 text-[11px] font-bold uppercase tracking-wider text-stone-500 border-b border-stone-100">
                  <tr>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3 text-center">Outer Boxes</th>
                    <th className="px-5 py-3 text-right">Billed Amount</th>
                    <th className="px-5 py-3 text-right">Paid</th>
                    <th className="px-5 py-3 text-right">Outstanding</th>
                    <th className="px-5 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {deliveriesReport.deliveries.map((d) => (
                    <tr key={d.id} className="hover:bg-stone-50/50">
                      <td className="px-5 py-3.5 text-xs text-stone-600 font-medium">
                        {formatDate(d.deliveryDate)}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-brand-dark">
                        {d.customerName}
                      </td>
                      <td className="px-5 py-3.5 text-center text-xs font-semibold text-stone-700">
                        {d.outerBoxes !== null ? d.outerBoxes : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-brand-dark">
                        {formatRupees(d.totalAmountRupees)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-emerald-700">
                        {formatRupees(d.totalPaidRupees)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-rose-700">
                        {formatRupees(d.outstandingRupees)}
                      </td>
                      <td className="px-5 py-3.5 text-center text-xs font-bold">
                        {d.paymentStatus}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}

      {/* TAB 4: Payments Report */}
      {activeTab === 'payments' && (
        <Card padding="none">
          <div className="p-4 border-b border-stone-100 flex items-center justify-between">
            <CardTitle>Collections by Payment Method</CardTitle>
            <span className="text-xs font-semibold text-emerald-700">
              Total Collections: {formatRupees(paymentsReport?.totalPaymentsRupees || 0)}
            </span>
          </div>

          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {paymentsReport?.byMethod &&
              Object.entries(paymentsReport.byMethod).map(([method, item]) => (
                <div key={method} className="p-4 rounded-xl border border-stone-200 bg-stone-50">
                  <span className="text-xs font-bold text-stone-500 uppercase block">
                    {method}
                  </span>
                  <span className="text-xl font-black text-brand-dark mt-1 block">
                    {formatRupees(item.totalRupees)}
                  </span>
                  <span className="text-xs text-stone-400 mt-1 block">
                    {item.count} recorded {item.count === 1 ? 'payment' : 'payments'}
                  </span>
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}
