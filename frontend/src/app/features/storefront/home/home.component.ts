import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CatalogApiService } from '../../../core/services/catalog-api.service';
import { CartApiService } from '../../../core/services/cart-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Category, Product } from '../../../core/models/catalog.models';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card.component';
import { ButtonDirective } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, ProductCardComponent, ButtonDirective],
  template: `
    <!-- Industrial Precision Split Hero -->
    <section class="bg-surface text-text-primary border-b border-border">
      <div class="max-w-7xl mx-auto px-4 py-8 lg:py-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div class="lg:col-span-7 space-y-4">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-steel/60 bg-bg text-steel font-mono text-xs font-medium">
            <span>INOX 304 · NHÔM · ĐỒNG · MICA</span>
            <span class="text-border">|</span>
            <span>SAI SỐ ±0.05 MM</span>
          </div>

          <h1 class="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-tight text-text-primary">
            Xưởng Gia Công Tem Nhãn Kim Loại & Bảng Tên Máy Công Nghiệp
          </h1>

          <p class="text-sm text-text-secondary max-w-2xl leading-relaxed">
            Nhận sản xuất trực tiếp tại xưởng: Ăn mòn điện hóa, Khắc Laser Fiber sâu, In UV phẳng độ bền cao.
            Tính báo giá tự động theo kích thước mm, xem trước mô hình 3D và duyệt mẫu thực tế trước khi sản xuất hàng loạt.
          </p>

          <div class="flex flex-wrap items-center gap-3 pt-1">
            <a
              routerLink="/quote-builder"
              appButton
              variant="primary"
              size="lg"
            >
              Mở Công Cụ Báo Giá & Xem Mẫu 3D
            </a>
            <a
              routerLink="/products"
              appButton
              variant="secondary"
              size="lg"
            >
              Xem Danh Mục Sản Phẩm
            </a>
          </div>
        </div>

        <!-- Technical Workshop Spec Sheet Box -->
        <div class="lg:col-span-5 bg-bg border border-border rounded-[10px] p-4 hover:shadow-card-hover transition-shadow">
          <div class="flex items-center justify-between border-b border-border pb-2.5 mb-3">
            <span class="font-mono text-xs font-medium text-accent uppercase">Thông Số Năng Lực Xưởng</span>
            <span class="font-mono text-[11px] text-steel border border-steel/50 px-2 py-0.5 rounded-full">ISO / B2B VAT</span>
          </div>
          <dl class="grid grid-cols-2 gap-3 text-xs">
            <div class="bg-surface border border-border rounded-[6px] p-2.5">
              <dt class="text-text-secondary mb-0.5">Độ dày gia công</dt>
              <dd class="font-mono tabular-nums font-medium text-text-primary">0.3 mm – 5.0 mm</dd>
            </div>
            <div class="bg-surface border border-border rounded-[6px] p-2.5">
              <dt class="text-text-secondary mb-0.5">Chiết khấu số lượng</dt>
              <dd class="font-mono tabular-nums font-medium text-accent">-10% từ 1.000 tem</dd>
            </div>
            <div class="bg-surface border border-border rounded-[6px] p-2.5">
              <dt class="text-text-secondary mb-0.5">File kỹ thuật nhận</dt>
              <dd class="font-mono font-medium text-text-primary">.CDR / .AI / .PDF / .SVG</dd>
            </div>
            <div class="bg-surface border border-border rounded-[6px] p-2.5">
              <dt class="text-text-secondary mb-0.5">Quy trình đơn đặt</dt>
              <dd class="font-mono font-medium text-text-primary">Duyệt mẫu → Cọc 50%</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>

    <div class="max-w-7xl mx-auto px-4 py-8 space-y-10">
      @if (toastMessage()) {
        <div class="fixed bottom-4 right-4 z-50 bg-surface text-text-primary border border-accent px-4 py-2.5 rounded-[6px] text-xs font-medium shadow-card-hover">
          {{ toastMessage() }}
        </div>
      }

      <!-- Category Grid -->
      <section>
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="font-heading text-lg font-bold text-text-primary">Danh Mục Gia Công & Vật Tư</h2>
            <p class="text-xs text-text-secondary">Chọn nhóm vật liệu hoặc thiết bị xưởng để lọc nhanh</p>
          </div>
          <a routerLink="/products" class="text-xs font-medium text-steel hover:text-steel-hover transition-colors">
            Xem tất cả →
          </a>
        </div>

        @if (categories().length > 0) {
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            @for (cat of categories(); track cat.id) {
              <a
                routerLink="/products"
                [queryParams]="{ categoryId: cat.id }"
                class="industrial-card hover:border-steel p-3.5 flex flex-col justify-between"
              >
                <div class="font-heading font-semibold text-sm text-text-primary mb-1">{{ cat.name }}</div>
                <div class="text-xs text-text-secondary line-clamp-2">{{ cat.description || 'Gia công chuẩn kích thước & vật tư xưởng' }}</div>
              </a>
            }
          </div>
        } @else {
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            @for (fallback of fallbackCategories; track fallback.label) {
              <a
                routerLink="/products"
                [queryParams]="{ search: fallback.search }"
                class="industrial-card hover:border-steel p-3.5"
              >
                <div class="font-heading font-semibold text-sm text-text-primary mb-1">{{ fallback.label }}</div>
                <div class="text-xs text-text-secondary">{{ fallback.sub }}</div>
              </a>
            }
          </div>
        }
      </section>

      <!-- Featured Products Grid -->
      <section>
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="font-heading text-lg font-bold text-text-primary">Mẫu Tem Gia Công & Sản Phẩm Tiêu Biểu</h2>
            <p class="text-xs text-text-secondary">Hỗ trợ tùy chỉnh kích thước 3D trực tiếp hoặc đặt mua vật tư có sẵn</p>
          </div>
          <a routerLink="/products" class="text-xs font-medium text-steel hover:text-steel-hover transition-colors">
            Toàn bộ kho mẫu →
          </a>
        </div>

        @if (loadingProducts()) {
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            @for (n of [1, 2, 3, 4]; track n) {
              <div class="bg-surface border border-border rounded-[10px] h-72 animate-pulse"></div>
            }
          </div>
        } @else {
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            @for (product of featuredProducts(); track product.id; let idx = $index) {
              <app-product-card
                class="product-grid-item block h-full"
                [style.animation-delay]="(idx < 6 ? idx : 5) * 40 + 'ms'"
                [product]="product"
                (addToCart)="handleAddToCart($event)"
              />
            }
          </div>
        }
      </section>
    </div>
  `,
})
export class HomeComponent implements OnInit {
  private readonly catalogApi = inject(CatalogApiService);
  private readonly cartApi = inject(CartApiService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly categories = signal<Category[]>([]);
  readonly featuredProducts = signal<Product[]>([]);
  readonly loadingProducts = signal(true);
  readonly toastMessage = signal('');

  readonly fallbackCategories = [
    { label: 'Tem Nhãn Inox 304', sub: 'Ăn mòn điện hóa, khắc laser thông số máy', search: 'Inox' },
    { label: 'Tem Nhôm Xước / Anode', sub: 'Nhẹ, bền màu, dập nổi logo thương hiệu', search: 'Nhôm' },
    { label: 'Tem Đồng Giả Cổ', sub: 'Tem nội thất, đồ gỗ, nhãn hiệu cao cấp', search: 'Đồng' },
    { label: 'Tem Mica & Máy Móc', sub: 'In UV ngược mặt sau, vật tư & hóa chất', search: 'Mica' },
  ];

  ngOnInit(): void {
    this.catalogApi.getCategories().subscribe({
      next: (res) => {
        if (res.success) this.categories.set(res.data || []);
      },
    });

    this.catalogApi.getProducts({ page: 0, size: 8 }).subscribe({
      next: (res) => {
        this.loadingProducts.set(false);
        if (res.success && res.data) {
          this.featuredProducts.set(res.data.content || []);
        }
      },
      error: () => this.loadingProducts.set(false),
    });
  }

  handleAddToCart(product: Product): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/' } });
      return;
    }

    this.cartApi
      .addItem({
        itemType: 'STANDARD_ITEM',
        productId: product.id,
        quantity: 1,
      })
      .subscribe({
        next: () => {
          this.toastMessage.set(`Đã thêm "${product.name}" vào giỏ hàng.`);
          setTimeout(() => this.toastMessage.set(''), 2500);
        },
      });
  }
}
