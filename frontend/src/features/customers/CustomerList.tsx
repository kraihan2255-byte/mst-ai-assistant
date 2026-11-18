import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  MapPin,
  Phone,
  ArrowRight,
  Edit2,
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { CreateCustomerModal } from './CreateCustomerModal';
import { EditCustomerModal } from './EditCustomerModal';
import { useCustomers, useAreas } from '../../hooks/use-customers';
import { useReportOutstanding } from '../../hooks/use-reports';
import { formatRupees } from '../../lib/formatters';
import type { Customer } from '../../types/api';

export function CustomerList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const { data: customers = [], isLoading, error, refetch } = useCustomers();
  const { data: areas = [] } = useAreas();
  const { data: outstandingList = [] } = useReportOutstanding();

  // Create a map of customerId -> outstandingRupees
  const outstandingMap = useMemo(() => {
    const map = new Map<string, { outstandingRupees: number; count: number }>();
    outstandingList.forEach((item) => {
      map.set(item.customerId, {
        outstandingRupees: item.outstandingRupees,
        count: item.unpaidDeliveriesCount,
      });
    });
    return map;
  }, [outstandingList]);

  // Filter customers by search term and area
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch =
        searchTerm.trim() === '' ||
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone && c.phone.includes(searchTerm)) ||
        (c.area && c.area.name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesArea =
        selectedAreaId === '' || c.areaId === selectedAreaId;

      return matchesSearch && matchesArea;
    });
  }, [customers, searchTerm, selectedAreaId]);

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-brand-dark tracking-tight">
            Customer Directory
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Manage customer accounts, delivery addresses, and outstanding credits
          </p>
        </div>

        <Button
          onClick={() => setIsCreateOpen(true)}
          variant="primary"
          size="md"
          className="shadow-sm shrink-0"
        >
          <Plus className="h-4 w-4 mr-1" /> Add Customer
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card padding="sm" className="bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search by customer name, phone, or location..."
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div>
            <select
              className="w-full h-10 rounded-lg border border-stone-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
              value={selectedAreaId}
              onChange={(e) => setSelectedAreaId(e.target.value)}
            >
              <option value="">All Areas ({areas.length})</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Error state */}
      {error && (
        <ErrorBanner
          message={error.message}
          onRetry={() => refetch()}
        />
      )}

      {/* Loading state */}
      {isLoading && (
        <LoadingSpinner label="Loading customer directory..." />
      )}

      {/* Empty state */}
      {!isLoading && !error && filteredCustomers.length === 0 && (
        <EmptyState
          title="No customers found"
          description={
            searchTerm || selectedAreaId
              ? 'No customers match your search criteria. Try clearing the filters.'
              : 'Start by creating your first customer profile.'
          }
          icon={<Users className="h-8 w-8 text-brand-primary" />}
          actionLabel={searchTerm || selectedAreaId ? 'Clear Filters' : 'Add Customer'}
          onAction={() => {
            if (searchTerm || selectedAreaId) {
              setSearchTerm('');
              setSelectedAreaId('');
            } else {
              setIsCreateOpen(true);
            }
          }}
        />
      )}

      {/* Customers Grid */}
      {!isLoading && !error && filteredCustomers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => {
            const dues = outstandingMap.get(customer.id);
            const hasDues = dues && dues.outstandingRupees > 0;

            return (
              <Card
                key={customer.id}
                padding="md"
                className="flex flex-col justify-between hover:shadow-md hover:border-teal-200 transition-all group"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-base text-brand-dark group-hover:text-brand-primary transition-colors">
                        {customer.name}
                      </h3>
                      {customer.area && (
                        <div className="flex items-center gap-1 text-xs text-stone-500 mt-1">
                          <MapPin className="h-3 w-3 text-stone-400" />
                          <span>{customer.area.name}</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setEditingCustomer(customer)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                      title="Edit Customer"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {customer.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-stone-600 mt-2 font-mono">
                      <Phone className="h-3 w-3 text-stone-400" />
                      <span>{customer.phone}</span>
                    </div>
                  )}

                  {customer.address && (
                    <p className="text-xs text-stone-500 mt-2 line-clamp-1">
                      {customer.address}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold block">
                      Outstanding
                    </span>
                    <span
                      className={`text-sm font-extrabold ${
                        hasDues ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {hasDues ? formatRupees(dues.outstandingRupees) : '₹0 (Clear)'}
                    </span>
                  </div>

                  <Link to={`/customers/${customer.id}`}>
                    <Button variant="outline" size="sm" className="font-semibold">
                      Account <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <CreateCustomerModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      {/* Edit Modal */}
      <EditCustomerModal
        isOpen={Boolean(editingCustomer)}
        onClose={() => setEditingCustomer(null)}
        customer={editingCustomer}
      />
    </div>
  );
}
