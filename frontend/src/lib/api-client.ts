import axios, { AxiosError } from 'axios';
import type {
  Area,
  AuthUser,
  Customer,
  CustomerBalance,
  CustomerOutstandingItem,
  DeliveriesReportResponse,
  Delivery,
  DeliveryDraft,
  DeliveryValidationResult,
  FinancialSummaryReport,
  HealthResponse,
  LoginResponse,
  PaymentsReportResponse,
  Product,
  ProductPriceHistory,
} from '../types/api';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  timeout: 30000,
});

// Attach Bearer token from localStorage for seamless standalone PWA sessions
apiClient.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('mst_auth_token') : null;
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string | string[]; error?: string; statusCode?: number }>) => {
    let cleanMessage = 'An unexpected error occurred. Please try again.';

    if (error.response?.data) {
      const data = error.response.data;
      if (Array.isArray(data.message)) {
        cleanMessage = data.message.join(', ');
      } else if (typeof data.message === 'string') {
        cleanMessage = data.message;
      } else if (data.error) {
        cleanMessage = data.error;
      }
    } else if (error.message) {
      if (error.code === 'ECONNABORTED') {
        cleanMessage = 'Request timed out. Please check if the backend service is responding.';
      } else if (error.message === 'Network Error') {
        cleanMessage = 'Cannot connect to backend server. Ensure NestJS backend is running at http://localhost:3000.';
      } else {
        cleanMessage = error.message;
      }
    }

    return Promise.reject(new Error(cleanMessage));
  },
);

// ---------------------------------------------------------------------------
// AI API Services
// ---------------------------------------------------------------------------
export const aiApi = {
  parseCommand: async (message: string): Promise<DeliveryDraft> => {
    const res = await apiClient.post<DeliveryDraft>('/ai/parse-command', { message });
    return res.data;
  },
  validateDelivery: async (draft: DeliveryDraft): Promise<DeliveryValidationResult> => {
    const res = await apiClient.post<DeliveryValidationResult>('/ai/validate-delivery', draft);
    return res.data;
  },
  transcribeAudio: async (
    audioBlob: Blob,
    filename = 'recording.webm',
  ): Promise<{ text: string }> => {
    const formData = new FormData();
    formData.append('file', audioBlob, filename);
    const res = await apiClient.post<{ text: string }>('/ai/transcribe', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  parseVoice: async (
    audioBlob: Blob,
    filename = 'recording.webm',
  ): Promise<{ transcript: string; draft: DeliveryDraft }> => {
    const formData = new FormData();
    formData.append('file', audioBlob, filename);
    const res = await apiClient.post<{ transcript: string; draft: DeliveryDraft }>(
      '/ai/parse-voice',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return res.data;
  },
};

// ---------------------------------------------------------------------------
// Customers API Services
// ---------------------------------------------------------------------------
export interface CreateCustomerPayload {
  name: string;
  phone?: string;
  areaId?: string;
  address?: string;
  notes?: string;
}

export interface UpdateCustomerPayload {
  name?: string;
  phone?: string;
  areaId?: string;
  address?: string;
  notes?: string;
}

export const customersApi = {
  getAll: async (params?: { search?: string; phone?: string }): Promise<Customer[]> => {
    const res = await apiClient.get<Customer[]>('/customers', { params });
    return res.data;
  },
  getAreas: async (): Promise<Area[]> => {
    const res = await apiClient.get<Area[]>('/customers/areas');
    return res.data;
  },
  getOne: async (id: string): Promise<Customer> => {
    const res = await apiClient.get<Customer>(`/customers/${id}`);
    return res.data;
  },
  getBalance: async (id: string): Promise<CustomerBalance> => {
    const res = await apiClient.get<CustomerBalance>(`/customers/${id}/balance`);
    return res.data;
  },
  create: async (data: CreateCustomerPayload): Promise<Customer> => {
    const res = await apiClient.post<Customer>('/customers', data);
    return res.data;
  },
  update: async (id: string, data: UpdateCustomerPayload): Promise<Customer> => {
    const res = await apiClient.patch<Customer>(`/customers/${id}`, data);
    return res.data;
  },
  getDeliveries: async (id: string): Promise<Delivery[]> => {
    const res = await apiClient.get<Delivery[]>(`/customers/${id}/deliveries`);
    return res.data;
  },
};

// ---------------------------------------------------------------------------
// Deliveries API Services
// ---------------------------------------------------------------------------
export interface ConfirmDeliveryItemInput {
  productId: string;
  quantity: number;
  unitPriceRupees?: number;
  unitPricePaise?: number;
}

export interface ConfirmPaymentInput {
  amountRupees?: number;
  amountPaise?: number;
  method: 'CASH' | 'UPI' | 'CHEQUE' | 'BANK_TRANSFER' | 'OTHER';
  provider?: string | null;
  paymentDate?: string;
  reference?: string | null;
  notes?: string | null;
}

export interface ConfirmDeliveryPayload {
  customerId: string;
  deliveryDate?: string;
  isItemized?: boolean;
  outerBoxes?: number | null;
  items?: ConfirmDeliveryItemInput[];
  totalAmountRupees?: number;
  totalAmountPaise?: number;
  payments: ConfirmPaymentInput[];
  notes?: string | null;
  idempotencyKey?: string | null;
  confirmed: boolean;
}

export interface RecordPaymentPayload {
  amountRupees?: number;
  amountPaise?: number;
  method: 'CASH' | 'UPI' | 'CHEQUE' | 'BANK_TRANSFER' | 'OTHER';
  provider?: string | null;
  paymentDate?: string;
  reference?: string | null;
  notes?: string | null;
}

export const deliveriesApi = {
  getAll: async (params?: {
    customerId?: string;
    startDate?: string;
    endDate?: string;
    paymentStatus?: string;
  }): Promise<Delivery[]> => {
    const res = await apiClient.get<Delivery[]>('/deliveries', { params });
    return res.data;
  },
  getOne: async (id: string): Promise<Delivery> => {
    const res = await apiClient.get<Delivery>(`/deliveries/${id}`);
    return res.data;
  },
  confirm: async (data: ConfirmDeliveryPayload): Promise<Delivery> => {
    const res = await apiClient.post<Delivery>('/deliveries/confirm', data);
    return res.data;
  },
  recordPayment: async (deliveryId: string, data: RecordPaymentPayload): Promise<Delivery> => {
    const res = await apiClient.post<Delivery>(`/deliveries/${deliveryId}/payments`, data);
    return res.data;
  },
};

// ---------------------------------------------------------------------------
// Products API Services
// ---------------------------------------------------------------------------
export interface CreateProductPayload {
  name: string;
  size: string;
  sku?: string;
  initialPriceRupees?: number;
  initialPricePaise?: number;
}

export interface AddPricePayload {
  priceRupees?: number;
  pricePaise?: number;
  effectiveFrom?: string;
}

export const productsApi = {
  getAll: async (activeOnly = true): Promise<Product[]> => {
    const res = await apiClient.get<Product[]>('/products', {
      params: { activeOnly: activeOnly ? 'true' : 'false' },
    });
    return res.data;
  },
  create: async (data: CreateProductPayload): Promise<Product> => {
    const res = await apiClient.post<Product>('/products', data);
    return res.data;
  },
  getPriceHistory: async (id: string): Promise<ProductPriceHistory[]> => {
    const res = await apiClient.get<ProductPriceHistory[]>(`/products/${id}/prices`);
    return res.data;
  },
  addPrice: async (id: string, data: AddPricePayload): Promise<ProductPriceHistory> => {
    const res = await apiClient.post<ProductPriceHistory>(`/products/${id}/prices`, data);
    return res.data;
  },
};

// ---------------------------------------------------------------------------
// Reports API Services
// ---------------------------------------------------------------------------
export const reportsApi = {
  getSummary: async (params?: { startDate?: string; endDate?: string }): Promise<FinancialSummaryReport> => {
    const res = await apiClient.get<FinancialSummaryReport>('/reports/summary', { params });
    return res.data;
  },
  getOutstanding: async (): Promise<CustomerOutstandingItem[]> => {
    const res = await apiClient.get<CustomerOutstandingItem[]>('/reports/outstanding');
    return res.data;
  },
  getDeliveries: async (params?: { startDate?: string; endDate?: string }): Promise<DeliveriesReportResponse> => {
    const res = await apiClient.get<DeliveriesReportResponse>('/reports/deliveries', { params });
    return res.data;
  },
  getPayments: async (params?: { startDate?: string; endDate?: string }): Promise<PaymentsReportResponse> => {
    const res = await apiClient.get<PaymentsReportResponse>('/reports/payments', { params });
    return res.data;
  },
};

// ---------------------------------------------------------------------------
// Health API Services
// ---------------------------------------------------------------------------
export const healthApi = {
  check: async (): Promise<HealthResponse> => {
    const res = await apiClient.get<HealthResponse>('/health');
    return res.data;
  },
};

// ---------------------------------------------------------------------------
// Authentication API Services
// ---------------------------------------------------------------------------
export const authApi = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const res = await apiClient.post<LoginResponse>('/auth/login', { username, password });
    if (res.data?.token && typeof window !== 'undefined') {
      localStorage.setItem('mst_auth_token', res.data.token);
    }
    return res.data;
  },
  pinLogin: async (pin: string): Promise<LoginResponse> => {
    const res = await apiClient.post<LoginResponse>('/auth/pin-login', { pin });
    if (res.data?.token && typeof window !== 'undefined') {
      localStorage.setItem('mst_auth_token', res.data.token);
    }
    return res.data;
  },
  quickUnlock: async (): Promise<LoginResponse> => {
    const res = await apiClient.post<LoginResponse>('/auth/quick-unlock');
    if (res.data?.token && typeof window !== 'undefined') {
      localStorage.setItem('mst_auth_token', res.data.token);
    }
    return res.data;
  },
  getAuthConfig: async (): Promise<{
    pinLoginEnabled: boolean;
    quickUnlockEnabled: boolean;
    defaultPinHint?: string;
  }> => {
    const res = await apiClient.get('/auth/config');
    return res.data;
  },
  logout: async (): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await apiClient.post<{ success: boolean; message: string }>('/auth/logout');
      return res.data;
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('mst_auth_token');
        localStorage.removeItem('mst_auto_unlock');
      }
    }
  },
  getMe: async (): Promise<{ user: AuthUser }> => {
    const res = await apiClient.get<{ user: AuthUser }>('/auth/me');
    return res.data;
  },
};
