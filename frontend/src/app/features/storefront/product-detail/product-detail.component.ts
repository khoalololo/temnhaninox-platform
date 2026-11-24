import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CatalogApiService } from '../../../core/services/catalog-api.service';
import { CartApiService } from '../../../core/services/cart-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Product } from '../../../core/models/catalog.models';
import { VndCurrencyPipe } from '../../../core/pipes/vnd-currency.pipe';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, VndCurrencyPipe],
  template: `
    <div class="max-w-6xl mx-auto px-4 py-8">
      <div class="mb-4 text-xs text-slate-500 flex items-center gap-2">
        <a routerLink="/" class="hover:text-slate-900">Trang chủ</a>
        <span>/</span>
        <a routerLink="/products" class="hover:text-slate-900">Danh mục sản phẩm</a>
        @if (product()) {
          <span>/</span>
          <span class="font-mono text-slate-800">{{ product()!.sku }}</span>
        }
      </div>

      @if (loading()) {
        <div class="bg-white border border-slate-300 rounded-md h-96 animate-pulse"></div>
      } @else if (!product()) {
        <div class="bg-white border border-slate-300 rounded-md p-8 text-center">
          <p class="text-sm font-bold text-slate-900 mb-2">Không tìm thấy sản phẩm</p>
          <a routerLink="/products" class="text-xs font-semibold text-amber-700 hover:underline">
            ← Quay lại danh mục
          </a>
        </div>
      } @else {
        <div class="bg-white border border-slate-300 rounded-md p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <!-- Gallery -->
          <div class="lg:col-span-5 space-y-3">
            <div class="aspect-square bg-slate-100 border border-slate-200 rounded-md overflow-hidden flex items-center justify-center">
              @if (activeImage()) {
                <img [src]="activeImage()!" [alt]="product()!.name" class="w-full h-full object-cover" />
              } @else {
                <div class="text-center text-slate-400">
                  <div class="font-mono text-sm font-bold">{{ product()!.sku }}</div>
                  <div class="text-xs mt-1">Chưa có ảnh mẫu</div>
                </div>
              }
            </div>

            @if ((product()!.galleryUrls?.length || 0) > 0) {
              <div class="flex gap-2 overflow-x-auto">
                @if (product()!.imageUrl) {
                  <button
                    type="button"
                    (click)="activeImage.set(product()!.imageUrl!)"
                    class="w-16 h-16 border rounded overflow-hidden shrink-0"
                    [class]="activeImage() === product()!.imageUrl ? 'border-amber-600 border-2' : 'border-slate-300'"
                  >
                    <img [src]="product()!.imageUrl!" class="w-full h-full object-cover" />
                  </button>
                }
                @for (img of product()!.galleryUrls!; track img) {
                  <button
                    type="button"
                    (click)="activeImage.set(img)"
                    class="w-16 h-16 border rounded overflow-hidden shrink-0"
                    [class]="activeImage() === img ? 'border-amber-600 border-2' : 'border-slate-300'"
                  >
                    <img [src]="img" class="w-full h-full object-cover" />
                  </button>
                }
              </div>
            }
          </div>

          <!-- Technical Specs & Order Actions -->
          <div class="lg:col-span-7 flex flex-col">
            <div class="flex items-center gap-2 mb-2">
              <span class="font-mono text-xs px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-slate-700">
                SKU: {{ product()!.sku }}
              </span>
              <span
                class="font-mono text-xs px-2 py-0.5 rounded border font-semibold"
                [class]="product()!.productType === 'CUSTOM_TEMPLATE'
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300'"
              >
                {{ product()!.productType === 'CUSTOM_TEMPLATE' ? 'Gia công theo kích thước' : 'Hàng có sẵn' }}
              </span>
            </div>

            <h1 class="text-2xl font-bold text-slate-900 mb-3">{{ product()!.name }}</h1>

            @if (product()!.shortDescription) {
              <p class="text-sm text-slate-600 mb-4 leading-relaxed">{{ product()!.shortDescription }}</p>
            }

            <!-- Technical Specification Table -->
            <div class="border border-slate-300 rounded-md overflow-hidden mb-5">
              <div class="bg-slate-100 px-3.5 py-2 border-b border-slate-300 text-xs font-bold uppercase tracking-wider text-slate-800">
                Thông Số Kỹ Thuật Tiêu Chuẩn
              </div>
              <table class="w-full text-xs">
                <tbody class="divide-y divide-slate-200">
                  <tr>
                    <td class="px-3.5 py-2.5 text-slate-500 w-44">Vật liệu nền</td>
                    <td class="px-3.5 py-2.5 font-semibold text-slate-900">{{ product()!.materialName || 'Theo tùy chọn' }}</td>
                  </tr>
                  <tr>
                    <td class="px-3.5 py-2.5 text-slate-500">Công nghệ gia công</td>
                    <td class="px-3.5 py-2.5 font-semibold text-slate-900">{{ product()!.processingMethodName || 'Theo tùy chọn' }}</td>
                  </tr>
                  <tr>
                    <td class="px-3.5 py-2.5 text-slate-500">Kích thước chuẩn (D × R × Dày)</td>
                    <td class="px-3.5 py-2.5 font-mono tabular-nums font-semibold text-slate-900">
                      {{ product()!.defaultWidthMm || 80 }} × {{ product()!.defaultHeightMm || 40 }} × {{ product()!.defaultThicknessMm || 0.8 }} mm
                    </td>
                  </tr>
                  @if (product()!.productType === 'STANDARD_ITEM') {
                    <tr>
                      <td class="px-3.5 py-2.5 text-slate-500">Đơn giá niêm yết</td>
                      <td class="px-3.5 py-2.5 font-mono tabular-nums text-base font-bold text-amber-700">
                        {{ product()!.basePrice | vnd }}
                      </td>
                    </tr>
                    <tr>
                      <td class="px-3.5 py-2.5 text-slate-500">Tồn kho sẵn sàng</td>
                      <td class="px-3.5 py-2.5 font-mono tabular-nums text-slate-900">
                        {{ product()!.stockQuantity ?? 0 }} đơn vị
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Action Box -->
            <div class="mt-auto pt-4 border-t border-slate-200">
              @if (product()!.productType === 'CUSTOM_TEMPLATE') {
                <a
                  routerLink="/quote-builder"
                  [queryParams]="{
                    productId: product()!.id,
                    materialId: product()!.materialId,
                    processingMethodId: product()!.processingMethodId,
                    w: product()!.defaultWidthMm || 80,
                    h: product()!.defaultHeightMm || 40,
                    t: product()!.defaultThicknessMm || 0.8
                  }"
                  class="inline-flex items-center justify-center w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm px-6 py-3 rounded-md transition-colors"
                >
                  Tùy chỉnh kích thước & Xem trước 3D →
                </a>
              } @else {
                <div class="flex flex-wrap items-center gap-3">
                  <div class="flex items-center border border-slate-300 rounded-md">
                    <button
                      type="button"
                      (click)="quantity = quantity > 1 ? quantity - 1 : 1"
                      class="px-3 py-2 text-sm font-mono hover:bg-slate-100"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      [(ngModel)]="quantity"
                      min="1"
                      class="w-16 text-center font-mono tabular-nums text-sm border-x border-slate-300 py-2 focus:outline-none"
                    />
                    <button
                      type="button"
                      (click)="quantity = quantity + 1"
                      class="px-3 py-2 text-sm font-mono hover:bg-slate-100"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    (click)="addToCart()"
                    [disabled]="adding() || (product()!.stockQuantity ?? 0) <= 0"
                    class="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-semibold text-sm px-6 py-2.5 rounded-md transition-colors"
                  >
                    {{ adding() ? 'Đang thêm...' : 'Thêm vào giỏ hàng' }}
                  </button>
                </div>

                @if (addedNotice()) {
                  <div class="mt-3 text-xs text-emerald-700 font-medium">
                    ✓ Đã thêm vào giỏ hàng. <a routerLink="/cart" class="underline font-bold">Xem giỏ hàng</a>
                  </div>
                }
              }
            </div>
          </div>
        </div>

        @if (product()!.description) {
          <div class="mt-6 bg-white border border-slate-300 rounded-md p-6">
            <h2 class="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2.5 mb-3">
              Mô Tả Chi Tiết & Ứng Dụng
            </h2>
            <div class="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
              {{ product()!.description }}
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class ProductDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalogApi = inject(CatalogApiService);
  private readonly cartApi = inject(CartApiService);
  private readonly authService = inject(AuthService);

  readonly product = signal<Product | null>(null);
  readonly activeImage = signal<string | null>(null);
  readonly loading = signal(true);
  readonly adding = signal(false);
  readonly addedNotice = signal(false);
  quantity = 1;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      if (!slug) return;
      this.loading.set(true);
      this.catalogApi.getProductBySlug(slug).subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.success && res.data) {
            this.product.set(res.data);
            this.activeImage.set(res.data.imageUrl || res.data.galleryUrls?.[0] || null);
            this.quantity = res.data.minOrderQuantity || 1;
          }
        },
        error: () => this.loading.set(false),
      });
    });
  }

  addToCart(): void {
    const p = this.product();
    if (!p) return;
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    this.adding.set(true);
    this.cartApi
      .addItem({
        productId: p.id,
        productName: p.name,
        productType: 'STANDARD_ITEM',
        quantity: Math.max(1, this.quantity),
      })
      .subscribe({
        next: () => {
          this.adding.set(false);
          this.addedNotice.set(true);
        },
        error: () => this.adding.set(false),
      });
  }
}
