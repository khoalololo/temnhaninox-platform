import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CatalogApiService } from '../../core/services/catalog-api.service';
import { QuoteApiService } from '../../core/services/quote-api.service';
import { CartApiService } from '../../core/services/cart-api.service';
import { AuthService } from '../../core/services/auth.service';
import { Material, ProcessingMethod } from '../../core/models/catalog.models';
import { FileUploadResponse, QuoteCalculationResponse } from '../../core/models/quote.models';
import { VndCurrencyPipe } from '../../core/pipes/vnd-currency.pipe';
import { Nameplate3dViewerComponent } from './nameplate-3d-viewer.component';

@Component({
  selector: 'app-quote-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, VndCurrencyPipe, Nameplate3dViewerComponent],
  template: `
    <div class="max-w-[1440px] mx-auto px-4 py-6">
      <!-- Top Workstation Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-5 border-b border-slate-300">
        <div>
          <div class="text-[11px] font-mono uppercase tracking-wider text-amber-700 font-bold">
            Xưởng Gia Công Chính Xác · Báo Giá Tự Động
          </div>
          <h1 class="text-xl font-bold text-slate-900">Công Cụ Thiết Lập Kích Thước & Xem Mẫu 3D</h1>
        </div>
        <div class="text-xs font-mono text-slate-500">
          Công thức xưởng: Tấm mỏng (&lt;2.0mm) theo m² · Phôi dày (≥2.0mm) theo khối lượng kg
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <!-- LEFT PANEL: Technical Specification Controls (4 cols) -->
        <div class="lg:col-span-4 bg-white border border-slate-300 rounded-md p-4 space-y-4">
          <div class="border-b border-slate-200 pb-2.5 flex items-center justify-between">
            <h2 class="text-xs font-bold uppercase tracking-wider text-slate-900">
              1. Thông Số Phôi & Công Nghệ
            </h2>
            <span class="text-[11px] font-mono text-slate-500">Đơn vị: mm</span>
          </div>

          <!-- Material Selector -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Vật liệu kim loại / nhựa *</label>
            <select
              [(ngModel)]="selectedMaterialId"
              (ngModelChange)="onMaterialChange()"
              class="w-full border border-slate-300 rounded-md px-3 py-2 text-xs font-medium bg-white focus:outline-none focus:border-amber-600"
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
            <label class="block text-xs font-semibold text-slate-700 mb-1">Công nghệ gia công bề mặt *</label>
            <select
              [(ngModel)]="selectedMethodId"
              (ngModelChange)="recalculate()"
              class="w-full border border-slate-300 rounded-md px-3 py-2 text-xs font-medium bg-white focus:outline-none focus:border-amber-600"
            >
              @for (pm of availableMethods(); track pm.id) {
                <option [value]="pm.id">
                  {{ pm.name }} (Dự kiến {{ pm.baseLeadTimeDays || 3 }} ngày)
                </option>
              }
            </select>
          </div>

          <!-- Dimensions Grid -->
          <div class="grid grid-cols-3 gap-2.5">
            <div>
              <label class="block text-[11px] font-semibold text-slate-700 mb-1">Chiều dài (mm)</label>
              <input
                type="number"
                [(ngModel)]="widthMm"
                (ngModelChange)="recalculate()"
                min="5"
                max="2000"
                step="1"
                class="w-full border border-slate-300 rounded-md px-2.5 py-2 text-xs font-mono tabular-nums focus:outline-none focus:border-amber-600"
              />
            </div>
            <div>
              <label class="block text-[11px] font-semibold text-slate-700 mb-1">Chiều rộng (mm)</label>
              <input
                type="number"
                [(ngModel)]="heightMm"
                (ngModelChange)="recalculate()"
                min="5"
                max="2000"
                step="1"
                class="w-full border border-slate-300 rounded-md px-2.5 py-2 text-xs font-mono tabular-nums focus:outline-none focus:border-amber-600"
              />
            </div>
            <div>
              <label class="block text-[11px] font-semibold text-slate-700 mb-1">Độ dày (mm)</label>
              <input
                type="number"
                [(ngModel)]="thicknessMm"
                (ngModelChange)="recalculate()"
                [min]="selectedMaterial()?.minThicknessMm || 0.2"
                [max]="selectedMaterial()?.maxThicknessMm || 10"
                step="0.1"
                class="w-full border border-slate-300 rounded-md px-2.5 py-2 text-xs font-mono tabular-nums focus:outline-none focus:border-amber-600"
              />
            </div>
          </div>

          <!-- Quantity & Volume Tiers -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-xs font-semibold text-slate-700">Số lượng đặt sản xuất (tem)</label>
              <div class="flex gap-1 font-mono text-[10px]">
                @for (presetQty of [50, 200, 500, 1000]; track presetQty) {
                  <button
                    type="button"
                    (click)="quantity = presetQty; recalculate()"
                    class="px-1.5 py-0.5 rounded border"
                    [class]="quantity === presetQty ? 'bg-amber-600 text-white border-amber-600' : 'bg-slate-100 text-slate-700 border-slate-300'"
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
              class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono tabular-nums font-bold focus:outline-none focus:border-amber-600"
            />
          </div>

          <!-- 3D Engraving Text & Rivets -->
          <div class="border-t border-slate-200 pt-3 space-y-2.5">
            <div class="flex items-center justify-between">
              <label class="text-xs font-semibold text-slate-700">Nội dung mô phỏng trên mặt tem 3D</label>
              <label class="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
                <input type="checkbox" [(ngModel)]="cornerRivets" />
                <span>4 lỗ đinh tán góc</span>
              </label>
            </div>
            <textarea
              rows="3"
              [(ngModel)]="previewText"
              class="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-amber-600"
            ></textarea>
          </div>

          <!-- Technical Artwork File Upload (SeaweedFS S3) -->
          <div class="border-t border-slate-200 pt-3">
            <label class="block text-xs font-semibold text-slate-700 mb-1">
              Tải lên bản vẽ thiết kế (.CDR, .AI, .PDF, .DXF, .PNG)
            </label>
            <input
              type="file"
              (change)="onFileSelected($event)"
              accept=".cdr,.ai,.pdf,.dxf,.svg,.png,.jpg,.jpeg,.zip"
              class="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-slate-300 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200"
            />
            @if (uploading()) {
              <div class="text-[11px] font-mono text-amber-700 mt-1">Đang tải file lên máy chủ xưởng...</div>
            }
            @if (uploadedFile()) {
              <div class="mt-1.5 p-2 rounded bg-emerald-50 border border-emerald-300 text-[11px] text-emerald-800 flex items-center justify-between">
                <span class="truncate font-mono">✓ {{ uploadedFile()!.fileName }}</span>
                <button type="button" (click)="uploadedFile.set(null)" class="text-red-600 font-bold ml-2">✕</button>
              </div>
            }
          </div>

          <!-- Customer Note -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Ghi chú kỹ thuật cho xưởng</label>
            <input
              type="text"
              [(ngModel)]="customerNote"
              placeholder="VD: Bo góc R3, đổ sơn đen nền, dán sẵn keo 3M mặt sau..."
              class="w-full border border-slate-300 rounded-md px-3 py-2 text-xs focus:outline-none focus:border-amber-600"
            />
          </div>
        </div>

        <!-- CENTER PANEL: Interactive Three.js 3D Viewport (5 cols) -->
        <div class="lg:col-span-5 space-y-3">
          <app-nameplate-3d-viewer
            [widthMm]="widthMm"
            [heightMm]="heightMm"
            [thicknessMm]="thicknessMm"
            [materialCode]="selectedMaterial()?.code || 'INOX_304'"
            [materialName]="selectedMaterial()?.name || 'Inox 304'"
            [processCode]="selectedMethod()?.code || 'ETCHING'"
            [processName]="selectedMethod()?.name || 'Ăn mòn'"
            [previewText]="previewText"
            [cornerRivets]="cornerRivets"
          />

          <div class="bg-white border border-slate-300 rounded-md p-3 text-xs text-slate-600 flex items-center justify-between">
            <span>Quy trình đảm bảo chất lượng:</span>
            <span class="font-mono font-semibold text-slate-900">
              1. Gửi đơn → 2. Xưởng làm 1 tem mẫu chụp ảnh duyệt → 3. Cọc 50% sản xuất
            </span>
          </div>
        </div>

        <!-- RIGHT PANEL: Live Deterministic Pricing Receipt (3 cols) -->
        <div class="lg:col-span-3 bg-white border border-slate-300 rounded-md p-4 space-y-4">
          <div class="border-b border-slate-200 pb-2.5 flex items-center justify-between">
            <h2 class="text-xs font-bold uppercase tracking-wider text-slate-900">
              2. Bảng Tính Báo Giá
            </h2>
            @if (calculating()) {
              <span class="text-[11px] font-mono text-amber-600">Đang tính...</span>
            }
          </div>

          @if (quoteError()) {
            <div class="p-2.5 rounded border border-red-300 bg-red-50 text-xs text-red-700">
              {{ quoteError() }}
            </div>
          }

          @if (quote()) {
            <div class="space-y-2.5 text-xs">
              <div class="bg-slate-50 border border-slate-200 rounded p-2.5 space-y-1 font-mono text-[11px]">
                <div class="flex justify-between">
                  <span class="text-slate-500">Chế độ tính:</span>
                  <span class="font-semibold text-slate-800">{{ quote()!.pricingFormulaMode }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">Diện tích 1 tem:</span>
                  <span class="tabular-nums text-slate-800">{{ quote()!.areaM2 }} m²</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">Khối lượng 1 tem:</span>
                  <span class="tabular-nums text-slate-800">{{ quote()!.calculatedWeightKg }} kg</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">Thời gian dự kiến:</span>
                  <span class="tabular-nums font-semibold text-slate-900">~{{ quote()!.estimatedLeadTimeDays }} ngày làm việc</span>
                </div>
              </div>

              <div class="flex justify-between items-baseline pt-1">
                <span class="text-slate-600">Đơn giá / 1 tem:</span>
                <span class="font-mono tabular-nums font-bold text-sm text-slate-900">
                  {{ quote()!.unitPrice | vnd }}
                </span>
              </div>

              <div class="flex justify-between">
                <span class="text-slate-600">Tạm tính ({{ quote()!.quantity }} tem):</span>
                <span class="font-mono tabular-nums text-slate-900">{{ quote()!.subtotalAmount | vnd }}</span>
              </div>

              @if ((quote()!.discountAmount || 0) > 0) {
                <div class="flex justify-between text-emerald-700 font-medium">
                  <span>Chiết khấu số lượng:</span>
                  <span class="font-mono tabular-nums">-{{ quote()!.discountAmount | vnd }}</span>
                </div>
              }

              <div class="pt-1 border-t border-slate-200">
                <label class="flex items-center justify-between cursor-pointer">
                  <span class="text-slate-700 font-medium">Xuất hóa đơn VAT đỏ (10%)</span>
                  <input
                    type="checkbox"
                    [(ngModel)]="requiresVatInvoice"
                    (ngModelChange)="recalculate()"
                    class="rounded border-slate-300"
                  />
                </label>
                @if (requiresVatInvoice) {
                  <div class="flex justify-between text-slate-600 mt-1.5">
                    <span>Thuế GTGT (VAT):</span>
                    <span class="font-mono tabular-nums">{{ quote()!.vatAmount | vnd }}</span>
                  </div>
                }
              </div>

              <div class="border-t-2 border-slate-900 pt-3 flex justify-between items-baseline">
                <span class="font-bold text-slate-900">TỔNG CỘNG:</span>
                <span class="font-mono tabular-nums text-lg font-bold text-amber-700">
                  {{ quote()!.totalAmount | vnd }}
                </span>
              </div>

              <div class="bg-amber-50 border border-amber-300 rounded p-2.5 flex justify-between items-center">
                <span class="text-amber-900 font-semibold">Cọc sản xuất (50%):</span>
                <span class="font-mono tabular-nums font-bold text-amber-900">
                  {{ quote()!.depositRequiredAmount | vnd }}
                </span>
              </div>
            </div>
          }

          <button
            type="button"
            (click)="addCustomItemToCart()"
            [disabled]="addingToCart() || !quote() || !!quoteError()"
            class="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white font-semibold text-sm py-3 rounded-md transition-colors"
          >
            {{ addingToCart() ? 'Đang thêm vào giỏ...' : '+ Thêm Cấu Hình Này Vào Giỏ' }}
          </button>

          @if (addedSuccess()) {
            <div class="p-2.5 rounded bg-emerald-50 border border-emerald-300 text-xs text-emerald-800 text-center">
              ✓ Đã lưu cấu hình vào giỏ! <a routerLink="/cart" class="underline font-bold">Mở giỏ hàng →</a>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class QuoteBuilderComponent implements OnInit {
  private readonly catalogApi = inject(CatalogApiService);
  private readonly quoteApi = inject(QuoteApiService);
  private readonly cartApi = inject(CartApiService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly materials = signal<Material[]>([]);
  readonly quote = signal<QuoteCalculationResponse | null>(null);
  readonly uploadedFile = signal<FileUploadResponse | null>(null);
  readonly calculating = signal(false);
  readonly uploading = signal(false);
  readonly addingToCart = signal(false);
  readonly addedSuccess = signal(false);
  readonly quoteError = signal('');

  productId?: string;
  selectedMaterialId = '';
  selectedMethodId = '';
  widthMm = 80;
  heightMm = 50;
  thicknessMm = 1.0;
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

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    this.productId = qp.get('productId') || undefined;
    if (qp.get('w')) this.widthMm = Number(qp.get('w'));
    if (qp.get('h')) this.heightMm = Number(qp.get('h'));
    if (qp.get('t')) this.thicknessMm = Number(qp.get('t'));

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
        next: () => {
          this.addingToCart.set(false);
          this.addedSuccess.set(true);
        },
        error: (err) => {
          this.addingToCart.set(false);
          this.quoteError.set(err?.error?.message || 'Không thể thêm vào giỏ hàng.');
        },
      });
  }
}
