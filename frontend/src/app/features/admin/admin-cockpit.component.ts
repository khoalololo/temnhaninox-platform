import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService } from '../../core/services/admin-api.service';
import { QuoteApiService } from '../../core/services/quote-api.service';
import {
  AdminDashboardSummary,
  OrderDetail,
  OrderStatus,
  OrderSummary,
  PricingRule,
} from '../../core/models/order.models';
import { Product } from '../../core/models/catalog.models';
import { VndCurrencyPipe } from '../../core/pipes/vnd-currency.pipe';

@Component({
  selector: 'app-admin-cockpit',
  standalone: true,
  imports: [CommonModule, FormsModule, VndCurrencyPipe],
  template: `
    <div class="max-w-[1440px] mx-auto px-4 py-6 space-y-6">
      <!-- Header & Tabs -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-300 pb-4">
        <div>
          <div class="text-[11px] font-mono uppercase tracking-wider text-amber-700 font-bold">
            BẢNG ĐIỀU HÀNH XƯỞNG GIA CÔNG
          </div>
          <h1 class="text-xl font-bold text-slate-900">Quản Lý Đơn Hàng, Duyệt Mẫu, Thu Cọc & Định Mức Giá</h1>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="activeTab.set('orders')"
            class="px-3.5 py-2 rounded-md text-xs font-semibold border transition-colors"
            [class]="activeTab() === 'orders' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'"
          >
            Đơn hàng & Sản xuất
          </button>
          <button
            type="button"
            (click)="activeTab.set('pricing')"
            class="px-3.5 py-2 rounded-md text-xs font-semibold border transition-colors"
            [class]="activeTab() === 'pricing' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'"
          >
            Cấu hình đơn giá & Chiết khấu
          </button>
          <button
            type="button"
            (click)="activeTab.set('products')"
            class="px-3.5 py-2 rounded-md text-xs font-semibold border transition-colors"
            [class]="activeTab() === 'products' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'"
          >
            Kho sản phẩm ({{ adminProducts().length }})
          </button>
        </div>
      </div>

      <!-- KPI Cards -->
      @if (summary()) {
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div class="bg-white border border-slate-300 rounded-md p-3.5">
            <div class="text-[11px] font-mono text-slate-500 uppercase">Chờ duyệt báo giá</div>
            <div class="text-2xl font-mono tabular-nums font-bold text-amber-700 mt-1">
              {{ summary()!.pendingQuotesCount }}
            </div>
          </div>
          <div class="bg-white border border-slate-300 rounded-md p-3.5">
            <div class="text-[11px] font-mono text-slate-500 uppercase">Chờ xác nhận cọc</div>
            <div class="text-2xl font-mono tabular-nums font-bold text-slate-900 mt-1">
              {{ summary()!.awaitingDepositCount }}
            </div>
          </div>
          <div class="bg-white border border-slate-300 rounded-md p-3.5">
            <div class="text-[11px] font-mono text-slate-500 uppercase">Đang chạy máy SX</div>
            <div class="text-2xl font-mono tabular-nums font-bold text-sky-700 mt-1">
              {{ summary()!.inProductionCount }}
            </div>
          </div>
          <div class="bg-white border border-slate-300 rounded-md p-3.5">
            <div class="text-[11px] font-mono text-slate-500 uppercase">Chờ xuất HĐ VAT</div>
            <div class="text-2xl font-mono tabular-nums font-bold text-rose-700 mt-1">
              {{ summary()!.vatPendingCount }}
            </div>
          </div>
          <div class="bg-slate-900 text-white border border-slate-800 rounded-md p-3.5 col-span-2 lg:col-span-1">
            <div class="text-[11px] font-mono text-slate-400 uppercase">Doanh thu tháng</div>
            <div class="text-xl font-mono tabular-nums font-bold text-amber-400 mt-1">
              {{ summary()!.monthlyRevenue | vnd }}
            </div>
          </div>
        </div>
      }

      @if (toast()) {
        <div class="p-3 rounded border border-emerald-300 bg-emerald-50 text-xs text-emerald-800 font-semibold">
          ✓ {{ toast() }}
        </div>
      }

      <!-- TAB 1: ORDERS & WORKFLOW DRAWER -->
      @if (activeTab() === 'orders') {
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <!-- Orders Queue -->
          <div [class]="selectedOrder() ? 'lg:col-span-7' : 'lg:col-span-12'" class="bg-white border border-slate-300 rounded-md overflow-hidden">
            <div class="p-3 bg-slate-100 border-b border-slate-300 flex flex-wrap items-center gap-2">
              <select
                [(ngModel)]="statusFilter"
                (ngModelChange)="loadOrders()"
                class="border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="QUOTE_PENDING">Chờ duyệt giá</option>
                <option value="QUOTE_APPROVED">Đã duyệt giá</option>
                <option value="PROTOTYPING">Đang làm mẫu</option>
                <option value="AWAITING_DEPOSIT">Chờ đặt cọc</option>
                <option value="IN_PRODUCTION">Đang sản xuất</option>
                <option value="READY_FOR_DELIVERY">Chờ giao hàng</option>
                <option value="COMPLETED">Hoàn tất</option>
              </select>

              <input
                type="text"
                [(ngModel)]="searchFilter"
                (keyup.enter)="loadOrders()"
                placeholder="Tìm mã đơn / tên khách..."
                class="border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white flex-1 min-w-[180px]"
              />
              <button
                type="button"
                (click)="loadOrders()"
                class="bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded"
              >
                Lọc
              </button>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-xs text-left">
                <thead class="bg-slate-50 border-b border-slate-200 font-mono text-slate-600">
                <tr>
                  <th class="px-3.5 py-2.5">Mã đơn</th>
                  <th class="px-3 py-2.5">Khách hàng</th>
                  <th class="px-3 py-2.5">Trạng thái</th>
                  <th class="px-3 py-2.5 text-right">Tổng tiền</th>
                  <th class="px-3 py-2.5 text-right">Thao tác</th>
                </tr>
                </thead>
                <tbody class="divide-y divide-slate-200">
                  @for (ord of orders(); track ord.id) {
                    <tr
                      class="hover:bg-amber-50/40 cursor-pointer"
                      [class]="selectedOrder()?.id === ord.id ? 'bg-amber-50' : ''"
                      (click)="openOrder(ord.id)"
                    >
                      <td class="px-3.5 py-3 font-mono font-bold text-slate-900">
                        {{ ord.orderCode }}
                        @if (ord.requiresVatInvoice) {
                          <span class="ml-1 px-1 py-0.5 text-[9px] bg-rose-100 text-rose-700 rounded">VAT</span>
                        }
                      </td>
                      <td class="px-3 py-3">{{ ord.recipientName }}</td>
                      <td class="px-3 py-3 font-mono text-[11px] font-semibold">{{ ord.status }}</td>
                      <td class="px-3 py-3 text-right font-mono tabular-nums font-bold">{{ ord.totalAmount | vnd }}</td>
                      <td class="px-3 py-3 text-right">
                        <button type="button" class="text-amber-700 font-semibold hover:underline">Xử lý</button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- Right Detail Inspector Drawer -->
          @if (selectedOrder(); as ord) {
            <div class="lg:col-span-5 bg-white border-2 border-slate-900 rounded-md p-4 space-y-4 text-xs">
              <div class="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <span class="font-mono font-bold text-base text-slate-900">{{ ord.orderCode }}</span>
                  <span class="ml-2 px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-mono text-[11px] font-bold">
                    {{ ord.status }}
                  </span>
                </div>
                <button type="button" (click)="selectedOrder.set(null)" class="text-slate-500 hover:text-slate-900 font-bold">
                  ✕ Đóng
                </button>
              </div>

              <!-- Customer & Shipping Info -->
              <div class="bg-slate-50 border border-slate-200 rounded p-3 space-y-1">
                <div><strong>Khách nhận:</strong> {{ ord.recipientName }} · <span class="font-mono">{{ ord.recipientPhone }}</span></div>
                <div><strong>Địa chỉ:</strong> {{ ord.shippingAddress }}</div>
                @if (ord.customerNote) {
                  <div class="text-amber-800"><strong>Ghi chú khách:</strong> {{ ord.customerNote }}</div>
                }
              </div>

              <!-- Items + Quote Price Override + Prototype Upload -->
              <div class="space-y-3">
                <div class="font-bold uppercase text-slate-800">Hạng mục & Ảnh mẫu thực tế</div>
                @for (item of ord.items; track item.id) {
                  <div class="border border-slate-300 rounded p-3 space-y-2">
                    <div class="flex justify-between font-bold">
                      <span>{{ item.itemName }} (×{{ item.quantity }})</span>
                      <span class="font-mono">{{ item.lineTotal | vnd }}</span>
                    </div>
                    @if (item.widthMm) {
                      <div class="font-mono text-[11px] text-slate-600">
                        {{ item.materialNameSnapshot }} · {{ item.processingNameSnapshot }} · {{ item.widthMm }}×{{ item.heightMm }}×{{ item.thicknessMm }}mm
                      </div>
                    }
                    <div class="flex flex-wrap items-center gap-3">
                      @if (item.designFileUrl) {
                        <a [href]="item.designFileUrl" target="_blank" class="text-amber-700 underline font-mono">
                          Tải bản vẽ khách ↗
                        </a>
                      }
                      @if (item.prototypeImageUrl) {
                        <a [href]="item.prototypeImageUrl" target="_blank" class="text-emerald-700 underline font-mono">
                          Ảnh mẫu đã gửi ✓
                        </a>
                      }
                    </div>

                    <!-- Upload physical prototype photo -->
                    <div class="pt-1 flex items-center gap-2">
                      <label class="cursor-pointer px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded font-semibold">
                        + Tải ảnh tem mẫu thực tế
                        <input
                          type="file"
                          class="hidden"
                          accept="image/*"
                          (change)="uploadPrototype(ord.id, item.id, $event)"
                        />
                      </label>
                    </div>
                  </div>
                }
              </div>

              <!-- Approve Quote Action -->
              @if (ord.status === 'QUOTE_PENDING') {
                <div class="border-t border-slate-200 pt-3 space-y-2">
                  <div class="font-bold text-slate-900">Duyệt báo giá đơn hàng</div>
                  <div class="flex gap-2">
                    <input
                      type="date"
                      [(ngModel)]="estimatedCompletionDate"
                      class="border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono"
                    />
                    <button
                      type="button"
                      (click)="approveQuote(ord.id)"
                      class="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-1.5 px-3 rounded"
                    >
                      Duyệt Báo Giá
                    </button>
                  </div>
                </div>
              }

              <!-- Verify Pending Payments -->
              @if (ord.paymentTransactions.length > 0) {
                <div class="border-t border-slate-200 pt-3 space-y-2">
                  <div class="font-bold text-slate-900">Giao dịch thanh toán ({{ ord.paymentTransactions.length }})</div>
                  @for (tx of ord.paymentTransactions; track tx.id) {
                    <div class="border border-slate-300 rounded p-2.5 flex items-center justify-between gap-2 bg-slate-50">
                      <div>
                        <div class="font-mono font-bold">{{ tx.paymentPhase }} · {{ tx.amount | vnd }}</div>
                        <div class="text-[11px] text-slate-600">{{ tx.paymentMethod }} · Ref: {{ tx.transactionRef || '—' }}</div>
                        @if (tx.proofImageUrl) {
                          <a [href]="tx.proofImageUrl" target="_blank" class="text-sky-700 underline text-[11px]">Xem biên lai ↗</a>
                        }
                      </div>
                      @if (tx.status === 'PENDING') {
                        <div class="flex gap-1.5">
                          <button
                            type="button"
                            (click)="verifyTx(tx.id, 'VERIFIED')"
                            class="px-2.5 py-1 bg-emerald-600 text-white font-semibold rounded"
                          >
                            Duyệt tiền
                          </button>
                          <button
                            type="button"
                            (click)="verifyTx(tx.id, 'FAILED')"
                            class="px-2 py-1 bg-red-600 text-white font-semibold rounded"
                          >
                            Từ chối
                          </button>
                        </div>
                      } @else {
                        <span class="font-mono font-bold" [class]="tx.status === 'VERIFIED' ? 'text-emerald-700' : 'text-red-600'">
                          {{ tx.status }}
                        </span>
                      }
                    </div>
                  }
                </div>
              }

              <!-- State Transition Controls -->
              <div class="border-t border-slate-200 pt-3 space-y-2">
                <div class="font-bold text-slate-900">Chuyển trạng thái sản xuất</div>
                <input
                  type="text"
                  [(ngModel)]="workerNote"
                  placeholder="Ghi chú thợ đứng máy (VD: Khắc sâu 0.15mm, đổ sơn đen)..."
                  class="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                />
                <div class="flex gap-2">
                  <select [(ngModel)]="nextStatus" class="border border-slate-300 rounded px-2.5 py-1.5 text-xs flex-1">
                    <option value="PROTOTYPING">PROTOTYPING (Làm mẫu)</option>
                    <option value="AWAITING_DEPOSIT">AWAITING_DEPOSIT (Chờ cọc)</option>
                    <option value="IN_PRODUCTION">IN_PRODUCTION (Đang sản xuất)</option>
                    <option value="READY_FOR_DELIVERY">READY_FOR_DELIVERY (Sẵn sàng giao)</option>
                    <option value="COMPLETED">COMPLETED (Hoàn tất)</option>
                    <option value="CANCELLED">CANCELLED (Hủy đơn)</option>
                  </select>
                  <button
                    type="button"
                    (click)="changeOrderStatus(ord.id)"
                    class="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3.5 py-1.5 rounded"
                  >
                    Cập nhật
                  </button>
                </div>
              </div>

              <!-- Red VAT Invoice Number Input -->
              @if (ord.requiresVatInvoice) {
                <div class="border-t border-slate-200 pt-3 space-y-2">
                  <div class="font-bold text-rose-800">Số hóa đơn VAT đỏ ({{ ord.vatTaxCode }} - {{ ord.vatCompanyName }})</div>
                  <div class="flex gap-2">
                    <input
                      type="text"
                      [(ngModel)]="vatInvoiceNumberInput"
                      placeholder="Nhập số HĐĐT (VD: 0000142)"
                      class="border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono flex-1"
                    />
                    <button
                      type="button"
                      (click)="saveVatNumber(ord.id)"
                      class="bg-rose-700 hover:bg-rose-800 text-white font-semibold px-3 py-1.5 rounded"
                    >
                      Lưu số HĐ
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- TAB 2: PRICING RULES -->
      @if (activeTab() === 'pricing') {
        <div class="bg-white border border-slate-300 rounded-md p-5 max-w-3xl space-y-4">
          <div class="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 class="text-sm font-bold text-slate-900">Tham Số Công Thức Báo Giá Xưởng</h2>
            <button
              type="button"
              (click)="savePricingRules()"
              class="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4 py-2 rounded"
            >
              Lưu cấu hình giá
            </button>
          </div>
          <div class="space-y-3">
            @for (rule of pricingRules(); track rule.ruleKey) {
              <div class="grid grid-cols-12 gap-3 items-center text-xs border-b border-slate-100 pb-2.5">
                <div class="col-span-5 font-mono font-bold text-slate-800">{{ rule.ruleKey }}</div>
                <div class="col-span-4 text-slate-500">{{ rule.description }}</div>
                <div class="col-span-3">
                  <input
                    type="number"
                    [(ngModel)]="rule.ruleValue"
                    step="0.01"
                    class="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono text-right"
                  />
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- TAB 3: CATALOG PRODUCTS -->
      @if (activeTab() === 'products') {
        <div class="bg-white border border-slate-300 rounded-md overflow-hidden">
          <table class="w-full text-xs text-left">
            <thead class="bg-slate-100 border-b border-slate-300 font-mono text-slate-700">
            <tr>
              <th class="px-4 py-3">SKU</th>
              <th class="px-3 py-3">Tên sản phẩm</th>
              <th class="px-3 py-3">Loại</th>
              <th class="px-3 py-3 text-right">Đơn giá / Tồn kho</th>
              <th class="px-4 py-3 text-right">Xóa</th>
            </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              @for (p of adminProducts(); track p.id) {
                <tr>
                  <td class="px-4 py-3 font-mono font-bold">{{ p.sku }}</td>
                  <td class="px-3 py-3 font-medium text-slate-900">{{ p.name }}</td>
                  <td class="px-3 py-3 font-mono text-[11px]">{{ p.productType }}</td>
                  <td class="px-3 py-3 text-right font-mono tabular-nums">
                    {{ p.productType === 'STANDARD_ITEM' ? (p.basePrice | vnd) + ' · Kho: ' + (p.stockQuantity ?? 0) : 'Báo giá 3D' }}
                  </td>
                  <td class="px-4 py-3 text-right">
                    <button type="button" (click)="removeProduct(p.id)" class="text-red-600 hover:underline">Xóa</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class AdminCockpitComponent implements OnInit {
  private readonly adminApi = inject(AdminApiService);
  private readonly quoteApi = inject(QuoteApiService);

  readonly activeTab = signal<'orders' | 'pricing' | 'products'>('orders');
  readonly summary = signal<AdminDashboardSummary | null>(null);
  readonly orders = signal<OrderSummary[]>([]);
  readonly selectedOrder = signal<OrderDetail | null>(null);
  readonly pricingRules = signal<PricingRule[]>([]);
  readonly adminProducts = signal<Product[]>([]);
  readonly toast = signal('');

  statusFilter: OrderStatus | '' = '';
  searchFilter = '';
  estimatedCompletionDate = '';
  workerNote = '';
  nextStatus: OrderStatus = 'IN_PRODUCTION';
  vatInvoiceNumberInput = '';

  ngOnInit(): void {
    this.refreshDashboard();
    this.loadOrders();
    this.adminApi.getPricingRules().subscribe({
      next: (res) => {
        if (res.success) this.pricingRules.set(res.data || []);
      },
    });
    this.adminApi.getAdminProducts().subscribe({
      next: (res) => {
        if (res.success && res.data) this.adminProducts.set(res.data.content || []);
      },
    });
  }

  refreshDashboard(): void {
    this.adminApi.getDashboardSummary().subscribe({
      next: (res) => {
        if (res.success) this.summary.set(res.data);
      },
    });
  }

  loadOrders(): void {
    this.adminApi
      .getOrders({
        status: this.statusFilter || undefined,
        search: this.searchFilter || undefined,
      })
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.orders.set(res.data.content || []);
          }
        },
      });
  }

  openOrder(id: string): void {
    this.adminApi.getOrderDetail(id).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.selectedOrder.set(res.data);
          this.nextStatus = res.data.status;
          this.workerNote = res.data.productionWorkerNote || '';
          this.vatInvoiceNumberInput = res.data.vatInvoiceNumber || '';
        }
      },
    });
  }

  approveQuote(orderId: string): void {
    this.adminApi
      .reviewQuote(orderId, {
        estimatedCompletionDate: this.estimatedCompletionDate || undefined,
        note: 'Xưởng đã duyệt đơn giá và tiến độ',
      })
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.selectedOrder.set(res.data);
            this.notify('Đã duyệt báo giá đơn hàng.');
            this.loadOrders();
            this.refreshDashboard();
          }
        },
      });
  }

  uploadPrototype(orderId: string, itemId: string, event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.quoteApi.uploadFile(file, 'prototypes').subscribe({
      next: (uploadRes) => {
        if (uploadRes.success && uploadRes.data) {
          this.adminApi
            .attachPrototypeImage(orderId, itemId, {
              prototypeImageUrl: uploadRes.data.url,
              note: 'Xưởng đã tải ảnh mẫu thực tế lên hệ thống',
            })
            .subscribe({
              next: (ordRes) => {
                if (ordRes.success && ordRes.data) {
                  this.selectedOrder.set(ordRes.data);
                  this.notify('Đã đính kèm ảnh mẫu thực tế và thông báo cho khách.');
                  this.loadOrders();
                }
              },
            });
        }
      },
    });
  }

  verifyTx(paymentId: string, status: 'VERIFIED' | 'FAILED'): void {
    this.adminApi.verifyPayment(paymentId, { status }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.selectedOrder.set(res.data);
          this.notify(status === 'VERIFIED' ? 'Đã xác nhận thanh toán.' : 'Đã từ chối giao dịch.');
          this.loadOrders();
          this.refreshDashboard();
        }
      },
    });
  }

  changeOrderStatus(orderId: string): void {
    this.adminApi
      .updateOrderStatus(orderId, {
        targetStatus: this.nextStatus,
        productionWorkerNote: this.workerNote.trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.selectedOrder.set(res.data);
            this.notify(`Đã chuyển trạng thái sang ${this.nextStatus}.`);
            this.loadOrders();
            this.refreshDashboard();
          }
        },
      });
  }

  saveVatNumber(orderId: string): void {
    if (!this.vatInvoiceNumberInput.trim()) return;
    this.adminApi.updateVatInvoice(orderId, this.vatInvoiceNumberInput.trim()).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.selectedOrder.set(res.data);
          this.notify('Đã lưu số hóa đơn VAT đỏ.');
          this.refreshDashboard();
        }
      },
    });
  }

  savePricingRules(): void {
    const payload = this.pricingRules().map((r) => ({
      ruleKey: r.ruleKey,
      ruleValue: Number(r.ruleValue),
      description: r.description,
    }));
    this.adminApi.updatePricingRules(payload).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.pricingRules.set(res.data);
          this.notify('Đã cập nhật bảng tham số định mức giá.');
        }
      },
    });
  }

  removeProduct(id: string): void {
    this.adminApi.deleteProduct(id).subscribe({
      next: () => {
        this.adminProducts.set(this.adminProducts().filter((p) => p.id !== id));
        this.notify('Đã xóa sản phẩm.');
      },
    });
  }

  private notify(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 3000);
  }
}
