import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartApiService } from '../../core/services/cart-api.service';
import { CartItem } from '../../core/models/cart.models';
import { VndCurrencyPipe } from '../../core/pipes/vnd-currency.pipe';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterLink, VndCurrencyPipe],
  template: `
    <div class="max-w-6xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between border-b border-slate-300 pb-4 mb-6">
        <div>
          <h1 class="text-xl font-bold text-slate-900">Giỏ Hàng & Danh Sách Hạng Mục Báo Giá</h1>
          <p class="text-xs text-slate-500">
            Đơn hàng có hạng mục gia công sẽ được xưởng duyệt mẫu thực tế trước khi thu cọc 50%
          </p>
        </div>
        @if ((cartService.cart()?.items?.length || 0) > 0) {
          <button
            type="button"
            (click)="clearAll()"
            class="text-xs text-red-600 hover:underline font-medium"
          >
            Xóa toàn bộ giỏ
          </button>
        }
      </div>

      @if (loading()) {
        <div class="bg-white border border-slate-300 rounded-md h-64 animate-pulse"></div>
      } @else if (!cartService.cart() || cartService.cart()!.items.length === 0) {
        <div class="bg-white border border-slate-300 rounded-md p-12 text-center space-y-3">
          <div class="text-base font-bold text-slate-900">Giỏ hàng hiện đang trống</div>
          <p class="text-xs text-slate-500">
            Bạn có thể chọn vật tư có sẵn hoặc thiết lập kích thước tem nhãn trên công cụ 3D.
          </p>
          <div class="flex items-center justify-center gap-3 pt-2">
            <a
              routerLink="/quote-builder"
              class="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4 py-2.5 rounded-md"
            >
              Mở Báo Giá & Xem Mẫu 3D
            </a>
            <a
              routerLink="/products"
              class="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 rounded-md"
            >
              Xem Danh Mục Sản Phẩm
            </a>
          </div>
        </div>
      } @else {
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- Cart Items Table -->
          <div class="lg:col-span-8 bg-white border border-slate-300 rounded-md overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-xs text-left">
                <thead class="bg-slate-100 border-b border-slate-300 text-slate-700 uppercase font-mono">
                  <tr>
                    <th class="px-4 py-3">Hạng mục / Thông số</th>
                    <th class="px-3 py-3 text-right">Đơn giá</th>
                    <th class="px-3 py-3 text-center">Số lượng</th>
                    <th class="px-4 py-3 text-right">Thành tiền</th>
                    <th class="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200">
                  @for (item of cartService.cart()!.items; track item.id) {
                    <tr>
                      <td class="px-4 py-3.5 align-top">
                        <div class="flex items-center gap-2 mb-1">
                          <span
                            class="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded border"
                            [class]="item.productType === 'CUSTOM_TEMPLATE'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-slate-100 text-slate-700 border-slate-300'"
                          >
                            {{ item.productType === 'CUSTOM_TEMPLATE' ? 'GIA CÔNG 3D' : 'CÓ SẴN' }}
                          </span>
                          <span class="font-bold text-slate-900 text-sm">{{ item.productName }}</span>
                        </div>

                        @if (item.productType === 'CUSTOM_TEMPLATE') {
                          <div class="text-slate-600 space-y-0.5 font-mono text-[11px]">
                            <div>
                              Vật liệu: {{ item.materialNameSnapshot || '—' }} · Gia công: {{ item.processingMethodNameSnapshot || '—' }}
                            </div>
                            <div class="tabular-nums">
                              Kích thước: {{ item.widthMm }} × {{ item.heightMm }} × {{ item.thicknessMm }} mm
                            </div>
                            @if (item.designFileUrl) {
                              <div>
                                File thiết kế:
                                <a [href]="item.designFileUrl" target="_blank" class="text-amber-700 underline">
                                  {{ item.designFileName || 'Xem file đính kèm' }}
                                </a>
                              </div>
                            }
                          </div>
                        }
                      </td>

                      <td class="px-3 py-3.5 text-right font-mono tabular-nums align-top text-slate-800">
                        {{ item.unitPrice | vnd }}
                      </td>

                      <td class="px-3 py-3.5 align-top">
                        <div class="inline-flex items-center border border-slate-300 rounded">
                          <button
                            type="button"
                            [disabled]="updatingId() === item.id || item.quantity <= 1"
                            (click)="changeQty(item, item.quantity - 1)"
                            class="px-2 py-1 font-mono hover:bg-slate-100 disabled:opacity-40"
                          >
                            -
                          </button>
                          <span class="px-2.5 py-1 font-mono tabular-nums font-semibold">
                            {{ item.quantity }}
                          </span>
                          <button
                            type="button"
                            [disabled]="updatingId() === item.id"
                            (click)="changeQty(item, item.quantity + 1)"
                            class="px-2 py-1 font-mono hover:bg-slate-100 disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>
                        @if (item.productType === 'CUSTOM_TEMPLATE' && item.quantity >= 1000) {
                          <div class="text-[10px] font-mono text-emerald-700 mt-1">Đã giảm 10% SL lớn</div>
                        }
                      </td>

                      <td class="px-4 py-3.5 text-right font-mono tabular-nums font-bold text-slate-900 align-top">
                        {{ item.lineTotal | vnd }}
                      </td>

                      <td class="px-3 py-3.5 text-right align-top">
                        <button
                          type="button"
                          (click)="removeItem(item.id)"
                          class="text-slate-400 hover:text-red-600 font-mono text-xs"
                          title="Xóa hạng mục"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- Order Summary Card -->
          <div class="lg:col-span-4 bg-white border border-slate-300 rounded-md p-5 h-fit space-y-4">
            <h2 class="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-3">
              Tạm Tính Đơn Hàng
            </h2>

            <div class="space-y-2 text-xs">
              <div class="flex justify-between text-slate-600">
                <span>Tổng số lượng tem / sản phẩm:</span>
                <span class="font-mono tabular-nums font-semibold text-slate-900">{{ cartService.cartCount() }}</span>
              </div>
              <div class="flex justify-between text-slate-600">
                <span>Tạm tính (chưa VAT):</span>
                <span class="font-mono tabular-nums text-base font-bold text-slate-900">
                  {{ cartService.cart()!.subtotal | vnd }}
                </span>
              </div>
              <p class="text-[11px] text-slate-500 pt-1">
                * Thuế VAT đỏ 10% và tiền đặt cọc 50% sản xuất sẽ được tính ở bước xác nhận đơn hàng.
              </p>
            </div>

            <a
              routerLink="/checkout"
              class="block w-full text-center bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm py-2.5 rounded-md transition-colors"
            >
              Tiến hành đặt hàng →
            </a>
          </div>
        </div>
      }
    </div>
  `,
})
export class CartComponent implements OnInit {
  readonly cartService = inject(CartApiService);
  readonly loading = signal(true);
  readonly updatingId = signal<string | null>(null);

  ngOnInit(): void {
    this.cartService.loadCart().subscribe({
      next: () => this.loading.set(false),
      error: () => this.loading.set(false),
    });
  }

  changeQty(item: CartItem, nextQty: number): void {
    if (nextQty < 1) return;
    this.updatingId.set(item.id);
    this.cartService.updateItemQuantity(item.id, { quantity: nextQty }).subscribe({
      next: () => this.updatingId.set(null),
      error: () => this.updatingId.set(null),
    });
  }

  removeItem(itemId: string): void {
    this.cartService.removeItem(itemId).subscribe();
  }

  clearAll(): void {
    this.cartService.clearCart().subscribe();
  }
}
