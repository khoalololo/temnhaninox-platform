import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CatalogApiService } from '../../core/services/catalog-api.service';
import { QuoteApiService } from '../../core/services/quote-api.service';
import { CartApiService } from '../../core/services/cart-api.service';
import { ToastService } from '../../shared/components/toast/toast.component';
import { AuthService } from '../../core/services/auth.service';
import { Material, ProcessingMethod } from '../../core/models/catalog.models';
import { FileUploadResponse, QuoteCalculationResponse } from '../../core/models/quote.models';
import { VndCurrencyPipe } from '../../core/pipes/vnd-currency.pipe';
import { Nameplate3dViewerComponent } from './nameplate-3d-viewer.component';
import { ButtonDirective } from '../../shared/components/button/button.component';

@Component({
  selector: 'app-quote-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, VndCurrencyPipe, Nameplate3dViewerComponent, ButtonDirective],
  template: `
    <div class="mx-auto max-w-[1600px] px-3 py-5 sm:px-5 lg:px-8 lg:py-8">
      <!-- Top Workstation Header -->
      <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between lg:mb-7">
        <div>
          <div class="font-mono text-xs font-semibold uppercase tracking-wider text-accent">
            Xưởng Gia Công Chính Xác · Báo Giá Tự Động
          </div>
          <h1 class="mt-1 font-heading text-2xl font-bold leading-tight text-text-primary sm:text-3xl">Thiết kế tem &amp; báo giá 3D</h1>
          <p class="mt-1 max-w-2xl text-sm text-text-secondary">Nhập thông số, xem trước mẫu tem và nhận dự toán sản xuất theo thời gian thực.</p>
        </div>
        <div class="max-w-xl rounded-lg bg-surface px-4 py-3 text-xs leading-5 text-text-secondary sm:text-right">
          Công thức xưởng: Tấm mỏng (≤1.0mm) theo m² · Phôi dày (&gt;1.0mm) theo khối lượng kg
        </div>
      </div>

      <nav class="quote-step-navigation mb-5 grid grid-cols-3 gap-2 rounded-xl border border-border bg-bg-elevated p-2 shadow-sm lg:mb-7" aria-label="Các bước thiết kế báo giá">
        <a href="#quote-configuration" (click)="scrollToSection($event, 'quote-configuration')" class="quote-step-link group flex min-h-16 items-center gap-2 rounded-lg px-2 py-2 transition-colors sm:gap-3 sm:px-4">
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">1</span>
          <span class="min-w-0"><span class="block truncate text-xs font-bold text-text-primary sm:text-sm">Thông số</span><span class="hidden text-xs text-text-muted sm:block">Vật liệu &amp; kích thước</span></span>
        </a>
        <a href="#quote-preview" (click)="scrollToSection($event, 'quote-preview')" class="quote-step-link group flex min-h-16 items-center gap-2 rounded-lg px-2 py-2 transition-colors sm:gap-3 sm:px-4">
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-raised text-sm font-bold text-accent">2</span>
          <span class="min-w-0"><span class="block truncate text-xs font-bold text-text-primary sm:text-sm">Xem mẫu 3D</span><span class="hidden text-xs text-text-muted sm:block">Xoay &amp; kiểm tra thiết kế</span></span>
        </a>
        <a href="#quote-summary" (click)="scrollToSection($event, 'quote-summary')" class="quote-step-link group flex min-h-16 items-center gap-2 rounded-lg px-2 py-2 transition-colors sm:gap-3 sm:px-4">
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-raised text-sm font-bold text-accent">3</span>
          <span class="min-w-0"><span class="block truncate text-xs font-bold text-text-primary sm:text-sm">Báo giá</span><span class="hidden text-xs text-text-muted sm:block">Dự toán &amp; thêm vào giỏ</span></span>
        </a>
      </nav>

      <div class="grid min-w-0 grid-cols-1 items-start gap-5 lg:grid-cols-12 lg:gap-6">
        <!-- Configuration -->
        <section id="quote-configuration" class="industrial-card min-w-0 scroll-mt-28 space-y-5 p-4 sm:p-6 lg:col-span-5">
          <div class="flex items-center justify-between gap-3">
            <div>
              <span class="text-xs font-semibold uppercase tracking-wider text-accent">Bước 1</span>
              <h2 class="mt-1 font-heading text-base font-bold text-text-primary sm:text-lg">Thông số &amp; công nghệ</h2>
            </div>
            <span class="tni-chip no-dot" data-tone="muted">Đơn vị: mm</span>
          </div>

          <!-- Material Selector -->
          <div>
            <label class="mb-2 block text-sm font-semibold text-text-secondary">Vật liệu kim loại / nhựa *</label>
            <select
              [(ngModel)]="selectedMaterialId"
              (ngModelChange)="onMaterialChange()"
              class="industrial-input min-h-12 w-full px-3.5 py-3 text-sm font-medium"
            >
              @for (mat of materials(); track mat.id) {
                <option [value]="mat.id">
                  {{ mat.name }} ({{ mat.code }}) · Dày {{ mat.minThicknessMm }}–{{ mat.maxThicknessMm }}mm
                </option>
              }
            </select>
          </div>

          <!-- Processing Method Selector -->
          <div>
            <label class="mb-2 block text-sm font-semibold text-text-secondary">Công nghệ gia công bề mặt *</label>
            <select
              [(ngModel)]="selectedMethodId"
              (ngModelChange)="recalculate()"
              class="industrial-input min-h-12 w-full px-3.5 py-3 text-sm font-medium"
            >
              @for (pm of availableMethods(); track pm.id) {
                <option [value]="pm.id">
                  {{ pm.name }} (Dự kiến {{ pm.baseLeadTimeDays || 3 }} ngày)
                </option>
              }
            </select>
          </div>

          <!-- Dimensions Grid -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label class="mb-1.5 block text-xs font-semibold text-text-secondary sm:text-sm">Chiều dài (mm)</label>
              <input
                type="number"
                [(ngModel)]="widthMm"
                (ngModelChange)="recalculate()"
                min="5"
                max="2000"
                step="1"
                class="industrial-input min-h-12 w-full px-3 py-2.5 text-base font-mono tabular-nums"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-semibold text-text-secondary sm:text-sm">Chiều rộng (mm)</label>
              <input
                type="number"
                [(ngModel)]="heightMm"
                (ngModelChange)="recalculate()"
                min="5"
                max="2000"
                step="1"
                class="industrial-input min-h-12 w-full px-3 py-2.5 text-base font-mono tabular-nums"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-semibold text-text-secondary sm:text-sm">Độ dày (mm)</label>
              <input
                type="number"
                [(ngModel)]="thicknessMm"
                (ngModelChange)="recalculate()"
                [min]="selectedMaterial()?.minThicknessMm || 0.2"
                [max]="selectedMaterial()?.maxThicknessMm || 10"
                step="0.1"
                class="industrial-input min-h-12 w-full px-3 py-2.5 text-base font-mono tabular-nums"
              />
            </div>
          </div>

          <!-- Quantity & Volume Tiers -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-sm font-semibold text-text-secondary">Số lượng đặt sản xuất (tem)</label>
              <div class="flex flex-wrap gap-1.5 font-mono text-xs">
                @for (presetQty of [50, 200, 500, 1000]; track presetQty) {
                  <button
                    type="button"
                    (click)="quantity = presetQty; recalculate()"
                    class="quote-quantity-preset"
                    [class.is-active]="quantity === presetQty"
                  >
                    {{ presetQty }}
                  </button>
                }
              </div>
            </div>
            <input
              type="number"
              [(ngModel)]="quantity"
              (ngModelChange)="recalculate()"
              min="1"
              step="1"
              class="industrial-input min-h-12 w-full px-3 py-2.5 text-lg font-mono font-bold tabular-nums"
            />
          </div>

          <!-- 3D Engraving Text & Rivets -->
          <div class="space-y-3 rounded-lg bg-surface p-4 sm:p-5">
            <div class="flex items-center justify-between">
              <label class="text-sm font-semibold text-text-secondary">Nội dung hiển thị trên tem 3D</label>
              <label class="flex cursor-pointer items-center gap-1.5 text-xs text-text-secondary">
                <input type="checkbox" [(ngModel)]="cornerRivets" class="accent-accent" />
                <span>4 lỗ đinh tán góc</span>
              </label>
            </div>
            <textarea
              rows="3"
              [(ngModel)]="previewText"
              class="industrial-input w-full px-3 py-2.5 text-sm font-mono"
            ></textarea>
          </div>

          <!-- Technical Artwork File Upload (SeaweedFS S3) -->
          <div class="space-y-2">
            <label class="mb-1 block text-sm font-semibold text-text-secondary">
              Tải lên bản vẽ thiết kế (.CDR, .AI, .PDF, .DXF, .PNG)
            </label>
            <input
              type="file"
              (change)="onFileSelected($event)"
              accept=".cdr,.ai,.pdf,.dxf,.svg,.png,.jpg,.jpeg,.zip"
              class="quote-file-input block min-h-12 w-full rounded-lg border border-border bg-bg p-2 text-sm text-text-secondary file:mr-3 file:min-h-9 file:rounded-[5px] file:border file:border-[#9acb98] file:bg-[#c8e6c1] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#202124] hover:file:bg-[#b6dcae]"
            />
            @if (fileUploadError()) {
              <div class="mt-1 text-sm text-danger">{{ fileUploadError() }}</div>
            }
            @if (uploading()) {
              <div class="mt-1 text-sm font-mono text-accent">Đang tải file lên máy chủ xưởng...</div>
            }
            @if (uploadedFile()) {
              <div class="mt-1.5 flex items-center justify-between rounded-[6px] border border-success/50 bg-success/10 p-3 text-sm text-success">
                <span class="flex min-w-0 items-center gap-2 truncate font-mono">
                  <svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
                  {{ uploadedFile()!.fileName }}
                </span>
                <button type="button" (click)="uploadedFile.set(null)" class="site-action-danger ml-2" aria-label="Xóa tệp đã tải lên">
                  <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m18 6-12 12M6 6l12 12" /></svg>
                </button>
              </div>
            }
          </div>

          <!-- Customer Note -->
          <div>
            <label class="mb-2 block text-sm font-semibold text-text-secondary">Ghi chú kỹ thuật cho xưởng</label>
            <input
              type="text"
              [(ngModel)]="customerNote"
              placeholder="VD: Bo góc R3, đổ sơn đen nền, dán sẵn keo 3M mặt sau..."
              class="industrial-input min-h-12 w-full px-3.5 py-3 text-sm"
            />
          </div>
        </section>

        <!-- Interactive 3D preview -->
        <section id="quote-preview" class="min-w-0 scroll-mt-28 space-y-4 lg:col-span-7">
          <div class="flex items-center justify-between gap-3">
            <div>
              <span class="text-xs font-semibold uppercase tracking-wider text-accent">Bước 2</span>
              <h2 class="mt-1 font-heading text-base font-bold text-text-primary sm:text-lg">Xem trước sản phẩm</h2>
            </div>
            <span class="text-xs text-text-muted sm:text-sm">Tương tác trực tiếp với mẫu</span>
          </div>
          <app-nameplate-3d-viewer
            class="block"
            [widthMm]="widthMm"
            [heightMm]="heightMm"
            [thicknessMm]="thicknessMm"
            [materialCode]="selectedMaterial()?.code || 'INOX_304'"
            [materialName]="selectedMaterial()?.name || 'Inox 304'"
            [processCode]="selectedMethod()?.code || 'ETCHING'"
            [processName]="selectedMethod()?.name || 'Ăn mòn'"
            [previewText]="previewText"
            [cornerRivets]="cornerRivets"
            [artworkDataUrl]="artworkDataUrl()"
            [cadFileName]="uploadedFile()?.fileName || null"
          />

          <div class="industrial-card flex flex-col gap-2 p-4 text-sm text-text-secondary sm:p-5">
            <span class="font-semibold text-text-primary">Quy trình đảm bảo chất lượng</span>
            <span class="leading-6">
              1. Gửi đơn; 2. Xưởng làm tem mẫu và gửi ảnh duyệt; 3. Đặt cọc 50% để sản xuất
            </span>
          </div>
        </section>

        <!-- Live pricing summary -->
        <section id="quote-summary" class="industrial-card min-w-0 scroll-mt-28 space-y-5 p-4 sm:p-6 lg:col-span-12">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span class="text-xs font-semibold uppercase tracking-wider text-accent">Bước 3</span>
              <h2 class="mt-1 font-heading text-base font-bold text-text-primary sm:text-lg">Bảng tính báo giá</h2>
            </div>
            @if (calculating()) {
              <span class="tni-chip no-dot" data-tone="info">Đang tính...</span>
            }
          </div>

          @if (quoteError()) {
            <div class="p-2.5 rounded-[6px] border border-danger/50 bg-danger/10 text-xs text-danger">
              {{ quoteError() }}
            </div>
          }

          @if (quote()) {
            <div class="grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-4">
              <div class="space-y-2 rounded-lg border border-border bg-bg p-4">
                <div class="flex justify-between">
                  <span class="text-text-secondary">Chế độ tính</span>
                  <span class="text-right font-medium text-steel">{{ quote()!.pricingFormulaMode }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-text-secondary">Diện tích / tem</span>
                  <span class="tabular-nums text-text-primary">{{ quote()!.areaM2 }} m²</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-text-secondary">Khối lượng / tem</span>
                  <span class="tabular-nums text-text-primary">{{ quote()!.calculatedWeightKg }} kg</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-text-secondary">Thời gian dự kiến</span>
                  <span class="text-right tabular-nums font-medium text-text-primary">~{{ quote()!.estimatedLeadTimeDays }} ngày</span>
                </div>
              </div>

              <div class="space-y-3 rounded-lg border border-border bg-bg p-4">
                <div class="flex items-center justify-between gap-3">
                  <span class="text-text-secondary">Đơn giá / tem</span>
                  <span class="price-text text-right font-mono font-bold tabular-nums">{{ quote()!.unitPrice | vnd }}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-text-secondary">Tạm tính ({{ quote()!.quantity }} tem)</span>
                  <span class="price-text text-right font-mono tabular-nums">{{ quote()!.subtotalAmount | vnd }}</span>
                </div>
                @if ((quote()!.discountAmount || 0) > 0) {
                  <div class="flex items-center justify-between gap-3 font-medium text-success">
                    <span>Chiết khấu</span>
                    <span class="price-text text-right font-mono tabular-nums">-{{ quote()!.discountAmount | vnd }}</span>
                  </div>
                }
              </div>

              <div class="space-y-3 rounded-lg border border-border bg-bg p-4">
                <label class="flex cursor-pointer items-center justify-between gap-3">
                  <span class="text-text-secondary font-medium">Xuất hóa đơn VAT đỏ (10%)</span>
                  <input
                    type="checkbox"
                    [(ngModel)]="requiresVatInvoice"
                    (ngModelChange)="recalculate()"
                    class="rounded border-border accent-accent"
                  />
                </label>
                @if (requiresVatInvoice) {
                  <div class="flex justify-between gap-3 text-text-secondary">
                    <span>Thuế GTGT (VAT):</span>
                    <span class="price-text text-right font-mono tabular-nums text-text-primary">{{ quote()!.vatAmount | vnd }}</span>
                  </div>
                }
              </div>

              <div class="flex flex-col justify-center gap-3 rounded-lg bg-surface p-4">
                <div>
                  <span class="block text-xs font-semibold uppercase tracking-wide text-text-secondary">Tổng cộng</span>
                  <span class="price-text mt-1 block break-words font-mono text-2xl font-bold tabular-nums sm:text-3xl">{{ quote()!.totalAmount | vnd }}</span>
                </div>
                <div class="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-accent/30 bg-bg-elevated px-3 py-2.5">
                  <span class="text-sm font-medium text-accent">Cọc sản xuất (50%)</span>
                  <span class="price-text font-mono font-bold tabular-nums">{{ quote()!.depositRequiredAmount | vnd }}</span>
                </div>
              </div>
            </div>
          }

          <div class="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            @if (authService.isAdmin()) {
              <p class="text-sm text-text-muted">Đang xem với tư cách quản trị viên</p>
            } @else {
              <p class="text-sm text-text-secondary">Kiểm tra kỹ thông số trước khi lưu cấu hình vào giỏ hàng.</p>
              <button
              type="button"
              (click)="addCustomItemToCart()"
              [disabled]="addingToCart() || !quote() || !!quoteError()"
              appButton
              variant="primary"
              size="lg"
              class="min-h-12 w-full sm:w-auto"
            >
                {{ addingToCart() ? 'Đang thêm vào giỏ...' : '+ Thêm cấu hình vào giỏ hàng' }}
              </button>

              @if (addedSuccess()) {
                <div class="rounded-[6px] border border-success/50 bg-success/10 p-3 text-sm text-success sm:ml-auto">
                <svg viewBox="0 0 24 24" class="mr-1 inline h-4 w-4 align-text-bottom" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M3 4h2l2.2 10.1a2 2 0 0 0 2 1.6h8.5a2 2 0 0 0 1.9-1.4L21 8H6" />
                  <circle cx="10" cy="19" r="1.3" />
                  <circle cx="18" cy="19" r="1.3" />
                </svg>
                Đã lưu cấu hình vào giỏ!
                <a routerLink="/cart" class="inline-flex items-center gap-1 underline font-semibold text-steel hover:text-steel-hover">
                  Mở giỏ hàng
                  <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12h14m0 0-6-6m6 6-6 6" /></svg>
                </a>
                </div>
              }
            }
          </div>
        </section>
      </div>
    </div>
  `,
})
export class QuoteBuilderComponent implements OnInit {
  private readonly catalogApi = inject(CatalogApiService);
  private readonly quoteApi = inject(QuoteApiService);
  private readonly cartApi = inject(CartApiService);
  private readonly toast = inject(ToastService);
  readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly materials = signal<Material[]>([]);
  readonly quote = signal<QuoteCalculationResponse | null>(null);
  readonly uploadedFile = signal<FileUploadResponse | null>(null);
  readonly artworkDataUrl = signal<string | null>(null);
  readonly calculating = signal(false);
  readonly uploading = signal(false);
  readonly addingToCart = signal(false);
  readonly addedSuccess = signal(false);
  readonly quoteError = signal('');
  readonly fileUploadError = signal('');

  productId?: string;
  selectedMaterialId = '';
  selectedMethodId = '';
  widthMm = 80;
  heightMm = 40;
  thicknessMm = 0.8;
  quantity = 100;
  requiresVatInvoice = true;
  cornerRivets = true;
  previewText = 'MÁY BƠM CÔNG NGHIỆP\nMODEL: TNI-304-PRO\nS/N: 2026-00849';
  customerNote = '';

  readonly selectedMaterial = computed(
    () => this.materials().find((m) => m.id === this.selectedMaterialId) || null
  );

  readonly availableMethods = computed<ProcessingMethod[]>(
    () => this.selectedMaterial()?.allowedProcessingMethods || []
  );

  readonly selectedMethod = computed(
    () => this.availableMethods().find((pm) => pm.id === this.selectedMethodId) || null
  );

  scrollToSection(event: Event, sectionId: string): void {
    event.preventDefault();
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    this.productId = qp.get('productId') || undefined;
    this.widthMm = this.readDimension(qp.get('w'), this.widthMm, 5, 2000);
    this.heightMm = this.readDimension(qp.get('h'), this.heightMm, 5, 2000);
    this.thicknessMm = this.readDimension(qp.get('t'), this.thicknessMm, 0.1, 100);

    this.catalogApi.getMaterials().subscribe({
      next: (res) => {
        if (res.success && res.data?.length) {
          this.materials.set(res.data);
          const qMat = qp.get('materialId');
          const matchedMat = res.data.find((m) => m.id === qMat) || res.data[0];
          this.selectedMaterialId = matchedMat.id;

          const methods = matchedMat.allowedProcessingMethods || [];
          const qMethod = qp.get('processingMethodId');
          const matchedMethod = methods.find((pm) => pm.id === qMethod) || methods[0];
          this.selectedMethodId = matchedMethod?.id || '';

          this.recalculate();
        }
      },
    });
  }

  private readDimension(value: string | null, fallback: number, min: number, max: number): number {
    if (value === null) return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
  }

  onMaterialChange(): void {
    const mat = this.selectedMaterial();
    if (!mat) return;
    if (this.thicknessMm < mat.minThicknessMm) this.thicknessMm = mat.minThicknessMm;
    if (this.thicknessMm > mat.maxThicknessMm) this.thicknessMm = mat.maxThicknessMm;

    const methods = mat.allowedProcessingMethods || [];
    if (!methods.some((m) => m.id === this.selectedMethodId)) {
      this.selectedMethodId = methods[0]?.id || '';
    }
    this.recalculate();
  }

  recalculate(): void {
    if (!this.selectedMaterialId || !this.selectedMethodId) return;
    if (this.widthMm < 1 || this.heightMm < 1 || this.thicknessMm < 0.1 || this.quantity < 1) return;

    this.calculating.set(true);
    this.quoteError.set('');

    this.quoteApi
      .calculateQuote({
        materialId: this.selectedMaterialId,
        processingMethodId: this.selectedMethodId,
        widthMm: Number(this.widthMm),
        heightMm: Number(this.heightMm),
        thicknessMm: Number(this.thicknessMm),
        quantity: Math.floor(Number(this.quantity)),
        requiresVatInvoice: this.requiresVatInvoice,
      })
      .subscribe({
        next: (res) => {
          this.calculating.set(false);
          if (res.success && res.data) {
            this.quote.set(res.data);
          } else {
            this.quoteError.set(res.message || 'Thông số chưa hợp lệ.');
          }
        },
        error: (err) => {
          this.calculating.set(false);
          this.quoteError.set(err?.error?.message || 'Độ dày hoặc công nghệ gia công không tương thích với vật liệu.');
        },
      });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.fileUploadError.set('');

    if (/\.(png|jpe?g|svg|webp)$/i.test(file.name)) {
      const reader = new FileReader();
      reader.onload = () => {
        this.artworkDataUrl.set(typeof reader.result === 'string' ? reader.result : null);
      };
      reader.readAsDataURL(file);
    } else {
      this.artworkDataUrl.set(null);
    }

    this.uploading.set(true);
    this.quoteApi.uploadFile(file, 'design-files').subscribe({
      next: (res) => {
        this.uploading.set(false);
        if (res.success && res.data) {
          this.uploadedFile.set(res.data);
        }
      },
      error: (err) => {
        this.uploading.set(false);
        this.quoteError.set(err?.error?.message || 'Tải file thiết kế thất bại.');
      },
    });
  }

  addCustomItemToCart(): void {
    if (!this.uploadedFile()) {
      this.fileUploadError.set('Vui lòng tải lên bản vẽ thiết kế trước khi thêm cấu hình vào giỏ hàng.');
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/quote-builder' } });
      return;
    }

    this.addingToCart.set(true);
    this.addedSuccess.set(false);

    this.cartApi
      .addItem({
        itemType: 'CUSTOM_ITEM',
        productId: this.productId,
        materialId: this.selectedMaterialId,
        processingMethodId: this.selectedMethodId,
        widthMm: Number(this.widthMm),
        heightMm: Number(this.heightMm),
        thicknessMm: Number(this.thicknessMm),
        quantity: Math.floor(Number(this.quantity)),
        designFileUrl: this.uploadedFile()?.url,
        customerNote: this.customerNote.trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.addingToCart.set(false);
          if (!res.success || !res.data) {
            const message = res.message || 'Không thể thêm vào giỏ hàng.';
            this.quoteError.set(message);
            this.toast.show(message, 'error', 'Không thể thêm cấu hình');
            return;
          }
          this.addedSuccess.set(true);
          this.toast.show('Cấu hình gia công đã được thêm vào giỏ hàng của bạn.', 'success', 'Đã thêm vào giỏ hàng', 'cart');
        },
        error: (err) => {
          this.addingToCart.set(false);
          const message = err?.error?.message || 'Không thể thêm vào giỏ hàng.';
          this.quoteError.set(message);
          this.toast.show(message, 'error', 'Không thể thêm cấu hình');
        },
      });
  }
}
