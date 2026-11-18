import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/modal';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select } from '../../components/ui/select';
import { Button } from '../../components/ui/button';
import { useUpdateCustomer, useAreas } from '../../hooks/use-customers';
import { useToast } from '../../components/ui/toast';
import type { Customer } from '../../types/api';

export interface EditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

export function EditCustomerModal({
  isOpen,
  onClose,
  customer,
}: EditCustomerModalProps) {
  const toast = useToast();
  const updateCustomerMutation = useUpdateCustomer(customer?.id || '');
  const { data: areas = [] } = useAreas();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [areaId, setAreaId] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setPhone(customer.phone || '');
      setAreaId(customer.areaId || '');
      setAddress(customer.address || '');
      setNotes(customer.notes || '');
      setError(null);
    }
  }, [customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    setError(null);

    if (!name.trim()) {
      setError('Customer name is required.');
      return;
    }

    try {
      await updateCustomerMutation.mutateAsync({
        name: name.trim(),
        phone: phone.trim() || undefined,
        areaId: areaId || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      toast.success(`Customer "${name}" updated successfully!`);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update customer.';
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Customer"
      description={`Update profile details for ${customer?.name || 'customer'}.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 mt-2">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        <Input
          label="Customer Name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <Select
            label="Delivery Area"
            placeholder="-- Select Area --"
            options={areas.map((a) => ({ value: a.id, label: a.name }))}
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
          />
        </div>

        <Textarea
          label="Address"
          rows={2}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

        <Textarea
          label="Internal Notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={updateCustomerMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={updateCustomerMutation.isPending}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
