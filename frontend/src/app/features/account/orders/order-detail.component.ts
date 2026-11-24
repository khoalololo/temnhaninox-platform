import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrderApiService } from '../../../core/services/order-api.service';
import { QuoteApiService } from '../../../core/services/quote-api.service';
import { OrderDetail, OrderStatus, PaymentPhase } from '../../../core/models/order.models';
import { VndCurrencyPipe } from '../../../core/pipes/vnd-currency.pipe';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, VndCurrencyPipe],
  template: `
    <div class="max-w-6xl mx-auto px-4 py-8">
      <div class="mb-4 text-xs text-slate-500 flex items-center gap-2">
        <a routerLink="/account/orders" class="hover:text-slate-900">← Danh sách đơn hàng</a>
        @if (order()) {
          <span>/</span>
          <span class="font-mono font-bold text-slate-900">{{ order()!.orderCode }}</span>
        }
      </div>

      @if (notice()) {
        <div class="mb-4 p-3 rounded border border-emerald-300 bg-emerald-50 text-xs text-emerald-800 font-medium">
          {{ notice() }}
        </div>
      }
      @if (error()) {
        <div class="mb-4 p-3 rounded border border-red-300 bg-red-50 text-xs text-red-700">
          {{ error() }}
        </div>
      }

      @if (loading()) {
        <div class="bg-white border border-slate-300 rounded-md h-96 animate-pulse"></div>
      } @else if (order()) {
        <!-- 7-Step Industrial Manufacturing Stepper -->
        <div class="bg-white border border-slate-300 rounded-md p-5 mb-6">
          <div class="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-200">
            <div>
              <div class="text-[11px] font-mono text-slate-500">MÃ ĐƠN HÀNG</div>
              <h1 class="text-xl font-mono font-bold text-slate-900">{{ order()!.orderCode }}</h1>
            </div>
            <div class="flex items-center gap-2">
              @if (canCancel(order()!.status)) {
                <button
                  type="button"
                  (click)="cancelOrder()"
                  class="px-3 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 rounded text-xs font-semibold"
                >
                  Hủy đơn hàng
                </button>
              }
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center">
            @for (step of steps; track step.key; let idx = $index) {
              <div
                class="p-2.5 rounded border text-xs"
                [class]="isStepActive(step.key)
                  ? 'bg-amber-600 text-white border-amber-600 font-bold'
                  : isStepCompleted(idx)
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-medium'
                    : 'bg-slate-50 text-slate-400 border-slate-200'"
              >
                <div class="font-mono text-[10px] mb-0.5">BƯỚC {{ idx + 1 }}</div>
                <div class="leading-tight">{{ step.label }}</div>
              </div>
            }
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- Left 8 cols: Items, Prototype Approval & Payment Actions -->
          <div class="lg:col-span-8 space-y-6">
            <!-- Physical Prototype Approval Banner -->
            @if (order()!.status === 'PROTOTYPING') {
              <div class="bg-amber-50 border-2 border-amber-500 rounded-md p-5 space-y-4">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <div class="text-xs font-mono font-bold uppercase text-amber-800">
                      YÊU CẦU DUYỆT MẪU THỰC TẾ TẠI XƯỞNG
                    </div>
                    <h2 class="text-base font-bold text-slate-900 mt-0.5">
                      Xưởng đã gia công xong tem mẫu — Vui lòng kiểm tra hình ảnh bên dưới
                    </h2>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  @for (item of order()!.items; track item.id) {
                    @if (item.prototypeImageUrl) {
                      <div class="bg-white border border-amber-300 rounded p-2.5">
                        <img [src]="item.prototypeImageUrl" class="w-full h-48 object-cover rounded mb-2" />
                        <div class="text-xs font-semibold text-slate-900">{{ item.itemName }}</div>
                      </div>
                    }
                  }
                </div>

                <button
                  type="button"
                  (click)="approvePrototype()"
                  [disabled]="actionLoading()"
                  class="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-5 py-2.5 rounded-md"
                >
                  ✓ Xác Nhận Duyệt Mẫu Này & Chuyển Sang Đặt Cọc 50%
                </button>
              </div>
            }

            <!-- Payment Action Card (AWAITING_DEPOSIT or READY_FOR_DELIVERY / remaining balance) -->
            @if (remainingAmount() > 0 && order()!.status !== 'CANCELLED') {
              <div class="bg-white border border-slate-300 rounded-md p-5 space-y-4">
                <div class="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h2 class="text-sm font-bold uppercase tracking-wider text-slate-900">
                    Thanh Toán {{ paymentPhaseLabel() }}
                  </h2>
                  <span class="font-mono tabular-nums text-base font-bold text-amber-700">
                    Cần thanh toán: {{ payableNowAmount() | vnd }}
                  </span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <!-- Option 1: VNPAY Sandbox -->
                  <div class="border border-slate-300 rounded p-4 flex flex-col justify-between bg-slate-50">
                    <div>
                      <div class="text-xs font-bold text-slate-900 mb-1">Cổng thanh toán VNPAY / Thẻ ATM / QR</div>
                      <p class="text-[11px] text-slate-600 mb-3">
                        Xác nhận tự động ngay lập tức và chuyển trạng thái đơn hàng sang sản xuất.
                      </p>
                    </div>
                    <button
                      type="button"
                      (click)="payWithVnpay()"
                      [disabled]="actionLoading()"
                      class="w-full bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold py-2.5 rounded-md"
                    >
                      Thanh toán qua VNPAY ({{ payableNowAmount() | vnd }})
                    </button>
                  </div>

                  <!-- Option 2: Bank Transfer Proof Upload -->
                  <div class="border border-slate-300 rounded p-4 space-y-2.5">
                    <div class="text-xs font-bold text-slate-900">Chuyển khoản ngân hàng (Ủy nhiệm chi)</div>
                    <div class="text-[11px] font-mono bg-slate-100 p-2 rounded text-slate-700">
                      ACB · STK: 88830468 · CTY TEM NHÃN INOX<br />
                      Nội dung: {{ order()!.orderCode }}
                    </div>
                    <input
                      type="text"
                      [(ngModel)]="bankRef"
                      placeholder="Mã giao dịch / Nội dung CK"
                      class="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono"
                    />
                    <input
                      type="file"
                      (change)="onProofFileSelected($event)"
                      accept="image/*,.pdf"
                      class="block w-full text-[11px] text-slate-600"
                    />
                    <button
                      type="button"
                      (click)="submitBankProof()"
                      [disabled]="actionLoading()"
                      class="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2 rounded-md"
                    >
                      Gửi Xác Nhận Chuyển Khoản
                    </button>
                  </div>
                </div>
              </div>
            }

            <!-- Order Items Table -->
            <div class="bg-white border border-slate-300 rounded-md overflow-hidden">
              <div class="bg-slate-100 px-4 py-2.5 border-b border-slate-300 text-xs font-bold uppercase text-slate-800">
                Chi Tiết Hạng Mục Gia Công ({{ order()!.items.length }})
              </div>
              <table class="w-full text-xs text-left">
                <thead class="border-b border-slate-200 text-slate-500 font-mono">
                  <tr>
                    <th class="px-4 py-2.5">Hạng mục</th>
                    <th class="px-3 py-2.5 text-right">Đơn giá chốt</th>
                    <th class="px-3 py-2.5 text-center">SL</th>
                    <th class="px-4 py-2.5 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200">
                  @for (item of order()!.items; track item.id) {
                    <tr>
                      <td class="px-4 py-3">
                        <div class="font-bold text-slate-900">{{ item.itemName }}</div>
                        @if (item.widthMm) {
                          <div class="font-mono text-[11px] text-slate-600">
                            {{ item.materialNameSnapshot }} · {{ item.processingNameSnapshot }} ·
                            {{ item.widthMm }}×{{ item.heightMm }}×{{ item.thicknessMm }}mm
                          </div>
                        }
                        @if (item.designFileUrl) {
                          <a [href]="item.designFileUrl" target="_blank" class="text-[11px] text-amber-700 underline font-mono">
                            Bản vẽ thiết kế ↗
                          </a>
                        }
                      </td>
                      <td class="px-3 py-3 text-right font-mono tabular-nums">{{ item.finalUnitPrice | vnd }}</td>
                      <td class="px-3 py-3 text-center font-mono tabular-nums">{{ item.quantity }}</td>
                      <td class="px-4 py-3 text-right font-mono tabular-nums font-bold">{{ item.lineTotal | vnd }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- Right 4 cols: Financials, VAT & Audit Log -->
          <div class="lg:col-span-4 space-y-6">
            <div class="bg-white border border-slate-300 rounded-md p-5 space-y-3 text-xs">
              <h2 class="font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2.5">
                Tổng Kết Thanh Toán & VAT
              </h2>
              <div class="flex justify-between">
                <span class="text-slate-600">Tạm tính:</span>
                <span class="font-mono tabular-nums">{{ order()!.subtotalAmount | vnd }}</span>
              </div>
              @if (order()!.discountAmount > 0) {
                <div class="flex justify-between text-emerald-700">
                  <span>Chiết khấu:</span>
                  <span class="font-mono tabular-nums">-{{ order()!.discountAmount | vnd }}</span>
                </div>
              }
              <div class="flex justify-between">
                <span class="text-slate-600">Thuế VAT ({{ order()!.vatRate }}%):</span>
                <span class="font-mono tabular-nums">{{ order()!.vatAmount | vnd }}</span>
              </div>
              <div class="border-t border-slate-300 pt-2 flex justify-between font-bold text-sm">
                <span>Tổng cộng:</span>
                <span class="font-mono tabular-nums text-slate-900">{{ order()!.totalAmount | vnd }}</span>
              </div>
              <div class="flex justify-between text-emerald-700 font-semibold">
                <span>Đã thanh toán:</span>
                <span class="font-mono tabular-nums">{{ order()!.paidAmount | vnd }}</span>
              </div>
              <div class="flex justify-between text-amber-800 font-bold">
                <span>Còn lại:</span>
                <span class="font-mono tabular-nums">{{ remainingAmount() | vnd }}</span>
              </div>

              @if (order()!.requiresVatInvoice) {
                <div class="mt-3 pt-3 border-t border-slate-200 space-y-1 bg-slate-50 p-2.5 rounded">
                  <div class="font-bold text-slate-800">Thông tin hóa đơn VAT đỏ:</div>
                  <div>{{ order()!.vatCompanyName }}</div>
                  <div class="font-mono">MST: {{ order()!.vatTaxCode }}</div>
                  <div class="font-mono text-emerald-700 font-semibold">
                    Số HĐĐT: {{ order()!.vatInvoiceNumber || 'Đang chờ xuất hóa đơn' }}
                  </div>
                </div>
              }
            </div>

            <!-- Status Audit Timeline -->
            <div class="bg-white border border-slate-300 rounded-md p-5 space-y-3 text-xs">
              <h2 class="font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2.5">
                Nhật Ký Tiến Độ Xưởng
              </h2>
              <div class="space-y-3">
                @for (log of order()!.statusLogs; track log.id) {
                  <div class="border-l-2 border-amber-600 pl-3 py-0.5">
                    <div class="font-bold text-slate-900">{{ log.toStatus }}</div>
                    @if (log.note) {
                      <div class="text-slate-600">{{ log.note }}</div>
                    }
                    <div class="font-mono text-[10px] text-slate-400">{{ log.createdAt | date:'dd/MM/yyyy HH:mm' }}</div>
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
