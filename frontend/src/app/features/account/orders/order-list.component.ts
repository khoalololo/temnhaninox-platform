import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrderApiService } from '../../../core/services/order-api.service';
import { OrderStatus, OrderSummary } from '../../../core/models/order.models';
import { orderStatusLabel, orderStatusTone, orderTypeLabel, paidPercent } from '../../../shared/utils/order-ui';
import { VndCurrencyPipe } from '../../../core/pipes/vnd-currency.pipe';
import { ButtonDirective } from '../../../shared/components/button/button.component';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule, RouterLink, VndCurrencyPipe, ButtonDirective, PaginatorComponent],
  template: `
    <div class="max-w-6xl mx-auto px-4 py-8">
      <div class="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4 mb-5">
        <div>
          <h1 class="font-heading text-2xl font-bold text-text-primary">Đơn hàng của tôi</h1>
          <p class="text-sm text-text-secondary mt-0.5">Theo dõi duyệt mẫu thực tế, đặt cọc 50% và trạng thái xuất xưởng.</p>
        </div>
        <a routerLink="/quote-builder" appButton variant="primary" size="sm">+ Tạo báo giá mới</a>
      </div>

      @if (loading()) {
        <div class="space-y-3" aria-label="Đang tải đơn hàng">
          <div class="bg-surface border border-border rounded-[10px] h-28 animate-pulse"></div>
          <div class="bg-surface border border-border rounded-[10px] h-28 animate-pulse"></div>
          <div class="bg-surface border border-border rounded-[10px] h-28 animate-pulse"></div>
        </div>
      } @else if (loadError()) {
        <div class="industrial-card p-8 text-center space-y-3">
          <p class="text-sm font-semibold text-danger">{{ loadError() }}</p>
          <button type="button" (click)="loadOrders()" appButton variant="primary" size="sm">Thử lại</button>
        </div>
      } @else if (orders().length === 0) {
        <div class="industrial-card tni-empty">
          <svg viewBox="0 0 24 24" class="tni-empty-icon" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M7 3.75h7l5 5v11.5H7a2 2 0 0 1-2-2v-12.5a2 2 0 0 1 2-2Z" /><path d="M14 3.75v5h5M8.5 13h7M8.5 16h7" /></svg>
          <strong class="text-text-primary">Bạn chưa có đơn hàng nào</strong>
          <span>Mở công cụ báo giá 3D để cấu hình tem nhãn và gửi yêu cầu sản xuất.</span>
          <a routerLink="/quote-builder" appButton variant="primary" size="sm" class="mt-2">Tạo báo giá đầu tiên</a>
        </div>
      } @else {
        @if (actionCount() > 0) {
          <div class="mb-4 rounded-[10px] border border-accent/40 bg-accent/5 px-4 py-3 text-sm text-text-primary" role="status">
            <strong>{{ actionCount() }} đơn đang chờ bạn thao tác</strong>
            <span class="text-text-secondary">. Duyệt mẫu thực tế hoặc đặt cọc để xưởng tiếp tục sản xuất.</span>
          </div>
        }

        <div class="mb-4 flex flex-wrap gap-2" role="group" aria-label="Lọc đơn hàng">
          @for (f of filters; track f.key) {
            <button type="button" class="tni-pill-filter" [attr.aria-pressed]="filter() === f.key" (click)="filter.set(f.key)">
              {{ f.label }} <span class="opacity-70 tabular-nums">{{ countFor(f.key) }}</span>
            </button>
          }
        </div>

        <ul class="space-y-3">
          @for (ord of visibleOrders(); track ord.id) {
            <li>
              <a
                [routerLink]="['/account/orders', ord.id]"
                class="order-card block rounded-[10px] border bg-bg-elevated p-4 sm:p-5 transition-all"
                [class.needs-action]="needsAction(ord.status)"
              >
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="font-mono text-base font-bold text-text-primary">{{ ord.orderCode }}</span>
                      <span class="tni-chip" [attr.data-tone]="statusTone(ord.status)">{{ statusLabel(ord.status) }}</span>
                      <span class="tni-chip no-dot" data-tone="muted">{{ typeLabel(ord.orderType) }}</span>
                    </div>
                    <div class="mt-1 text-[13px] text-text-secondary">
                      {{ ord.itemCount }} mặt hàng · đặt ngày {{ ord.createdAt | date:'dd/MM/yyyy' }}
                    </div>
                  </div>
                  <div class="text-left sm:text-right">
                    <div class="price-text whitespace-nowrap font-sans tabular-nums text-lg font-bold text-text-primary">{{ ord.totalAmount | vnd }}</div>
                    <div class="text-[13px] text-text-secondary">Tổng thanh toán</div>
                  </div>
                </div>

                <div class="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] items-center gap-3">
                  <div>
                    <div class="tni-progress" role="progressbar" [attr.aria-valuenow]="percent(ord)" aria-valuemin="0" aria-valuemax="100"><span [style.width.%]="percent(ord)"></span></div>
                    <div class="mt-1 flex justify-between text-[13px] text-text-secondary">
                      <span>Đã thanh toán <span class="price-text whitespace-nowrap font-sans tabular-nums">{{ ord.paidAmount | vnd }}</span> ({{ percent(ord) }}%)</span>
                    </div>
                  </div>
                  <span class="order-cta" [class.is-primary]="needsAction(ord.status)">
                    {{ ctaLabel(ord.status) }}
                    <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12h14m0 0-6-6m6 6-6 6" /></svg>
                  </span>
                </div>
              </a>
            </li>
          } @empty {
            <li class="tni-empty industrial-card">
              <strong class="text-text-primary">Không có đơn nào ở mục này</strong>
              <span>Chọn mục “Tất cả” để xem lại toàn bộ đơn hàng.</span>
            </li>
          }
        </ul>
        <app-paginator [page]="page()" [totalPages]="totalPages()" (pageChange)="goToPage($event)" />
      }
    </div>
  `,
  styles: [`
    .order-card { border-color: var(--color-border); }
    .order-card:hover { border-color: var(--color-accent); box-shadow: var(--shadow-card-hover); }
    .order-card.needs-action { border-color: color-mix(in srgb, var(--color-accent) 55%, var(--color-border)); background: color-mix(in srgb, var(--color-accent) 4%, var(--color-bg-elevated)); }
    .order-cta { display: inline-flex; justify-content: center; padding: 0.45rem 0.9rem; border-radius: 6px; border: 1px solid var(--color-border); font-size: 0.8125rem; font-weight: 600; color: var(--color-text-secondary); white-space: nowrap; }
    .order-card:hover .order-cta { border-color: var(--color-accent); color: var(--color-accent); }
    .order-cta.is-primary { background: var(--color-accent); border-color: var(--color-accent); color: #fff !important; }
  `],
})
export class OrderListComponent implements OnInit {
  private readonly orderApi = inject(OrderApiService);

  readonly orders = signal<OrderSummary[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly page = signal(0);
  readonly totalPages = signal(0);

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.orderApi.getMyOrders(this.page(), 20).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success && res.data) {
          this.orders.set(res.data.content || []);
          this.totalPages.set(res.data.totalPages || 0);
        } else {
          this.loadError.set('Không thể tải danh sách đơn hàng.');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.loadError.set(err?.error?.message || 'Không thể kết nối máy chủ để tải đơn hàng.');
      },
    });
  }

  goToPage(page: number): void {
    this.page.set(page);
    this.loadOrders();
  }

  readonly filter = signal<'ALL' | 'ACTION' | 'ACTIVE' | 'DONE'>('ALL');
  readonly filters: { key: 'ALL' | 'ACTION' | 'ACTIVE' | 'DONE'; label: string }[] = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'ACTION', label: 'Cần thao tác' },
    { key: 'ACTIVE', label: 'Đang xử lý' },
    { key: 'DONE', label: 'Hoàn tất / Đã hủy' },
  ];

  readonly statusLabel = orderStatusLabel;
  readonly statusTone = orderStatusTone;
  readonly typeLabel = orderTypeLabel;

  percent(o: OrderSummary): number {
    return paidPercent(o.paidAmount, o.totalAmount);
  }

  /** Statuses where the customer is the one who must act next. */
  needsAction(status: OrderStatus): boolean {
    return status === 'PROTOTYPING' || status === 'AWAITING_DEPOSIT';
  }

  ctaLabel(status: OrderStatus): string {
    if (status === 'PROTOTYPING') return 'Duyệt mẫu';
    if (status === 'AWAITING_DEPOSIT') return 'Đặt cọc';
    if (status === 'READY_FOR_DELIVERY') return 'Xem chi tiết';
    return 'Theo dõi';
  }

  private matches(o: OrderSummary, key: 'ALL' | 'ACTION' | 'ACTIVE' | 'DONE'): boolean {
    switch (key) {
      case 'ACTION': return this.needsAction(o.status);
      case 'ACTIVE': return o.status !== 'COMPLETED' && o.status !== 'CANCELLED';
      case 'DONE': return o.status === 'COMPLETED' || o.status === 'CANCELLED';
      default: return true;
    }
  }

  countFor(key: 'ALL' | 'ACTION' | 'ACTIVE' | 'DONE'): number {
    return this.orders().filter((o) => this.matches(o, key)).length;
  }

  visibleOrders(): OrderSummary[] {
    return this.orders().filter((o) => this.matches(o, this.filter()));
  }

  actionCount(): number {
    return this.countFor('ACTION');
  }
}
