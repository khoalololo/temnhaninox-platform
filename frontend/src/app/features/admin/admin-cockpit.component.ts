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
import { Category, Material, Product } from '../../core/models/catalog.models';
import { VndCurrencyPipe } from '../../core/pipes/vnd-currency.pipe';
import { ButtonDirective } from '../../shared/components/button/button.component';

@Component({
  selector: 'app-admin-cockpit',
  standalone: true,
  imports: [CommonModule, FormsModule, VndCurrencyPipe, ButtonDirective],
  template: `
    <div class="max-w-[1440px] mx-auto px-4 py-6 space-y-6">
      <!-- Header & Tabs -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div class="text-[11px] font-mono uppercase tracking-wider text-accent font-medium">
            BẢNG ĐIỀU HÀNH XƯỞNG GIA CÔNG
          </div>
          <h1 class="font-heading text-xl font-bold text-text-primary">Quản Lý Đơn Hàng, Duyệt Mẫu, Thu Cọc & Định Mức Giá</h1>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="activeTab.set('orders')"
            appButton
            [variant]="activeTab() === 'orders' ? 'primary' : 'secondary'"
            size="sm"
          >
            Đơn hàng & Sản xuất
          </button>
          <button
            type="button"
            (click)="activeTab.set('pricing')"
            appButton
            [variant]="activeTab() === 'pricing' ? 'primary' : 'secondary'"
            size="sm"
          >
            Cấu hình đơn giá & Chiết khấu
          </button>
          <button
            type="button"
            (click)="activeTab.set('products')"
            appButton
            [variant]="activeTab() === 'products' ? 'primary' : 'secondary'"
            size="sm"
          >
            Kho sản phẩm ({{ adminProducts().length }})
          </button>
        </div>
      </div>

      <!-- KPI Cards -->
      @if (summary()) {
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div class="industrial-card p-3.5">
            <div class="text-[11px] font-mono text-text-muted uppercase">Chờ duyệt báo giá</div>
            <div class="text-2xl font-mono tabular-nums font-bold text-accent mt-1">
              {{ summary()!.pendingQuotesCount }}
            </div>
          </div>
          <div class="industrial-card p-3.5">
            <div class="text-[11px] font-mono text-text-muted uppercase">Chờ xác nhận cọc</div>
            <div class="text-2xl font-mono tabular-nums font-bold text-warning mt-1">
              {{ summary()!.awaitingDepositCount }}
            </div>
          </div>
          <div class="industrial-card p-3.5">
            <div class="text-[11px] font-mono text-text-muted uppercase">Đang chạy máy SX</div>
            <div class="text-2xl font-mono tabular-nums font-bold text-steel mt-1">
              {{ summary()!.inProductionCount }}
            </div>
          </div>
          <div class="industrial-card p-3.5">
            <div class="text-[11px] font-mono text-text-muted uppercase">Chờ xuất HĐ VAT</div>
            <div class="text-2xl font-mono tabular-nums font-bold text-danger mt-1">
              {{ summary()!.vatPendingCount }}
            </div>
          </div>
          <div class="industrial-card border-accent/60 p-3.5 col-span-2 lg:col-span-1">
            <div class="text-[11px] font-mono text-text-muted uppercase">Doanh thu tháng</div>
            <div class="text-xl font-mono tabular-nums font-bold text-accent mt-1">
              {{ summary()!.monthlyRevenue | vnd }}
            </div>
          </div>
        </div>
      }

      @if (toast()) {
        <div class="p-3 rounded-[6px] border border-success/50 bg-success/10 text-xs text-success font-semibold">
          ✓ {{ toast() }}
        </div>
      }
      @if (errorMsg()) {
        <div class="p-3 rounded-[6px] border border-danger/50 bg-danger/10 text-xs text-danger font-semibold">
          ✕ {{ errorMsg() }}
        </div>
      }

      <!-- TAB 1: ORDERS & WORKFLOW DRAWER -->
      @if (activeTab() === 'orders') {
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <!-- Orders Queue -->
          <div [class]="selectedOrder() ? 'lg:col-span-7' : 'lg:col-span-12'" class="industrial-card overflow-hidden">
            <div class="p-3 bg-surface-raised border-b border-border flex flex-wrap items-center gap-2">
              <select
                [(ngModel)]="statusFilter"
                (ngModelChange)="loadOrders()"
                class="industrial-input px-2.5 py-1.5 text-xs"
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
                class="industrial-input px-2.5 py-1.5 text-xs flex-1 min-w-[180px]"
              />
              <button
                type="button"
                (click)="loadOrders()"
                appButton
                variant="secondary"
                size="xs"
              >
                Lọc
              </button>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-xs text-left">
                <thead class="bg-bg border-b border-border font-mono text-text-secondary">
                <tr>
                  <th class="px-3.5 py-2.5">Mã đơn</th>
                  <th class="px-3 py-2.5">Khách hàng</th>
                  <th class="px-3 py-2.5">Trạng thái</th>
                  <th class="px-3 py-2.5 text-right">Tổng tiền</th>
                  <th class="px-3 py-2.5 text-right">Thao tác</th>
                </tr>
                </thead>
                <tbody class="divide-y divide-border">
                  @for (ord of orders(); track ord.id) {
                    <tr
                      class="hover:bg-surface-raised cursor-pointer transition-colors"
                      [class]="selectedOrder()?.id === ord.id ? 'bg-surface-raised' : ''"
                      (click)="openOrder(ord.id)"
                    >
                      <td class="px-3.5 py-3 font-mono font-bold text-text-primary">
                        {{ ord.orderCode }}
                        @if (ord.requiresVatInvoice) {
                          <span class="ml-1 px-1.5 py-0.5 text-[9px] border border-danger/70 text-danger rounded-full">VAT</span>
                        }
                      </td>
                      <td class="px-3 py-3 text-text-primary">{{ ord.recipientName }}</td>
                      <td class="px-3 py-3 font-mono text-[11px] font-medium text-steel">{{ ord.status }}</td>
                      <td class="px-3 py-3 text-right font-mono tabular-nums font-bold text-text-primary">{{ ord.totalAmount | vnd }}</td>
                      <td class="px-3 py-3 text-right">
                        <button type="button" class="text-steel hover:text-steel-hover font-medium hover:underline">Xử lý</button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- Right Detail Inspector Drawer -->
          @if (selectedOrder(); as ord) {
            <div class="lg:col-span-5 industrial-card border-steel p-4 space-y-4 text-xs">
              <div class="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <span class="font-mono font-bold text-base text-text-primary">{{ ord.orderCode }}</span>
                  <span class="ml-2 px-2 py-0.5 rounded-full border border-accent/70 text-accent font-mono text-[11px] font-medium">
                    {{ ord.status }}
                  </span>
                </div>
                <button type="button" (click)="selectedOrder.set(null)" appButton variant="ghost" size="xs">
                  ✕ Đóng
                </button>
              </div>

              <!-- Customer & Shipping Info -->
              <div class="bg-bg border border-border rounded-[6px] p-3 space-y-1 text-text-secondary">
                <div><strong class="text-text-primary">Khách nhận:</strong> {{ ord.recipientName }} · <span class="font-mono text-text-primary">{{ ord.recipientPhone }}</span></div>
                <div><strong class="text-text-primary">Địa chỉ:</strong> {{ ord.shippingAddress }}</div>
                @if (ord.customerNote) {
                  <div class="text-accent"><strong>Ghi chú khách:</strong> {{ ord.customerNote }}</div>
                }
              </div>

              <!-- Items + Quote Price Override + Prototype Upload -->
              <div class="space-y-3">
                <div class="font-heading font-bold uppercase text-text-primary">Hạng mục & Ảnh mẫu thực tế</div>
                @for (item of ord.items; track item.id) {
                  <div class="border border-border rounded-[6px] p-3 space-y-2 bg-bg">
                    <div class="flex justify-between font-semibold text-text-primary">
                      <span>{{ item.itemName }} (×{{ item.quantity }})</span>
                      <span class="font-mono">{{ item.lineTotal | vnd }}</span>
                    </div>
                    @if (item.widthMm) {
                      <div class="font-mono text-[11px] text-text-secondary">
                        {{ item.materialNameSnapshot }} · {{ item.processingNameSnapshot }} · {{ item.widthMm }}×{{ item.heightMm }}×{{ item.thicknessMm }}mm
                      </div>
                    }
                    <div class="flex flex-wrap items-center gap-3">
                      @if (item.designFileUrl) {
                        <a [href]="item.designFileUrl" target="_blank" class="text-steel hover:text-steel-hover underline font-mono">
                          Tải bản vẽ khách ↗
                        </a>
                      }
                      @if (item.prototypeImageUrl) {
                        <a [href]="item.prototypeImageUrl" target="_blank" class="text-success underline font-mono">
                          Ảnh mẫu đã gửi ✓
                        </a>
                      }
                    </div>

                    <!-- Upload physical prototype photo -->
                    <div class="pt-1 flex items-center gap-2">
                      <label class="cursor-pointer px-2.5 py-1 bg-surface hover:bg-surface-raised border border-steel text-steel rounded-[6px] font-medium transition-colors">
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

              <!-- Approve Quote Action + Per-Item Unit Price Override -->
              @if (ord.status === 'QUOTE_PENDING') {
                <div class="border-t border-border pt-3 space-y-2.5">
                  <div class="font-semibold text-text-primary">Điều chỉnh đơn giá & Duyệt báo giá</div>
                  <div class="space-y-1.5">
                    @for (item of ord.items; track item.id) {
                      <div class="flex items-center justify-between gap-2 bg-bg border border-border rounded-[6px] px-2.5 py-1.5">
                        <span class="truncate text-[11px] text-text-secondary flex-1">{{ item.itemName }}</span>
                        <input
                          type="number"
                          [(ngModel)]="itemPriceOverrides[item.id]"
                          min="0"
                          step="1000"
                          class="industrial-input w-28 px-2 py-1 text-xs font-mono text-right"
                        />
                        <span class="text-[10px] font-mono text-text-muted">đ/cái</span>
                      </div>
                    }
                  </div>
                  <div class="flex gap-2">
                    <input
                      type="date"
                      [(ngModel)]="estimatedCompletionDate"
                      class="industrial-input px-2.5 py-1.5 text-xs font-mono"
                    />
                    <button
                      type="button"
                      (click)="approveQuote(ord.id)"
                      appButton
                      variant="primary"
                      size="xs"
                      class="flex-1"
                    >
                      Duyệt Báo Giá
                    </button>
                  </div>
                </div>
              }

              <!-- Verify Pending Payments -->
              @if (ord.paymentTransactions.length > 0) {
                <div class="border-t border-border pt-3 space-y-2">
                  <div class="font-semibold text-text-primary">Giao dịch thanh toán ({{ ord.paymentTransactions.length }})</div>
                  @for (tx of ord.paymentTransactions; track tx.id) {
                    <div class="border border-border rounded-[6px] p-2.5 flex items-center justify-between gap-2 bg-bg">
                      <div>
                        <div class="font-mono font-bold text-text-primary">{{ tx.paymentPhase }} · {{ tx.amount | vnd }}</div>
                        <div class="text-[11px] text-text-secondary">{{ tx.paymentMethod }} · Ref: {{ tx.transactionRef || '—' }}</div>
                        @if (tx.proofImageUrl) {
                          <a [href]="tx.proofImageUrl" target="_blank" class="text-steel hover:text-steel-hover underline text-[11px]">Xem biên lai ↗</a>
                        }
                      </div>
                      @if (tx.status === 'PENDING') {
                        <div class="flex gap-1.5">
                          <button
                            type="button"
                            (click)="verifyTx(tx.id, 'VERIFIED')"
                            appButton
                            variant="primary"
                            size="xs"
                          >
                            Duyệt tiền
                          </button>
                          <button
                            type="button"
                            (click)="verifyTx(tx.id, 'FAILED')"
                            appButton
                            variant="danger"
                            size="xs"
                          >
                            Từ chối
                          </button>
                        </div>
                      } @else {
                        <span class="font-mono font-bold" [class]="tx.status === 'VERIFIED' ? 'text-success' : 'text-danger'">
                          {{ tx.status }}
                        </span>
                      }
                    </div>
                  }
                </div>
              }

              <!-- State Transition Controls -->
              <div class="border-t border-border pt-3 space-y-2">
                <div class="font-semibold text-text-primary">Chuyển trạng thái sản xuất</div>
                <input
                  type="text"
                  [(ngModel)]="workerNote"
                  placeholder="Ghi chú thợ đứng máy (VD: Khắc sâu 0.15mm, đổ sơn đen)..."
                  class="industrial-input w-full px-2.5 py-1.5 text-xs"
                />
                <div class="flex gap-2">
                  <select [(ngModel)]="nextStatus" class="industrial-input px-2.5 py-1.5 text-xs flex-1">
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
                    appButton
                    variant="secondary"
                    size="xs"
                  >
                    Cập nhật
                  </button>
                </div>
              </div>

              <!-- Red VAT Invoice Number Input -->
              @if (ord.requiresVatInvoice) {
                <div class="border-t border-border pt-3 space-y-2">
                  <div class="font-semibold text-danger">Số hóa đơn VAT đỏ ({{ ord.vatTaxCode }} - {{ ord.vatCompanyName }})</div>
                  <div class="flex gap-2">
                    <input
                      type="text"
                      [(ngModel)]="vatInvoiceNumberInput"
                      placeholder="Nhập số HĐĐT (VD: 0000142)"
                      class="industrial-input px-2.5 py-1.5 text-xs font-mono flex-1"
                    />
                    <button
                      type="button"
                      (click)="saveVatNumber(ord.id)"
                      appButton
                      variant="primary"
                      size="xs"
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
        <div class="industrial-card p-5 max-w-3xl space-y-4">
          <div class="flex items-center justify-between border-b border-border pb-3">
            <h2 class="font-heading text-sm font-bold text-text-primary">Tham Số Công Thức Báo Giá Xưởng</h2>
            <button
              type="button"
              (click)="savePricingRules()"
              appButton
              variant="primary"
              size="sm"
            >
              Lưu cấu hình giá
            </button>
          </div>
          <div class="space-y-3">
            @for (rule of pricingRules(); track rule.ruleKey) {
              <div class="grid grid-cols-12 gap-3 items-center text-xs border-b border-border pb-2.5">
                <div class="col-span-5 font-mono font-bold text-text-primary">{{ rule.ruleKey }}</div>
                <div class="col-span-4 text-text-secondary">{{ rule.description }}</div>
                <div class="col-span-3">
                  <input
                    type="number"
                    [(ngModel)]="rule.ruleValue"
                    step="0.01"
                    class="industrial-input w-full px-2.5 py-1.5 font-mono text-right"
                  />
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- TAB 3: CATALOG PRODUCTS -->
      @if (activeTab() === 'products') {
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="font-heading text-sm font-bold text-text-primary">
              Danh Sách Sản Phẩm & Phôi Xưởng ({{ adminProducts().length }})
            </h2>
            <button
              type="button"
              (click)="showCreateProduct.set(!showCreateProduct())"
              appButton
              variant="primary"
              size="sm"
            >
              {{ showCreateProduct() ? 'Đóng biểu mẫu' : '+ Thêm sản phẩm mới' }}
            </button>
          </div>

          @if (showCreateProduct()) {
            <form (ngSubmit)="createProduct()" class="industrial-card p-5 space-y-4 text-xs">
              <div class="font-heading font-bold uppercase text-text-primary border-b border-border pb-2">
                Tạo Sản Phẩm / Mẫu Tem Mới
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label class="block text-[11px] font-medium text-text-secondary mb-1">Mã SKU *</label>
                  <input type="text" [(ngModel)]="newProd.sku" name="sku" required placeholder="VD: NVX-2001" class="industrial-input w-full px-2.5 py-1.5 font-mono" />
                </div>
                <div>
                  <label class="block text-[11px] font-medium text-text-secondary mb-1">Tên sản phẩm *</label>
                  <input type="text" [(ngModel)]="newProd.name" name="name" required placeholder="VD: Tem inox 304 khắc laser" class="industrial-input w-full px-2.5 py-1.5" />
                </div>
                <div>
                  <label class="block text-[11px] font-medium text-text-secondary mb-1">Slug URL *</label>
                  <input type="text" [(ngModel)]="newProd.slug" name="slug" required placeholder="VD: tem-inox-304-khac-laser" class="industrial-input w-full px-2.5 py-1.5 font-mono" />
                </div>
                <div>
                  <label class="block text-[11px] font-medium text-text-secondary mb-1">Danh mục *</label>
                  <select [(ngModel)]="newProd.categoryId" name="categoryId" required class="industrial-input w-full px-2.5 py-1.5">
                    @for (c of adminCategories(); track c.id) {
                      <option [value]="c.id">{{ c.name }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label class="block text-[11px] font-medium text-text-secondary mb-1">Vật liệu *</label>
                  <select [(ngModel)]="newProd.materialId" name="materialId" required class="industrial-input w-full px-2.5 py-1.5">
                    @for (m of adminMaterials(); track m.id) {
                      <option [value]="m.id">{{ m.name }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label class="block text-[11px] font-medium text-text-secondary mb-1">Loại sản phẩm *</label>
                  <select [(ngModel)]="newProd.productType" name="productType" class="industrial-input w-full px-2.5 py-1.5">
                    <option value="STANDARD_ITEM">STANDARD_ITEM (Bán sẵn)</option>
                    <option value="CUSTOM_TEMPLATE">CUSTOM_TEMPLATE (Báo giá 3D)</option>
                  </select>
                </div>
                <div>
                  <label class="block text-[11px] font-medium text-text-secondary mb-1">Đơn giá (VNĐ)</label>
                  <input type="number" [(ngModel)]="newProd.basePrice" name="basePrice" min="0" class="industrial-input w-full px-2.5 py-1.5 font-mono" />
                </div>
                <div>
                  <label class="block text-[11px] font-medium text-text-secondary mb-1">Tồn kho</label>
                  <input type="number" [(ngModel)]="newProd.stockQuantity" name="stockQuantity" min="0" class="industrial-input w-full px-2.5 py-1.5 font-mono" />
                </div>
                <div>
                  <label class="block text-[11px] font-medium text-text-secondary mb-1">Ảnh sản phẩm (URL)</label>
                  <input type="text" [(ngModel)]="newProd.imageUrl" name="imageUrl" placeholder="/assets/products/..." class="industrial-input w-full px-2.5 py-1.5 font-mono" />
                </div>
              </div>
              <div class="flex justify-end gap-2">
                <button type="button" (click)="showCreateProduct.set(false)" appButton variant="secondary" size="xs">Hủy</button>
                <button type="submit" appButton variant="primary" size="xs">Lưu sản phẩm</button>
              </div>
            </form>
          }

          <div class="industrial-card overflow-hidden">
            <table class="w-full text-xs text-left">
              <thead class="bg-bg border-b border-border font-mono text-text-secondary">
              <tr>
                <th class="px-4 py-3">SKU</th>
                <th class="px-3 py-3">Tên sản phẩm</th>
                <th class="px-3 py-3">Loại</th>
                <th class="px-3 py-3 text-right">Đơn giá / Tồn kho</th>
                <th class="px-4 py-3 text-right">Xóa</th>
              </tr>
              </thead>
              <tbody class="divide-y divide-border">
                @for (p of adminProducts(); track p.id) {
                  <tr class="hover:bg-surface-raised transition-colors">
                    <td class="px-4 py-3 font-mono font-bold text-text-primary">{{ p.sku }}</td>
                    <td class="px-3 py-3 font-medium text-text-primary">{{ p.name }}</td>
                    <td class="px-3 py-3 font-mono text-[11px] text-steel">{{ p.productType }}</td>
                    <td class="px-3 py-3 text-right font-mono tabular-nums text-text-primary">
                      {{ p.productType === 'STANDARD_ITEM' ? (p.basePrice | vnd) + ' · Kho: ' + (p.stockQuantity ?? 0) : 'Báo giá 3D' }}
                    </td>
                    <td class="px-4 py-3 text-right">
                      <button type="button" (click)="removeProduct(p.id)" class="text-danger hover:underline">Xóa</button>
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
export class AdminCockpitComponent implements OnInit {
  private readonly adminApi = inject(AdminApiService);
  private readonly quoteApi = inject(QuoteApiService);

  readonly activeTab = signal<'orders' | 'pricing' | 'products'>('orders');
  readonly summary = signal<AdminDashboardSummary | null>(null);
  readonly orders = signal<OrderSummary[]>([]);
  readonly selectedOrder = signal<OrderDetail | null>(null);
  readonly pricingRules = signal<PricingRule[]>([]);
  readonly adminProducts = signal<Product[]>([]);
  readonly adminCategories = signal<Category[]>([]);
  readonly adminMaterials = signal<Material[]>([]);
  readonly showCreateProduct = signal(false);
  readonly toast = signal('');
  readonly errorMsg = signal('');

  statusFilter: OrderStatus | '' = '';
  searchFilter = '';
  estimatedCompletionDate = '';
  workerNote = '';
  nextStatus: OrderStatus = 'IN_PRODUCTION';
  vatInvoiceNumberInput = '';
  itemPriceOverrides: Record<string, number> = {};

  newProd = {
    sku: '',
    name: '',
    slug: '',
    categoryId: '',
    materialId: '',
    productType: 'STANDARD_ITEM' as 'STANDARD_ITEM' | 'CUSTOM_TEMPLATE',
    basePrice: 50000,
    stockQuantity: 50,
    imageUrl: '',
  };

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
    this.adminApi.getAdminCategories().subscribe({
      next: (res) => {
        if (res.success && res.data?.length) {
          this.adminCategories.set(res.data);
          this.newProd.categoryId = res.data[0].id;
        }
      },
    });
    this.adminApi.getAdminMaterials().subscribe({
      next: (res) => {
        if (res.success && res.data?.length) {
          this.adminMaterials.set(res.data);
          this.newProd.materialId = res.data[0].id;
        }
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
          this.itemPriceOverrides = {};
          for (const item of res.data.items) {
            this.itemPriceOverrides[item.id] = item.finalUnitPrice;
          }
        }
      },
      error: (err) => this.notifyError(err?.error?.message || 'Không thể tải chi tiết đơn hàng.'),
    });
  }

  approveQuote(orderId: string): void {
    const items = Object.entries(this.itemPriceOverrides).map(([orderItemId, finalUnitPrice]) => ({
      orderItemId,
      finalUnitPrice: Number(finalUnitPrice),
    }));

    this.adminApi
      .reviewQuote(orderId, {
        items,
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
        error: (err) => this.notifyError(err?.error?.message || 'Duyệt báo giá thất bại.'),
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
        error: (err) => this.notifyError(err?.error?.message || 'Không thể chuyển trạng thái (kiểm tra điều kiện đặt cọc 50%).'),
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

  createProduct(): void {
    if (!this.newProd.sku.trim() || !this.newProd.name.trim() || !this.newProd.slug.trim()) {
      this.notifyError('Vui lòng nhập đầy đủ SKU, Tên sản phẩm và Slug.');
      return;
    }
    this.adminApi
      .createProduct({
        sku: this.newProd.sku.trim(),
        name: this.newProd.name.trim(),
        slug: this.newProd.slug.trim(),
        categoryId: this.newProd.categoryId,
        materialId: this.newProd.materialId,
        productType: this.newProd.productType,
        basePrice: Number(this.newProd.basePrice),
        stockQuantity: Number(this.newProd.stockQuantity),
        images: this.newProd.imageUrl.trim() ? [this.newProd.imageUrl.trim()] : [],
        isActive: true,
      })
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.adminProducts.set([res.data, ...this.adminProducts()]);
            this.showCreateProduct.set(false);
            this.newProd.sku = '';
            this.newProd.name = '';
            this.newProd.slug = '';
            this.newProd.imageUrl = '';
            this.notify('Đã tạo sản phẩm mới.');
          }
        },
        error: (err) => this.notifyError(err?.error?.message || 'Tạo sản phẩm thất bại.'),
      });
  }

  removeProduct(id: string): void {
    this.adminApi.deleteProduct(id).subscribe({
      next: () => {
        this.adminProducts.set(this.adminProducts().filter((p) => p.id !== id));
        this.notify('Đã xóa sản phẩm.');
      },
      error: (err) => this.notifyError(err?.error?.message || 'Xóa sản phẩm thất bại.'),
    });
  }

  private notify(msg: string): void {
    this.errorMsg.set('');
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 3000);
  }

  private notifyError(msg: string): void {
    this.toast.set('');
    this.errorMsg.set(msg);
    setTimeout(() => this.errorMsg.set(''), 4500);
  }
}
