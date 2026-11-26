import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrderApiService } from '../../../core/services/order-api.service';
import { QuoteApiService } from '../../../core/services/quote-api.service';
import { OrderDetail, OrderStatus, PaymentPhase } from '../../../core/models/order.models';
import { VndCurrencyPipe } from '../../../core/pipes/vnd-currency.pipe';
import { ButtonDirective } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, VndCurrencyPipe, ButtonDirective],
  template: `
    <div class="max-w-6xl mx-auto px-4 py-8">
      <div class="mb-4 text-xs text-text-muted flex items-center gap-2">
        <a routerLink="/account/orders" class="hover:text-steel-hover transition-colors">← Danh sách đơn hàng</a>
        @if (order()) {
          <span>/</span>
          <span class="font-mono font-bold text-text-primary">{{ order()!.orderCode }}</span>
        }
      </div>

      @if (notice()) {
        <div class="mb-4 p-3 rounded-[6px] border border-success/50 bg-success/10 text-xs text-success font-medium">
          {{ notice() }}
        </div>
      }
      @if (error()) {
        <div class="mb-4 p-3 rounded-[6px] border border-danger/50 bg-danger/10 text-xs text-danger">
          {{ error() }}
        </div>
      }

      @if (loading()) {
        <div class="bg-surface border border-border rounded-[10px] h-96 animate-pulse"></div>
      } @else if (order()) {
        <!-- 7-Step Industrial Manufacturing Stepper -->
        <div class="industrial-card p-5 mb-6">
          <div class="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-border">
            <div>
              <div class="text-[11px] font-mono text-text-muted">MÃ ĐƠN HÀNG</div>
              <h1 class="font-heading text-xl font-mono font-bold text-text-primary">{{ order()!.orderCode }}</h1>
            </div>
            <div class="flex items-center gap-2">
              @if (canCancel(order()!.status)) {
                <button
                  type="button"
                  (click)="cancelOrder()"
                  appButton
                  variant="danger"
                  size="xs"
                >
                  Hủy đơn hàng
                </button>
              }
            </div>
          </div>

          @if (order()!.status === 'CANCELLED') {
            <div class="p-3 rounded-[6px] border border-danger/60 bg-danger/10 text-xs text-danger font-semibold text-center">
              Đơn hàng này đã bị hủy.
            </div>
          } @else {
            <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center">
              @for (step of steps; track step.key; let idx = $index) {
                <div
                  class="p-2.5 rounded-[6px] border text-xs"
                  [class]="isStepActive(step.key)
                    ? 'bg-accent text-bg border-accent font-bold'
                    : isStepCompleted(idx)
                      ? 'bg-bg text-success border-success/60 font-medium'
                      : 'bg-bg text-text-muted border-border'"
                >
                  <div class="font-mono text-[10px] mb-0.5">BƯỚC {{ idx + 1 }}</div>
                  <div class="leading-tight">{{ step.label }}</div>
                </div>
              }
            </div>
          }
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- Left 8 cols: Items, Prototype Approval & Payment Actions -->
          <div class="lg:col-span-8 space-y-6">
            <!-- Physical Prototype Approval Banner -->
            @if (order()!.status === 'PROTOTYPING') {
              <div class="bg-surface border border-accent rounded-[10px] p-5 space-y-4 hover:shadow-card-hover transition-shadow">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <div class="text-xs font-mono font-bold uppercase text-accent">
                      YÊU CẦU DUYỆT MẪU THỰC TẾ TẠI XƯỞNG
                    </div>
                    <h2 class="font-heading text-base font-bold text-text-primary mt-0.5">
                      Xưởng đã gia công xong tem mẫu — Vui lòng kiểm tra hình ảnh bên dưới
                    </h2>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  @for (item of order()!.items; track item.id) {
                    @if (item.prototypeImageUrl) {
                      <div class="bg-bg border border-border rounded-[6px] p-2.5">
                        <img [src]="item.prototypeImageUrl" class="w-full h-48 object-cover rounded-[6px] mb-2" />
                        <div class="text-xs font-semibold text-text-primary">{{ item.itemName }}</div>
                      </div>
                    }
                  }
                </div>

                <button
                  type="button"
                  (click)="approvePrototype()"
                  [disabled]="actionLoading()"
                  appButton
                  variant="primary"
                  size="lg"
                >
                  ✓ Xác Nhận Duyệt Mẫu Này & Chuyển Sang Đặt Cọc 50%
                </button>
              </div>
            }

            <!-- Payment Action Card -->
            @if (remainingAmount() > 0 && order()!.status !== 'CANCELLED') {
              <div class="industrial-card p-5 space-y-4">
                <div class="flex items-center justify-between border-b border-border pb-3">
                  <h2 class="font-heading text-sm font-bold uppercase tracking-wider text-text-primary">
                    Thanh Toán {{ paymentPhaseLabel() }}
                  </h2>
                  <span class="font-mono tabular-nums text-base font-bold text-accent">
                    Cần thanh toán: {{ payableNowAmount() | vnd }}
                  </span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <!-- Option 1: VNPAY Sandbox -->
                  <div class="border border-border rounded-[6px] p-4 flex flex-col justify-between bg-bg">
                    <div>
                      <div class="text-xs font-semibold text-text-primary mb-1">Cổng thanh toán VNPAY / Thẻ ATM / QR</div>
                      <p class="text-[11px] text-text-secondary mb-3">
                        Xác nhận tự động ngay lập tức và chuyển trạng thái đơn hàng sang sản xuất.
                      </p>
                    </div>
                    <button
                      type="button"
                      (click)="payWithVnpay()"
                      [disabled]="actionLoading()"
                      appButton
                      variant="primary"
                      size="md"
                      [fullWidth]="true"
                    >
                      Thanh toán qua VNPAY ({{ payableNowAmount() | vnd }})
                    </button>
                  </div>

                  <!-- Option 2: Bank Transfer Proof Upload -->
                  <div class="border border-border rounded-[6px] p-4 space-y-2.5 bg-bg">
                    <div class="text-xs font-semibold text-text-primary">Chuyển khoản ngân hàng (Ủy nhiệm chi)</div>
                    <div class="text-[11px] font-mono bg-surface border border-border p-2 rounded-[6px] text-text-secondary">
                      ACB · STK: 88830468 · CTY TEM NHÃN INOX<br />
                      Nội dung: <span class="text-text-primary">{{ order()!.orderCode }}</span>
                    </div>
                    <input
                      type="text"
                      [(ngModel)]="bankRef"
                      placeholder="Mã giao dịch / Nội dung CK"
                      class="industrial-input w-full px-2.5 py-1.5 text-xs font-mono"
                    />
                    <input
                      type="file"
                      (change)="onProofFileSelected($event)"
                      accept="image/*,.pdf"
                      class="block w-full text-[11px] text-text-secondary file:mr-2 file:py-1 file:px-2.5 file:rounded-[6px] file:border file:border-border file:text-[11px] file:bg-surface file:text-text-primary"
                    />
                    <button
                      type="button"
                      (click)="submitBankProof()"
                      [disabled]="actionLoading()"
                      appButton
                      variant="secondary"
                      size="sm"
                      [fullWidth]="true"
                    >
                      Gửi Xác Nhận Chuyển Khoản
                    </button>
                  </div>
                </div>
              </div>
            }

            <!-- Order Items Table -->
            <div class="industrial-card overflow-hidden">
              <div class="bg-surface-raised px-4 py-2.5 border-b border-border font-heading text-xs font-bold uppercase text-text-primary">
                Chi Tiết Hạng Mục Gia Công ({{ order()!.items.length }})
              </div>
              <table class="w-full text-xs text-left">
                <thead class="border-b border-border text-text-muted font-mono">
                  <tr>
                    <th class="px-4 py-2.5">Hạng mục</th>
                    <th class="px-3 py-2.5 text-right">Đơn giá chốt</th>
                    <th class="px-3 py-2.5 text-center">SL</th>
                    <th class="px-4 py-2.5 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border">
                  @for (item of order()!.items; track item.id) {
                    <tr>
                      <td class="px-4 py-3">
                        <div class="font-semibold text-text-primary">{{ item.itemName }}</div>
                        @if (item.widthMm) {
                          <div class="font-mono text-[11px] text-text-secondary">
                            {{ item.materialNameSnapshot }} · {{ item.processingNameSnapshot }} ·
                            {{ item.widthMm }}×{{ item.heightMm }}×{{ item.thicknessMm }}mm
                          </div>
                        }
                        @if (item.designFileUrl) {
                          <a [href]="item.designFileUrl" target="_blank" class="text-[11px] text-steel hover:text-steel-hover underline font-mono">
                            Bản vẽ thiết kế ↗
                          </a>
                        }
                      </td>
                      <td class="px-3 py-3 text-right font-mono tabular-nums text-text-primary">{{ item.finalUnitPrice | vnd }}</td>
                      <td class="px-3 py-3 text-center font-mono tabular-nums text-text-primary">{{ item.quantity }}</td>
                      <td class="px-4 py-3 text-right font-mono tabular-nums font-bold text-text-primary">{{ item.lineTotal | vnd }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- Right 4 cols: Financials, VAT & Audit Log -->
          <div class="lg:col-span-4 space-y-6">
            <div class="industrial-card p-5 space-y-3 text-xs">
              <h2 class="font-heading font-bold uppercase tracking-wider text-text-primary border-b border-border pb-2.5">
                Tổng Kết Thanh Toán & VAT
              </h2>
              <div class="flex justify-between">
                <span class="text-text-secondary">Tạm tính:</span>
                <span class="font-mono tabular-nums text-text-primary">{{ order()!.subtotalAmount | vnd }}</span>
              </div>
              @if (order()!.discountAmount > 0) {
                <div class="flex justify-between text-success">
                  <span>Chiết khấu:</span>
                  <span class="font-mono tabular-nums">-{{ order()!.discountAmount | vnd }}</span>
                </div>
              }
              <div class="flex justify-between">
                <span class="text-text-secondary">Thuế VAT ({{ order()!.vatRate }}%):</span>
                <span class="font-mono tabular-nums text-text-primary">{{ order()!.vatAmount | vnd }}</span>
              </div>
              <div class="border-t border-border pt-2 flex justify-between font-bold text-sm">
                <span class="text-text-primary">Tổng cộng:</span>
                <span class="font-mono tabular-nums text-text-primary">{{ order()!.totalAmount | vnd }}</span>
              </div>
              <div class="flex justify-between text-success font-semibold">
                <span>Đã thanh toán:</span>
                <span class="font-mono tabular-nums">{{ order()!.paidAmount | vnd }}</span>
              </div>
              <div class="flex justify-between text-accent font-bold">
                <span>Còn lại:</span>
                <span class="font-mono tabular-nums">{{ remainingAmount() | vnd }}</span>
              </div>

              @if (order()!.estimatedCompletionDate || order()!.productionWorkerNote) {
                <div class="mt-3 pt-3 border-t border-border space-y-1 bg-bg border rounded-[6px] p-2.5">
                  @if (order()!.estimatedCompletionDate) {
                    <div class="flex justify-between">
                      <span class="text-text-secondary">Dự kiến hoàn thành:</span>
                      <span class="font-mono font-semibold text-text-primary">{{ order()!.estimatedCompletionDate | date:'dd/MM/yyyy' }}</span>
                    </div>
                  }
                  @if (order()!.productionWorkerNote) {
                    <div class="text-text-secondary">
                      <strong class="text-text-primary">Ghi chú kỹ thuật xưởng:</strong> {{ order()!.productionWorkerNote }}
                    </div>
                  }
                </div>
              }

              @if (order()!.requiresVatInvoice) {
                <div class="mt-3 pt-3 border-t border-border space-y-1 bg-bg border rounded-[6px] p-2.5">
                  <div class="font-semibold text-text-primary">Thông tin hóa đơn VAT đỏ:</div>
                  <div class="text-text-secondary">{{ order()!.vatCompanyName }}</div>
                  <div class="font-mono text-text-secondary">MST: {{ order()!.vatTaxCode }}</div>
                  <div class="font-mono text-success font-semibold">
                    Số HĐĐT: {{ order()!.vatInvoiceNumber || 'Đang chờ xuất hóa đơn' }}
                  </div>
                </div>
              }
            </div>

            <!-- Status Audit Timeline -->
            <div class="industrial-card p-5 space-y-3 text-xs">
              <h2 class="font-heading font-bold uppercase tracking-wider text-text-primary border-b border-border pb-2.5">
                Nhật Ký Tiến Độ Xưởng
              </h2>
              <div class="space-y-3">
                @for (log of order()!.statusLogs; track log.id) {
                  <div class="border-l-2 border-steel pl-3 py-0.5">
                    <div class="font-mono font-bold text-text-primary">{{ log.toStatus }}</div>
                    @if (log.note) {
                      <div class="text-text-secondary">{{ log.note }}</div>
                    }
                    <div class="font-mono text-[10px] text-text-muted">{{ log.createdAt | date:'dd/MM/yyyy HH:mm' }}</div>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class OrderDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly orderApi = inject(OrderApiService);
  private readonly quoteApi = inject(QuoteApiService);

  readonly order = signal<OrderDetail | null>(null);
  readonly loading = signal(true);
  readonly actionLoading = signal(false);
  readonly notice = signal('');
  readonly error = signal('');

  bankRef = '';
  proofUrl = '';

  readonly steps: { key: OrderStatus; label: string }[] = [
    { key: 'QUOTE_PENDING', label: 'Chờ duyệt giá' },
    { key: 'QUOTE_APPROVED', label: 'Đã duyệt giá' },
    { key: 'PROTOTYPING', label: 'Duyệt mẫu thực tế' },
    { key: 'AWAITING_DEPOSIT', label: 'Đặt cọc 50%' },
    { key: 'IN_PRODUCTION', label: 'Đang sản xuất' },
    { key: 'READY_FOR_DELIVERY', label: 'Chờ giao hàng' },
    { key: 'COMPLETED', label: 'Hoàn tất' },
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadOrder(id);
  }

  loadOrder(id: string): void {
    this.loading.set(true);
    this.orderApi.getMyOrderDetail(id).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success && res.data) this.order.set(res.data);
      },
      error: () => this.loading.set(false),
    });
  }

  isStepActive(stepKey: OrderStatus): boolean {
    return this.order()?.status === stepKey;
  }

  isStepCompleted(stepIdx: number): boolean {
    const currentStatus = this.order()?.status;
    if (!currentStatus || currentStatus === 'CANCELLED') return false;
    const currentIdx = this.steps.findIndex((s) => s.key === currentStatus);
    return currentIdx > stepIdx;
  }

  canCancel(status: OrderStatus): boolean {
    return status === 'QUOTE_PENDING' || status === 'QUOTE_APPROVED' || status === 'AWAITING_DEPOSIT';
  }

  remainingAmount(): number {
    const o = this.order();
    if (!o) return 0;
    return Math.max(0, o.totalAmount - o.paidAmount);
  }

  activePaymentPhase(): PaymentPhase {
    const o = this.order();
    if (!o) return 'FULL_100';
    if (o.orderType === 'DIRECT_STORE_ORDER') return 'FULL_100';
    if (o.paidAmount < o.depositRequiredAmount) return 'DEPOSIT_50';
    return 'BALANCE_50';
  }

  paymentPhaseLabel(): string {
    const phase = this.activePaymentPhase();
    if (phase === 'DEPOSIT_50') return 'Tiền Đặt Cọc Sản Xuất (50%)';
    if (phase === 'BALANCE_50') return 'Tất Toán 50% Còn Lại Trước Giao Hàng';
    return 'Thanh Toán 100% Đơn Hàng';
  }

  payableNowAmount(): number {
    const o = this.order();
    if (!o) return 0;
    const phase = this.activePaymentPhase();
    if (phase === 'DEPOSIT_50') {
      return Math.max(0, o.depositRequiredAmount - o.paidAmount);
    }
    return this.remainingAmount();
  }

  approvePrototype(): void {
    const o = this.order();
    if (!o) return;
    this.actionLoading.set(true);
    this.orderApi.approvePrototype(o.id, 'Khách hàng xác nhận duyệt mẫu trên hệ thống').subscribe({
      next: (res) => {
        this.actionLoading.set(false);
        if (res.success && res.data) {
          this.order.set(res.data);
          this.notice.set('Đã duyệt mẫu thành công! Vui lòng tiến hành đặt cọc 50% để xưởng lên lệnh sản xuất.');
        }
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.error.set(err?.error?.message || 'Không thể duyệt mẫu.');
      },
    });
  }

  cancelOrder(): void {
    const o = this.order();
    if (!o) return;
    this.actionLoading.set(true);
    this.orderApi.cancelOrder(o.id, 'Khách hàng yêu cầu hủy đơn').subscribe({
      next: (res) => {
        this.actionLoading.set(false);
        if (res.success && res.data) {
          this.order.set(res.data);
          this.notice.set('Đơn hàng đã được hủy.');
        }
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.error.set(err?.error?.message || 'Không thể hủy đơn hàng ở trạng thái hiện tại.');
      },
    });
  }

  payWithVnpay(): void {
    const o = this.order();
    if (!o) return;
    this.actionLoading.set(true);
    this.orderApi
      .createVnpayUrl({
        orderId: o.id,
        paymentPhase: this.activePaymentPhase(),
        amount: this.payableNowAmount(),
      })
      .subscribe({
        next: (res) => {
          this.actionLoading.set(false);
          if (res.success && res.data?.paymentUrl) {
            window.location.href = res.data.paymentUrl;
          }
        },
        error: (err) => {
          this.actionLoading.set(false);
          this.error.set(err?.error?.message || 'Không thể tạo liên kết VNPAY.');
        },
      });
  }

  onProofFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.quoteApi.uploadFile(file, 'payment-proofs').subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.proofUrl = res.data.url;
        }
      },
    });
  }

  submitBankProof(): void {
    const o = this.order();
    if (!o) return;
    this.actionLoading.set(true);
    this.orderApi
      .submitPaymentProof(o.id, {
        paymentPhase: this.activePaymentPhase(),
        paymentMethod: 'BANK_TRANSFER',
        amount: this.payableNowAmount(),
        transactionRef: this.bankRef.trim() || o.orderCode,
        proofImageUrl: this.proofUrl || undefined,
      })
      .subscribe({
        next: () => {
          this.actionLoading.set(false);
          this.notice.set('Đã gửi chứng từ chuyển khoản! Xưởng sẽ đối soát và xác nhận trong ít phút.');
          this.loadOrder(o.id);
        },
        error: (err) => {
          this.actionLoading.set(false);
          this.error.set(err?.error?.message || 'Gửi xác nhận chuyển khoản thất bại.');
        },
      });
  }
}
