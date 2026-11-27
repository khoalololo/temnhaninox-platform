import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AdminApiService } from '../../../core/services/admin-api.service';
import { OrderStatus, OrderSummary, OrderType } from '../../../core/models/order.models';
import { VndCurrencyPipe } from '../../../core/pipes/vnd-currency.pipe';
import { ToastService } from '../../../shared/components/toast/toast.component';

interface BoardColumn {
  status: OrderStatus;
  title: string;
  hint: string;
  /** Orders sitting here need someone at the workshop to act (drives the accent dot). */
  needsAction: boolean;
  /** Max cards fetched for this column (finished orders are capped). */
  size: number;
}

/**
 * Transitions the admin API accepts WITHOUT extra input, so they can be done by drag & drop or one click.
 * Everything else (price review, prototype photo, verifying a payment) needs data, so it opens the order.
 */
const DIRECT_MOVES: Partial<Record<OrderStatus, OrderStatus[]>> = {
  IN_PRODUCTION: ['READY_FOR_DELIVERY'],
  READY_FOR_DELIVERY: ['COMPLETED'],
};
const CANCELLABLE: OrderStatus[] = [
  'QUOTE_PENDING', 'QUOTE_APPROVED', 'PROTOTYPING', 'AWAITING_DEPOSIT', 'IN_PRODUCTION', 'READY_FOR_DELIVERY',
];
const OPEN_ORDER_HINT: Partial<Record<OrderStatus, string>> = {
  QUOTE_APPROVED: 'Cần đính kèm ảnh mẫu hoặc chờ khách — mở đơn để xử lý.',
  PROTOTYPING: 'Khách phải duyệt mẫu — mở đơn để xem.',
  AWAITING_DEPOSIT: 'Đơn tự chuyển sang sản xuất khi xác nhận đủ tiền cọc — mở đơn để xác nhận thanh toán.',
  IN_PRODUCTION: 'Đơn chỉ vào sản xuất sau khi xác nhận cọc.',
};

@Component({
  selector: 'app-admin-order-board',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, VndCurrencyPipe],
  styles: [`
    :host { display: block; }
    .board-scroll { display: flex; gap: 14px; overflow-x: auto; padding-bottom: 12px; scroll-snap-type: x proximity; }
    .col {
      flex: 0 0 292px; scroll-snap-align: start; display: flex; flex-direction: column;
      background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 10px;
      max-height: calc(100vh - 290px); min-height: 220px;
      transition: border-color 160ms ease, background-color 160ms ease, opacity 160ms ease;
    }
    .col { border-top: 3px solid var(--stage, var(--color-border)); }
    .col-head { padding: 12px 14px 10px; border-bottom: 1px solid var(--color-border); position: sticky; top: 0; }
    .col-body { padding: 10px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; flex: 1; }
    .col.drop-ok { border-color: var(--color-accent); background: color-mix(in srgb, var(--color-accent) 7%, var(--color-surface)); }
    .col.drop-ok .col-body { outline: 2px dashed var(--color-accent); outline-offset: -6px; border-radius: 8px; }
    .col.drop-no { opacity: 0.45; }
    .card {
      background: var(--color-bg-elevated); border: 1px solid var(--color-border); border-radius: 8px;
      padding: 11px 12px; text-align: left; width: 100%; cursor: pointer;
      transition: border-color 140ms ease, box-shadow 140ms ease, transform 140ms ease;
    }
    .card:hover { border-color: var(--color-accent); box-shadow: 0 4px 14px rgba(0, 0, 0, 0.10); transform: translateY(-1px); }
    .card:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
    .card[draggable='true'] { cursor: grab; }
    .card.dragging { opacity: 0.4; transform: rotate(1.2deg); }
    .chip {
      display: inline-flex; align-items: center; gap: 4px; font-size: 11px; line-height: 1;
      padding: 4px 7px; border-radius: 999px; border: 1px solid var(--color-border);
      color: var(--color-text-secondary); background: var(--color-surface);
    }
    .chip-accent { border-color: var(--color-accent); color: var(--color-accent); }
    .chip-warn { border-color: var(--color-warning); color: var(--color-warning); }
    .bar { height: 5px; border-radius: 999px; background: var(--color-surface-raised); overflow: hidden; }
    .bar > span { display: block; height: 100%; background: var(--color-accent); transition: width 300ms ease; }
    .bar.full > span { background: var(--color-success); }
    .skeleton { border-radius: 8px; height: 112px; background: var(--color-surface-raised); animation: pulse 1.4s ease-in-out infinite; }
    @keyframes pulse { 50% { opacity: 0.55; } }
    .step-btn {
      font-size: 12px; font-weight: 600; padding: 5px 9px; border-radius: 6px;
      border: 1px solid var(--color-accent); color: var(--color-accent); background: transparent; cursor: pointer;
    }
    .step-btn:hover:not(:disabled) { background: var(--color-accent); color: #fff; }
    .step-btn:disabled { opacity: 0.45; cursor: not-allowed; border-color: var(--color-border); color: var(--color-text-muted); }
    @media (prefers-reduced-motion: reduce) {
      .card, .col, .bar > span { transition: none; }
      .skeleton { animation: none; }
      .card:hover { transform: none; }
    }
    @media (max-width: 640px) { .col { flex-basis: 84vw; max-height: none; } }
  `],
  template: `
    <div class="max-w-[1680px] mx-auto px-4 py-8 space-y-5">
      <!-- Header -->
      <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <div class="text-sm text-text-muted mb-1">Quản trị</div>
          <h1 class="font-heading text-2xl sm:text-3xl font-semibold text-text-primary">Bảng tiến độ đơn hàng</h1>
          <p class="text-sm text-text-secondary mt-1">
            Kéo thả để chuyển bước đơn giản (sản xuất → sẵn sàng giao → hoàn tất). Các bước cần dữ liệu sẽ mở chi tiết đơn.
          </p>
        </div>
        <nav class="flex flex-wrap gap-2" aria-label="Chế độ xem đơn hàng">
          <a routerLink="/admin" class="admin-tab">Danh sách &amp; chi tiết</a>
          <span class="admin-tab admin-tab-active" aria-current="page">Bảng Kanban</span>
        </nav>
      </div>

      <!-- Toolbar -->
      <div class="flex flex-wrap items-center gap-3">
        <input
          type="search"
          [ngModel]="search()"
          (ngModelChange)="search.set($event)"
          placeholder="Tìm mã đơn hoặc tên người nhận…"
          aria-label="Tìm đơn hàng"
          class="industrial-input px-3 py-2 text-sm w-full sm:w-72"
        />
        <select [ngModel]="typeFilter()" (ngModelChange)="typeFilter.set($event)" aria-label="Lọc loại đơn" class="industrial-input px-3 py-2 text-sm">
          <option value="">Tất cả loại đơn</option>
          <option value="CUSTOM_QUOTE_ORDER">Báo giá gia công riêng</option>
          <option value="DIRECT_STORE_ORDER">Đơn mua có sẵn</option>
        </select>
        <label class="flex items-center gap-2 text-sm text-text-secondary cursor-pointer select-none">
          <input type="checkbox" [ngModel]="showCancelled()" (ngModelChange)="toggleCancelled($event)" />
          Hiện đơn đã hủy
        </label>
        <div class="ml-auto flex items-center gap-3 text-sm text-text-muted">
          <span>{{ totalVisible() }} đơn</span>
          @if (updatedAt()) { <span>Cập nhật {{ updatedAt() | date:'HH:mm:ss' }}</span> }
          <button type="button" (click)="load()" class="admin-tab" [disabled]="loading()">{{ loading() ? 'Đang tải…' : 'Làm mới' }}</button>
        </div>
      </div>

      @if (error()) {
        <div class="p-3 rounded-[6px] border border-danger/50 bg-danger/10 text-sm text-danger flex items-center justify-between gap-3">
          <span>{{ error() }}</span>
          <button type="button" (click)="load()" class="font-semibold underline">Thử lại</button>
        </div>
      }

      <!-- Board -->
      <div class="board-scroll" #scroller (dragover)="autoScroll($event, scroller)" role="list" aria-label="Các cột trạng thái đơn hàng">
        @for (col of visibleColumns(); track col.status) {
          <section
            class="col"
            role="listitem"
            [class.drop-ok]="dragging() && canDrop(col.status)"
            [class.drop-no]="dragging() && !canDrop(col.status) && dragging()!.status !== col.status"
            [attr.aria-label]="col.title"
            [style.--stage]="stageColor(col.status)"
            (dragover)="onDragOver($event, col.status)"
            (drop)="onDrop($event, col.status)"
          >
            <header class="col-head bg-[var(--color-surface)] rounded-t-[10px]">
              <div class="flex items-center justify-between gap-2">
                <h2 class="font-heading text-[15px] font-semibold text-text-primary flex items-center gap-2">
                  @if (col.needsAction && counts()[col.status]) {
                    <span class="inline-block w-2 h-2 rounded-full bg-[var(--color-warning)]" aria-hidden="true"></span>
                  }
                  {{ col.title }}
                </h2>
                <span class="chip tabular-nums" [attr.aria-label]="(counts()[col.status] || 0) + ' đơn'">{{ counts()[col.status] || 0 }}</span>
              </div>
              <p class="text-xs text-text-muted mt-1">{{ col.hint }}</p>
            </header>

            <div class="col-body">
              @if (loading() && !loaded()) {
                <div class="skeleton"></div><div class="skeleton"></div>
              } @else {
                @for (o of cardsFor(col.status); track o.id) {
                  <article
                    class="card"
                    tabindex="0"
                    role="button"
                    [attr.draggable]="isDraggable(o) ? 'true' : null"
                    [class.dragging]="dragging()?.id === o.id"
                    [attr.aria-label]="'Đơn ' + o.orderCode + ', ' + o.recipientName + ', mở chi tiết'"
                    (click)="open(o)"
                    (keydown.enter)="open(o)"
                    (keydown.space)="$event.preventDefault(); open(o)"
                    (dragstart)="onDragStart($event, o)"
                    (dragend)="onDragEnd()"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <span class="font-mono text-[13px] font-semibold text-text-primary">{{ o.orderCode }}</span>
                      <span class="chip" [class.chip-accent]="o.orderType === 'CUSTOM_QUOTE_ORDER'">
                        {{ o.orderType === 'CUSTOM_QUOTE_ORDER' ? 'Gia công' : 'Có sẵn' }}
                      </span>
                    </div>
                    <div class="mt-1 text-sm text-text-primary truncate">{{ o.recipientName }}</div>
                    <div class="mt-0.5 text-xs text-text-muted">{{ o.itemCount }} mặt hàng</div>

                    <div class="mt-3 flex items-baseline justify-between">
                      <span class="font-semibold tabular-nums text-text-primary">{{ o.totalAmount | vnd }}</span>
                      <span class="text-xs tabular-nums text-text-muted">{{ paidPercent(o) }}% đã thu</span>
                    </div>
                    <div class="bar mt-1.5" [class.full]="paidPercent(o) >= 100" role="progressbar"
                         [attr.aria-valuenow]="paidPercent(o)" aria-valuemin="0" aria-valuemax="100" aria-label="Tiến độ thanh toán">
                      <span [style.width.%]="paidPercent(o)"></span>
                    </div>

                    <div class="mt-3 flex flex-wrap items-center gap-1.5">
                      @if (o.requiresVatInvoice) { <span class="chip">VAT đỏ</span> }
                      @if (isStale(o)) { <span class="chip chip-warn" title="Đơn nằm yên ở cột này khá lâu">{{ ageLabel(o) }} chưa đổi</span> }
                      @else { <span class="chip">{{ ageLabel(o) }}</span> }
                    </div>

                    @if (nextStep(o); as next) {
                      <div class="mt-3 pt-3 border-t border-border flex items-center justify-between gap-2">
                        <button type="button" class="step-btn"
                                [disabled]="!!next.blocked || moving() === o.id"
                                [attr.title]="next.blocked || null"
                                (click)="$event.stopPropagation(); move(o, next.to)">
                          {{ next.label }}
                        </button>
                        @if (next.blocked) { <span class="text-[11px] text-text-muted">{{ next.blocked }}</span> }
                      </div>
                    }
                  </article>
                } @empty {
                  <div class="text-center text-sm text-text-muted py-8 border border-dashed border-border rounded-[8px]">
                    {{ dragging() && canDrop(col.status) ? 'Thả vào đây' : 'Không có đơn' }}
                  </div>
                }
                @if (hiddenCount(col) > 0) {
                  <a routerLink="/admin" class="text-center text-xs font-medium text-accent hover:underline py-1">
                    +{{ hiddenCount(col) }} đơn khác — xem trong danh sách
                  </a>
                }
              }
            </div>
          </section>
        }
      </div>
    </div>
  `,
})
export class AdminOrderBoardComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly columns: BoardColumn[] = [
    { status: 'QUOTE_PENDING', title: 'Chờ duyệt báo giá', hint: 'Admin xem file, chốt giá', needsAction: true, size: 50 },
    { status: 'QUOTE_APPROVED', title: 'Đã báo giá', hint: 'Chuẩn bị ảnh mẫu thực tế', needsAction: true, size: 50 },
    { status: 'PROTOTYPING', title: 'Duyệt mẫu', hint: 'Chờ khách xác nhận mẫu', needsAction: false, size: 50 },
    { status: 'AWAITING_DEPOSIT', title: 'Chờ cọc', hint: 'Xác nhận tiền cọc / chuyển khoản', needsAction: true, size: 50 },
    { status: 'IN_PRODUCTION', title: 'Đang sản xuất', hint: 'Xưởng đang gia công', needsAction: false, size: 50 },
    { status: 'READY_FOR_DELIVERY', title: 'Sẵn sàng giao', hint: 'Thu nốt tiền, giao hàng', needsAction: true, size: 50 },
    { status: 'COMPLETED', title: 'Hoàn tất', hint: '15 đơn gần nhất', needsAction: false, size: 15 },
    { status: 'CANCELLED', title: 'Đã hủy', hint: '15 đơn gần nhất', needsAction: false, size: 15 },
  ];

  readonly data = signal<Partial<Record<OrderStatus, OrderSummary[]>>>({});
  readonly totals = signal<Partial<Record<OrderStatus, number>>>({});
  readonly loading = signal(true);
  readonly loaded = signal(false);
  readonly error = signal('');
  readonly updatedAt = signal<Date | null>(null);
  readonly search = signal('');
  readonly typeFilter = signal<OrderType | ''>('');
  readonly showCancelled = signal(false);
  readonly dragging = signal<OrderSummary | null>(null);
  readonly moving = signal<string | null>(null);
  private autoShownCancelled = false;

  readonly visibleColumns = computed(() =>
    this.columns.filter((c) => c.status !== 'CANCELLED' || this.showCancelled())
  );
  readonly counts = computed(() => this.totals());
  readonly totalVisible = computed(() =>
    this.visibleColumns().reduce((sum, c) => sum + this.cardsFor(c.status).length, 0)
  );

  ngOnInit(): void {
    this.load();
    const timer = setInterval(() => {
      if (!this.dragging() && !document.hidden) this.load(true);
    }, 60_000);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  load(silent = false): void {
    if (!silent) this.loading.set(true);
    this.error.set('');
    const requests = this.columns.map((c) => this.api.getOrders({ status: c.status, page: 0, size: c.size }));
    forkJoin(requests).subscribe({
      next: (results) => {
        const data: Partial<Record<OrderStatus, OrderSummary[]>> = {};
        const totals: Partial<Record<OrderStatus, number>> = {};
        results.forEach((res, i) => {
          const status = this.columns[i].status;
          data[status] = res.data?.content ?? [];
          totals[status] = res.data?.totalElements ?? data[status]!.length;
        });
        this.data.set(data);
        this.totals.set(totals);
        this.loading.set(false);
        this.loaded.set(true);
        this.updatedAt.set(new Date());
      },
      error: (err) => {
        this.loading.set(false);
        this.loaded.set(true);
        this.error.set(err?.error?.message || 'Không thể tải bảng đơn hàng.');
      },
    });
  }

  toggleCancelled(value: boolean): void {
    this.showCancelled.set(value);
  }

  cardsFor(status: OrderStatus): OrderSummary[] {
    const q = this.search().trim().toLowerCase();
    const type = this.typeFilter();
    return (this.data()[status] ?? []).filter(
      (o) =>
        (!type || o.orderType === type) &&
        (!q || o.orderCode.toLowerCase().includes(q) || (o.recipientName ?? '').toLowerCase().includes(q))
    );
  }

  stageColor(s: OrderStatus): string {
    const map: Record<OrderStatus, string> = {
      QUOTE_PENDING: 'var(--color-warning)',
      QUOTE_APPROVED: 'var(--color-steel)',
      PROTOTYPING: 'var(--color-steel)',
      AWAITING_DEPOSIT: 'var(--color-warning)',
      IN_PRODUCTION: 'var(--color-accent)',
      READY_FOR_DELIVERY: 'var(--color-success)',
      COMPLETED: 'var(--color-text-muted)',
      CANCELLED: 'var(--color-danger)',
    };
    return map[s];
  }

  /** Scroll the board sideways while dragging near its edges, so far columns are reachable. */
  autoScroll(ev: DragEvent, el: HTMLElement): void {
    if (!this.dragging()) return;
    const rect = el.getBoundingClientRect();
    const edge = 90;
    if (ev.clientX < rect.left + edge) el.scrollLeft -= 22;
    else if (ev.clientX > rect.right - edge) el.scrollLeft += 22;
  }

  hiddenCount(col: BoardColumn): number {
    const total = this.totals()[col.status] ?? 0;
    const loaded = (this.data()[col.status] ?? []).length;
    return Math.max(0, total - loaded);
  }

  paidPercent(o: OrderSummary): number {
    if (!o.totalAmount) return 0;
    return Math.min(100, Math.round((Number(o.paidAmount) / Number(o.totalAmount)) * 100));
  }

  private ageDays(o: OrderSummary): number {
    return Math.floor((Date.now() - new Date(o.updatedAt).getTime()) / 86_400_000);
  }

  ageLabel(o: OrderSummary): string {
    const mins = Math.floor((Date.now() - new Date(o.updatedAt).getTime()) / 60_000);
    if (mins < 60) return `${Math.max(mins, 1)} phút`;
    if (mins < 1440) return `${Math.floor(mins / 60)} giờ`;
    return `${Math.floor(mins / 1440)} ngày`;
  }

  isStale(o: OrderSummary): boolean {
    return o.status !== 'COMPLETED' && o.status !== 'CANCELLED' && this.ageDays(o) >= 3;
  }

  // ------------------------------------------------------------------ actions
  open(o: OrderSummary): void {
    this.router.navigate(['/admin'], { queryParams: { order: o.id } });
  }

  nextStep(o: OrderSummary): { to: OrderStatus; label: string; blocked?: string } | null {
    const to = DIRECT_MOVES[o.status]?.[0];
    if (!to) return null;
    if (to === 'COMPLETED') {
      const unpaid = Number(o.paidAmount) < Number(o.totalAmount);
      return { to, label: '→ Hoàn tất', blocked: unpaid ? 'Chưa thu đủ tiền' : undefined };
    }
    return { to, label: '→ Sẵn sàng giao' };
  }

  isDraggable(o: OrderSummary): boolean {
    return o.status !== 'COMPLETED' && o.status !== 'CANCELLED';
  }

  canDrop(target: OrderStatus): boolean {
    const o = this.dragging();
    if (!o || o.status === target) return false;
    if (target === 'CANCELLED') return CANCELLABLE.includes(o.status);
    return !!DIRECT_MOVES[o.status]?.includes(target);
  }

  onDragStart(ev: DragEvent, o: OrderSummary): void {
    if (!this.isDraggable(o)) {
      ev.preventDefault();
      return;
    }
    ev.dataTransfer?.setData('text/plain', o.id);
    if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move';
    this.dragging.set(o);
    if (!this.showCancelled()) {
      this.showCancelled.set(true); // reveal the cancel drop zone while dragging
      this.autoShownCancelled = true;
    }
  }

  onDragEnd(): void {
    this.dragging.set(null);
    this.restoreCancelled();
  }

  private restoreCancelled(): void {
    if (this.autoShownCancelled) {
      this.showCancelled.set(false);
      this.autoShownCancelled = false;
    }
  }

  onDragOver(ev: DragEvent, target: OrderStatus): void {
    if (this.canDrop(target)) {
      ev.preventDefault();
      if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(ev: DragEvent, target: OrderStatus): void {
    ev.preventDefault();
    const o = this.dragging();
    const allowed = this.canDrop(target); // must be evaluated while the drag state still exists
    const droppedOnCancel = target === 'CANCELLED';
    this.dragging.set(null);
    if (!droppedOnCancel) this.restoreCancelled();
    else this.autoShownCancelled = false; // keep the column visible after cancelling something
    if (!o || o.status === target) return;
    if (!allowed) {
      this.toast.show(OPEN_ORDER_HINT[o.status] ?? 'Chuyển bước này cần mở chi tiết đơn.', 'error');
      return;
    }
    this.move(o, target);
  }

  move(o: OrderSummary, to: OrderStatus): void {
    if (to === 'COMPLETED' && Number(o.paidAmount) < Number(o.totalAmount)) {
      this.toast.show('Chưa thu đủ tiền — không thể hoàn tất đơn.', 'error');
      return;
    }
    if (to === 'CANCELLED' && !confirm(`Hủy đơn ${o.orderCode}? Thao tác này không hoàn tác được.`)) return;

    this.moving.set(o.id);
    const from = o.status;
    this.applyLocal(o, to); // optimistic
    this.api.updateOrderStatus(o.id, { targetStatus: to, note: 'Cập nhật từ bảng Kanban' }).subscribe({
      next: (res) => {
        this.moving.set(null);
        if (res.success) {
          this.toast.show(`Đơn ${o.orderCode} → ${this.label(to)}`, 'success');
          this.load(true);
        } else {
          this.applyLocal({ ...o, status: to }, from);
          this.toast.show(res.message || 'Không thể chuyển trạng thái.', 'error');
        }
      },
      error: (err) => {
        this.moving.set(null);
        this.applyLocal({ ...o, status: to }, from); // rollback
        this.toast.show(err?.error?.message || 'Không thể chuyển trạng thái.', 'error');
      },
    });
  }

  private applyLocal(o: OrderSummary, to: OrderStatus): void {
    const data = { ...this.data() };
    const totals = { ...this.totals() };
    data[o.status] = (data[o.status] ?? []).filter((x) => x.id !== o.id);
    totals[o.status] = Math.max(0, (totals[o.status] ?? 1) - 1);
    data[to] = [{ ...o, status: to, updatedAt: new Date().toISOString() }, ...(data[to] ?? [])];
    totals[to] = (totals[to] ?? 0) + 1;
    this.data.set(data);
    this.totals.set(totals);
  }

  private label(s: OrderStatus): string {
    return this.columns.find((c) => c.status === s)?.title ?? s;
  }
}
