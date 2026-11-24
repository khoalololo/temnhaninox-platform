import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrderApiService } from '../../core/services/order-api.service';
import { VnpayReturnResponse } from '../../core/models/order.models';
import { VndCurrencyPipe } from '../../core/pipes/vnd-currency.pipe';

@Component({
  selector: 'app-vnpay-return',
  standalone: true,
  imports: [CommonModule, RouterLink, VndCurrencyPipe],
  template: `
    <div class="max-w-lg mx-auto px-4 py-14">
      <div class="bg-white border border-slate-300 rounded-md p-6 text-center space-y-4">
        @if (loading()) {
          <div class="text-sm font-mono text-slate-600">Đang xác thực chữ ký giao dịch VNPAY...</div>
        } @else if (result()) {
          <div
            class="w-12 h-12 rounded-full mx-auto flex items-center justify-center font-bold text-lg"
            [class]="result()!.verified ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'"
          >
            {{ result()!.verified ? '✓' : '✕' }}
          </div>

          <h1 class="text-lg font-bold text-slate-900">
            {{ result()!.verified ? 'Thanh Toán VNPAY Thành Công' : 'Giao Dịch Chưa Hoàn Tất' }}
          </h1>

          <p class="text-xs text-slate-600">{{ result()!.message }}</p>

          <div class="bg-slate-50 border border-slate-200 rounded p-3 text-xs font-mono space-y-1 text-left">
            @if (result()!.orderCode) {
              <div>Mã đơn hàng: <strong>{{ result()!.orderCode }}</strong></div>
            }
            @if (result()!.transactionRef) {
              <div>Mã tham chiếu: {{ result()!.transactionRef }}</div>
            }
            @if (result()!.amount) {
              <div>Số tiền: <strong>{{ result()!.amount | vnd }}</strong></div>
            }
          </div>

          <div class="pt-2">
            @if (result()!.orderId) {
              <a
                [routerLink]="['/account/orders', result()!.orderId]"
                class="inline-block bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-5 py-2.5 rounded-md"
              >
                Quay lại chi tiết đơn hàng →
              </a>
            } @else {
              <a
                routerLink="/account/orders"
                class="inline-block bg-slate-900 text-white text-xs font-semibold px-5 py-2.5 rounded-md"
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
