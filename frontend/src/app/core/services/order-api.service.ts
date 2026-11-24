import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, PageResponse } from '../models/api.models';
import {
  CheckoutRequest,
  OrderDetail,
  OrderSummary,
  PaymentTransaction,
  SubmitPaymentProofRequest,
  VnpayCreateUrlRequest,
  VnpayCreateUrlResponse,
  VnpayReturnResponse,
} from '../models/order.models';

@Injectable({ providedIn: 'root' })
export class OrderApiService {
  private readonly http = inject(HttpClient);

  checkout(payload: CheckoutRequest): Observable<ApiResponse<OrderDetail>> {
    return this.http.post<ApiResponse<OrderDetail>>('/api/v1/orders/checkout', payload);
  }

  getMyOrders(page = 0, size = 10): Observable<ApiResponse<PageResponse<OrderSummary>>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<ApiResponse<PageResponse<OrderSummary>>>('/api/v1/orders', { params });
  }

  getMyOrderDetail(id: string): Observable<ApiResponse<OrderDetail>> {
    return this.http.get<ApiResponse<OrderDetail>>(`/api/v1/orders/${id}`);
  }

  approvePrototype(id: string, note?: string): Observable<ApiResponse<OrderDetail>> {
    return this.http.post<ApiResponse<OrderDetail>>(`/api/v1/orders/${id}/approve-prototype`, { note });
  }

  cancelOrder(id: string, note?: string): Observable<ApiResponse<OrderDetail>> {
    return this.http.post<ApiResponse<OrderDetail>>(`/api/v1/orders/${id}/cancel`, { note });
  }

  submitPaymentProof(
    orderId: string,
    payload: SubmitPaymentProofRequest
  ): Observable<ApiResponse<PaymentTransaction>> {
    return this.http.post<ApiResponse<PaymentTransaction>>(
      `/api/v1/orders/${orderId}/payments/proof`,
      payload
    );
  }

  createVnpayUrl(payload: VnpayCreateUrlRequest): Observable<ApiResponse<VnpayCreateUrlResponse>> {
    return this.http.post<ApiResponse<VnpayCreateUrlResponse>>(
      '/api/v1/payments/vnpay/create-url',
      payload
    );
  }

  handleVnpayReturn(queryParams: Record<string, string>): Observable<ApiResponse<VnpayReturnResponse>> {
    let params = new HttpParams();
    Object.entries(queryParams).forEach(([k, v]) => {
      params = params.set(k, v);
    });
    return this.http.get<ApiResponse<VnpayReturnResponse>>('/api/v1/payments/vnpay-return', { params });
  }
}
