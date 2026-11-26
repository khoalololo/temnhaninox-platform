import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CatalogApiService } from '../../../core/services/catalog-api.service';
import { CartApiService } from '../../../core/services/cart-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Product } from '../../../core/models/catalog.models';
import { VndCurrencyPipe } from '../../../core/pipes/vnd-currency.pipe';
import { ButtonDirective } from '../../../shared/components/button/button.component';
import { ImagePlaceholderComponent } from '../../../shared/components/image-placeholder/image-placeholder.component';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, VndCurrencyPipe, ButtonDirective, ImagePlaceholderComponent],
  template: `
    <div class="max-w-6xl mx-auto px-4 py-8">
      <div class="mb-4 text-xs text-text-muted flex items-center gap-2">
        <a routerLink="/" class="hover:text-steel-hover transition-colors">Trang chủ</a>
        <span>/</span>
        <a routerLink="/products" class="hover:text-steel-hover transition-colors">Danh mục sản phẩm</a>
        @if (product()) {
          <span>/</span>
          <span class="font-mono text-text-secondary">{{ product()!.sku }}</span>
        }
      </div>

      @if (loading()) {
        <div class="bg-surface border border-border rounded-[10px] h-96 animate-pulse"></div>
      } @else if (!product()) {
        <div class="industrial-card p-8 text-center">
          <p class="font-heading text-sm font-bold text-text-primary mb-2">Không tìm thấy sản phẩm</p>
          <a routerLink="/products" class="text-xs font-medium text-steel hover:text-steel-hover hover:underline">
            ← Quay lại danh mục
          </a>
        </div>
      } @else {
        <div class="industrial-card p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <!-- Gallery -->
          <div class="lg:col-span-5 space-y-3">
            <div class="aspect-square bg-bg border border-border rounded-[10px] overflow-hidden flex items-center justify-center">
              @if (activeImage() && !mainImageBroken()) {
                <img
                  [src]="activeImage()!"
                  [alt]="product()!.name"
                  (error)="mainImageBroken.set(true)"
                  class="w-full h-full object-cover"
                />
              } @else {
                <app-image-placeholder [sku]="product()!.sku" />
              }
            </div>

            @if ((product()!.galleryUrls?.length || 0) > 0) {
              <div class="flex gap-2 overflow-x-auto">
                @if (product()!.imageUrl) {
                  <button
                    type="button"
                    (click)="activeImage.set(product()!.imageUrl!)"
                    class="w-16 h-16 border rounded-[6px] overflow-hidden shrink-0 bg-bg"
                    [class]="activeImage() === product()!.imageUrl ? 'border-accent border-2' : 'border-border'"
                  >
                    <img [src]="product()!.imageUrl!" class="w-full h-full object-cover" />
                  </button>
                }
                @for (img of product()!.galleryUrls!; track img) {
                  <button
                    type="button"
                    (click)="activeImage.set(img)"
                    class="w-16 h-16 border rounded-[6px] overflow-hidden shrink-0 bg-bg"
                    [class]="activeImage() === img ? 'border-accent border-2' : 'border-border'"
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
              <span class="font-mono text-xs px-2.5 py-0.5 bg-bg border border-border rounded-full text-text-secondary">
                SKU: {{ product()!.sku }}
              </span>
              <span
                class="font-mono text-xs px-2.5 py-0.5 rounded-full border font-medium"
                [class]="product()!.productType === 'CUSTOM_TEMPLATE'
                  ? 'border-accent/70 text-accent bg-bg'
                  : 'border-steel/70 text-steel bg-bg'"
              >
                {{ product()!.productType === 'CUSTOM_TEMPLATE' ? 'Gia công theo kích thước' : 'Hàng có sẵn' }}
              </span>
            </div>

            <h1 class="font-heading text-2xl font-bold text-text-primary mb-3">{{ product()!.name }}</h1>

            @if (product()!.shortDescription) {
              <p class="text-sm text-text-secondary mb-4 leading-relaxed">{{ product()!.shortDescription }}</p>
            }

            <!-- Technical Specification Table -->
            <div class="border border-border rounded-[10px] overflow-hidden mb-5 bg-bg">
              <div class="bg-surface-raised px-3.5 py-2 border-b border-border font-heading text-xs font-semibold uppercase tracking-wider text-text-primary">
                Thông Số Kỹ Thuật Tiêu Chuẩn
              </div>
              <table class="w-full text-xs">
                <tbody class="divide-y divide-border">
                  <tr>
                    <td class="px-3.5 py-2.5 text-text-secondary w-44">Vật liệu nền</td>
                    <td class="px-3.5 py-2.5 font-medium text-text-primary">{{ product()!.materialName || 'Theo tùy chọn' }}</td>
                  </tr>
                  <tr>
                    <td class="px-3.5 py-2.5 text-text-secondary">Công nghệ gia công</td>
                    <td class="px-3.5 py-2.5 font-medium text-text-primary">{{ product()!.processingMethodName || 'Theo tùy chọn' }}</td>
                  </tr>
                  <tr>
                    <td class="px-3.5 py-2.5 text-text-secondary">Kích thước chuẩn (D × R × Dày)</td>
                    <td class="px-3.5 py-2.5 font-sans tabular-nums font-medium text-text-primary">
                      {{ product()!.defaultWidthMm || 80 }} × {{ product()!.defaultHeightMm || 40 }} × {{ product()!.defaultThicknessMm || 0.8 }} mm
                    </td>
                  </tr>
                  <tr>
                    <td class="px-3.5 py-2.5 text-text-secondary">Thời gian gia công dự kiến</td>
                    <td class="px-3.5 py-2.5 font-sans tabular-nums font-medium text-text-primary">
                      {{ product()!.productType === 'CUSTOM_TEMPLATE' ? '3–5 ngày làm việc (duyệt mẫu thực tế trước)' : 'Giao ngay trong 24–48h' }}
                    </td>
                  </tr>
                  @if (product()!.productType === 'STANDARD_ITEM') {
                    <tr>
                      <td class="px-3.5 py-2.5 text-text-secondary">Đơn giá niêm yết</td>
                      <td class="px-3.5 py-2.5 font-mono tabular-nums text-base font-bold text-accent">
                        {{ product()!.basePrice | vnd }}
                      </td>
                    </tr>
                    <tr>
                      <td class="px-3.5 py-2.5 text-text-secondary">Tồn kho sẵn sàng</td>
                      <td class="px-3.5 py-2.5 font-mono tabular-nums text-text-primary">
                        {{ product()!.stockQuantity ?? 0 }} đơn vị
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Action Box -->
            <div class="mt-auto pt-4 border-t border-border">
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
                  appButton
                  variant="primary"
                  size="lg"
                >
                  Tùy chỉnh kích thước & Xem trước 3D →
                </a>
              } @else {
                <div class="flex flex-wrap items-center gap-3">
                  <div class="flex items-center border border-border rounded-[6px] bg-bg">
                    <button
                      type="button"
                      (click)="quantity = quantity > 1 ? quantity - 1 : 1"
                      class="px-3 py-2 text-sm font-mono text-text-primary hover:bg-surface-raised"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      [(ngModel)]="quantity"
                      min="1"
                      class="w-16 text-center font-mono tabular-nums text-sm bg-bg text-text-primary border-x border-border py-2 focus:outline-none"
                    />
                    <button
                      type="button"
                      (click)="quantity = quantity + 1"
                      class="px-3 py-2 text-sm font-mono text-text-primary hover:bg-surface-raised"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    (click)="addToCart()"
                    [disabled]="adding() || (product()!.stockQuantity ?? 0) <= 0"
                    appButton
                    variant="primary"
                    size="lg"
                  >
                    {{ adding() ? 'Đang thêm...' : 'Thêm vào giỏ hàng' }}
                  </button>
                </div>

                @if (addedNotice()) {
                  <div class="mt-3 text-xs text-success font-medium">
                    ✓ Đã thêm vào giỏ hàng. <a routerLink="/cart" class="underline font-semibold text-steel hover:text-steel-hover">Xem giỏ hàng</a>
                  </div>
                }
              }
            </div>
          </div>
        </div>

        @if (product()!.description) {
          <div class="mt-6 industrial-card p-6">
            <h2 class="font-heading text-sm font-bold uppercase tracking-wider text-text-primary border-b border-border pb-2.5 mb-3">
              Mô Tả Chi Tiết & Ứng Dụng
            </h2>
            <div class="text-sm text-text-secondary whitespace-pre-line leading-relaxed">
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
        itemType: 'STANDARD_ITEM',
        productId: p.id,
        quantity: this.quantity,
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
