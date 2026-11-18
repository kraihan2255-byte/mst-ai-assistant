import React, { useState } from 'react';
import { Modal } from '../../components/ui/modal';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select } from '../../components/ui/select';
import { Button } from '../../components/ui/button';
import { useCreateCustomer, useAreas } from '../../hooks/use-customers';
import { useToast } from '../../components/ui/toast';

export interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateCustomerModal({ isOpen, onClose }: CreateCustomerModalProps) {
  const toast = useToast();
  const createCustomerMutation = useCreateCustomer();
  const { data: areas = [] } = useAreas();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [areaId, setAreaId] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setPhone('');
    setAreaId('');
    setAddress('');
    setNotes('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Customer name is required.');
      return;
    }

    try {
      const created = await createCustomerMutation.mutateAsync({
        name: name.trim(),
        phone: phone.trim() || undefined,
        areaId: areaId || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      toast.success(`Customer "${created.name}" created successfully!`);
      resetForm();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create customer.';
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title="Create New Customer"
      description="Add a new customer profile for deliveries and invoicing."
    >
      <form onSubmit={handleSubmit} className="space-y-4 mt-2">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        <Input
          label="Customer Name *"
          placeholder="e.g. Malabar Catering or ABC Hotel"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Phone Number"
            placeholder="e.g. 9840011223"
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
          placeholder="Street or location details"
          rows={2}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

        <Textarea
          label="Internal Notes"
          placeholder="e.g. Preferred delivery time, contact person"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              resetForm();
              onClose();
            }}
            disabled={createCustomerMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={createCustomerMutation.isPending}
          >
            Create Customer
          </Button>
        </div>
      </form>
    </Modal>
  );
}
