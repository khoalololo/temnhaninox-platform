import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AdminApiService } from '../../core/services/admin-api.service';
import { QuoteApiService } from '../../core/services/quote-api.service';
import {
  AdminDashboardSummary,
  OrderDetail,
  OrderStatus,
  OrderSummary,
  PaymentTransaction,
  PricingRule,
} from '../../core/models/order.models';
import { Category, Material, ProcessingMethod, Product, ProductType } from '../../core/models/catalog.models';
import { AdminCustomer } from '../../core/models/auth.models';
import { VndCurrencyPipe } from '../../core/pipes/vnd-currency.pipe';
import { ButtonDirective } from '../../shared/components/button/button.component';
import { PaginatorComponent } from '../../shared/components/paginator/paginator.component';
import { ToastService } from '../../shared/components/toast/toast.component';

@Component({
  selector: 'app-admin-cockpit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, VndCurrencyPipe, ButtonDirective, PaginatorComponent],
  template: `
    <div class="admin-page max-w-[1440px] mx-auto px-4 py-8 space-y-7">
      <!-- Header & Tabs -->
      <div class="flex flex-col xl:flex-row xl:items-end justify-between gap-5 border-b border-border pb-5">
        <div>
        <div class="text-sm text-text-muted mb-1">Quản trị</div>
        <h1 class="font-heading text-2xl sm:text-3xl font-semibold text-text-primary">Quản lý xưởng</h1>
      </div>

      <nav class="flex flex-wrap gap-2" aria-label="Khu vực quản trị">
        <button
          type="button"
          (click)="setActiveTab('orders')"
          class="admin-tab"
          [class.admin-tab-active]="activeTab() === 'orders'"
        >
          Đơn hàng
        </button>
        <a routerLink="/admin/board" class="admin-tab">Bảng Kanban</a>
        <button
          type="button"
          (click)="setActiveTab('pricing')"
          class="admin-tab"
          [class.admin-tab-active]="activeTab() === 'pricing'"
        >
          Định giá
        </button>
        <button
          type="button"
          (click)="setActiveTab('products')"
          class="admin-tab"
          [class.admin-tab-active]="activeTab() === 'products'"
        >
          Sản phẩm <span class="tab-count">{{ productsTotalElements() }}</span>
        </button>
        <button
          type="button"
          (click)="setActiveTab('customers')"
          class="admin-tab"
          [class.admin-tab-active]="activeTab() === 'customers'"
        >
          Khách hàng
        </button>
      </nav>
      </div>

      <!-- TAB 1: ORDERS & WORKFLOW DRAWER -->
      @if (activeTab() === 'orders') {
      <section class="industrial-card overflow-hidden" aria-labelledby="order-overview-title">
        <div class="px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="order-overview-title" class="font-heading text-lg font-semibold text-text-primary">Tổng quan đơn hàng</h2>
            <p class="text-sm text-text-secondary mt-0.5">Số liệu hiện tại từ đơn hàng và thanh toán đã xác nhận.</p>
          </div>
          @if (summaryLoading()) {
            <span class="text-sm text-text-muted">Đang cập nhật…</span>
          } @else if (summaryError()) {
            <button type="button" (click)="refreshDashboard()" class="text-sm font-medium text-accent hover:underline">Thử tải lại</button>
          } @else {
            <span class="text-sm text-text-muted">Cập nhật {{ summaryUpdatedAt() | date:'HH:mm' }}</span>
          }
        </div>
        @if (summaryLoading()) {
          <div class="h-24 animate-pulse bg-surface-raised" aria-label="Đang tải tổng quan đơn hàng"></div>
        } @else if (summaryError()) {
          <p class="px-5 py-4 text-sm text-danger">{{ summaryError() }}</p>
        } @else {
          @if (summary(); as stats) {
            <dl class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 divide-x divide-y xl:divide-y-0 divide-border">
              <div class="px-5 py-4">
                <dt class="text-sm text-text-secondary">Chờ duyệt báo giá</dt>
                <dd class="mt-1 text-2xl font-semibold tabular-nums text-text-primary">{{ stats.pendingQuotesCount }}</dd>
              </div>
              <div class="px-5 py-4">
                <dt class="text-sm text-text-secondary">Chờ xác nhận cọc</dt>
                <dd class="mt-1 text-2xl font-semibold tabular-nums text-text-primary">{{ stats.awaitingDepositCount }}</dd>
              </div>
              <div class="px-5 py-4">
                <dt class="text-sm text-text-secondary">Đang sản xuất</dt>
                <dd class="mt-1 text-2xl font-semibold tabular-nums text-text-primary">{{ stats.inProductionCount }}</dd>
              </div>
              <div class="px-5 py-4">
                <dt class="text-sm text-text-secondary">Chờ hóa đơn VAT</dt>
                <dd class="mt-1 text-2xl font-semibold tabular-nums text-text-primary">{{ stats.vatPendingCount }}</dd>
              </div>
              <div class="px-5 py-4 col-span-2 md:col-span-1">
                <dt class="text-sm text-text-secondary">Doanh thu tháng này</dt>
                <dd class="mt-1 text-xl font-semibold tabular-nums text-text-primary">{{ stats.monthlyRevenue | vnd }}</dd>
              </div>
            </dl>
            @if (!stats.pendingQuotesCount && !stats.awaitingDepositCount && !stats.inProductionCount && !stats.vatPendingCount) {
              <p class="px-5 py-3 bg-surface-raised border-t border-border text-sm text-text-secondary">
                Hiện chưa có đơn hàng đang chờ xử lý.
              </p>
            }
          }
        }
      </section>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <!-- Orders Queue -->
          <div [class]="selectedOrder() ? 'lg:col-span-7' : 'lg:col-span-12'" class="industrial-card overflow-hidden">
            <div class="px-5 py-4 bg-surface-raised border-b border-border flex flex-wrap items-center gap-3">
              <select
                [(ngModel)]="statusFilter"
                (ngModelChange)="resetOrdersPage()"
                class="industrial-input min-w-48"
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
                (keyup.enter)="resetOrdersPage()"
                placeholder="Tìm mã đơn / tên khách..."
                class="industrial-input flex-1 min-w-[220px]"
              />
              <button
                type="button"
                (click)="resetOrdersPage()"
                appButton
                variant="secondary"
                size="sm"
              >
                Lọc
              </button>
            </div>

            @if (ordersLoading()) {
              <div class="h-52 animate-pulse bg-surface-raised" aria-label="Đang tải đơn hàng"></div>
            } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-sm text-left">
                <thead class="bg-surface border-b border-border text-text-secondary">
                <tr>
                  <th class="px-5 py-3 font-medium">Mã đơn</th>
                  <th class="px-4 py-3 font-medium">Khách hàng</th>
                  <th class="px-4 py-3 font-medium">Trạng thái</th>
                  <th class="px-4 py-3 text-right font-medium">Tổng tiền</th>
                  <th class="px-5 py-3 text-right font-medium">Thao tác</th>
                </tr>
                </thead>
                <tbody class="divide-y divide-border">
                  @for (ord of orders(); track ord.id) {
                    <tr
                      class="hover:bg-surface-raised cursor-pointer transition-colors"
                      [class]="selectedOrder()?.id === ord.id ? 'bg-surface-raised' : ''"
                      (click)="openOrder(ord.id)"
                    >
                      <td class="px-5 py-4 font-sans tabular-nums font-semibold text-text-primary">
                        {{ ord.orderCode }}
                        @if (ord.requiresVatInvoice) {
                          <span class="ml-2 px-2 py-0.5 text-xs border border-danger/50 text-danger rounded-full">VAT</span>
                        }
                      </td>
                      <td class="px-4 py-4 text-text-primary">{{ ord.recipientName }}</td>
                      <td class="px-4 py-4 text-text-secondary">{{ orderStatusLabel(ord.status) }}</td>
                      <td class="px-4 py-4 text-right font-sans tabular-nums font-medium text-text-primary">{{ ord.totalAmount | vnd }}</td>
                      <td class="px-5 py-4 text-right">
                        <button type="button" class="font-medium text-accent hover:underline">Xử lý</button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            @if (!ordersLoading() && !orders().length) {
              <div class="p-8 text-center text-xs text-text-secondary">Không tìm thấy đơn hàng phù hợp.</div>
            }
            <app-paginator
              [page]="ordersPage()"
              [totalPages]="ordersTotalPages()"
              (pageChange)="goToOrdersPage($event)"
            />
            }
          </div>

          <!-- Right Detail Inspector Drawer -->
          @if (selectedOrder(); as ord) {
            <div class="lg:col-span-5 industrial-card border-steel p-6 pb-20 space-y-6 text-sm">
              <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-mono font-bold text-base text-text-primary">{{ ord.orderCode }}</span>
                  <span class="px-2.5 py-1 rounded-full border border-accent/70 text-accent font-sans text-xs font-semibold">
                    {{ ord.status }}
                  </span>
                </div>
                <button type="button" (click)="selectedOrder.set(null)" appButton variant="ghost" size="xs">
                  ✕ Đóng
                </button>
              </div>

              <!-- Customer & Shipping Info -->
              <div class="bg-surface-raised border border-border rounded-[10px] p-4 space-y-2 text-sm text-text-secondary">
                <div><strong class="text-text-primary">Khách nhận:</strong> {{ ord.recipientName }} · <span class="font-sans tabular-nums text-text-primary">{{ ord.recipientPhone }}</span></div>
                <div><strong class="text-text-primary">Địa chỉ:</strong> {{ ord.shippingAddress }}</div>
                @if (ord.customerNote) {
                  <div class="text-accent"><strong>Ghi chú khách:</strong> {{ ord.customerNote }}</div>
                }
              </div>

              @if (ord.status === 'QUOTE_APPROVED') {
                <div class="rounded-[10px] border border-accent/40 bg-accent/5 p-4 space-y-1.5">
                  <div class="font-heading text-xs font-bold tracking-wider uppercase text-accent">Bước tiếp theo · Xưởng làm mẫu thực tế</div>
                  <p class="text-sm text-text-secondary">
                    Tải ảnh mẫu cho từng hạng mục bên dưới. Sau khi gửi ảnh, khách hàng sẽ có thể duyệt mẫu và đặt cọc.
                  </p>
                </div>
              } @else if (ord.status === 'PROTOTYPING') {
                <div class="rounded-[10px] border border-steel/40 bg-steel/5 p-4 space-y-1.5">
                  <div class="font-heading text-xs font-bold tracking-wider uppercase text-steel">Đang chờ khách duyệt mẫu</div>
                  <p class="text-sm text-text-secondary">
                    Ảnh mẫu đã được gửi cho khách. Khách hàng cần xác nhận duyệt mẫu trước khi có thể thanh toán đặt cọc.
                  </p>
                </div>
              }

              <!-- Items + Quote Price Override + Prototype Upload -->
              <div class="mt-6 border-t border-border pt-5 space-y-3">
                <div class="font-heading text-xs font-bold tracking-wider uppercase text-text-secondary">Hạng mục & Ảnh mẫu thực tế</div>
                @for (item of ord.items; track item.id) {
                  <div class="border border-border rounded-[10px] p-4 space-y-3 bg-surface-raised">
                    <div class="flex flex-col items-start gap-2.5">
                      <span class="min-w-0 text-sm leading-5 font-semibold text-text-primary break-words">
                        {{ item.itemName }} <span class="font-sans tabular-nums font-semibold text-text-secondary">(×{{ item.quantity }})</span>
                      </span>
                      <span class="shrink-0 self-start rounded-md border border-success/30 bg-success/10 px-3 py-1.5 font-sans tabular-nums text-sm font-semibold text-success">
                        {{ item.lineTotal | vnd }}
                      </span>
                    </div>
                    @if (item.widthMm) {
                      <div class="font-sans tabular-nums text-sm text-text-secondary">
                        {{ item.materialNameSnapshot }} · {{ item.processingNameSnapshot }} · {{ item.widthMm }}×{{ item.heightMm }}×{{ item.thicknessMm }}mm
                      </div>
                    }
                    <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
                      @if (item.designFileUrl) {
                        <a [href]="item.designFileUrl" target="_blank" class="text-sm font-medium text-steel hover:text-steel-hover underline">
                          Tải bản vẽ khách ↗
                        </a>
                      }
                      @if (item.prototypeImageUrl) {
                        <a [href]="item.prototypeImageUrl" target="_blank" class="text-sm font-medium text-success underline">
                          Ảnh mẫu đã gửi ✓
                        </a>
                      }
                    </div>

                    @if (ord.status === 'QUOTE_APPROVED' || ord.status === 'PROTOTYPING') {
                      <!-- Upload physical prototype photo -->
                      <div class="border-t border-border pt-3">
                        <label class="inline-flex cursor-pointer items-center px-4 py-2.5 bg-accent text-bg hover:bg-accent-hover rounded-[6px] text-sm font-semibold transition-colors">
                          {{ item.prototypeImageUrl ? 'Cập nhật ảnh mẫu thực tế' : '＋ Tải ảnh mẫu để gửi khách duyệt' }}
                          <input
                            type="file"
                            class="hidden"
                            accept="image/*"
                            (change)="uploadPrototype(ord.id, item.id, $event)"
                          />
                        </label>
                      </div>
                    }
                  </div>
                }

              </div>

              <!-- Approve Quote Action + Per-Item Unit Price Override -->
              @if (ord.status === 'QUOTE_PENDING') {
                <div class="mt-6 border-t border-border pt-5 space-y-3">
                  <div class="font-heading text-xs font-bold tracking-wider uppercase text-text-secondary">Điều chỉnh đơn giá & Duyệt báo giá</div>
                  <div class="space-y-3">
                    @for (item of ord.items; track item.id) {
                      <div class="space-y-3 bg-surface-raised border border-border rounded-[10px] p-4">
                        <div class="text-sm leading-5 font-medium text-text-primary break-words">{{ item.itemName }}</div>
                        <div class="flex items-center gap-3">
                          <input
                            type="number"
                            [(ngModel)]="itemPriceOverrides[item.id]"
                            min="0"
                            step="1000"
                            aria-label="Đơn giá chốt mỗi sản phẩm"
                            class="industrial-input min-w-[140px] w-40 px-3.5 py-2.5 pr-8 font-sans tabular-nums text-base font-semibold text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                          <span class="shrink-0 text-sm font-medium text-text-secondary">đ / cái</span>
                        </div>
                      </div>
                    }
                  </div>
                  <div class="grid grid-cols-1 gap-3">
                    <input
                      type="date"
                      [(ngModel)]="estimatedCompletionDate"
                      aria-label="Ngày hoàn thành dự kiến"
                      class="industrial-input w-full px-3.5 py-2.5 text-sm"
                    />
                    <button
                      type="button"
                      (click)="approveQuote(ord.id)"
                      appButton
                      variant="primary"
                      size="sm"
                      class="w-full"
                    >
                      Duyệt Báo Giá
                    </button>
                  </div>
                </div>
              }

              <!-- Verify Pending Payments -->
              @if (ord.paymentTransactions.length > 0) {
                <div class="mt-6 border-t border-border pt-5 space-y-3">
                  <div class="font-heading text-xs font-bold tracking-wider uppercase text-text-secondary">Giao dịch thanh toán ({{ ord.paymentTransactions.length }})</div>
                  @for (tx of ord.paymentTransactions; track tx.id) {
                    <div class="border border-border rounded-[10px] p-4 flex flex-col gap-3 bg-surface-raised">
                      <div class="min-w-0 space-y-1">
                        <div class="font-sans tabular-nums font-semibold text-sm text-text-primary">{{ tx.paymentPhase }} · {{ tx.amount | vnd }}</div>
                        <div class="text-sm text-text-secondary break-words">{{ tx.paymentMethod }} · Ref: {{ tx.transactionRef || '—' }}</div>
                        @if (tx.proofImageUrl) {
                          <a [href]="tx.proofImageUrl" target="_blank" class="inline-block text-sm text-steel hover:text-steel-hover underline">Xem biên lai ↗</a>
                        }
                      </div>
                      @if (tx.status === 'PENDING' && canVerifyPayment(ord, tx)) {
                        <div class="flex flex-wrap gap-2">
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
                        @if (tx.status === 'PENDING') {
                          <span class="text-xs font-medium text-text-muted">
                            Chưa đến bước thanh toán — chưa thể duyệt giao dịch
                          </span>
                        } @else {
                          <span class="font-sans tabular-nums font-semibold text-sm" [class]="tx.status === 'VERIFIED' ? 'text-success' : 'text-danger'">
                            {{ tx.status }}
                          </span>
                        }
                      }
                    </div>
                  }
                </div>
              }

              @if (ord.status === 'IN_PRODUCTION' || ord.status === 'READY_FOR_DELIVERY') {
                <div class="mt-6 border-t border-border pt-5 space-y-3">
                  <div class="font-heading text-xs font-bold tracking-wider uppercase text-text-secondary">Bước tiếp theo</div>
                  <input
                    type="text"
                    [(ngModel)]="workerNote"
                    placeholder="Ghi chú sản xuất (không bắt buộc)"
                    class="industrial-input w-full px-3.5 py-2.5 text-sm"
                  />
                  @if (ord.status === 'IN_PRODUCTION') {
                    <button
                      type="button"
                      (click)="changeOrderStatus(ord.id, 'READY_FOR_DELIVERY')"
                      appButton
                      variant="primary"
                      size="sm"
                      class="w-full"
                    >
                      Hoàn tất sản xuất · Chuyển sang chờ giao
                    </button>
                  } @else if (ord.paidAmount >= ord.totalAmount) {
                    <button
                      type="button"
                      (click)="changeOrderStatus(ord.id, 'COMPLETED')"
                      appButton
                      variant="primary"
                      size="sm"
                      class="w-full"
                    >
                      Xác nhận đã giao hàng · Hoàn tất đơn
                    </button>
                  } @else {
                    <div class="rounded-[6px] border border-warning/40 bg-warning/10 p-3 text-sm text-text-secondary">
                      Chờ khách thanh toán số dư còn lại {{ (ord.totalAmount - ord.paidAmount) | vnd }} trước khi hoàn tất đơn.
                    </div>
                  }
                </div>
              }

              <!-- Red VAT Invoice Number Input -->
              @if (ord.requiresVatInvoice) {
                <div class="mt-6 border-t border-border pt-5 space-y-3">
                  <div class="font-heading text-xs font-bold tracking-wider uppercase text-danger">Số hóa đơn VAT đỏ ({{ ord.vatTaxCode }} - {{ ord.vatCompanyName }})</div>
                  <div class="grid grid-cols-1 gap-3">
                    <input
                      type="text"
                      [(ngModel)]="vatInvoiceNumberInput"
                      placeholder="Nhập số HĐĐT (VD: 0000142)"
                      class="industrial-input w-full px-3.5 py-2.5 text-sm font-sans tabular-nums"
                    />
                    <button
                      type="button"
                      (click)="saveVatNumber(ord.id)"
                      appButton
                      variant="primary"
                      size="sm"
                      class="w-full"
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
        <section class="industrial-card overflow-hidden" aria-labelledby="pricing-title">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 sm:px-7 py-5 border-b border-border">
            <div>
              <h2 id="pricing-title" class="font-heading text-xl sm:text-2xl font-semibold text-text-primary">Định giá</h2>
              <p class="mt-1 text-sm text-text-secondary">Điều chỉnh các tham số dùng để tính báo giá mới.</p>
            </div>
            <button
              type="button"
              (click)="savePricingRules()"
              [disabled]="pricingLoading() || pricingSaving() || !pricingRules().length"
              appButton
              variant="primary"
              size="md"
            >
              {{ pricingSaving() ? 'Đang lưu…' : 'Lưu thay đổi' }}
            </button>
          </div>

          @if (pricingLoading()) {
            <div class="p-6 space-y-4" aria-label="Đang tải tham số định giá">
              <div class="h-14 animate-pulse rounded bg-surface-raised"></div>
              <div class="h-14 animate-pulse rounded bg-surface-raised"></div>
              <div class="h-14 animate-pulse rounded bg-surface-raised"></div>
            </div>
          } @else if (pricingError()) {
            <div class="px-5 sm:px-7 py-6 flex items-center justify-between gap-4">
              <p class="text-sm text-danger">{{ pricingError() }}</p>
              <button type="button" (click)="loadPricingRules()" class="text-sm font-medium text-accent hover:underline">Thử lại</button>
            </div>
          } @else if (pricingRules().length) {
            <div class="divide-y divide-border">
              @for (rule of pricingRules(); track rule.ruleKey) {
                <div class="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px] gap-3 md:gap-8 items-center px-5 sm:px-7 py-4">
                  <div>
                    <label [for]="'pricing-' + rule.ruleKey" class="block text-base font-medium text-text-primary">
                      {{ pricingRuleLabel(rule.ruleKey) }}
                    </label>
                    @if (rule.description) {
                      <p class="mt-1 text-sm text-text-secondary">{{ rule.description }}</p>
                    }
                  </div>
                  <div class="flex min-w-0 items-center gap-3">
                    <input
                      [id]="'pricing-' + rule.ruleKey"
                      type="number"
                      [(ngModel)]="rule.ruleValue"
                      [name]="rule.ruleKey"
                      step="0.01"
                      min="0"
                      class="industrial-input pricing-value-input min-w-0 flex-1 text-left font-sans tabular-nums"
                    />
                    @if (pricingRuleUnit(rule.ruleKey)) {
                      <span class="w-16 shrink-0 text-sm text-text-secondary">
                        {{ pricingRuleUnit(rule.ruleKey) }}
                      </span>
                    }
                  </div>
                </div>
              }
            </div>
            <div class="px-5 sm:px-7 py-4 bg-surface text-sm text-text-secondary">
              Thay đổi chỉ áp dụng cho báo giá được tạo sau khi lưu.
            </div>
          } @else {
            <p class="px-5 sm:px-7 py-8 text-center text-sm text-text-secondary">Chưa có tham số định giá.</p>
          }
        </section>
      }

      <!-- TAB 3: CATALOG PRODUCTS -->
      @if (activeTab() === 'products') {
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="font-heading text-xl font-semibold text-text-primary">
            Sản phẩm <span class="text-base font-normal text-text-secondary">({{ productsTotalElements() }})</span>
            </h2>
            <button
              type="button"
              (click)="startNewProduct()"
              appButton
              variant="primary"
              size="sm"
            >
              {{ showCreateProduct() ? 'Đóng biểu mẫu' : '+ Thêm sản phẩm mới' }}
            </button>
          </div>

          @if (showCreateProduct()) {
            <form (ngSubmit)="createProduct()" class="industrial-card p-5 sm:p-7 space-y-7">
              <div class="border-b border-border pb-4">
                <h3 class="font-heading text-xl font-semibold text-text-primary">
                  {{ editingProductId() ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm' }}
                </h3>
                <p class="mt-1 text-sm text-text-secondary">Thông tin có dấu * là bắt buộc.</p>
              </div>

              <section class="space-y-4">
                <h4 class="text-base font-semibold text-text-primary">Thông tin cơ bản</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  <label class="admin-field">
                    <span>Mã SKU *</span>
                    <input type="text" [(ngModel)]="newProd.sku" name="sku" required placeholder="VD: NVX-2001" class="industrial-input w-full font-sans tabular-nums" />
                  </label>
                  <label class="admin-field md:col-span-2">
                    <span>Tên sản phẩm *</span>
                    <input type="text" [(ngModel)]="newProd.name" name="name" required placeholder="VD: Tem inox 304 khắc laser" class="industrial-input w-full" />
                  </label>
                  <label class="admin-field md:col-span-2 xl:col-span-1">
                    <span>Đường dẫn sản phẩm *</span>
                    <input type="text" [(ngModel)]="newProd.slug" name="slug" required placeholder="tem-inox-304-khac-laser" class="industrial-input w-full font-sans" />
                  </label>
                  <label class="admin-field">
                    <span>Danh mục *</span>
                    <select [(ngModel)]="newProd.categoryId" name="categoryId" required class="industrial-input w-full">
                      @for (c of adminCategories(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
                    </select>
                  </label>
                  <label class="admin-field">
                    <span>Vật liệu</span>
                    <select [(ngModel)]="newProd.materialId" name="materialId" class="industrial-input w-full">
                      <option value="">Chọn vật liệu</option>
                      @for (m of adminMaterials(); track m.id) { <option [value]="m.id">{{ m.name }}</option> }
                    </select>
                  </label>
                  <label class="admin-field">
                    <span>Loại sản phẩm *</span>
                    <select [(ngModel)]="newProd.productType" name="productType" class="industrial-input w-full">
                      <option value="STANDARD_ITEM">Hàng có sẵn</option>
                      <option value="CUSTOM_TEMPLATE">Gia công theo yêu cầu</option>
                    </select>
                  </label>
                </div>
              </section>

              @if (newProd.productType === 'STANDARD_ITEM') {
                <section class="space-y-4 border-t border-border pt-5">
                  <div>
                    <h4 class="text-base font-semibold text-text-primary">Giá bán và tồn kho</h4>
                    <p class="mt-1 text-sm text-text-secondary">Áp dụng cho sản phẩm bán sẵn.</p>
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                    <label class="admin-field">
                      <span>Đơn giá (VNĐ)</span>
                      <input type="number" [(ngModel)]="newProd.basePrice" name="basePrice" min="0" class="industrial-input w-full font-sans tabular-nums" />
                    </label>
                    <label class="admin-field">
                      <span>Số lượng tồn kho</span>
                      <input type="number" [(ngModel)]="newProd.stockQuantity" name="stockQuantity" min="0" class="industrial-input w-full font-sans tabular-nums" />
                    </label>
                  </div>
                </section>
              } @else {
                <section class="space-y-4 border-t border-border pt-5">
                  <div>
                    <h4 class="text-base font-semibold text-text-primary">Thông số gia công</h4>
                    <p class="mt-1 text-sm text-text-secondary">Kích thước mặc định được dùng làm gợi ý cho báo giá.</p>
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <label class="admin-field">
                      <span>Phương pháp gia công</span>
                      <select [(ngModel)]="newProd.processingMethodId" name="processingMethodId" class="industrial-input w-full">
                        <option value="">Chọn phương pháp</option>
                        @for (method of adminProcessingMethods(); track method.id) { <option [value]="method.id">{{ method.name }}</option> }
                      </select>
                    </label>
                    <label class="admin-field">
                      <span>Chiều rộng (mm)</span>
                      <input type="number" [(ngModel)]="newProd.defaultWidthMm" name="defaultWidthMm" min="0" step="0.1" class="industrial-input w-full font-sans tabular-nums" />
                    </label>
                    <label class="admin-field">
                      <span>Chiều cao (mm)</span>
                      <input type="number" [(ngModel)]="newProd.defaultHeightMm" name="defaultHeightMm" min="0" step="0.1" class="industrial-input w-full font-sans tabular-nums" />
                    </label>
                    <label class="admin-field">
                      <span>Độ dày (mm)</span>
                      <input type="number" [(ngModel)]="newProd.defaultThicknessMm" name="defaultThicknessMm" min="0" step="0.1" class="industrial-input w-full font-sans tabular-nums" />
                    </label>
                  </div>
                </section>
              }

              <section class="space-y-4 border-t border-border pt-5">
                <h4 class="text-base font-semibold text-text-primary">Mô tả và hình ảnh</h4>
                <label class="admin-field">
                  <span>Mô tả sản phẩm</span>
                  <textarea [(ngModel)]="newProd.description" name="description" rows="4" placeholder="Mô tả chất liệu, cách gia công hoặc đặc điểm sản phẩm..." class="industrial-input w-full"></textarea>
                </label>
                <div class="space-y-3">
                  <div>
                    <label for="product-images" class="block text-sm font-medium text-text-primary">Ảnh sản phẩm</label>
                    <p class="mt-1 text-sm text-text-secondary">Ảnh đầu tiên sẽ được dùng làm ảnh đại diện. Có thể đổi thứ tự sau khi tải lên.</p>
                  </div>
                  <input id="product-images" type="file" accept="image/*" multiple (change)="uploadProductImages($event)" class="admin-file-input block w-full" />
                  @if (newProd.images.length) {
                    <div class="flex flex-wrap gap-4">
                      @for (image of newProd.images; track image; let idx = $index) {
                        <div class="w-36 overflow-hidden rounded-lg border border-border bg-bg">
                          <img [src]="image" [alt]="'Ảnh sản phẩm ' + (idx + 1)" class="w-full h-32 object-cover" />
                          <div class="flex items-center justify-between gap-1 border-t border-border px-2 py-1.5 text-xs">
                            <span class="truncate text-text-secondary">{{ idx === 0 ? 'Ảnh đại diện' : 'Ảnh ' + (idx + 1) }}</span>
                            <div class="flex shrink-0 gap-1">
                              <button type="button" (click)="moveProductImage(idx, -1)" [disabled]="idx === 0" class="image-action" [attr.aria-label]="'Đưa ảnh ' + (idx + 1) + ' lên trước'">←</button>
                              <button type="button" (click)="removeProductImage(idx)" class="image-action image-action-remove" [attr.aria-label]="'Xóa ảnh ' + (idx + 1)">×</button>
                              <button type="button" (click)="moveProductImage(idx, 1)" [disabled]="idx === newProd.images.length - 1" class="image-action" [attr.aria-label]="'Đưa ảnh ' + (idx + 1) + ' xuống sau'">→</button>
                            </div>
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              </section>

              <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 border-t border-border pt-5">
                <button type="button" (click)="cancelProductEdit()" appButton variant="secondary" size="md">Hủy</button>
                <button type="submit" [disabled]="productSaving()" appButton variant="primary" size="md">{{ productSaving() ? 'Đang lưu...' : 'Lưu sản phẩm' }}</button>
              </div>
            </form>
          }

          <div class="industrial-card overflow-hidden">
            <div class="p-3 bg-surface-raised border-b border-border flex flex-wrap gap-2">
              <input [(ngModel)]="productSearch" (keyup.enter)="resetProductsPage()" placeholder="Tìm tên / SKU" class="industrial-input px-2.5 py-1.5 text-xs flex-1 min-w-[160px]" />
              <select [(ngModel)]="productCategoryFilter" (ngModelChange)="resetProductsPage()" class="industrial-input px-2.5 py-1.5 text-xs">
                <option value="">Tất cả danh mục</option>
                @for (c of adminCategories(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
              </select>
              <select [(ngModel)]="productTypeFilter" (ngModelChange)="resetProductsPage()" class="industrial-input px-2.5 py-1.5 text-xs">
                <option value="">Tất cả loại</option>
                <option value="STANDARD_ITEM">Hàng có sẵn</option>
                <option value="CUSTOM_TEMPLATE">Gia công theo yêu cầu</option>
              </select>
              <button type="button" (click)="resetProductsPage()" appButton variant="secondary" size="xs">Tìm</button>
            </div>
            @if (productsLoading()) {
              <div class="h-52 animate-pulse bg-surface-raised" aria-label="Đang tải sản phẩm"></div>
            } @else {
            <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
              <thead class="bg-surface border-b border-border text-text-secondary">
              <tr>
                <th class="px-4 py-3 font-medium">Ảnh</th>
                <th class="px-4 py-3 font-medium">SKU</th>
                <th class="px-4 py-3 font-medium">Tên sản phẩm</th>
                <th class="px-4 py-3 font-medium">Danh mục</th>
                <th class="px-4 py-3 font-medium">Loại</th>
                <th class="px-4 py-3 text-right font-medium">Đơn giá / Tồn kho</th>
                <th class="px-4 py-3 text-center font-medium">Hiển thị</th>
                <th class="px-5 py-3 text-right font-medium">Thao tác</th>
              </tr>
              </thead>
              <tbody class="divide-y divide-border">
                @for (p of adminProducts(); track p.id) {
                  <tr class="hover:bg-surface-raised transition-colors">
                    <td class="px-4 py-3">
                      @if (p.imageUrl || p.images?.[0]) {
                        <img [src]="p.imageUrl || p.images?.[0]" [alt]="p.name" class="w-12 h-12 object-cover rounded-[6px] border border-border" />
                      } @else {
                        <span class="w-12 h-12 flex items-center justify-center rounded-[6px] border border-border text-[9px] text-text-muted">Chưa có ảnh</span>
                      }
                    </td>
                    <td class="px-4 py-4 font-sans tabular-nums font-medium text-text-primary">{{ p.sku }}</td>
                    <td class="px-4 py-4 font-medium text-text-primary">{{ p.name }}</td>
                    <td class="px-4 py-4 text-text-secondary">{{ p.categoryName }}</td>
                    <td class="px-4 py-4 text-text-secondary">{{ p.productType === 'STANDARD_ITEM' ? 'Hàng có sẵn' : 'Gia công theo yêu cầu' }}</td>
                    <td class="px-4 py-4 text-right font-sans tabular-nums text-text-primary">
                      {{ p.productType === 'STANDARD_ITEM' ? (p.basePrice | vnd) + ' · Kho: ' + (p.stockQuantity ?? 0) : 'Báo giá 3D' }}
                    </td>
                    <td class="px-4 py-4 text-center">
                      <input type="checkbox" [checked]="p.isActive" (change)="toggleProductActive(p)" [attr.aria-label]="'Hiển thị ' + p.name" />
                    </td>
                    <td class="px-5 py-4 text-right whitespace-nowrap">
                      <button type="button" (click)="editProduct(p)" class="text-accent hover:underline mr-4">Sửa</button>
                      <button type="button" (click)="removeProduct(p.id)" class="text-danger hover:underline">Xóa</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            </div>
            @if (!adminProducts().length) {
              <div class="p-8 text-center text-xs text-text-secondary">Không tìm thấy sản phẩm.</div>
            }
            <app-paginator
              [page]="productsPage()"
              [totalPages]="productsTotalPages()"
              (pageChange)="goToProductsPage($event)"
            />
            }
          </div>
        </div>
      }

      @if (activeTab() === 'customers') {
        <section class="industrial-card overflow-hidden">
          <div class="px-5 py-4 bg-surface border-b border-border">
            <h2 class="font-heading text-xl font-semibold text-text-primary">Khách hàng</h2>
            <p class="mt-1 text-sm text-text-secondary">Tra cứu thông tin khách hàng đã đăng ký.</p>
          </div>
          <div class="px-5 py-4 bg-surface-raised border-b border-border flex flex-wrap gap-3">
            <input [(ngModel)]="customerSearch" (keyup.enter)="resetCustomersPage()" placeholder="Tìm tên, email, số điện thoại" class="industrial-input px-2.5 py-1.5 text-xs flex-1 min-w-[180px]" />
            <button type="button" (click)="resetCustomersPage()" appButton variant="secondary" size="xs">Tìm khách hàng</button>
          </div>
          @if (customersLoading()) {
            <div class="h-52 animate-pulse bg-surface-raised" aria-label="Đang tải khách hàng"></div>
          } @else if (customers().length) {
            <div class="overflow-x-auto">
              <table class="w-full text-sm text-left">
                <thead class="bg-bg border-b border-border text-text-secondary">
                  <tr>
                    <th class="px-5 py-3 font-medium">Khách hàng</th>
                    <th class="px-4 py-3 font-medium">Email</th>
                    <th class="px-4 py-3 font-medium">Điện thoại</th>
                    <th class="px-4 py-3 font-medium">Địa chỉ mặc định</th>
                    <th class="px-5 py-3 font-medium">Ngày tạo</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border">
                  @for (customer of customers(); track customer.id) {
                    <tr>
                      <td class="px-5 py-4 font-medium text-text-primary">{{ customer.fullName }}</td>
                      <td class="px-4 py-4 text-text-secondary">{{ customer.email }}</td>
                      <td class="px-4 py-4 font-sans tabular-nums text-text-secondary">{{ customer.phone || '—' }}</td>
                      <td class="px-4 py-4 text-text-secondary">{{ customer.defaultAddress || '—' }}</td>
                      <td class="px-5 py-4 font-sans tabular-nums text-text-secondary">{{ customer.createdAt | date:'dd/MM/yyyy' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <div class="p-8 text-center text-xs text-text-secondary">Không tìm thấy khách hàng.</div>
          }
          <app-paginator [page]="customersPage()" [totalPages]="customersTotalPages()" (pageChange)="goToCustomersPage($event)" />
        </section>
      }

      @if (deleteProductId()) {
        <div class="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" role="presentation">
          <section class="industrial-card w-full max-w-md space-y-4 p-5" role="dialog" aria-modal="true" aria-labelledby="delete-product-title">
            <h2 id="delete-product-title" class="font-heading text-base font-bold text-text-primary">Xóa sản phẩm?</h2>
            <p class="text-sm text-text-secondary">Thao tác này sẽ xóa sản phẩm khỏi danh mục.</p>
            <div class="flex justify-end gap-2">
              <button type="button" (click)="deleteProductId.set(null)" appButton variant="secondary" size="sm">Hủy</button>
              <button type="button" (click)="confirmRemoveProduct()" [disabled]="productSaving()" appButton variant="danger" size="sm">
                {{ productSaving() ? 'Đang xóa...' : 'Xóa sản phẩm' }}
              </button>
            </div>
          </section>
        </div>
      }
    </div>
  `,
})
export class AdminCockpitComponent implements OnInit {
  private readonly adminApi = inject(AdminApiService);
  private readonly quoteApi = inject(QuoteApiService);
  private readonly toastService = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  readonly activeTab = signal<'orders' | 'pricing' | 'products' | 'customers'>('orders');
  readonly summary = signal<AdminDashboardSummary | null>(null);
  readonly summaryLoading = signal(true);
  readonly summaryError = signal('');
  readonly summaryUpdatedAt = signal<Date | null>(null);
  readonly orders = signal<OrderSummary[]>([]);
  readonly selectedOrder = signal<OrderDetail | null>(null);
  readonly pricingRules = signal<PricingRule[]>([]);
  readonly pricingLoading = signal(true);
  readonly pricingError = signal('');
  readonly pricingSaving = signal(false);
  readonly adminProducts = signal<Product[]>([]);
  readonly adminCategories = signal<Category[]>([]);
  readonly adminMaterials = signal<Material[]>([]);
  readonly adminProcessingMethods = signal<ProcessingMethod[]>([]);
  readonly customers = signal<AdminCustomer[]>([]);
  readonly showCreateProduct = signal(false);
  readonly editingProductId = signal<string | null>(null);
  readonly ordersPage = signal(0);
  readonly ordersTotalPages = signal(0);
  readonly ordersLoading = signal(true);
  readonly productsPage = signal(0);
  readonly productsTotalPages = signal(0);
  readonly productsTotalElements = signal(0);
  readonly productsLoading = signal(true);
  readonly customersPage = signal(0);
  readonly customersTotalPages = signal(0);
  readonly customersLoading = signal(false);
  readonly deleteProductId = signal<string | null>(null);
  readonly productSaving = signal(false);

  statusFilter: OrderStatus | '' = '';
  searchFilter = '';
  productSearch = '';
  productCategoryFilter = '';
  productTypeFilter: ProductType | '' = '';
  customerSearch = '';
  estimatedCompletionDate = '';
  workerNote = '';
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
    defaultWidthMm: 80,
    defaultHeightMm: 40,
    defaultThicknessMm: 0.8,
    processingMethodId: '',
    description: '',
    images: [] as string[],
    isActive: true,
  };

  ngOnInit(): void {
    this.refreshDashboard();
    this.loadOrders();
    const deepLinkedOrder = this.route.snapshot.queryParamMap.get('order');
    if (deepLinkedOrder) this.openOrder(deepLinkedOrder); // coming from the Kanban board
    this.loadPricingRules();
    this.fetchAdminProducts();
    this.adminApi.getAdminCategories().subscribe({
      next: (res) => {
        if (res.success && res.data?.length) {
          const categories = this.flattenCategories(res.data);
          this.adminCategories.set(categories);
          this.newProd.categoryId = categories[0].id;
        }
      },
      error: (err) => this.notifyError(err?.error?.message || 'Không thể tải danh mục sản phẩm.'),
    });
    this.adminApi.getAdminMaterials().subscribe({
      next: (res) => {
        if (res.success && res.data?.length) {
          this.adminMaterials.set(res.data);
          this.newProd.materialId = res.data[0].id;
        }
      },
      error: (err) => this.notifyError(err?.error?.message || 'Không thể tải danh sách vật liệu.'),
    });
    this.adminApi.getAdminProcessingMethods().subscribe({
      next: (res) => {
        if (res.success) this.adminProcessingMethods.set(res.data || []);
      },
      error: (err) => this.notifyError(err?.error?.message || 'Không thể tải phương pháp gia công.'),
    });
  }

  loadPricingRules(): void {
    this.pricingLoading.set(true);
    this.pricingError.set('');
    this.adminApi.getPricingRules().subscribe({
      next: (res) => {
        this.pricingLoading.set(false);
        if (res.success) {
          this.pricingRules.set((res.data || []).map((rule) => ({
            ...rule,
            ruleValue: rule.ruleKey.endsWith('_RATE') ? rule.ruleValue * 100 : rule.ruleValue,
          })));
        } else {
          this.pricingError.set(res.message || 'Không thể tải quy tắc giá.');
        }
      },
      error: (err) => {
        this.pricingLoading.set(false);
        this.pricingError.set(err?.error?.message || 'Không thể tải quy tắc giá.');
      },
    });
  }

  refreshDashboard(): void {
    this.summaryLoading.set(true);
    this.summaryError.set('');
    this.adminApi.getDashboardSummary().subscribe({
      next: (res) => {
        this.summaryLoading.set(false);
        if (res.success && res.data) {
          this.summary.set(res.data);
          this.summaryUpdatedAt.set(new Date());
        } else {
          this.summaryError.set(res.message || 'Không thể tải tổng quan đơn hàng.');
        }
      },
      error: (err) => {
        this.summaryLoading.set(false);
        this.summaryError.set(err?.error?.message || 'Không thể tải tổng quan đơn hàng.');
      },
    });
  }

  setActiveTab(tab: 'orders' | 'pricing' | 'products' | 'customers'): void {
    this.activeTab.set(tab);
    if (tab === 'orders') this.refreshDashboard();
    if (tab === 'customers') this.loadCustomers();
  }

  loadOrders(): void {
    this.ordersLoading.set(true);
    this.adminApi
      .getOrders({
        status: this.statusFilter || undefined,
        search: this.searchFilter || undefined,
        page: this.ordersPage(),
        size: 20,
      })
      .subscribe({
        next: (res) => {
          this.ordersLoading.set(false);
          if (res.success && res.data) {
            this.orders.set(res.data.content || []);
            this.ordersTotalPages.set(res.data.totalPages || 0);
          } else {
            this.notifyError(res.message || 'Không thể tải danh sách đơn hàng.');
          }
        },
        error: (err) => {
          this.ordersLoading.set(false);
          this.notifyError(err?.error?.message || 'Không thể tải danh sách đơn hàng.');
        },
      });
  }

  resetOrdersPage(): void {
    this.ordersPage.set(0);
    this.loadOrders();
  }

  goToOrdersPage(page: number): void {
    this.ordersPage.set(page);
    this.loadOrders();
  }

  private fetchAdminProducts(): void {
    this.productsLoading.set(true);
    this.adminApi.getAdminProducts(this.productsPage(), 20, {
      search: this.productSearch,
      categoryId: this.productCategoryFilter,
      productType: this.productTypeFilter,
    }).subscribe({
      next: (res) => {
        this.productsLoading.set(false);
        if (res.success && res.data) {
          this.adminProducts.set(res.data.content || []);
          this.productsTotalPages.set(res.data.totalPages || 0);
          this.productsTotalElements.set(res.data.totalElements || 0);
        } else {
          this.notifyError(res.message || 'Không thể tải danh sách sản phẩm.');
        }
      },
      error: (err) => {
        this.productsLoading.set(false);
        this.notifyError(err?.error?.message || 'Không thể tải danh sách sản phẩm.');
      },
    });
  }

  resetProductsPage(): void {
    this.productsPage.set(0);
    this.fetchAdminProducts();
  }

  goToProductsPage(page: number): void {
    this.productsPage.set(page);
    this.fetchAdminProducts();
  }

  private flattenCategories(categories: Category[], depth = 0): Category[] {
    return categories.flatMap((category) => [
      { ...category, name: '— '.repeat(depth) + category.name, children: undefined },
      ...this.flattenCategories(category.children || [], depth + 1),
    ]);
  }

  loadCustomers(): void {
    this.customersLoading.set(true);
    this.adminApi.getCustomers(this.customerSearch, this.customersPage(), 20).subscribe({
      next: (res) => {
        this.customersLoading.set(false);
        if (res.success && res.data) {
          this.customers.set(res.data.content || []);
          this.customersTotalPages.set(res.data.totalPages || 0);
        } else {
          this.notifyError(res.message || 'Không thể tải danh sách khách hàng.');
        }
      },
      error: (err) => {
        this.customersLoading.set(false);
        this.notifyError(err?.error?.message || 'Không thể tải danh sách khách hàng.');
      },
    });
  }

  resetCustomersPage(): void {
    this.customersPage.set(0);
    this.loadCustomers();
  }

  goToCustomersPage(page: number): void {
    this.customersPage.set(page);
    this.loadCustomers();
  }

  openOrder(id: string): void {
    this.adminApi.getOrderDetail(id).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.selectedOrder.set(res.data);
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
                } else {
                  this.notifyError(ordRes.message || 'Không thể đính kèm ảnh mẫu.');
                }
              },
              error: (err) => this.notifyError(err?.error?.message || 'Không thể đính kèm ảnh mẫu.'),
            });
        } else {
          this.notifyError(uploadRes.message || 'Tải ảnh mẫu thất bại.');
        }
      },
      error: (err) => this.notifyError(err?.error?.message || 'Tải ảnh mẫu thất bại.'),
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
        } else {
          this.notifyError(res.message || 'Không thể cập nhật trạng thái thanh toán.');
        }
      },
      error: (err) => this.notifyError(err?.error?.message || 'Không thể cập nhật trạng thái thanh toán.'),
    });
  }

  canVerifyPayment(order: OrderDetail, tx: PaymentTransaction): boolean {
    if (order.orderType === 'DIRECT_STORE_ORDER') {
      return order.status === 'AWAITING_DEPOSIT' && tx.paymentPhase === 'FULL_100';
    }
    return (order.status === 'AWAITING_DEPOSIT' && tx.paymentPhase === 'DEPOSIT_50')
      || (order.status === 'READY_FOR_DELIVERY' && tx.paymentPhase === 'BALANCE_50');
  }

  changeOrderStatus(orderId: string, targetStatus: OrderStatus): void {
    this.adminApi
      .updateOrderStatus(orderId, {
        targetStatus,
        productionWorkerNote: this.workerNote.trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.selectedOrder.set(res.data);
            this.notify(`Đã chuyển trạng thái sang ${targetStatus}.`);
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
        } else {
          this.notifyError(res.message || 'Không thể lưu số hóa đơn VAT.');
        }
      },
      error: (err) => this.notifyError(err?.error?.message || 'Không thể lưu số hóa đơn VAT.'),
    });
  }

  savePricingRules(): void {
    this.pricingSaving.set(true);
    const payload = this.pricingRules().map((r) => ({
      ruleKey: r.ruleKey,
      ruleValue: r.ruleKey.endsWith('_RATE') ? Number(r.ruleValue) / 100 : Number(r.ruleValue),
      description: r.description,
    }));
    this.adminApi.updatePricingRules(payload).subscribe({
      next: (res) => {
        this.pricingSaving.set(false);
        if (res.success && res.data) {
          this.pricingRules.set(res.data.map((rule) => ({
            ...rule,
            ruleValue: rule.ruleKey.endsWith('_RATE') ? rule.ruleValue * 100 : rule.ruleValue,
          })));
          this.notify('Đã cập nhật bảng tham số định mức giá.');
        } else {
          this.notifyError(res.message || 'Cập nhật tham số giá thất bại.');
        }
      },
      error: (err) => {
        this.pricingSaving.set(false);
        this.notifyError(err?.error?.message || 'Cập nhật tham số giá thất bại.');
      },
    });
  }

  pricingRuleLabel(key: string): string {
    const labels: Record<string, string> = {
      THIN_SHEET_RATE_M2: 'Đơn giá tấm mỏng',
      THICK_METAL_MULTIPLIER: 'Hệ số kim loại dày',
      THIN_SHEET_THRESHOLD_MM: 'Ngưỡng tấm mỏng',
      BULK_DISCOUNT_MIN_QTY: 'Số lượng chiết khấu',
      BULK_DISCOUNT_RATE: 'Tỷ lệ chiết khấu',
      VAT_RATE: 'Thuế VAT',
      DEPOSIT_RATE: 'Tỷ lệ đặt cọc',
    };
    return labels[key] || key;
  }

  pricingRuleUnit(key: string): string {
    if (key.endsWith('_MM')) return 'mm';
    if (key.endsWith('_RATE_M2')) return 'đ/m²';
    if (key.endsWith('_M2')) return 'đ/m²';
    if (key.endsWith('_QTY')) return 'cái';
    if (key.endsWith('_RATE')) return '%';
    return key.includes('MULTIPLIER') ? '×' : '';
  }

  orderStatusLabel(status: OrderStatus): string {
    const labels: Record<OrderStatus, string> = {
      QUOTE_PENDING: 'Chờ duyệt báo giá',
      QUOTE_APPROVED: 'Đã duyệt báo giá',
      PROTOTYPING: 'Đang làm mẫu',
      AWAITING_DEPOSIT: 'Chờ đặt cọc',
      IN_PRODUCTION: 'Đang sản xuất',
      READY_FOR_DELIVERY: 'Chờ giao hàng',
      COMPLETED: 'Hoàn tất',
      CANCELLED: 'Đã hủy',
    };
    return labels[status] || status;
  }

  startNewProduct(): void {
    if (this.showCreateProduct() && !this.editingProductId()) {
      this.cancelProductEdit();
      return;
    }
    this.editingProductId.set(null);
    this.newProd = {
      sku: '',
      name: '',
      slug: '',
      categoryId: this.adminCategories()[0]?.id || '',
      materialId: '',
      productType: 'STANDARD_ITEM',
      basePrice: 50000,
      stockQuantity: 50,
      defaultWidthMm: 80,
      defaultHeightMm: 40,
      defaultThicknessMm: 0.8,
      processingMethodId: '',
      description: '',
      images: [],
      isActive: true,
    };
    this.showCreateProduct.set(true);
  }

  cancelProductEdit(): void {
    this.editingProductId.set(null);
    this.showCreateProduct.set(false);
  }

  editProduct(product: Product): void {
    this.editingProductId.set(product.id);
    this.newProd = {
      sku: product.sku,
      name: product.name,
      slug: product.slug,
      categoryId: product.categoryId,
      materialId: product.materialId || '',
      productType: product.productType,
      basePrice: product.basePrice ?? 0,
      stockQuantity: product.stockQuantity ?? 0,
      defaultWidthMm: product.defaultWidthMm ?? 80,
      defaultHeightMm: product.defaultHeightMm ?? 40,
      defaultThicknessMm: product.defaultThicknessMm ?? 0.8,
      processingMethodId: product.processingMethodId || '',
      description: product.description || '',
      images: [...(product.images?.length ? product.images : product.imageUrl ? [product.imageUrl] : [])],
      isActive: product.isActive ?? true,
    };
    this.showCreateProduct.set(true);
  }

  uploadProductImages(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (!files.length) return;
    const invalidFile = files.find((file) => !file.type.startsWith('image/'));
    if (invalidFile) {
      this.notifyError(`${invalidFile.name} không phải là tệp hình ảnh.`);
      input.value = '';
      return;
    }

    forkJoin(files.map((file) => this.quoteApi.uploadFile(file, 'product-images'))).subscribe({
      next: (responses) => {
        const uploaded = responses.filter((res) => res.success && res.data?.url).map((res) => res.data!.url);
        if (uploaded.length !== files.length) {
          this.notifyError('Một số ảnh không tải lên được. Vui lòng thử lại.');
        }
        this.newProd.images = [...this.newProd.images, ...uploaded];
        input.value = '';
      },
      error: (err) => {
        this.notifyError(err?.error?.message || 'Tải ảnh sản phẩm thất bại.');
        input.value = '';
      },
    });
  }

  moveProductImage(index: number, offset: number): void {
    const target = index + offset;
    if (target < 0 || target >= this.newProd.images.length) return;
    const images = [...this.newProd.images];
    [images[index], images[target]] = [images[target], images[index]];
    this.newProd.images = images;
  }

  removeProductImage(index: number): void {
    this.newProd.images = this.newProd.images.filter((_, imageIndex) => imageIndex !== index);
  }

  createProduct(): void {
    if (!this.newProd.sku.trim() || !this.newProd.name.trim() || !this.newProd.slug.trim() || !this.newProd.categoryId) {
      this.notifyError('Vui lòng nhập SKU, tên, slug và danh mục sản phẩm.');
      return;
    }
    const payload = {
      sku: this.newProd.sku.trim(),
      name: this.newProd.name.trim(),
      slug: this.newProd.slug.trim(),
      description: this.newProd.description.trim(),
      categoryId: this.newProd.categoryId,
      materialId: this.newProd.materialId || undefined,
      processingMethodId: this.newProd.processingMethodId || undefined,
      productType: this.newProd.productType,
      basePrice: Number(this.newProd.basePrice),
      stockQuantity: Number(this.newProd.stockQuantity),
      defaultWidthMm: this.newProd.productType === 'CUSTOM_TEMPLATE' ? Number(this.newProd.defaultWidthMm) : undefined,
      defaultHeightMm: this.newProd.productType === 'CUSTOM_TEMPLATE' ? Number(this.newProd.defaultHeightMm) : undefined,
      defaultThicknessMm: this.newProd.productType === 'CUSTOM_TEMPLATE' ? Number(this.newProd.defaultThicknessMm) : undefined,
      images: [...this.newProd.images],
      isActive: this.newProd.isActive,
    };
    this.productSaving.set(true);
    const request = this.editingProductId()
      ? this.adminApi.updateProduct(this.editingProductId()!, payload)
      : this.adminApi.createProduct(payload);
    request.subscribe({
      next: (res) => {
        this.productSaving.set(false);
        if (res.success && res.data) {
          this.notify(this.editingProductId() ? 'Đã cập nhật sản phẩm.' : 'Đã tạo sản phẩm mới.');
          this.cancelProductEdit();
          this.fetchAdminProducts();
        }
      },
      error: (err) => {
        this.productSaving.set(false);
        this.notifyError(err?.error?.message || 'Lưu sản phẩm thất bại.');
      },
    });
  }

  toggleProductActive(product: Product): void {
    const payload = {
      sku: product.sku,
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      categoryId: product.categoryId,
      materialId: product.materialId,
      processingMethodId: product.processingMethodId,
      productType: product.productType,
      basePrice: product.basePrice ?? 0,
      stockQuantity: product.stockQuantity ?? 0,
      defaultWidthMm: product.defaultWidthMm,
      defaultHeightMm: product.defaultHeightMm,
      defaultThicknessMm: product.defaultThicknessMm,
      images: product.images || (product.imageUrl ? [product.imageUrl] : []),
      isActive: !product.isActive,
    };
    this.adminApi.updateProduct(product.id, payload).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.adminProducts.update((products) => products.map((item) => item.id === product.id ? res.data! : item));
          this.notify(res.data.isActive ? 'Đã hiển thị sản phẩm.' : 'Đã ẩn sản phẩm.');
        }
      },
      error: (err) => {
        this.notifyError(err?.error?.message || 'Không thể cập nhật trạng thái sản phẩm.');
        this.fetchAdminProducts();
      },
    });
  }

  removeProduct(id: string): void {
    this.deleteProductId.set(id);
  }

  confirmRemoveProduct(): void {
    const id = this.deleteProductId();
    if (!id) return;
    this.productSaving.set(true);
    this.adminApi.deleteProduct(id).subscribe({
      next: () => {
        this.productSaving.set(false);
        this.deleteProductId.set(null);
        this.fetchAdminProducts();
        this.notify('Đã xóa sản phẩm.');
      },
      error: (err) => {
        this.productSaving.set(false);
        this.notifyError(err?.error?.message || 'Xóa sản phẩm thất bại.');
      },
    });
  }

  private notify(msg: string): void {
    this.toastService.show(msg);
  }

  private notifyError(msg: string): void {
    this.toastService.show(msg, 'error');
  }
}
