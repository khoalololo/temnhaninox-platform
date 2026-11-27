import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrderApiService } from '../../../core/services/order-api.service';
import { QuoteApiService } from '../../../core/services/quote-api.service';
import { OrderDetail, OrderStatus, PaymentPhase } from '../../../core/models/order.models';
import { VndCurrencyPipe } from '../../../core/pipes/vnd-currency.pipe';
import { ButtonDirective } from '../../../shared/components/button/button.component';
import { ImageLightboxComponent } from '../../../shared/components/image-lightbox/image-lightbox.component';
import {
  PAYMENT_METHOD_LABEL,
  PAYMENT_PHASE_LABEL,
  PAYMENT_STATUS_LABEL,
  fileExtension,
  isImageUrl,
  orderStatusLabel,
  orderStatusTone,
  orderTypeLabel,
  paidPercent,
  paymentStatusTone,
} from '../../../shared/utils/order-ui';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, VndCurrencyPipe, ButtonDirective, ImageLightboxComponent],
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
      } @else if (loadError()) {
        <div class="industrial-card p-8 text-center space-y-3">
          <p class="text-sm font-semibold text-danger">{{ loadError() }}</p>
          <button type="button" (click)="retryLoad()" appButton variant="primary" size="sm">Thử lại</button>
        </div>
      } @else if (order()) {
        <!-- 7-Step Industrial Manufacturing Stepper -->
        <div class="industrial-card p-5 mb-6">
          <div class="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-border">
            <div>
              <div class="text-xs text-text-muted">Mã đơn hàng · đặt ngày {{ order()!.createdAt | date:'dd/MM/yyyy' }}</div>
              <div class="flex flex-wrap items-center gap-3">
                <h1 class="font-heading text-2xl font-mono font-bold text-text-primary">{{ order()!.orderCode }}</h1>
                <span class="tni-chip" [attr.data-tone]="statusTone(order()!.status)">{{ statusLabel(order()!.status) }}</span>
                <span class="tni-chip no-dot" data-tone="muted">{{ typeLabel(order()!.orderType) }}</span>
              </div>
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
              @if (order()!.requiresVatInvoice && order()!.vatInvoiceNumber) {
                <button type="button" (click)="printOrderSummary()" appButton variant="secondary" size="xs">
                  In bản tóm tắt / Lưu PDF
                </button>
              }
            </div>
          </div>

          @if (order()!.status === 'CANCELLED') {
            <div class="p-3 rounded-[6px] border border-danger/60 bg-danger/10 text-xs text-danger font-semibold text-center">
              Đơn hàng này đã bị hủy.
            </div>
          } @else {
            <ol class="order-steps" aria-label="Tiến độ đơn hàng">
              @for (step of steps; track step.key; let idx = $index) {
                <li
                  class="order-step"
                  [class.is-done]="isStepCompleted(idx)"
                  [class.is-current]="isStepActive(step.key)"
                  [attr.aria-current]="isStepActive(step.key) ? 'step' : null"
                >
                  <span class="order-step-dot">{{ isStepCompleted(idx) ? '✓' : idx + 1 }}</span>
                  <span class="order-step-label">{{ step.label }}</span>
                </li>
              }
            </ol>
          }
        </div>

        @if (order()!.requiresVatInvoice && order()!.vatInvoiceNumber) {
          <section class="print-invoice" aria-label="Bản tóm tắt đơn hàng">
            <h1>KĨ NGHỆ NVX - SÀI GÒN</h1>
            <h2>BẢN TÓM TẮT ĐƠN HÀNG</h2>
            <p>Mã đơn: {{ order()!.orderCode }} · Số hóa đơn điện tử: {{ order()!.vatInvoiceNumber }}</p>
            <p>Ngày đặt: {{ order()!.createdAt | date:'dd/MM/yyyy' }}</p>
            <hr />
            <h3>Thông tin nhận hàng</h3>
            <p>{{ order()!.recipientName }} · {{ order()!.recipientPhone }}</p>
            <p>{{ order()!.shippingAddress }}</p>
            <h3>Thông tin xuất hóa đơn</h3>
            <p>{{ order()!.vatCompanyName }} · MST: {{ order()!.vatTaxCode }}</p>
            <p>{{ order()!.vatCompanyAddress }}</p>
            <table>
              <thead><tr><th>Hạng mục</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
              <tbody>
                @for (item of order()!.items; track item.id) {
                  <tr>
                    <td>{{ item.itemName }}</td>
                    <td>{{ item.quantity }}</td>
                    <td>{{ item.finalUnitPrice | vnd }}</td>
                    <td>{{ item.lineTotal | vnd }}</td>
                  </tr>
                }
              </tbody>
            </table>
            <p>Tạm tính: {{ order()!.subtotalAmount | vnd }}</p>
            <p>VAT ({{ vatPercent() }}%): {{ order()!.vatAmount | vnd }}</p>
            <h3>Tổng thanh toán: {{ order()!.totalAmount | vnd }}</h3>
            <p class="print-disclaimer">Bản tóm tắt này không thay thế hóa đơn điện tử do cơ quan thuế chấp thuận.</p>
          </section>
        }

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
                      Xưởng đã gia công xong tem mẫu. Vui lòng kiểm tra hình ảnh bên dưới.
                    </h2>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  @for (item of order()!.items; track item.id) {
                    @if (item.prototypeImageUrl) {
                      <div class="bg-bg border border-border rounded-[6px] p-2.5">
                        <img
                          [src]="item.prototypeImageUrl"
                          [alt]="'Ảnh mẫu thực tế của ' + item.itemName"
                          class="w-full h-48 object-cover rounded-[6px] mb-2"
                          [class.hidden]="prototypeImageErrorIds().has(item.id)"
                          (load)="onPrototypeImageLoad(item.id)"
                          (error)="onPrototypeImageError(item.id)"
                        />
                        @if (prototypeImageErrorIds().has(item.id)) {
                          <div class="w-full min-h-48 mb-2 rounded-[6px] border border-danger/30 bg-danger/5 p-4 flex items-center justify-center text-center text-sm text-danger">
                            Không tải được ảnh mẫu. Vui lòng tải lại trang hoặc liên hệ xưởng.
                          </div>
                        }
                        <div class="text-xs font-semibold text-text-primary">{{ item.itemName }}</div>
                      </div>
                    }
                  }
                </div>

                @if (!canApprovePrototype()) {
                  <p class="text-sm text-text-secondary">
                    Bạn có thể xác nhận duyệt mẫu sau khi ảnh mẫu của tất cả hạng mục đã tải thành công.
                  </p>
                }
                <button
                  type="button"
                  (click)="approvePrototype()"
                  [disabled]="actionLoading() || !canApprovePrototype()"
                  appButton
                  variant="primary"
                  size="lg"
                >
                  Xác Nhận Duyệt Mẫu Và Chuyển Sang Đặt Cọc 50%
                </button>
              </div>
            }

            @if (isCustomOrderAwaitingWorkshopApproval()) {
              <div class="industrial-card p-4 text-sm text-text-secondary">
                @if (order()!.status === 'QUOTE_PENDING') {
                  <strong class="text-text-primary">Đơn hàng đang chờ xưởng duyệt báo giá.</strong>
                  <span> Sau khi chốt báo giá, xưởng sẽ làm mẫu thực tế và gửi ảnh để bạn duyệt. Bạn chưa cần thao tác hoặc thanh toán lúc này.</span>
                } @else if (order()!.status === 'QUOTE_APPROVED') {
                  <strong class="text-text-primary">Báo giá đã được xưởng duyệt.</strong>
                  <span> Xưởng đang chuẩn bị mẫu thực tế. Nút duyệt mẫu sẽ xuất hiện tại đây sau khi xưởng gửi ảnh. Bạn chưa cần thanh toán lúc này.</span>
                } @else {
                  <strong class="text-text-primary">Đang chờ xưởng gửi ảnh mẫu thực tế.</strong>
                  <span> Khi ảnh mẫu sẵn sàng, bạn có thể xem và xác nhận duyệt mẫu tại đây. Sau khi duyệt, bạn sẽ thanh toán đặt cọc 50%.</span>
                }
              </div>
            }

            <!-- Payment Action Card -->
            @if (canPayNow()) {
              <div class="industrial-card p-5 space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
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
                      <p class="text-xs text-text-secondary mb-3">
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
                    <div class="text-xs font-mono bg-surface border border-border p-2.5 rounded-[6px] text-text-secondary leading-relaxed">
                      ACB · STK: 88830468 · CTY TEM NHÃN INOX<br />
                      Nội dung: <span class="text-text-primary">{{ order()!.orderCode }}</span>
                    </div>
                    <input
                      type="text"
                      [(ngModel)]="bankRef"
                      placeholder="Mã giao dịch / Nội dung CK"
                      class="industrial-input w-full px-2.5 py-2 text-sm"
                    />
                    <label class="block text-xs text-text-secondary" for="proof-file">Ảnh/PDF biên lai chuyển khoản</label>
                    <input
                      id="proof-file"
                      type="file"
                      (change)="onProofFileSelected($event)"
                      accept="image/*,.pdf"
                      class="admin-file-input block w-full"
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
              <div class="overflow-x-auto">
              <table class="w-full text-sm text-left">
                <thead class="border-b border-border text-text-muted text-xs uppercase tracking-wide">
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
                        @if (item.designFileUrl || item.prototypeImageUrl) {
                          <div class="mt-2 flex flex-wrap gap-3">
                            @if (item.designFileUrl) {
                              @if (isImage(item.designFileUrl)) {
                                <button type="button" class="tni-thumb" (click)="openPreview(item.designFileUrl, 'Bản vẽ thiết kế · ' + item.itemName)">
                                  <img [src]="item.designFileUrl" alt="Bản vẽ thiết kế" loading="lazy" />
                                  <span>Bản vẽ của bạn</span>
                                </button>
                              } @else {
                                <a class="tni-thumb" [href]="item.designFileUrl" target="_blank" rel="noopener" style="cursor:pointer">
                                  <span class="tni-thumb-file">{{ ext(item.designFileUrl) }}</span>
                                  <span>Tải bản vẽ ↗</span>
                                </a>
                              }
                            }
                            @if (item.prototypeImageUrl) {
                              <button type="button" class="tni-thumb" (click)="openPreview(item.prototypeImageUrl, 'Ảnh mẫu thực tế · ' + item.itemName)">
                                <img [src]="item.prototypeImageUrl" alt="Ảnh mẫu thực tế" loading="lazy" />
                                <span>Ảnh mẫu xưởng</span>
                              </button>
                            }
                          </div>
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

            @if (order()!.paymentTransactions.length) {
              <div class="industrial-card overflow-hidden">
                <div class="bg-surface-raised px-4 py-2.5 border-b border-border font-heading text-xs font-bold uppercase text-text-primary">
                  Lịch sử thanh toán ({{ order()!.paymentTransactions.length }})
                </div>
                <ul class="divide-y divide-border">
                  @for (tx of order()!.paymentTransactions; track tx.id) {
                    <li class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                      <div class="min-w-0 flex-1">
                        <div class="font-semibold text-text-primary text-sm">{{ phaseLabel(tx.paymentPhase) }}</div>
                        <div class="text-xs text-text-secondary">{{ methodLabel(tx.paymentMethod) }}@if (tx.transactionRef) { · Mã GD: {{ tx.transactionRef }} } · {{ tx.createdAt | date:'dd/MM/yyyy HH:mm' }}</div>
                      </div>
                      @if (tx.proofImageUrl && isImage(tx.proofImageUrl)) {
                        <button type="button" class="tni-thumb !w-14" (click)="openPreview(tx.proofImageUrl, 'Biên lai · ' + phaseLabel(tx.paymentPhase))" aria-label="Xem biên lai">
                          <img [src]="tx.proofImageUrl" alt="Biên lai" class="!w-14 !h-10" loading="lazy" />
                        </button>
                      }
                      <span class="font-mono tabular-nums font-bold text-text-primary">{{ tx.amount | vnd }}</span>
                      <span class="tni-chip" [attr.data-tone]="payTone(tx.status)">{{ payLabel(tx.status) }}</span>
                    </li>
                  }
                </ul>
              </div>
            }
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
                <span class="text-text-secondary">Thuế VAT ({{ vatPercent() }}%):</span>
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
              <div class="tni-progress" role="progressbar" [attr.aria-valuenow]="percentPaid()" aria-valuemin="0" aria-valuemax="100"><span [style.width.%]="percentPaid()"></span></div>
              <div class="text-right text-[11px] text-text-muted">Đã thanh toán {{ percentPaid() }}%</div>

              @if (order()!.estimatedCompletionDate) {
                <div class="mt-3 pt-3 border-t border-border space-y-1 bg-bg border rounded-[6px] p-2.5">
                  @if (order()!.estimatedCompletionDate) {
                    <div class="flex justify-between">
                      <span class="text-text-secondary">Dự kiến hoàn thành:</span>
                      <span class="font-mono font-semibold text-text-primary">{{ order()!.estimatedCompletionDate | date:'dd/MM/yyyy' }}</span>
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
                Nhật Ký Tiến Độ Đơn Hàng
              </h2>
              <ol class="order-timeline">
                @for (log of order()!.statusLogs; track log.id; let last = $last) {
                  <li [class.is-last]="last">
                    <div class="font-semibold text-text-primary text-sm">{{ statusLabel(log.toStatus) }}</div>
                    @if (log.note) { <div class="text-text-secondary">{{ log.note }}</div> }
                    <div class="text-[11px] text-text-muted tabular-nums">{{ log.createdAt | date:'dd/MM/yyyy HH:mm' }}</div>
                  </li>
                }
              </ol>
            </div>
          </div>
        </div>
      }
      @if (preview(); as pv) {
        <app-image-lightbox [url]="pv.url" [caption]="pv.caption" (closed)="preview.set(null)" />
      }
    </div>
  `,
  styles: [`
    .order-steps { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 0; list-style: none; margin: 0; padding: 0; }
    .order-step { position: relative; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; text-align: center; color: var(--color-text-muted); font-size: 0.8125rem; line-height: 1.25; padding: 0 0.25rem; }
    .order-step::before { content: ''; position: absolute; top: 0.9rem; right: 50%; width: 100%; height: 2px; background: var(--color-border); z-index: 0; }
    .order-step:first-child::before { display: none; }
    .order-step-dot { position: relative; z-index: 1; width: 1.8rem; height: 1.8rem; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8125rem; background: var(--color-bg-elevated); border: 2px solid var(--color-border); }
    .order-step.is-done { color: var(--color-text-secondary); }
    .order-step.is-done::before, .order-step.is-current::before { background: var(--color-accent); }
    .order-step.is-done .order-step-dot { background: var(--color-accent); border-color: var(--color-accent); color: #fff; }
    .order-step.is-current { color: var(--color-text-primary); font-weight: 700; }
    .order-step.is-current .order-step-dot { border-color: var(--color-accent); color: var(--color-accent); box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-accent) 18%, transparent); }
    @media (max-width: 720px) {
      .order-steps { grid-template-columns: 1fr; gap: 0.25rem; }
      .order-step { flex-direction: row; text-align: left; gap: 0.75rem; padding: 0.25rem 0; }
      .order-step::before { display: none; }
    }
    .order-timeline { list-style: none; margin: 0; padding: 0 0 0 0.25rem; display: flex; flex-direction: column; }
    .order-timeline li { position: relative; padding: 0 0 1rem 1.25rem; border-left: 2px solid var(--color-border); }
    .order-timeline li.is-last { border-left-color: transparent; padding-bottom: 0; }
    .order-timeline li::before { content: ''; position: absolute; left: -0.4rem; top: 0.3rem; width: 0.7rem; height: 0.7rem; border-radius: 999px; background: var(--color-bg-elevated); border: 2px solid var(--color-accent); }
    .order-timeline li.is-last::before { background: var(--color-accent); }
  `],
})
export class OrderDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly orderApi = inject(OrderApiService);
  private readonly quoteApi = inject(QuoteApiService);

  readonly order = signal<OrderDetail | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly actionLoading = signal(false);
  readonly notice = signal('');
  readonly error = signal('');
  readonly prototypeImageLoadedIds = signal(new Set<string>());
  readonly prototypeImageErrorIds = signal(new Set<string>());

  readonly preview = signal<{ url: string; caption: string } | null>(null);
  readonly statusLabel = orderStatusLabel;
  readonly statusTone = orderStatusTone;
  readonly typeLabel = orderTypeLabel;
  readonly payTone = paymentStatusTone;
  readonly isImage = isImageUrl;
  readonly ext = fileExtension;
  phaseLabel = (p: keyof typeof PAYMENT_PHASE_LABEL) => PAYMENT_PHASE_LABEL[p] ?? p;
  methodLabel = (m: keyof typeof PAYMENT_METHOD_LABEL) => PAYMENT_METHOD_LABEL[m] ?? m;
  payLabel = (s: keyof typeof PAYMENT_STATUS_LABEL) => PAYMENT_STATUS_LABEL[s] ?? s;

  percentPaid(): number {
    const o = this.order();
    return o ? paidPercent(o.paidAmount, o.totalAmount) : 0;
  }

  /** The API sends vatRate as a fraction (0.1); show it as a percentage (10). */
  vatPercent(): number {
    const rate = this.order()?.vatRate ?? 0;
    return Math.round((rate <= 1 ? rate * 100 : rate) * 100) / 100;
  }

  openPreview(url: string | undefined, caption: string): void {
    if (url) this.preview.set({ url, caption });
  }

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
    else {
      this.loading.set(false);
      this.loadError.set('Không tìm thấy mã đơn hàng.');
    }
  }

  loadOrder(id: string): void {
    this.loading.set(true);
    this.loadError.set('');
    this.orderApi.getMyOrderDetail(id).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success && res.data) this.order.set(res.data);
        else this.loadError.set('Không thể tải thông tin đơn hàng.');
      },
      error: (err) => {
        this.loading.set(false);
        this.loadError.set(err?.error?.message || 'Không thể kết nối máy chủ để tải đơn hàng.');
      },
    });
  }

  retryLoad(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadOrder(id);
  }

  printOrderSummary(): void {
    window.print();
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

  onPrototypeImageLoad(itemId: string): void {
    this.prototypeImageErrorIds.update((ids) => {
      const next = new Set(ids);
      next.delete(itemId);
      return next;
    });
    this.prototypeImageLoadedIds.update((ids) => new Set(ids).add(itemId));
  }

  onPrototypeImageError(itemId: string): void {
    this.prototypeImageLoadedIds.update((ids) => {
      const next = new Set(ids);
      next.delete(itemId);
      return next;
    });
    this.prototypeImageErrorIds.update((ids) => new Set(ids).add(itemId));
  }

  canApprovePrototype(): boolean {
    const order = this.order();
    return !!order && order.items.length > 0
      && order.items.every((item) =>
        !!item.prototypeImageUrl && this.prototypeImageLoadedIds().has(item.id)
      );
  }

  isCustomOrderAwaitingWorkshopApproval(): boolean {
    const o = this.order();
    return o?.orderType === 'CUSTOM_QUOTE_ORDER'
      && (o.status === 'QUOTE_PENDING' || o.status === 'QUOTE_APPROVED' || o.status === 'PROTOTYPING');
  }

  canPayNow(): boolean {
    const o = this.order();
    if (!o || this.remainingAmount() <= 0) return false;
    if (o.orderType === 'DIRECT_STORE_ORDER') return o.status === 'AWAITING_DEPOSIT';
    return o.status === 'AWAITING_DEPOSIT' || o.status === 'READY_FOR_DELIVERY';
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
