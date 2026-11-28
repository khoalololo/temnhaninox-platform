export type OrderStatus =
  | 'QUOTE_PENDING'
  | 'QUOTE_APPROVED'
  | 'PROTOTYPING'
  | 'AWAITING_DEPOSIT'
  | 'IN_PRODUCTION'
  | 'READY_FOR_DELIVERY'
  | 'COMPLETED'
  | 'CANCELLED';

export type OrderType = 'DIRECT_STORE_ORDER' | 'CUSTOM_QUOTE_ORDER';
export type PaymentMethod = 'BANK_TRANSFER' | 'CASH' | 'VNPAY_SANDBOX';
export type PaymentPhase = 'DEPOSIT_50' | 'BALANCE_50' | 'FULL_100';
export type PaymentStatus = 'PENDING' | 'VERIFIED' | 'FAILED';

export interface CheckoutRequest {
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  customerNote?: string;
  requiresVatInvoice: boolean;
  vatCompanyName?: string;
  vatTaxCode?: string;
  vatCompanyAddress?: string;
}

export interface OrderSummary {
  id: string;
  orderCode: string;
  orderType: OrderType;
  status: OrderStatus;
  recipientName: string;
  totalAmount: number;
  depositRequiredAmount: number;
  paidAmount: number;
  requiresVatInvoice: boolean;
  itemCount: number;
  totalQuantity?: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  productId?: string;
  itemName: string;
  materialId?: string;
  materialNameSnapshot?: string;
  processingMethodId?: string;
  processingNameSnapshot?: string;
  widthMm?: number;
  heightMm?: number;
  thicknessMm?: number;
  calculatedWeightKg?: number;
  systemUnitPrice: number;
  finalUnitPrice: number;
  quantity: number;
  lineTotal: number;
  designFileUrl?: string;
  prototypeImageUrl?: string;
}

export interface PaymentTransaction {
  id: string;
  paymentPhase: PaymentPhase;
  paymentMethod: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  transactionRef?: string;
  proofImageUrl?: string;
  verifiedAt?: string;
  createdAt: string;
}

export interface OrderStatusLog {
  id: string;
  fromStatus?: OrderStatus;
  toStatus: OrderStatus;
  changedByUserId?: string;
  note?: string;
  createdAt: string;
}

export interface OrderDetail {
  id: string;
  orderCode: string;
  customerId: string;
  orderType: OrderType;
  status: OrderStatus;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  customerNote?: string;
  subtotalAmount: number;
  discountAmount: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  depositRequiredAmount: number;
  paidAmount: number;
  requiresVatInvoice: boolean;
  vatCompanyName?: string;
  vatTaxCode?: string;
  vatCompanyAddress?: string;
  vatInvoiceNumber?: string;
  /** Internal — only returned to admins. */
  productionWorkerNote?: string;
  /** Visible to the customer. */
  customerProgressNote?: string;
  estimatedCompletionDate?: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  paymentTransactions: PaymentTransaction[];
  statusLogs: OrderStatusLog[];
}

export interface SubmitPaymentProofRequest {
  paymentPhase: PaymentPhase;
  paymentMethod: PaymentMethod;
  amount: number;
  transactionRef?: string;
  proofImageUrl?: string;
}

export interface VnpayCreateUrlRequest {
  orderId: string;
  paymentPhase: PaymentPhase;
  amount: number;
}

export interface VnpayCreateUrlResponse {
  paymentUrl: string;
  transactionRef: string;
  orderId: string;
  amount: number;
}

export interface VnpayReturnResponse {
  verified: boolean;
  orderId?: string;
  orderCode?: string;
  transactionRef?: string;
  responseCode?: string;
  paymentStatus?: PaymentStatus;
  orderStatus?: OrderStatus;
  amount?: number;
  message?: string;
}

export interface AdminDashboardSummary {
  pendingQuotesCount: number;
  awaitingDepositCount: number;
  inProductionCount: number;
  vatPendingCount: number;
  monthlyRevenue: number;
}

export interface PricingRule {
  ruleKey: string;
  ruleValue: number;
  description?: string;
  updatedAt?: string;
}
