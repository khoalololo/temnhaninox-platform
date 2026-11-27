import { OrderStatus, OrderType, PaymentMethod, PaymentPhase, PaymentStatus } from '../../core/models/order.models';

export type ChipTone = 'warning' | 'info' | 'accent' | 'success' | 'danger' | 'muted';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  QUOTE_PENDING: 'Chờ duyệt báo giá',
  QUOTE_APPROVED: 'Đã duyệt báo giá',
  PROTOTYPING: 'Duyệt mẫu thực tế',
  AWAITING_DEPOSIT: 'Chờ đặt cọc',
  IN_PRODUCTION: 'Đang sản xuất',
  READY_FOR_DELIVERY: 'Chờ giao hàng',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
};

const STATUS_TONE: Record<OrderStatus, ChipTone> = {
  QUOTE_PENDING: 'warning',
  QUOTE_APPROVED: 'info',
  PROTOTYPING: 'info',
  AWAITING_DEPOSIT: 'warning',
  IN_PRODUCTION: 'accent',
  READY_FOR_DELIVERY: 'info',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

export function orderStatusLabel(status: string | undefined | null): string {
  return (status && ORDER_STATUS_LABEL[status as OrderStatus]) || status || '—';
}

export function orderStatusTone(status: string | undefined | null): ChipTone {
  return (status && STATUS_TONE[status as OrderStatus]) || 'muted';
}

export function orderTypeLabel(type: OrderType | string | undefined): string {
  return type === 'CUSTOM_QUOTE_ORDER' ? 'Gia công 3D' : 'Hàng có sẵn';
}

export const PAYMENT_PHASE_LABEL: Record<PaymentPhase, string> = {
  DEPOSIT_50: 'Đặt cọc 50%',
  BALANCE_50: 'Thanh toán 50% còn lại',
  FULL_100: 'Thanh toán 100%',
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  BANK_TRANSFER: 'Chuyển khoản',
  CASH: 'Tiền mặt',
  VNPAY_SANDBOX: 'VNPAY',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: 'Chờ xác nhận',
  VERIFIED: 'Đã xác nhận',
  FAILED: 'Bị từ chối',
};

export function paymentStatusTone(status: PaymentStatus): ChipTone {
  return status === 'VERIFIED' ? 'success' : status === 'FAILED' ? 'danger' : 'warning';
}

export function paidPercent(paid: number | undefined, total: number | undefined): number {
  if (!total || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(((paid ?? 0) / total) * 100)));
}

/** True when a URL points to a browser-renderable image (ignores query string). */
export function isImageUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  const clean = url.split('?')[0].split('#')[0].toLowerCase();
  return /\.(png|jpe?g|webp|gif|avif|bmp|svg)$/.test(clean);
}

export function fileExtension(url: string | undefined | null): string {
  if (!url) return 'FILE';
  const clean = url.split('?')[0].split('#')[0];
  const dot = clean.lastIndexOf('.');
  return dot >= 0 ? clean.slice(dot + 1).toUpperCase().slice(0, 4) : 'FILE';
}

export function initials(name: string | undefined | null): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const last = parts[parts.length - 1][0];
  const first = parts.length > 1 ? parts[0][0] : '';
  return (first + last).toUpperCase();
}
