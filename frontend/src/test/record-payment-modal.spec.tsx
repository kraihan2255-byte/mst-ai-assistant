import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RecordPaymentModal } from '../features/payments/RecordPaymentModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../components/ui/toast';
import type { Delivery } from '../types/api';
import { deliveriesApi } from '../lib/api-client';

const mockQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

function renderModal(delivery: Delivery, onClose = vi.fn()) {
  return render(
    <QueryClientProvider client={mockQueryClient}>
      <ToastProvider>
        <RecordPaymentModal
          isOpen={true}
          onClose={onClose}
          delivery={delivery}
        />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('RecordPaymentModal', () => {
  const sampleDelivery: Delivery = {
    id: 'del-12345678-abcd',
    customerId: 'cust-1',
    customerName: 'Kottakkal Bakery',
    deliveryDate: new Date().toISOString(),
    deliveryType: 'NON_ITEMIZED',
    isItemized: false,
    itemsCount: 0,
    outerBoxes: 5,
    totalAmountPaise: 300000,
    totalAmountRupees: 3000,
    totalPaidPaise: 100000,
    totalPaidRupees: 1000,
    outstandingPaise: 200000,
    outstandingRupees: 2000,
    paymentStatus: 'PARTIALLY_PAID',
    notes: null,
    idempotencyKey: null,
    createdAt: new Date().toISOString(),
    customer: {
      id: 'cust-1',
      name: 'Kottakkal Bakery',
      phone: '9840001122',
      areaId: null,
      address: null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    items: [],
    payments: [],
  };

  it('Scenario 10: Rejects payment amount that exceeds current outstanding balance', async () => {
    renderModal(sampleDelivery);

    const amountInput = screen.getByLabelText(/Payment Amount/i);
    // Outstanding is 2000, try to pay 2500
    fireEvent.change(amountInput, { target: { value: '2500' } });

    const submitBtn = screen.getByRole('button', { name: /Record Payment/i });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText(/cannot exceed the outstanding balance/),
    ).toBeInTheDocument();
  });

  it('Scenario 9 & 12: Submits valid payment and guards against duplicate clicks', async () => {
    const recordPaymentSpy = vi
      .spyOn(deliveriesApi, 'recordPayment')
      .mockResolvedValueOnce({
        ...sampleDelivery,
        totalPaidRupees: 3000,
        outstandingRupees: 0,
        paymentStatus: 'PAID',
      });

    const onClose = vi.fn();
    renderModal(sampleDelivery, onClose);

    const amountInput = screen.getByLabelText(/Payment Amount/i);
    fireEvent.change(amountInput, { target: { value: '2000' } });

    const submitBtn = screen.getByRole('button', { name: /Record Payment/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(recordPaymentSpy).toHaveBeenCalledWith(
        'del-12345678-abcd',
        expect.objectContaining({
          amountRupees: 2000,
          method: 'UPI',
        }),
      );
      expect(onClose).toHaveBeenCalled();
    });
  });
});
