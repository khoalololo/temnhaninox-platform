import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CartApiService } from '../../core/services/cart-api.service';
import { OrderApiService } from '../../core/services/order-api.service';
import { VatProfile } from '../../core/models/auth.models';
import { VndCurrencyPipe } from '../../core/pipes/vnd-currency.pipe';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, VndCurrencyPipe],
  template: `
    <div class="max-w-5xl mx-auto px-4 py-8">
      <div class="border-b border-slate-300 pb-4 mb-6">
        <h1 class="text-xl font-bold text-slate-900">Xác Nhận Thông Tin Giao Hàng & Hóa Đơn VAT</h1>
        <p class="text-xs text-slate-500">
          Sau khi gửi đơn, xưởng sẽ kiểm tra bản vẽ kỹ thuật và liên hệ duyệt mẫu thực tế
        </p>
      </div>

      @if (errorMessage()) {
        <div class="mb-4 p-3 rounded border border-red-300 bg-red-50 text-xs text-red-700">
          {{ errorMessage() }}
        </div>
      }

      <form (ngSubmit)="submitOrder()" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div class="lg:col-span-7 space-y-5">
          <!-- Shipping Details -->
          <div class="bg-white border border-slate-300 rounded-md p-5 space-y-3.5">
            <h2 class="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2.5">
              1. Địa chỉ nhận hàng / Giao chành xe
            </h2>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Người nhận hàng *</label>
                <input
                  type="text"
                  [(ngModel)]="recipientName"
                  name="recipientName"
                  required
                  class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-amber-600"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại / Zalo *</label>
                <input
                  type="text"
                  [(ngModel)]="recipientPhone"
                  name="recipientPhone"
                  required
                  class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-600"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Địa chỉ giao hàng chi tiết *</label>
              <textarea
                rows="2"
                [(ngModel)]="shippingAddress"
                name="shippingAddress"
                required
                placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-amber-600"
              ></textarea>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Ghi chú đơn hàng</label>
              <input
                type="text"
                [(ngModel)]="customerNote"
                name="customerNote"
                placeholder="VD: Giao giờ hành chính, xuất phiếu giao hàng kèm theo..."
                class="w-full border border-slate-300 rounded-md px-3 py-2 text-xs focus:outline-none focus:border-amber-600"
              />
            </div>
          </div>

          <!-- Red VAT Invoice Section -->
          <div class="bg-white border border-slate-300 rounded-md p-5 space-y-3.5">
            <label class="flex items-center justify-between cursor-pointer">
              <div>
                <div class="text-xs font-bold uppercase tracking-wider text-slate-900">
                  2. Xuất Hóa Đơn Giá Trị Gia Tăng (VAT Đỏ 10%)
                </div>
                <div class="text-[11px] text-slate-500">Hóa đơn điện tử gửi qua email sau khi tất toán</div>
              </div>
              <input
                type="checkbox"
                [(ngModel)]="requiresVatInvoice"
                name="requiresVatInvoice"
                class="w-4 h-4 rounded border-slate-300"
              />
            </label>

            @if (requiresVatInvoice) {
              <div class="pt-3 border-t border-slate-200 space-y-3">
                @if (vatProfiles().length > 0) {
                  <div>
                    <label class="block text-[11px] font-semibold text-slate-700 mb-1">Chọn nhanh MST đã lưu</label>
                    <select
                      (change)="onSelectSavedVat($event)"
                      class="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-slate-50"
                    >
                      <option value="">-- Nhập thủ công hoặc chọn hồ sơ --</option>
                      @for (vp of vatProfiles(); track vp.id) {
                        <option [value]="vp.id">{{ vp.taxCode }} - {{ vp.companyName }}</option>
                      }
                    </select>
                  </div>
                }

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-[11px] font-semibold text-slate-700 mb-1">Tên công ty *</label>
                    <input
                      type="text"
                      [(ngModel)]="vatCompanyName"
                      name="vatCompanyName"
                      required
                      class="w-full border border-slate-300 rounded-md px-3 py-2 text-xs focus:outline-none focus:border-amber-600"
                    />
                  </div>
                  <div>
                    <label class="block text-[11px] font-semibold text-slate-700 mb-1">Mã số thuế (MST) *</label>
                    <input
                      type="text"
                      [(ngModel)]="vatTaxCode"
                      name="vatTaxCode"
                      required
                      class="w-full border border-slate-300 rounded-md px-3 py-2 text-xs font-mono focus:outline-none focus:border-amber-600"
                    />
                  </div>
                </div>

                <div>
                  <label class="block text-[11px] font-semibold text-slate-700 mb-1">Địa chỉ đăng ký kinh doanh *</label>
                  <input
                    type="text"
                    [(ngModel)]="vatCompanyAddress"
                    name="vatCompanyAddress"
                    required
                    class="w-full border border-slate-300 rounded-md px-3 py-2 text-xs focus:outline-none focus:border-amber-600"
                  />
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Order Summary -->
        <div class="lg:col-span-5 bg-white border border-slate-300 rounded-md p-5 h-fit space-y-4">
          <h2 class="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2.5">
            Tóm Tắt Đơn Đặt Hàng
          </h2>

          @if (cartService.cart()) {
            <div class="space-y-2 text-xs">
              <div class="flex justify-between text-slate-600">
                <span>Số lượng hạng mục:</span>
                <span class="font-mono font-semibold text-slate-900">{{ cartService.cart()!.items.length }}</span>
              </div>
              <div class="flex justify-between text-slate-600">
                <span>Tổng số lượng sản phẩm:</span>
                <span class="font-mono tabular-nums font-semibold text-slate-900">{{ cartService.cartCount() }}</span>
              </div>
              <div class="flex justify-between text-slate-600">
                <span>Tạm tính:</span>
                <span class="font-mono tabular-nums font-semibold text-slate-900">
                  {{ cartService.cart()!.estimatedSubtotal | vnd }}
                </span>
              </div>
              @if (requiresVatInvoice) {
                <div class="flex justify-between text-slate-600">
                  <span>Thuế VAT (10%):</span>
                  <span class="font-mono tabular-nums text-slate-900">
                    {{ cartService.cart()!.estimatedSubtotal * 0.1 | vnd }}
                  </span>
                </div>
              }
              <div class="border-t-2 border-slate-900 pt-3 flex justify-between items-baseline">
                <span class="font-bold text-slate-900">Tổng thanh toán dự kiến:</span>
                <span class="font-mono tabular-nums text-lg font-bold text-amber-700">
                  {{ (cartService.cart()!.estimatedSubtotal * (requiresVatInvoice ? 1.1 : 1)) | vnd }}
                </span>
              </div>
            </div>
          }

          <button
            type="submit"
            [disabled]="submitting() || (cartService.cart()?.items?.length || 0) === 0"
            class="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white font-semibold text-sm py-3 rounded-md transition-colors"
          >
            {{ submitting() ? 'Đang khởi tạo đơn hàng...' : 'Xác Nhận Gửi Đơn Hàng' }}
          </button>

          <a routerLink="/cart" class="block text-center text-xs text-slate-500 hover:text-slate-800">
            ← Quay lại chỉnh sửa giỏ hàng
          </a>
        </div>
      </form>
    </div>
  `,
})
export class CheckoutComponent implements OnInit {
  private readonly authService = inject(AuthService);
  readonly cartService = inject(CartApiService);
  private readonly orderApi = inject(OrderApiService);
  private readonly router = inject(Router);

  readonly vatProfiles = signal<VatProfile[]>([]);
  readonly submitting = signal(false);
  readonly errorMessage = signal('');

  recipientName = '';
  recipientPhone = '';
  shippingAddress = '';
  customerNote = '';
  requiresVatInvoice = false;
  vatCompanyName = '';
  vatTaxCode = '';
  vatCompanyAddress = '';

  ngOnInit(): void {
    this.cartService.loadCart().subscribe();
    this.authService.getProfile().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.recipientName = res.data.fullName || '';
          this.recipientPhone = res.data.phone || '';
          this.shippingAddress = res.data.defaultAddress || '';
        }
      },
    });
    this.authService.getVatProfiles().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.vatProfiles.set(res.data);
          const def = res.data.find((v) => v.isDefault) || res.data[0];
          if (def) {
            this.vatCompanyName = def.companyName;
            this.vatTaxCode = def.taxCode;
            this.vatCompanyAddress = def.companyAddress;
          }
        }
      },
    });
  }

  onSelectSavedVat(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    const found = this.vatProfiles().find((v) => v.id === id);
    if (found) {
      this.vatCompanyName = found.companyName;
      this.vatTaxCode = found.taxCode;
      this.vatCompanyAddress = found.companyAddress;
    }
  }

  submitOrder(): void {
    if (!this.recipientName.trim() || !this.recipientPhone.trim() || !this.shippingAddress.trim()) {
      this.errorMessage.set('Vui lòng nhập đầy đủ Tên người nhận, Số điện thoại và Địa chỉ giao hàng.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    this.orderApi
      .checkout({
        recipientName: this.recipientName.trim(),
        recipientPhone: this.recipientPhone.trim(),
        shippingAddress: this.shippingAddress.trim(),
        customerNote: this.customerNote.trim() || undefined,
        requiresVatInvoice: this.requiresVatInvoice,
        vatCompanyName: this.requiresVatInvoice ? this.vatCompanyName.trim() : undefined,
        vatTaxCode: this.requiresVatInvoice ? this.vatTaxCode.trim() : undefined,
        vatCompanyAddress: this.requiresVatInvoice ? this.vatCompanyAddress.trim() : undefined,
      })
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          if (res.success && res.data) {
            this.cartService.resetLocalCart();
            this.router.navigate(['/account/orders', res.data.id]);
          }
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(err?.error?.message || 'Không thể tạo đơn hàng.');
        },
      });
  }
}
