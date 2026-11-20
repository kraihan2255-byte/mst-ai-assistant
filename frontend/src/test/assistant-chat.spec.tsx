import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AssistantChat } from '../features/assistant/AssistantChat';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../components/ui/toast';
import { aiApi, customersApi } from '../lib/api-client';
import type { DeliveryDraft, Customer } from '../types/api';

const mockQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

function renderChat() {
  return render(
    <QueryClientProvider client={mockQueryClient}>
      <ToastProvider>
        <AssistantChat />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('AssistantChat', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockQueryClient.clear();
  });

  it('renders welcome message and suggestions', () => {
    renderChat();
    expect(screen.getByText(/Hello! I am your MST Tengapal business assistant/)).toBeInTheDocument();
    expect(screen.getByText(/Try:/)).toBeInTheDocument();
  });

  it('Scenario 1: Successful delivery extraction displays confirmation preview', async () => {
    const mockDraft: DeliveryDraft = {
      action: 'record_delivery',
      recipient_name: 'Al Madina Supermarket',
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
        id: 'cust-99',
        name: 'Al Madina Supermarket',
        phone: '9840012345',
        area: 'Malappuram',
      },
    };

    const parseSpy = vi
      .spyOn(aiApi, 'parseCommand')
      .mockResolvedValueOnce(mockDraft);

    renderChat();

    const textarea = screen.getByPlaceholderText(/Record a delivery or payment/i);
    fireEvent.change(textarea, {
      target: {
        value:
          'I delivered 10 boxes to Al Madina Supermarket for 5000 and received 2000 GPay',
      },
    });

    const sendBtn = screen.getByRole('button', { name: /Send/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(parseSpy).toHaveBeenCalledWith(
        'I delivered 10 boxes to Al Madina Supermarket for 5000 and received 2000 GPay',
      );
      expect(
        screen.getByText(/Delivery Confirmation Preview/i),
      ).toBeInTheDocument();
      expect(screen.getByText('Al Madina Supermarket')).toBeInTheDocument();
    });
  });

  it('Scenario 3: Missing delivery amount prompts user for clarification', async () => {
    const mockDraftWithMissing: DeliveryDraft = {
      action: 'record_delivery',
      recipient_name: 'Tirur Bakery',
      boxes_delivered: 5,
      total_amount: null,
      payment_received: 0,
      payment_method: null,
      payment_provider: null,
      payments: [],
      items: [],
      notes: null,
      missing_fields: ['total_amount'],
    };

    vi.spyOn(aiApi, 'parseCommand').mockResolvedValueOnce(mockDraftWithMissing);

    renderChat();

    const textarea = screen.getByPlaceholderText(/Record a delivery or payment/i);
    fireEvent.change(textarea, {
      target: { value: 'Delivered 5 boxes to Tirur Bakery' },
    });

    const sendBtn = screen.getByRole('button', { name: /Send/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/some information is missing: total_amount/i),
      ).toBeInTheDocument();
    });
  });

  it('Scenario 11: Network or server error during command parsing displays error feedback', async () => {
    vi.spyOn(aiApi, 'parseCommand').mockRejectedValueOnce(
      new Error('Cannot connect to backend server.'),
    );

    renderChat();

    const textarea = screen.getByPlaceholderText(/Record a delivery or payment/i);
    fireEvent.change(textarea, {
      target: { value: 'Delivered 10 boxes' },
    });

    const sendBtn = screen.getByRole('button', { name: /Send/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/I could not process that request: Cannot connect to backend server./i),
      ).toBeInTheDocument();
    });
  });

  it('Scenario 12: Quick Delivery Builder allows step-by-step delivery creation without typing', async () => {
    const mockCustomers: Customer[] = [
      {
        id: 'cust-1',
        name: 'ABC Catering',
        phone: '9840011223',
        areaId: 'area-1',
        address: null,
        notes: null,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        area: { id: 'area-1', name: 'Manjeri', createdAt: '', updatedAt: '' },
      },
    ];

    vi.spyOn(customersApi, 'getAll').mockResolvedValue(mockCustomers);

    renderChat();

    // Toggle quick delivery builder
    const toggleBtn = screen.getByRole('button', { name: /Delivered \(Quick Select\)/i });
    expect(toggleBtn).toBeInTheDocument();
    fireEvent.click(toggleBtn);

    // Verify Builder opened with steps
    expect(screen.getByText('Quick Delivery Builder')).toBeInTheDocument();
    expect(screen.getByText(/Select Item Sold/i)).toBeInTheDocument();
    expect(screen.getByText(/Number of Boxes Delivered/i)).toBeInTheDocument();
    expect(screen.getByText(/Select Customer/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Amount & Payment Method/i)).toBeInTheDocument();

    // Verify 1kg is default and 10 boxes calculates ₹2,900 (10 x 290)
    expect(screen.getByText(/10 boxes × ₹290 = ₹2,900/i)).toBeInTheDocument();
    const amountInput = screen.getByPlaceholderText('2900') as HTMLInputElement;
    expect(amountInput.value).toBe('2900');

    // Select customer from list
    await waitFor(() => {
      expect(screen.getByText('ABC Catering')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('ABC Catering'));

    // Submit the draft
    const createDraftBtn = screen.getByRole('button', { name: /Create Delivery Draft/i });
    expect(createDraftBtn).not.toBeDisabled();
    fireEvent.click(createDraftBtn);

    // Verify draft was appended to chat with 1kg item and 2,900 amount
    await waitFor(() => {
      expect(screen.getByText(/I've prepared a draft for your delivery to "ABC Catering"/i)).toBeInTheDocument();
      expect(screen.getByText('Delivery Confirmation Preview')).toBeInTheDocument();
      expect(screen.getAllByText('₹2,900').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('Scenario 13: Item rate dynamically recalculates bill when changing boxes or product', async () => {
    renderChat();

    // Open Builder
    fireEvent.click(screen.getByRole('button', { name: /Delivered \(Quick Select\)/i }));

    // By default 1kg @ ₹290 for 10 boxes = ₹2,900
    expect(screen.getByText(/10 boxes × ₹290 = ₹2,900/i)).toBeInTheDocument();

    // Change to 5 boxes
    const box5Btn = screen.getByRole('button', { name: '5' });
    fireEvent.click(box5Btn);
    expect(screen.getByText(/5 boxes × ₹290 = ₹1,450/i)).toBeInTheDocument();

    // Change item to 500g (@ ₹155)
    const item500gBtn = screen.getByRole('button', { name: /500g/i });
    fireEvent.click(item500gBtn);
    expect(screen.getByText(/5 boxes × ₹155 = ₹775/i)).toBeInTheDocument();
  });
});
