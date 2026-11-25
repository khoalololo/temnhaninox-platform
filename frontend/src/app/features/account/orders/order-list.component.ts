import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrderApiService } from '../../../core/services/order-api.service';
import { OrderStatus, OrderSummary } from '../../../core/models/order.models';
import { VndCurrencyPipe } from '../../../core/pipes/vnd-currency.pipe';
import { ButtonDirective } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule, RouterLink, VndCurrencyPipe, ButtonDirective],
  template: `
    <div class="max-w-6xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between border-b border-border pb-4 mb-6">
        <div>
          <h1 class="font-heading text-xl font-bold text-text-primary">Lịch Sử Đơn Hàng & Tiến Độ Gia Công</h1>
          <p class="text-xs text-text-secondary">Theo dõi duyệt mẫu thực tế, đặt cọc 50% và trạng thái xuất xưởng</p>
        </div>
        <a
          routerLink="/quote-builder"
          appButton
          variant="primary"
          size="sm"
        >
          + Tạo Báo Giá Mới
        </a>
      </div>

      @if (loading()) {
        <div class="bg-surface border border-border rounded-[10px] h-64 animate-pulse"></div>
      } @else if (orders().length === 0) {
        <div class="industrial-card p-10 text-center space-y-2">
          <div class="font-heading text-sm font-bold text-text-primary">Bạn chưa có đơn hàng nào</div>
          <p class="text-xs text-text-secondary">Hãy mở công cụ báo giá 3D để cấu hình tem nhãn và gửi yêu cầu sản xuất.</p>
        </div>
      } @else {
        <div class="industrial-card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-xs text-left">
              <thead class="bg-surface-raised border-b border-border text-text-secondary uppercase font-mono">
                <tr>
                  <th class="px-4 py-3">Mã đơn</th>
                  <th class="px-3 py-3">Loại đơn</th>
                  <th class="px-3 py-3">Trạng thái</th>
                  <th class="px-3 py-3 text-right">Tổng tiền</th>
                  <th class="px-3 py-3 text-right">Đã thanh toán</th>
                  <th class="px-4 py-3 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                @for (ord of orders(); track ord.id) {
                  <tr class="hover:bg-surface-raised transition-colors">
                    <td class="px-4 py-3.5 font-mono font-bold text-text-primary">{{ ord.orderCode }}</td>
                    <td class="px-3 py-3.5">
                      <span class="px-2 py-0.5 rounded-full border border-border text-[11px] font-mono text-text-secondary bg-bg">
                        {{ ord.orderType === 'CUSTOM_QUOTE_ORDER' ? 'Gia công 3D' : 'Hàng có sẵn' }}
                      </span>
                    </td>
                    <td class="px-3 py-3.5">
                      <span class="px-2 py-0.5 rounded-full border text-[11px] font-medium" [class]="statusBadgeClass(ord.status)">
                        {{ statusLabel(ord.status) }}
                      </span>
                    </td>
                    <td class="px-3 py-3.5 text-right font-mono tabular-nums font-bold text-text-primary">
                      {{ ord.totalAmount | vnd }}
                    </td>
                    <td class="px-3 py-3.5 text-right font-mono tabular-nums text-success font-semibold">
                      {{ ord.paidAmount | vnd }}
                    </td>
                    <td class="px-4 py-3.5 text-right">
                      <a
                        [routerLink]="['/account/orders', ord.id]"
                        appButton
                        variant="secondary"
                        size="xs"
                      >
                        Theo dõi →
                      </a>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
})
export class OrderListComponent implements OnInit {
  private readonly orderApi = inject(OrderApiService);

  readonly orders = signal<OrderSummary[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.orderApi.getMyOrders(0, 20).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success && res.data) {
          this.orders.set(res.data.content || []);
        }
      },
      error: () => this.loading.set(false),
    });
  }

  statusLabel(status: OrderStatus): string {
    const map: Record<OrderStatus, string> = {
      QUOTE_PENDING: 'Chờ duyệt báo giá',
      QUOTE_APPROVED: 'Đã duyệt giá',
      PROTOTYPING: 'Đang làm mẫu thực tế',
      AWAITING_DEPOSIT: 'Chờ đặt cọc 50%',
      IN_PRODUCTION: 'Đang sản xuất hàng loạt',
      READY_FOR_DELIVERY: 'Sẵn sàng giao hàng',
      COMPLETED: 'Hoàn tất',
      CANCELLED: 'Đã hủy',
    };
    return map[status] || status;
  }

  statusBadgeClass(status: OrderStatus): string {
    switch (status) {
      case 'PROTOTYPING':
      case 'AWAITING_DEPOSIT':
        return 'bg-bg text-accent border-accent/70';
      case 'IN_PRODUCTION':
      case 'READY_FOR_DELIVERY':
        return 'bg-bg text-steel border-steel/70';
      case 'COMPLETED':
        return 'bg-bg text-success border-success/70';
      case 'CANCELLED':
        return 'bg-bg text-danger border-danger/70';
      default:
        return 'bg-bg text-text-secondary border-border';
    }
  }
}
