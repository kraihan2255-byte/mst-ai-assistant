import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  Search,
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { useDeliveries } from '../../hooks/use-deliveries';
import { formatRupees, formatDate } from '../../lib/formatters';
import type { Payment } from '../../types/api';

export function PaymentList() {
  const { data: deliveries = [], isLoading, error, refetch } = useDeliveries();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');

  // Flatten all payments across deliveries with their delivery and customer context
  const allPayments = useMemo(() => {
    const list: Array<Payment & { customerName: string; customerId: string; deliveryId: string }> = [];
    deliveries.forEach((d) => {
      d.payments.forEach((p) => {
        list.push({
          ...p,
          customerName: d.customerName,
          customerId: d.customerId,
          deliveryId: d.id,
        });
      });
    });
    // Sort descending by payment date
    return list.sort(
      (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime(),
    );
  }, [deliveries]);

  const filteredPayments = useMemo(() => {
    return allPayments.filter((p) => {
      const matchesSearch =
        searchTerm.trim() === '' ||
        p.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.reference && p.reference.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.provider && p.provider.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesMethod =
        selectedMethod === '' || p.method === selectedMethod;

      return matchesSearch && matchesMethod;
    });
  }, [allPayments, searchTerm, selectedMethod]);

  const totalCollectedRupees = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + p.amountPaise / 100, 0);
  }, [filteredPayments]);

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-brand-dark tracking-tight">
            Payments & Collections
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Audit trail of all cash, UPI, and bank receipts received across deliveries
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-4 py-2 rounded-xl bg-teal-50 border border-teal-100 text-brand-dark text-xs font-bold">
            Total Filtered Collections: <span className="text-brand-primary">{formatRupees(totalCollectedRupees)}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card padding="sm" className="bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search payments by customer name, provider, or reference..."
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div>
            <select
              className="w-full h-10 rounded-lg border border-stone-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
            >
              <option value="">All Methods</option>
              <option value="UPI">UPI (GPay / PhonePe)</option>
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Error State */}
      {error && <ErrorBanner message={error.message} onRetry={() => refetch()} />}

      {/* Loading State */}
      {isLoading && <LoadingSpinner label="Loading payments ledger..." />}

      {/* Empty State */}
      {!isLoading && !error && filteredPayments.length === 0 && (
        <EmptyState
          title="No payments recorded"
          description={
            searchTerm || selectedMethod
              ? 'No payments match your filter criteria.'
              : 'Payments recorded during deliveries or settlements will show up here.'
          }
          icon={<CreditCard className="h-8 w-8 text-brand-primary" />}
        />
      )}

      {/* Payments Display (Mobile Cards + Desktop Table) */}
      {!isLoading && !error && filteredPayments.length > 0 && (
        <>
          {/* Mobile Payment Cards (sm:hidden) */}
          <div className="block sm:hidden space-y-3">
            {filteredPayments.map((p) => (
              <Card key={p.id} padding="md" className="bg-white border-stone-200">
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-stone-100">
                  <div>
                    <Link
                      to={`/customers/${p.customerId}`}
                      className="font-bold text-base text-brand-dark hover:text-brand-primary block"
                    >
                      {p.customerName}
                    </Link>
                    <span className="text-xs text-stone-500 font-medium">
                      {formatDate(p.paymentDate)}
                    </span>
                  </div>
                  <span className="font-black text-emerald-700 text-base">
                    +{formatRupees(p.amountPaise / 100)}
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs text-stone-600">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-stone-100 font-semibold text-stone-700 text-[11px]">
                      {p.method === 'CASH' ? '💵 Cash' : p.method === 'UPI' ? '📱 UPI' : p.method}
                      {p.provider ? ` (${p.provider})` : ''}
                    </span>
                    {p.reference && (
                      <span className="font-mono text-[10px] text-stone-400">
                        {p.reference}
                      </span>
                    )}
                  </div>

                  <span className="font-mono text-stone-400 text-[11px]">
                    Deliv #{p.deliveryId.slice(0, 8)}
                  </span>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop Table (hidden sm:block) */}
          <div className="hidden sm:block">
            <Card padding="none">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-stone-50 text-[11px] font-bold uppercase tracking-wider text-stone-500 border-b border-stone-100">
                    <tr>
                      <th className="px-5 py-3">Payment Date</th>
                      <th className="px-5 py-3">Customer</th>
                      <th className="px-5 py-3">Method & Details</th>
                      <th className="px-5 py-3">Delivery Ref</th>
                      <th className="px-5 py-3 text-right">Amount Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="px-5 py-3.5 text-xs text-stone-600 font-medium">
                          {formatDate(p.paymentDate)}
                        </td>

                        <td className="px-5 py-3.5">
                          <Link
                            to={`/customers/${p.customerId}`}
                            className="font-bold text-brand-dark hover:text-brand-primary"
                          >
                            {p.customerName}
                          </Link>
                        </td>

                        <td className="px-5 py-3.5 text-xs">
                          <span className="font-semibold text-stone-800">
                            {p.method}
                          </span>
                          {p.provider && (
                            <span className="ml-1 text-stone-500">
                              ({p.provider})
                            </span>
                          )}
                          {p.reference && (
                            <span className="block text-[11px] text-stone-400 font-mono mt-0.5">
                              Ref: {p.reference}
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-xs text-stone-500 font-mono">
                          #{p.deliveryId.slice(0, 8)}
                        </td>

                        <td className="px-5 py-3.5 text-right font-extrabold text-emerald-700 text-sm">
                          {formatRupees(p.amountPaise / 100)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
