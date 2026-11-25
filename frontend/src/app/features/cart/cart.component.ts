import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartApiService } from '../../core/services/cart-api.service';
import { CartItem } from '../../core/models/cart.models';
import { VndCurrencyPipe } from '../../core/pipes/vnd-currency.pipe';
import { ButtonDirective } from '../../shared/components/button/button.component';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterLink, VndCurrencyPipe, ButtonDirective],
  template: `
    <div class="max-w-6xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between border-b border-border pb-4 mb-6">
        <div>
          <h1 class="font-heading text-xl font-bold text-text-primary">Giỏ Hàng & Danh Sách Hạng Mục Báo Giá</h1>
          <p class="text-xs text-text-secondary">
            Đơn hàng có hạng mục gia công sẽ được xưởng duyệt mẫu thực tế trước khi thu cọc 50%
          </p>
        </div>
        @if ((cartService.cart()?.items?.length || 0) > 0) {
          <button
            type="button"
            (click)="clearAll()"
            appButton
            variant="danger"
            size="xs"
          >
            Xóa toàn bộ giỏ
          </button>
        }
      </div>

      @if (loading()) {
        <div class="bg-surface border border-border rounded-[10px] h-64 animate-pulse"></div>
      } @else if (!cartService.cart() || cartService.cart()!.items.length === 0) {
        <div class="industrial-card p-12 text-center space-y-3">
          <div class="font-heading text-base font-bold text-text-primary">Giỏ hàng hiện đang trống</div>
          <p class="text-xs text-text-secondary">
            Bạn có thể chọn vật tư có sẵn hoặc thiết lập kích thước tem nhãn trên công cụ 3D.
          </p>
          <div class="flex items-center justify-center gap-3 pt-2">
            <a
              routerLink="/quote-builder"
              appButton
              variant="primary"
              size="md"
            >
              Mở Báo Giá & Xem Mẫu 3D
            </a>
            <a
              routerLink="/products"
              appButton
              variant="secondary"
              size="md"
            >
              Xem Danh Mục Sản Phẩm
            </a>
          </div>
        </div>
      } @else {
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div class="lg:col-span-8 industrial-card overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-xs text-left">
                <thead class="bg-surface-raised border-b border-border text-text-secondary uppercase font-mono">
                <tr>
                  <th class="px-4 py-3">Hạng mục / Thông số</th>
                  <th class="px-3 py-3 text-right">Đơn giá tạm tính</th>
                  <th class="px-3 py-3 text-center">Số lượng</th>
                  <th class="px-4 py-3 text-right">Thành tiền</th>
                  <th class="px-3 py-3"></th>
                </tr>
                </thead>
                <tbody class="divide-y divide-border">
                  @for (item of cartService.cart()!.items; track item.id) {
                    <tr>
                      <td class="px-4 py-3.5 align-top">
                        <div class="flex items-center gap-2 mb-1">
                          <span
                            class="px-2 py-0.5 text-[10px] font-mono font-medium rounded-full border"
                            [class]="item.itemType === 'CUSTOM_ITEM'
                              ? 'border-accent/70 text-accent bg-bg'
                              : 'border-steel/70 text-steel bg-bg'"
                          >
                            {{ item.itemType === 'CUSTOM_ITEM' ? 'GIA CÔNG 3D' : 'CÓ SẴN' }}
                          </span>
                          <span class="font-semibold text-text-primary text-sm">
                            {{ item.itemType === 'CUSTOM_ITEM' ? 'Tem Nhãn Gia Công Theo Kích Thước' : 'Vật Tư / Sản Phẩm Kho' }}
                          </span>
                        </div>

                        @if (item.itemType === 'CUSTOM_ITEM') {
                          <div class="text-text-secondary space-y-0.5 font-mono text-[11px]">
                            <div class="tabular-nums">
                              Kích thước: {{ item.widthMm }} × {{ item.heightMm }} × {{ item.thicknessMm }} mm
                            </div>
                            @if (item.designFileUrl) {
                              <div>
                                File kỹ thuật:
                                <a [href]="item.designFileUrl" target="_blank" class="text-steel hover:text-steel-hover underline">
                                  Xem bản vẽ đính kèm
                                </a>
                              </div>
                            }
                          </div>
                        }
                        @if (item.customerNote) {
                          <div class="text-[11px] text-text-muted mt-1">Ghi chú: {{ item.customerNote }}</div>
                        }
                      </td>

                      <td class="px-3 py-3.5 text-right font-mono tabular-nums align-top text-text-primary">
                        {{ item.estimatedUnitPrice | vnd }}
                      </td>

                      <td class="px-3 py-3.5 align-top">
                        <div class="inline-flex items-center border border-border rounded-[6px] bg-bg">
                          <button
                            type="button"
                            [disabled]="updatingId() === item.id || item.quantity <= 1"
                            (click)="changeQty(item, item.quantity - 1)"
                            class="px-2 py-1 font-mono text-text-primary hover:bg-surface-raised disabled:opacity-40"
                          >
                            -
                          </button>
                          <span class="px-2.5 py-1 font-mono tabular-nums font-medium text-text-primary">
                            {{ item.quantity }}
                          </span>
                          <button
                            type="button"
                            [disabled]="updatingId() === item.id"
                            (click)="changeQty(item, item.quantity + 1)"
                            class="px-2 py-1 font-mono text-text-primary hover:bg-surface-raised disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>
                        @if (item.itemType === 'CUSTOM_ITEM' && item.quantity >= 1000) {
                          <div class="text-[10px] font-mono text-success mt-1">Đã áp dụng chiết khấu SL lớn</div>
                        }
                      </td>

                      <td class="px-4 py-3.5 text-right font-mono tabular-nums font-semibold text-text-primary align-top">
                        {{ item.lineTotal | vnd }}
                      </td>

                      <td class="px-3 py-3.5 text-right align-top">
                        <button
                          type="button"
                          (click)="removeItem(item.id)"
                          class="text-text-muted hover:text-danger font-mono text-xs transition-colors"
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

          <div class="lg:col-span-4 industrial-card p-5 h-fit space-y-4">
            <h2 class="font-heading text-sm font-bold uppercase tracking-wider text-text-primary border-b border-border pb-3">
              Tạm Tính Đơn Hàng
            </h2>

            <div class="space-y-2 text-xs">
              <div class="flex justify-between text-text-secondary">
                <span>Tổng số lượng tem / sản phẩm:</span>
                <span class="font-mono tabular-nums font-medium text-text-primary">{{ cartService.cartCount() }}</span>
              </div>
              <div class="flex justify-between text-text-secondary">
                <span>Tạm tính (chưa VAT):</span>
                <span class="font-mono tabular-nums text-base font-bold text-text-primary">
                  {{ cartService.cart()!.estimatedSubtotal | vnd }}
                </span>
              </div>
              <p class="text-[11px] text-text-muted pt-1">
                * Thuế VAT đỏ 10% và tiền đặt cọc 50% sản xuất sẽ được tính ở bước xác nhận đơn hàng.
              </p>
            </div>

            <a
              routerLink="/checkout"
              appButton
              variant="primary"
              size="lg"
              [fullWidth]="true"
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
