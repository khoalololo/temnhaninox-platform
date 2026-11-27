import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrderApiService } from '../../core/services/order-api.service';
import { VnpayReturnResponse } from '../../core/models/order.models';
import { VndCurrencyPipe } from '../../core/pipes/vnd-currency.pipe';
import { ButtonDirective } from '../../shared/components/button/button.component';

@Component({
  selector: 'app-vnpay-return',
  standalone: true,
  imports: [CommonModule, RouterLink, VndCurrencyPipe, ButtonDirective],
  template: `
    <div class="max-w-lg mx-auto px-4 py-14">
      <div class="industrial-card p-6 text-center space-y-4">
        @if (loading()) {
          <div class="text-sm font-mono text-text-secondary">Đang xác thực chữ ký giao dịch VNPAY...</div>
        } @else if (result()) {
          <div
            class="w-12 h-12 rounded-full mx-auto flex items-center justify-center font-bold text-lg border"
            [class]="result()!.verified ? 'bg-success/10 border-success text-success' : 'bg-danger/10 border-danger text-danger'"
          >
            @if (result()!.verified) {
              <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2.2" aria-label="Thanh toán thành công"><path d="m5 12 4 4L19 6" /></svg>
            } @else {
              <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2.2" aria-label="Giao dịch chưa hoàn tất"><path d="m18 6-12 12M6 6l12 12" /></svg>
            }
          </div>

          <h1 class="font-heading text-lg font-bold text-text-primary">
            {{ result()!.verified ? 'Thanh Toán VNPAY Thành Công' : 'Giao Dịch Chưa Hoàn Tất' }}
          </h1>

          <p class="text-xs text-text-secondary">{{ result()!.message }}</p>

          <div class="bg-bg border border-border rounded-[6px] p-3 text-xs font-mono space-y-1 text-left text-text-secondary">
            @if (result()!.orderCode) {
              <div>Mã đơn hàng: <strong class="text-text-primary">{{ result()!.orderCode }}</strong></div>
            }
            @if (result()!.transactionRef) {
              <div>Mã tham chiếu: <span class="text-text-primary">{{ result()!.transactionRef }}</span></div>
            }
            @if (result()!.amount) {
              <div>Số tiền: <strong class="price-text text-accent">{{ result()!.amount | vnd }}</strong></div>
            }
          </div>

          <div class="pt-2">
            @if (result()!.orderId) {
              <a
                [routerLink]="['/account/orders', result()!.orderId]"
                appButton
                variant="primary"
                size="md"
              >
                Quay lại chi tiết đơn hàng
                <svg viewBox="0 0 24 24" class="ml-1 inline h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12h14m0 0-6-6m6 6-6 6" /></svg>
              </a>
            } @else {
              <a
                routerLink="/account/orders"
                appButton
                variant="secondary"
                size="md"
              >
                Danh sách đơn hàng
              </a>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class VnpayReturnComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly orderApi = inject(OrderApiService);

  readonly loading = signal(true);
  readonly result = signal<VnpayReturnResponse | null>(null);

  ngOnInit(): void {
    const queryParams: Record<string, string> = {};
    this.route.snapshot.queryParamMap.keys.forEach((key) => {
      const val = this.route.snapshot.queryParamMap.get(key);
      if (val !== null) queryParams[key] = val;
    });

    this.orderApi.handleVnpayReturn(queryParams).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success && res.data) {
          this.result.set(res.data);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.result.set({
          verified: false,
          message: err?.error?.message || 'Lỗi xác thực chữ ký VNPAY.',
        });
      },
    });
  }
}
