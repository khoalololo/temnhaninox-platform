import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ApiResponse } from '../models/api.models';
import { AddCartItemRequest, Cart, UpdateCartItemRequest } from '../models/cart.models';

@Injectable({ providedIn: 'root' })
export class CartApiService {
  private readonly http = inject(HttpClient);

  private readonly _cart = signal<Cart | null>(null);
  readonly cart = this._cart.asReadonly();
  readonly cartCount = computed(() => {
    const items = this._cart()?.items ?? [];
    return items.reduce((sum, item) => sum + item.quantity, 0);
  });

  loadCart(): Observable<ApiResponse<Cart>> {
    return this.http.get<ApiResponse<Cart>>('/api/v1/cart').pipe(
      tap((res) => {
        if (res.success && res.data) {
          this._cart.set(res.data);
        }
      })
    );
  }

  addItem(payload: AddCartItemRequest): Observable<ApiResponse<Cart>> {
    return this.http.post<ApiResponse<Cart>>('/api/v1/cart/items', payload).pipe(
      tap((res) => {
        if (res.success && res.data) {
          this._cart.set(res.data);
        }
      })
    );
  }

  updateItemQuantity(itemId: string, payload: UpdateCartItemRequest): Observable<ApiResponse<Cart>> {
    return this.http.put<ApiResponse<Cart>>(`/api/v1/cart/items/${itemId}`, payload).pipe(
      tap((res) => {
        if (res.success && res.data) {
          this._cart.set(res.data);
        }
      })
    );
  }

  removeItem(itemId: string): Observable<ApiResponse<Cart>> {
    return this.http.delete<ApiResponse<Cart>>(`/api/v1/cart/items/${itemId}`).pipe(
      tap((res) => {
        if (res.success && res.data) {
          this._cart.set(res.data);
        }
      })
    );
  }

  clearCart(): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>('/api/v1/cart').pipe(
      tap(() => {
        this._cart.set(null);
      })
    );
  }

  resetLocalCart(): void {
    this._cart.set(null);
  }
}
