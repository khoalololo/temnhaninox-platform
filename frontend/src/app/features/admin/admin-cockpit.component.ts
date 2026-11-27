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
import { ImageLightboxComponent } from '../../shared/components/image-lightbox/image-lightbox.component';
import {
  PAYMENT_METHOD_LABEL,
  PAYMENT_PHASE_LABEL,
  PAYMENT_STATUS_LABEL,
  fileExtension,
  initials,
  isImageUrl,
  orderStatusLabel as statusLabelFn,
  orderStatusTone,
  orderTypeLabel,
  paidPercent,
  paymentStatusTone,
} from '../../shared/utils/order-ui';

@Component({
  selector: 'app-admin-cockpit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, VndCurrencyPipe, ButtonDirective, PaginatorComponent, ImageLightboxComponent],
  template: `
    <div class="admin-page mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 space-y-7">
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
                <dd class="price-text mt-1 text-xl font-semibold tabular-nums text-text-primary">{{ stats.monthlyRevenue | vnd }}</dd>
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
            <div class="px-3 py-3 bg-surface border-b border-border sm:px-5 sm:py-4">
              <div class="flex flex-nowrap items-center gap-2">
                <select
                  [ngModel]="statusFilter"
                  (ngModelChange)="setStatusFilter($event)"
                  aria-label="Lọc theo trạng thái đơn hàng"
                  class="industrial-input w-[9.5rem] shrink-0 text-sm"
                >
                  @for (opt of statusOptions; track opt.value) {
                    <option [value]="opt.value">{{ opt.label }}</option>
                  }
                </select>
                <input
                  type="search"
                  [(ngModel)]="searchFilter"
                  (keyup.enter)="resetOrdersPage()"
                  placeholder="Tìm mã đơn / tên khách..."
                  class="industrial-input min-w-0 flex-1 text-sm"
                />
                <button type="button" (click)="resetOrdersPage()" appButton variant="secondary" size="sm" class="shrink-0">Tìm</button>
              </div>
            </div>

            @if (ordersLoading()) {
              <div class="h-52 animate-pulse bg-surface-raised" aria-label="Đang tải đơn hàng"></div>
            } @else {
            <div class="hidden overflow-x-auto md:block">
              <table class="tni-table">
                <thead>
                  <tr>
                    <th>Mã đơn</th>
                    <th>Khách hàng</th>
                    <th>Trạng thái</th>
                    @if (!selectedOrder()) { <th>Thanh toán</th> }
                    <th class="!text-right">Tổng tiền</th>
                    <th class="!text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (ord of orders(); track ord.id) {
                    <tr class="clickable" [class.is-selected]="selectedOrder()?.id === ord.id" (click)="openOrder(ord.id)">
                      <td>
                        <div class="font-sans text-sm font-semibold tabular-nums text-text-primary">{{ ord.orderCode }}</div>
                        <div class="mt-1 flex flex-wrap items-center gap-1.5">
                          <span class="tni-chip no-dot" data-tone="muted">{{ typeLabel(ord.orderType) }}</span>
                          @if (ord.requiresVatInvoice) { <span class="tni-chip no-dot" data-tone="danger">VAT</span> }
                        </div>
                      </td>
                      <td class="text-text-primary">
                        <span class="text-sm font-semibold text-text-primary">{{ ord.recipientName }}</span>
                        <div class="text-[13px] text-text-secondary">{{ ord.itemCount }} mặt hàng · {{ ord.createdAt | date:'dd/MM/yyyy' }}</div>
                      </td>
                      <td><span class="tni-chip" [attr.data-tone]="statusTone(ord.status)">{{ statusLabel(ord.status) }}</span></td>
                      @if (!selectedOrder()) {
                        <td class="min-w-[9rem]">
                          <div class="tni-progress" role="progressbar" [attr.aria-valuenow]="percentPaid(ord)" aria-valuemin="0" aria-valuemax="100"><span [style.width.%]="percentPaid(ord)"></span></div>
                          <div class="mt-1 text-[13px] font-sans font-medium tabular-nums text-text-secondary">{{ percentPaid(ord) }}% đã thu</div>
                        </td>
                      }
                      <td class="price-text text-right font-sans font-semibold tabular-nums text-text-primary">{{ ord.totalAmount | vnd }}</td>
                      <td class="text-right"><span class="tni-row-action">Xử lý</span></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <div class="space-y-3 p-3 md:hidden">
              @for (ord of orders(); track ord.id) {
                <button
                  type="button"
                  (click)="openOrder(ord.id)"
                  [attr.aria-label]="'Xử lý đơn hàng ' + ord.orderCode"
                  class="block w-full rounded-[8px] border border-border bg-bg-elevated p-4 text-left transition-colors hover:border-accent"
                  [class.border-accent]="selectedOrder()?.id === ord.id"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <div class="break-words font-sans text-sm font-semibold tabular-nums text-text-primary">{{ ord.orderCode }}</div>
                      <div class="mt-1 truncate text-sm text-text-secondary">{{ ord.recipientName }}</div>
                    </div>
                    <span class="tni-chip shrink-0" [attr.data-tone]="statusTone(ord.status)">{{ statusLabel(ord.status) }}</span>
                  </div>
                  <div class="mt-3 flex items-end justify-between gap-3 border-t border-border pt-3">
                    <div class="min-w-0">
                      <div class="text-[13px] text-text-secondary">{{ ord.itemCount }} mặt hàng · {{ ord.createdAt | date:'dd/MM/yyyy' }}</div>
                      <div class="price-text mt-1 text-sm font-sans font-semibold tabular-nums text-text-primary">{{ ord.totalAmount | vnd }}</div>
                    </div>
                    <span class="shrink-0 text-sm font-semibold text-accent">Xử lý</span>
                  </div>
                </button>
              }
            </div>
            @if (!ordersLoading() && !orders().length) {
              <div class="tni-empty">
                <svg viewBox="0 0 24 24" class="tni-empty-icon" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M7 3.75h7l5 5v11.5H7a2 2 0 0 1-2-2v-12.5a2 2 0 0 1 2-2Z" /><path d="M14 3.75v5h5M8.5 13h7M8.5 16h7" /></svg>
                <strong class="text-text-primary">Không có đơn hàng phù hợp</strong><span>Thử đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm.</span>
              </div>
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
                  <span class="tni-chip" [attr.data-tone]="statusTone(ord.status)">{{ statusLabel(ord.status) }}</span>
                </div>
                <button type="button" (click)="selectedOrder.set(null)" appButton variant="ghost" size="xs">
                  <span class="inline-flex items-center gap-1">
                    <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m18 6-12 12M6 6l12 12" /></svg>
                    Đóng
                  </span>
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
                      <span class="price-text shrink-0 self-start rounded-md border border-success/30 bg-success/10 px-3 py-1.5 font-sans tabular-nums text-sm font-semibold text-success">
                        {{ item.lineTotal | vnd }}
                      </span>
                    </div>
                    @if (item.widthMm) {
                      <div class="font-sans tabular-nums text-sm text-text-secondary">
                        {{ item.materialNameSnapshot }} · {{ item.processingNameSnapshot }} · {{ item.widthMm }}×{{ item.heightMm }}×{{ item.thicknessMm }}mm
                      </div>
                    }
                    @if (item.designFileUrl || item.prototypeImageUrl) {
                      <div class="flex flex-wrap gap-4">
                        @if (item.designFileUrl) {
                          @if (isImage(item.designFileUrl)) {
                            <button type="button" class="tni-thumb" (click)="openPreview(item.designFileUrl, 'Bản vẽ khách gửi · ' + item.itemName)">
                              <img [src]="item.designFileUrl" alt="Bản vẽ khách gửi" loading="lazy" />
                              <span>Bản vẽ khách gửi</span>
                            </button>
                          } @else {
                            <a class="tni-thumb" [href]="item.designFileUrl" target="_blank" rel="noopener" style="cursor:pointer">
                              <span class="tni-thumb-file">{{ ext(item.designFileUrl) }}</span>
                              <span class="inline-flex items-center gap-1">Tải bản vẽ khách <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M14 4h6v6m0-6-9 9" /><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" /></svg></span>
                            </a>
                          }
                        }
                        @if (item.prototypeImageUrl) {
                          <button type="button" class="tni-thumb" (click)="openPreview(item.prototypeImageUrl, 'Ảnh mẫu thực tế · ' + item.itemName)">
                            <img [src]="item.prototypeImageUrl" alt="Ảnh mẫu thực tế đã gửi" loading="lazy" />
                            <span class="inline-flex items-center gap-1 text-success">
                              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
                              Ảnh mẫu đã gửi
                            </span>
                          </button>
                        }
                      </div>
                    }

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
                        <div class="flex flex-wrap items-center justify-between gap-2">
                          <span class="font-semibold text-sm text-text-primary">{{ phaseLabel(tx.paymentPhase) }}</span>
                          <span class="tni-chip" [attr.data-tone]="payTone(tx.status)">{{ payLabel(tx.status) }}</span>
                        </div>
                        <div class="price-text font-sans tabular-nums text-lg font-semibold text-text-primary">{{ tx.amount | vnd }}</div>
                        <div class="text-sm text-text-secondary break-words">{{ methodLabel(tx.paymentMethod) }} · Mã GD: {{ tx.transactionRef || 'Chưa cập nhật' }}</div>
                        @if (tx.proofImageUrl) {
                          @if (isImage(tx.proofImageUrl)) {
                            <button type="button" class="tni-thumb mt-2" (click)="openPreview(tx.proofImageUrl, 'Biên lai · ' + phaseLabel(tx.paymentPhase))">
                              <img [src]="tx.proofImageUrl" alt="Biên lai chuyển khoản" loading="lazy" />
                              <span>Xem biên lai</span>
                            </button>
                          } @else {
                            <a [href]="tx.proofImageUrl" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-sm text-steel hover:text-steel-hover underline">
                              Xem biên lai
                              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M14 4h6v6m0-6-9 9" /><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" /></svg>
                            </a>
                          }
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
                            Chưa đến bước thanh toán. Chưa thể duyệt giao dịch.
                          </span>
                        } @else {
                          <span class="text-xs text-text-muted">{{ tx.verifiedAt ? 'Xử lý lúc ' + (tx.verifiedAt | date:'dd/MM/yyyy HH:mm') : '' }}</span>
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
                      Chờ khách thanh toán số dư còn lại <span class="price-text">{{ (ord.totalAmount - ord.paidAmount) | vnd }}</span> trước khi hoàn tất đơn.
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
              Thay đổi chỉ áp dụng cho báo giá được tạo sau khi lưu. Ngưỡng "tấm mỏng" tính theo ly: 1 ly = 1 mm.
            </div>
          } @else {
            <p class="px-5 sm:px-7 py-8 text-center text-sm text-text-secondary">Chưa có tham số định giá.</p>
          }
        </section>

        <!-- Per-material rates: mica/decal do NOT use the metal 5,000,000 đ/m² rate -->
        <section class="industrial-card overflow-hidden mt-6" aria-labelledby="materials-title">
          <div class="px-5 sm:px-7 py-5 border-b border-border">
            <h2 id="materials-title" class="font-heading text-xl font-semibold text-text-primary">Giá theo vật liệu</h2>
            <p class="mt-1 text-sm text-text-secondary">
              Kim loại tấm mỏng (≤ 1 ly) dùng đơn giá chung ở trên. <strong>Mica / Decal không dùng đơn giá này</strong>. Nhập đơn giá/m² riêng cho từng loại. Chưa nhập thì khách chưa thể báo giá tự động vật liệu đó.
            </p>
          </div>
          <div class="divide-y divide-border">
            @for (m of adminMaterials(); track m.id) {
              <div class="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-3 md:gap-8 items-center px-5 sm:px-7 py-4">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="font-medium text-text-primary">{{ m.name }}</span>
                    <span class="tni-chip no-dot" [attr.data-tone]="m.isMetal ? 'info' : 'muted'">{{ m.isMetal ? 'Kim loại' : 'Phi kim' }}</span>
                    @if (!m.isMetal && !m.thinSheetRatePerM2) {
                      <span class="tni-chip" data-tone="warning">Chưa có đơn giá</span>
                    }
                  </div>
                  <p class="mt-1 text-sm text-text-secondary">
                    Dày {{ m.minThicknessMm }}–{{ m.maxThicknessMm }} mm
                    @if (m.isMetal) { · tấm mỏng: để trống = dùng đơn giá chung } @else { · tính theo diện tích (đ/m²) }
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <input
                    type="number" min="0" step="1000"
                    class="industrial-input pricing-value-input w-40 text-right font-sans tabular-nums"
                    [attr.aria-label]="'Đơn giá theo m² của ' + m.name"
                    [placeholder]="m.isMetal ? 'Dùng chung' : 'Nhập đơn giá'"
                    [ngModel]="materialRates[m.id]"
                    (ngModelChange)="materialRates[m.id] = $event"
                  />
                  <span class="text-sm text-text-secondary">đ/m²</span>
                  <button type="button" appButton variant="secondary" size="sm"
                    [disabled]="materialSavingId() === m.id || !materialRateChanged(m)"
                    (click)="saveMaterialRate(m)">
                    {{ materialSavingId() === m.id ? 'Đang lưu…' : 'Lưu' }}
                  </button>
                </div>
              </div>
            } @empty {
              <p class="px-5 sm:px-7 py-6 text-sm text-text-secondary">Chưa tải được danh sách vật liệu.</p>
            }
          </div>
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
                              <button type="button" (click)="moveProductImage(idx, -1)" [disabled]="idx === 0" class="image-action" [attr.aria-label]="'Đưa ảnh ' + (idx + 1) + ' lên trước'">
                                <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 19V5m0 0-6 6m6-6 6 6" /></svg>
                              </button>
                              <button type="button" (click)="removeProductImage(idx)" class="image-action image-action-remove" [attr.aria-label]="'Xóa ảnh ' + (idx + 1)">×</button>
                              <button type="button" (click)="moveProductImage(idx, 1)" [disabled]="idx === newProd.images.length - 1" class="image-action" [attr.aria-label]="'Đưa ảnh ' + (idx + 1) + ' xuống sau'">
                                <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 5v14m0 0 6-6m-6 6-6-6" /></svg>
                              </button>
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
            <div class="grid grid-cols-1 gap-2 bg-surface border-b border-border p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-[minmax(12rem,1fr)_minmax(10rem,auto)_minmax(10rem,auto)_auto]">
              <input type="search" [(ngModel)]="productSearch" (keyup.enter)="resetProductsPage()" placeholder="Tìm tên / SKU" class="industrial-input min-w-0 w-full text-sm" />
              <select [(ngModel)]="productCategoryFilter" (ngModelChange)="resetProductsPage()" class="industrial-input min-w-0 w-full text-sm">
                <option value="">Tất cả danh mục</option>
                @for (c of adminCategories(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
              </select>
              <select [(ngModel)]="productTypeFilter" (ngModelChange)="resetProductsPage()" class="industrial-input min-w-0 w-full text-sm">
                <option value="">Tất cả loại</option>
                <option value="STANDARD_ITEM">Hàng có sẵn</option>
                <option value="CUSTOM_TEMPLATE">Gia công theo yêu cầu</option>
              </select>
              <button type="button" (click)="resetProductsPage()" appButton variant="secondary" size="sm" class="w-full xl:w-auto">Tìm</button>
            </div>
            @if (productsLoading()) {
              <div class="h-52 animate-pulse bg-surface-raised" aria-label="Đang tải sản phẩm"></div>
            } @else {
            <div class="hidden overflow-x-auto md:block">
            <table class="tni-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Danh mục</th>
                  <th>Loại</th>
                  <th class="!text-right">Giá</th>
                  <th>Tồn kho</th>
                  <th class="!text-center">Hiển thị</th>
                  <th class="!text-right"></th>
                </tr>
              </thead>
              <tbody>
                @for (p of adminProducts(); track p.id) {
                  <tr [class.opacity-60]="p.isActive === false">
                    <td>
                      <div class="flex items-center gap-3 min-w-[16rem]">
                        @if (p.imageUrl || p.images?.[0]) {
                          <img [src]="p.imageUrl || p.images?.[0]" [alt]="p.name" loading="lazy" class="h-12 w-12 shrink-0 rounded-lg border border-border object-cover" />
                        } @else {
                          <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-surface text-text-muted" aria-label="Chưa có ảnh" title="Chưa có ảnh"><svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3.75" y="4.75" width="16.5" height="14.5" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="m5 17 4-4 3 3 2-2 5 4" /></svg></span>
                        }
                        <div class="min-w-0">
                          <div class="text-sm font-semibold text-text-primary leading-snug">{{ p.name }}</div>
                          <div class="font-sans text-[13px] font-medium tabular-nums text-text-secondary">{{ p.sku }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="text-text-secondary">{{ p.categoryName || 'Chưa phân loại' }}</td>
                    <td>
                      <span class="tni-chip no-dot" [attr.data-tone]="p.productType === 'STANDARD_ITEM' ? 'muted' : 'info'">
                        {{ p.productType === 'STANDARD_ITEM' ? 'Hàng có sẵn' : 'Gia công 3D' }}
                      </span>
                    </td>
                    <td class="price-text text-right font-sans tabular-nums font-semibold text-text-primary">
                      @if (p.productType === 'STANDARD_ITEM') { {{ p.basePrice | vnd }} } @else { <span class="text-text-muted font-normal">Báo giá theo yêu cầu</span> }
                    </td>
                    <td>
                      @if (p.productType === 'STANDARD_ITEM') {
                        <span class="tni-chip" [attr.data-tone]="(p.stockQuantity ?? 0) === 0 ? 'danger' : (p.stockQuantity ?? 0) < 10 ? 'warning' : 'success'">
                          {{ (p.stockQuantity ?? 0) === 0 ? 'Hết hàng' : p.stockQuantity + ' cái' }}
                        </span>
                      } @else { <span class="text-text-muted">Không áp dụng</span> }
                    </td>
                    <td class="text-center">
                      <button type="button" role="switch" class="tni-switch" [attr.aria-checked]="p.isActive !== false" (click)="toggleProductActive(p)" [attr.aria-label]="(p.isActive !== false ? 'Ẩn ' : 'Hiện ') + p.name"></button>
                    </td>
                    <td class="text-right whitespace-nowrap">
                      <button type="button" (click)="editProduct(p)" class="tni-row-action mr-2">Sửa</button>
                      <button type="button" (click)="removeProduct(p.id)" class="tni-row-action danger">Xóa</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            </div>
            <div class="space-y-3 p-3 md:hidden">
              @for (p of adminProducts(); track p.id) {
                <article class="rounded-[8px] border border-border bg-bg-elevated p-4" [class.opacity-60]="p.isActive === false">
                  <div class="flex items-start gap-3">
                    @if (p.imageUrl || p.images?.[0]) {
                      <img [src]="p.imageUrl || p.images?.[0]" [alt]="p.name" loading="lazy" class="h-14 w-14 shrink-0 rounded-[6px] border border-border object-cover" />
                    } @else {
                      <span class="flex h-14 w-14 shrink-0 items-center justify-center rounded-[6px] border border-dashed border-border bg-surface text-lg text-text-muted" aria-label="Chưa có ảnh"><svg viewBox="0 0 24 24" class="h-7 w-7" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3.75" y="4.75" width="16.5" height="14.5" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="m5 17 4-4 3 3 2-2 5 4" /></svg></span>
                    }
                    <div class="min-w-0 flex-1">
                      <h3 class="break-words text-sm font-semibold leading-snug text-text-primary">{{ p.name }}</h3>
                      <p class="mt-1 text-[13px] font-sans font-medium tabular-nums text-text-secondary">{{ p.sku }}</p>
                      <p class="mt-1 text-[13px] text-text-secondary">{{ p.categoryName || 'Chưa phân loại' }}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      class="tni-switch shrink-0"
                      [attr.aria-checked]="p.isActive !== false"
                      (click)="toggleProductActive(p)"
                      [attr.aria-label]="(p.isActive !== false ? 'Ẩn ' : 'Hiện ') + p.name"
                    ></button>
                  </div>
                  <div class="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                    <span class="tni-chip no-dot" [attr.data-tone]="p.productType === 'STANDARD_ITEM' ? 'muted' : 'info'">
                      {{ p.productType === 'STANDARD_ITEM' ? 'Hàng có sẵn' : 'Gia công 3D' }}
                    </span>
                    @if (p.productType === 'STANDARD_ITEM') {
                      <span class="price-text text-sm font-sans font-semibold tabular-nums text-text-primary">{{ p.basePrice | vnd }}</span>
                      <span class="text-[13px] text-text-secondary">{{ (p.stockQuantity ?? 0) === 0 ? 'Hết hàng' : (p.stockQuantity ?? 0) + ' cái' }}</span>
                    } @else {
                      <span class="text-[13px] text-text-secondary">Báo giá theo yêu cầu</span>
                    }
                  </div>
                  <div class="mt-3 flex gap-2">
                    <button type="button" (click)="editProduct(p)" class="tni-row-action flex-1">Sửa sản phẩm</button>
                    <button type="button" (click)="removeProduct(p.id)" class="tni-row-action danger flex-1">Xóa</button>
                  </div>
                </article>
              }
            </div>
            @if (!adminProducts().length) {
              <div class="tni-empty"><svg viewBox="0 0 24 24" class="tni-empty-icon" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3.75" y="4.75" width="16.5" height="14.5" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="m5 17 4-4 3 3 2-2 5 4" /></svg><strong class="text-text-primary">Chưa có sản phẩm phù hợp</strong><span>Bấm “+ Thêm sản phẩm mới” hoặc đổi bộ lọc.</span></div>
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
            <input type="search" [(ngModel)]="customerSearch" (keyup.enter)="resetCustomersPage()" placeholder="Tìm tên, email, số điện thoại" class="industrial-input flex-1 min-w-[180px]" />
            <button type="button" (click)="resetCustomersPage()" appButton variant="secondary" size="sm">Tìm khách hàng</button>
          </div>
          @if (customersLoading()) {
            <div class="h-52 animate-pulse bg-surface-raised" aria-label="Đang tải khách hàng"></div>
          } @else if (customers().length) {
            <div class="overflow-x-auto">
              <table class="tni-table">
                <thead>
                  <tr>
                    <th>Khách hàng</th>
                    <th>Điện thoại</th>
                    <th>Địa chỉ mặc định</th>
                    <th>Trạng thái</th>
                    <th>Ngày tạo</th>
                  </tr>
                </thead>
                <tbody>
                  @for (customer of customers(); track customer.id) {
                    <tr>
                      <td>
                        <div class="flex items-center gap-3 min-w-[14rem]">
                          <span class="tni-avatar" aria-hidden="true">{{ initialsOf(customer.fullName) }}</span>
                          <div class="min-w-0">
                            <div class="font-medium text-text-primary">{{ customer.fullName }}</div>
                            <div class="text-xs text-text-muted truncate">{{ customer.email }}</div>
                          </div>
                        </div>
                      </td>
                      <td class="tabular-nums text-text-secondary">{{ customer.phone || 'Chưa cập nhật' }}</td>
                      <td class="text-text-secondary max-w-[22rem]">{{ customer.defaultAddress || 'Chưa cập nhật' }}</td>
                      <td><span class="tni-chip" [attr.data-tone]="customer.isActive ? 'success' : 'muted'">{{ customer.isActive ? 'Hoạt động' : 'Đã khóa' }}</span></td>
                      <td class="tabular-nums text-text-secondary">{{ customer.createdAt | date:'dd/MM/yyyy' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <div class="tni-empty"><strong class="text-text-primary">Không tìm thấy khách hàng</strong><span>Thử tên, email hoặc số điện thoại khác.</span></div>
          }
          <app-paginator [page]="customersPage()" [totalPages]="customersTotalPages()" (pageChange)="goToCustomersPage($event)" />
        </section>
      }

      @if (preview(); as pv) {
        <app-image-lightbox [url]="pv.url" [caption]="pv.caption" (closed)="preview.set(null)" />
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
  readonly preview = signal<{ url: string; caption: string } | null>(null);
  readonly materialSavingId = signal<string | null>(null);
  materialRates: Record<string, number | null> = {};

  readonly statusOptions: { value: OrderStatus | ''; label: string }[] = [
    { value: '', label: 'Tất cả' },
    { value: 'QUOTE_PENDING', label: 'Chờ duyệt giá' },
    { value: 'QUOTE_APPROVED', label: 'Đã duyệt giá' },
    { value: 'PROTOTYPING', label: 'Duyệt mẫu' },
    { value: 'AWAITING_DEPOSIT', label: 'Chờ cọc' },
    { value: 'IN_PRODUCTION', label: 'Đang sản xuất' },
    { value: 'READY_FOR_DELIVERY', label: 'Chờ giao' },
    { value: 'COMPLETED', label: 'Hoàn tất' },
    { value: 'CANCELLED', label: 'Đã hủy' },
  ];

  // Template helpers (shared with the customer screens)
  readonly statusLabel = statusLabelFn;
  readonly statusTone = orderStatusTone;
  readonly typeLabel = orderTypeLabel;
  readonly payTone = paymentStatusTone;
  readonly isImage = isImageUrl;
  readonly ext = fileExtension;
  readonly initialsOf = initials;
  phaseLabel = (p: keyof typeof PAYMENT_PHASE_LABEL) => PAYMENT_PHASE_LABEL[p] ?? p;
  methodLabel = (m: keyof typeof PAYMENT_METHOD_LABEL) => PAYMENT_METHOD_LABEL[m] ?? m;
  payLabel = (s: keyof typeof PAYMENT_STATUS_LABEL) => PAYMENT_STATUS_LABEL[s] ?? s;
  percentPaid = (o: OrderSummary) => paidPercent(o.paidAmount, o.totalAmount);

  setStatusFilter(value: OrderStatus | ''): void {
    this.statusFilter = value;
    this.resetOrdersPage();
  }

  openPreview(url: string | undefined, caption: string): void {
    if (url) this.preview.set({ url, caption });
  }

  materialRateChanged(m: Material): boolean {
    const draft = this.materialRates[m.id];
    const current = m.thinSheetRatePerM2 ?? null;
    const norm = (v: number | null | undefined) => (v === null || v === undefined || (v as unknown) === '' ? null : Number(v));
    return norm(draft) !== norm(current);
  }

  saveMaterialRate(m: Material): void {
    const raw = this.materialRates[m.id];
    const rate = raw === null || raw === undefined || (raw as unknown) === '' ? null : Number(raw);
    if (rate !== null && (!Number.isFinite(rate) || rate <= 0)) {
      this.notifyError('Đơn giá phải lớn hơn 0.');
      return;
    }
    this.materialSavingId.set(m.id);
    this.adminApi.updateMaterial(m.id, {
      code: m.code,
      name: m.name,
      isMetal: m.isMetal,
      densityKgM3: m.densityKgM3 ?? null,
      pricePerKg: m.pricePerKg ?? null,
      thinSheetRatePerM2: rate,
      minThicknessMm: m.minThicknessMm,
      maxThicknessMm: m.maxThicknessMm,
      pbrPreviewConfig: m.pbrPreviewConfig ?? null,
      isActive: m.isActive ?? true,
    }).subscribe({
      next: (res) => {
        this.materialSavingId.set(null);
        if (res.success && res.data) {
          this.adminMaterials.update((list) => list.map((x) => (x.id === m.id ? res.data : x)));
          this.materialRates[m.id] = res.data.thinSheetRatePerM2 ?? null;
          this.notify('Đã lưu đơn giá vật liệu.');
        } else {
          this.notifyError(res.message || 'Không thể lưu đơn giá vật liệu.');
        }
      },
      error: (err) => {
        this.materialSavingId.set(null);
        this.notifyError(err?.error?.message || 'Không thể lưu đơn giá vật liệu.');
      },
    });
  }

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
          res.data.forEach((m) => (this.materialRates[m.id] = m.thinSheetRatePerM2 ?? null));
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
      { ...category, name: `${depth > 0 ? '[Danh mục con] ' : ''}${category.name}`, children: undefined },
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
      THIN_SHEET_RATE_M2: 'Đơn giá tấm mỏng (kim loại)',
      THICK_METAL_MULTIPLIER: 'Hệ số kim loại dày',
      THIN_SHEET_THRESHOLD_MM: 'Ngưỡng tấm mỏng (1 ly = 1 mm)',
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
