import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeliveryPreviewCard } from '../features/assistant/DeliveryPreviewCard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DeliveryDraft } from '../types/api';

const mockQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderWithClient(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={mockQueryClient}>{ui}</QueryClientProvider>,
  );
}

describe('DeliveryPreviewCard', () => {
  const nonItemizedDraft: DeliveryDraft = {
    action: 'record_delivery',
    recipient_name: 'ABC Catering',
    boxes_delivered: 10,
    total_amount: 5000,
    payment_received: 2000,
    payment_method: 'UPI',
    payment_provider: 'GPay',
    payments: [{ amount: 2000, method: 'UPI', provider: 'GPay' }],
    items: [],
    notes: null,
    missing_fields: [],
    matched_customer: {
      id: 'cust-123',
      name: 'ABC Catering',
      phone: '9840011223',
      area: 'Manjeri',
    },
  };

  it('Scenario 5: Renders non-itemized delivery preview with correct financial calculations', () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();

    renderWithClient(
      <DeliveryPreviewCard
        draft={nonItemizedDraft}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />,
    );

    expect(screen.getByText('Delivery Confirmation Preview')).toBeInTheDocument();
    expect(screen.getByText('Non-Itemized')).toBeInTheDocument();
    expect(screen.getByText('ABC Catering')).toBeInTheDocument();
    expect(screen.getByText('10 boxes')).toBeInTheDocument();
    expect(screen.getByText('Partially Paid')).toBeInTheDocument();
  });

  it('Scenario 4: Renders itemized delivery preview with product items', () => {
    const itemizedDraft: DeliveryDraft = {
      ...nonItemizedDraft,
      items: [
        { product_name: 'Coconut Milk', size: '500g', quantity: 10, unit_price: 155 },
        { product_name: 'Coconut Milk', size: '1kg', quantity: 5, unit_price: 290 },
      ],
    };

    renderWithClient(
      <DeliveryPreviewCard
        draft={itemizedDraft}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText('Itemized')).toBeInTheDocument();
    expect(screen.getByText(/10x Coconut Milk/)).toBeInTheDocument();
    expect(screen.getByText(/5x Coconut Milk/)).toBeInTheDocument();
  });

  it('Scenario 6: User toggles edit mode and modifies extracted delivery details', async () => {
    renderWithClient(
      <DeliveryPreviewCard
        draft={nonItemizedDraft}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const editBtn = screen.getByRole('button', { name: /Edit Details/i });
    fireEvent.click(editBtn);

    // Box input is now visible
    const boxInput = screen.getByPlaceholderText('Boxes count');
    expect(boxInput).toBeInTheDocument();
    fireEvent.change(boxInput, { target: { value: '15' } });
    expect((boxInput as HTMLInputElement).value).toBe('15');
  });

  it('Scenario 7: User cancels a delivery draft preview', () => {
    const handleCancel = vi.fn();
    renderWithClient(
      <DeliveryPreviewCard
        draft={nonItemizedDraft}
        onConfirm={vi.fn()}
        onCancel={handleCancel}
      />,
    );

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('Scenario 8: User confirms a delivery', async () => {
    const handleConfirm = vi.fn().mockResolvedValue(undefined);
    renderWithClient(
      <DeliveryPreviewCard
        draft={nonItemizedDraft}
        onConfirm={handleConfirm}
        onCancel={vi.fn()}
      />,
    );

    const confirmBtn = screen.getByRole('button', { name: /Confirm Delivery/i });
    fireEvent.click(confirmBtn);

    expect(handleConfirm).toHaveBeenCalledTimes(1);
    expect(handleConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'cust-123',
        totalAmountRupees: 5000,
        outerBoxes: 10,
        payments: [
          expect.objectContaining({
            amountRupees: 2000,
            method: 'UPI',
            provider: 'GPay',
          }),
        ],
      }),
    );
  });
});
