import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrderApiService } from '../../../core/services/order-api.service';
import { OrderStatus, OrderSummary } from '../../../core/models/order.models';
import { VndCurrencyPipe } from '../../../core/pipes/vnd-currency.pipe';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule, RouterLink, VndCurrencyPipe],
  template: `
    <div class="max-w-6xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between border-b border-slate-300 pb-4 mb-6">
        <div>
          <h1 class="text-xl font-bold text-slate-900">Lịch Sử Đơn Hàng & Tiến Độ Gia Công</h1>
          <p class="text-xs text-slate-500">Theo dõi duyệt mẫu thực tế, đặt cọc 50% và trạng thái xuất xưởng</p>
        </div>
        <a
          routerLink="/quote-builder"
          class="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4 py-2 rounded-md"
        >
          + Tạo Báo Giá Mới
        </a>
      </div>

      @if (loading()) {
        <div class="bg-white border border-slate-300 rounded-md h-64 animate-pulse"></div>
      } @else if (orders().length === 0) {
        <div class="bg-white border border-slate-300 rounded-md p-10 text-center space-y-2">
          <div class="text-sm font-bold text-slate-900">Bạn chưa có đơn hàng nào</div>
          <p class="text-xs text-slate-500">Hãy mở công cụ báo giá 3D để cấu hình tem nhãn và gửi yêu cầu sản xuất.</p>
        </div>
      } @else {
        <div class="bg-white border border-slate-300 rounded-md overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-xs text-left">
              <thead class="bg-slate-100 border-b border-slate-300 text-slate-700 uppercase font-mono">
                <tr>
                  <th class="px-4 py-3">Mã đơn</th>
                  <th class="px-3 py-3">Loại đơn</th>
                  <th class="px-3 py-3">Trạng thái</th>
                  <th class="px-3 py-3 text-right">Tổng tiền</th>
                  <th class="px-3 py-3 text-right">Đã thanh toán</th>
                  <th class="px-4 py-3 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                @for (ord of orders(); track ord.id) {
                  <tr class="hover:bg-slate-50">
                    <td class="px-4 py-3.5 font-mono font-bold text-slate-900">{{ ord.orderCode }}</td>
                    <td class="px-3 py-3.5">
                      <span class="px-2 py-0.5 rounded border text-[11px] font-mono bg-slate-100 border-slate-300">
                        {{ ord.orderType === 'CUSTOM_QUOTE_ORDER' ? 'Gia công 3D' : 'Hàng có sẵn' }}
                      </span>
                    </td>
                    <td class="px-3 py-3.5">
                      <span class="px-2 py-0.5 rounded border text-[11px] font-semibold" [class]="statusBadgeClass(ord.status)">
                        {{ statusLabel(ord.status) }}
                      </span>
                    </td>
                    <td class="px-3 py-3.5 text-right font-mono tabular-nums font-bold text-slate-900">
                      {{ ord.totalAmount | vnd }}
                    </td>
                    <td class="px-3 py-3.5 text-right font-mono tabular-nums text-emerald-700 font-semibold">
                      {{ ord.paidAmount | vnd }}
                    </td>
                    <td class="px-4 py-3.5 text-right">
                      <a
                        [routerLink]="['/account/orders', ord.id]"
                        class="inline-block bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3 py-1.5 rounded text-[11px]"
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
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'IN_PRODUCTION':
      case 'READY_FOR_DELIVERY':
        return 'bg-sky-50 text-sky-800 border-sky-300';
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'CANCELLED':
        return 'bg-red-50 text-red-700 border-red-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  }
}
