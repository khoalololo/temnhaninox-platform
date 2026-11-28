import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, PageResponse } from '../models/api.models';
import {
  AdminDashboardSummary,
  OrderDetail,
  OrderStatus,
  OrderSummary,
  OrderType,
  PaymentStatus,
  PricingRule,
} from '../models/order.models';
import { Category, Material, ProcessingMethod, Product } from '../models/catalog.models';
import { AdminCustomer } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);

  getDashboardSummary(): Observable<ApiResponse<AdminDashboardSummary>> {
    return this.http.get<ApiResponse<AdminDashboardSummary>>('/api/v1/admin/dashboard/summary');
  }

  getCustomers(search = '', page = 0, size = 20): Observable<ApiResponse<PageResponse<AdminCustomer>>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (search.trim()) params = params.set('search', search.trim());
    return this.http.get<ApiResponse<PageResponse<AdminCustomer>>>('/api/v1/users/admin/customers', { params });
  }

  getOrders(filters: {
    status?: OrderStatus | '';
    orderType?: OrderType | '';
    search?: string;
    page?: number;
    size?: number;
  }): Observable<ApiResponse<PageResponse<OrderSummary>>> {
    let params = new HttpParams()
      .set('page', (filters.page ?? 0).toString())
      .set('size', (filters.size ?? 20).toString());
    if (filters.status) params = params.set('status', filters.status);
    if (filters.orderType) params = params.set('orderType', filters.orderType);
    if (filters.search) params = params.set('search', filters.search.trim());

    return this.http.get<ApiResponse<PageResponse<OrderSummary>>>('/api/v1/admin/orders', { params });
  }

  getOrderDetail(id: string): Observable<ApiResponse<OrderDetail>> {
    return this.http.get<ApiResponse<OrderDetail>>(`/api/v1/admin/orders/${id}`);
  }

  reviewQuote(
    id: string,
    payload: {
      items?: { orderItemId: string; finalUnitPrice: number }[];
      estimatedCompletionDate?: string;
      adminInternalNote?: string;
      note?: string;
    }
  ): Observable<ApiResponse<OrderDetail>> {
    return this.http.patch<ApiResponse<OrderDetail>>(`/api/v1/admin/orders/${id}/quote`, payload);
  }

  attachPrototypeImage(
    orderId: string,
    itemId: string,
    payload: { prototypeImageUrl: string; note?: string }
  ): Observable<ApiResponse<OrderDetail>> {
    return this.http.post<ApiResponse<OrderDetail>>(
      `/api/v1/admin/orders/${orderId}/items/${itemId}/prototype`,
      payload
    );
  }

  updateOrderStatus(
    id: string,
    payload: {
      targetStatus: OrderStatus;
      productionWorkerNote?: string;
      customerProgressNote?: string;
      adminInternalNote?: string;
      note?: string;
    }
  ): Observable<ApiResponse<OrderDetail>> {
    return this.http.patch<ApiResponse<OrderDetail>>(`/api/v1/admin/orders/${id}/status`, payload);
  }

  updateVatInvoice(id: string, vatInvoiceNumber: string): Observable<ApiResponse<OrderDetail>> {
    return this.http.patch<ApiResponse<OrderDetail>>(`/api/v1/admin/orders/${id}/vat-invoice`, {
      vatInvoiceNumber,
    });
  }

  verifyPayment(
    paymentId: string,
    payload: { status: PaymentStatus; note?: string }
  ): Observable<ApiResponse<OrderDetail>> {
    return this.http.patch<ApiResponse<OrderDetail>>(
      `/api/v1/admin/payments/${paymentId}/verify`,
      payload
    );
  }

  getPaymentProof(key: string): Observable<Blob> {
    return this.http.get(`/api/v1/admin/files/payment-proofs/${encodeURIComponent(key)}`, {
      responseType: 'blob',
    });
  }

  // Catalog & Pricing Admin
  getAdminCategories(): Observable<ApiResponse<Category[]>> {
    return this.http.get<ApiResponse<Category[]>>('/api/v1/admin/catalog/categories');
  }

  getAdminMaterials(): Observable<ApiResponse<Material[]>> {
    return this.http.get<ApiResponse<Material[]>>('/api/v1/admin/catalog/materials');
  }

  updateMaterial(id: string, payload: Record<string, unknown>): Observable<ApiResponse<Material>> {
    return this.http.put<ApiResponse<Material>>(`/api/v1/admin/catalog/materials/${id}`, payload);
  }

  getAdminProcessingMethods(): Observable<ApiResponse<ProcessingMethod[]>> {
    return this.http.get<ApiResponse<ProcessingMethod[]>>('/api/v1/admin/catalog/processing-methods');
  }

  getAdminProducts(
    page = 0,
    size = 20,
    filters: { search?: string; categoryId?: string; productType?: string } = {}
  ): Observable<ApiResponse<PageResponse<Product>>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filters.search) params = params.set('search', filters.search.trim());
    if (filters.categoryId) params = params.set('categoryId', filters.categoryId);
    if (filters.productType) params = params.set('productType', filters.productType);
    return this.http.get<ApiResponse<PageResponse<Product>>>('/api/v1/admin/catalog/products', { params });
  }

  createProduct(payload: Record<string, unknown>): Observable<ApiResponse<Product>> {
    return this.http.post<ApiResponse<Product>>('/api/v1/admin/catalog/products', payload);
  }

  updateProduct(id: string, payload: Record<string, unknown>): Observable<ApiResponse<Product>> {
    return this.http.put<ApiResponse<Product>>(`/api/v1/admin/catalog/products/${id}`, payload);
  }

  deleteProduct(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`/api/v1/admin/catalog/products/${id}`);
  }

  getPricingRules(): Observable<ApiResponse<PricingRule[]>> {
    return this.http.get<ApiResponse<PricingRule[]>>('/api/v1/admin/pricing/rules');
  }

  updatePricingRules(
    rules: { ruleKey: string; ruleValue: number; description?: string }[]
  ): Observable<ApiResponse<PricingRule[]>> {
    return this.http.put<ApiResponse<PricingRule[]>>('/api/v1/admin/pricing/rules', { rules });
  }
}
