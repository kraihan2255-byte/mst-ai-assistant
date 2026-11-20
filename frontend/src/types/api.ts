export type PaymentMethod = 'CASH' | 'UPI' | 'CHEQUE' | 'BANK_TRANSFER' | 'OTHER';
export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
export type DeliveryType = 'ITEMIZED' | 'NON_ITEMIZED';
export type UserRole = 'ADMIN' | 'STAFF';

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
}

export interface LoginResponse {
  success: boolean;
  user: AuthUser;
  token?: string;
}

export interface Area {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  areaId: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  area?: Area | null;
}

export interface CustomerBalance {
  customerId: string;
  customerName: string;
  phone: string | null;
  totalDeliveries: number;
  totalBilledPaise: number;
  totalBilledRupees: number;
  totalPaidPaise: number;
  totalPaidRupees: number;
  outstandingPaise: number;
  outstandingRupees: number;
  paymentStatus: PaymentStatus;
}

export interface ProductPriceHistory {
  id: string;
  productId: string;
  pricePaise: number;
  effectiveFrom: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  size: string;
  sku: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  currentPricePaise: number;
  currentPriceRupees: number;
  effectivePriceDate: string;
}

export interface DeliveryItem {
  id: string;
  deliveryId: string;
  productId: string;
  quantity: number;
  unitPricePaise: number;
  lineTotalPaise: number;
  product?: Product;
}

export interface Payment {
  id: string;
  deliveryId: string;
  amountPaise: number;
  method: PaymentMethod;
  provider: string | null;
  paymentDate: string;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

export interface Delivery {
  id: string;
  invoiceNumber?: string;
  customerId: string;
  customerName: string;
  deliveryDate: string;
  deliveryType: DeliveryType;
  isItemized: boolean;
  itemsCount: number;
  outerBoxes: number | null;
  totalAmountPaise: number;
  totalAmountRupees: number;
  totalPaidPaise: number;
  totalPaidRupees: number;
  outstandingPaise: number;
  outstandingRupees: number;
  paymentStatus: PaymentStatus;
  notes: string | null;
  idempotencyKey: string | null;
  createdAt: string;
  customer: Customer;
  items: DeliveryItem[];
  payments: Payment[];
  isDuplicate?: boolean;
  message?: string;
}

export interface PaymentItemDraft {
  amount: number;
  method: PaymentMethod;
  provider?: string | null;
}

export interface DeliveryItemDraft {
  productId?: string;
  product_name?: string;
  size?: string;
  quantity?: number;
  unit_price?: number;
}

export interface MatchedCustomerSummary {
  id: string;
  name: string;
  phone: string | null;
  area: string | null;
}

export interface ConfirmationPreview {
  customerId: string | null;
  customerName: string | null;
  outerBoxes: number | null;
  totalAmountRupees: number | null;
  payments: PaymentItemDraft[];
  ready_to_confirm: boolean;
}

export interface DeliveryDraft {
  action: 'record_delivery' | 'unknown';
  recipient_name: string | null;
  boxes_delivered: number | null;
  total_amount: number | null;
  payment_received: number;
  payment_method: PaymentMethod | null;
  payment_provider: string | null;
  payments: PaymentItemDraft[];
  items: DeliveryItemDraft[];
  notes: string | null;
  missing_fields: string[];
  matched_customer?: MatchedCustomerSummary | null;
  requires_customer_selection?: boolean;
  candidate_customers?: MatchedCustomerSummary[];
  confirmation_preview?: ConfirmationPreview | null;
}

export interface DeliveryValidationResult {
  isValid: boolean;
  action: string;
  missing_fields: string[];
  errors: string[];
  draft: DeliveryDraft;
  financial_summary?: {
    total_amount: number;
    payment_received: number;
    outstanding_balance: number;
    payment_status: PaymentStatus;
  };
}

export interface FinancialSummaryReport {
  startDate: string | null;
  endDate: string | null;
  totalDeliveries: number;
  totalDeliveryValuePaise: number;
  totalDeliveryValueRupees: number;
  totalPaymentsReceivedPaise: number;
  totalPaymentsReceivedRupees: number;
  totalOutstandingCreditPaise: number;
  totalOutstandingCreditRupees: number;
  customersWithOutstandingCount: number;
  totalOuterBoxes: number;
}

export interface CustomerOutstandingItem {
  customerId: string;
  customerName: string;
  phone: string | null;
  areaName: string | null;
  totalBilledPaise: number;
  totalBilledRupees: number;
  totalPaidPaise: number;
  totalPaidRupees: number;
  outstandingPaise: number;
  outstandingRupees: number;
  unpaidDeliveriesCount: number;
}

export interface DeliveriesReportResponse {
  startDate: string | null;
  endDate: string | null;
  totalDeliveries: number;
  totalValuePaise: number;
  totalValueRupees: number;
  totalOuterBoxes: number;
  deliveries: Array<{
    id: string;
    customerName: string;
    deliveryDate: string;
    outerBoxes: number | null;
    totalAmountRupees: number;
    totalPaidRupees: number;
    outstandingRupees: number;
    paymentStatus: string;
  }>;
}

export interface PaymentsReportResponse {
  startDate: string | null;
  endDate: string | null;
  totalPaymentsCount: number;
  totalPaymentsPaise: number;
  totalPaymentsRupees: number;
  byMethod: Record<
    PaymentMethod,
    { count: number; totalPaise: number; totalRupees: number }
  >;
  byProvider: Record<
    string,
    { count: number; totalPaise: number; totalRupees: number }
  >;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  service: string;
  timestamp: string;
  uptimeSeconds: number;
  ollama: {
    status: 'reachable' | 'unreachable';
    baseUrl: string;
    model: string;
    modelAvailable: boolean;
    latencyMs: number;
    error?: string;
  };
}
