import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AssistantChat } from '../features/assistant/AssistantChat';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../components/ui/toast';
import { aiApi } from '../lib/api-client';
import type { DeliveryDraft } from '../types/api';

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
});
