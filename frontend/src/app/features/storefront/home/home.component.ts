import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CatalogApiService } from '../../../core/services/catalog-api.service';
import { CartApiService } from '../../../core/services/cart-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Category, Product } from '../../../core/models/catalog.models';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, ProductCardComponent],
  template: `
    <!-- Industrial Precision Split Hero -->
    <section class="bg-slate-900 text-white border-b border-slate-800">
      <div class="max-w-7xl mx-auto px-4 py-8 lg:py-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div class="lg:col-span-7 space-y-4">
          <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded border border-amber-500/40 bg-amber-500/10 text-amber-400 font-mono text-xs">
            <span>INOX 304 · NHÔM · ĐỒNG · MICA</span>
            <span>|</span>
            <span>SAI SỐ ±0.05 MM</span>
          </div>

          <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-tight text-white">
            Xưởng Gia Công Tem Nhãn Kim Loại & Bảng Tên Máy Công Nghiệp
          </h1>

          <p class="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Nhận sản xuất trực tiếp tại xưởng: Ăn mòn điện hóa, Khắc Laser Fiber sâu, In UV phẳng độ bền cao.
            Tính báo giá tự động theo kích thước mm, xem trước mô hình 3D và duyệt mẫu thực tế trước khi sản xuất hàng loạt.
          </p>

          <div class="flex flex-wrap items-center gap-3 pt-1">
            <a
              routerLink="/quote-builder"
              class="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm px-5 py-2.5 rounded-md transition-colors"
            >
              Mở Công Cụ Báo Giá & Xem Mẫu 3D
            </a>
            <a
              routerLink="/products"
              class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-sm px-5 py-2.5 rounded-md transition-colors"
            >
              Xem Danh Mục Sản Phẩm
            </a>
          </div>
        </div>

        <!-- Technical Workshop Spec Sheet Box -->
        <div class="lg:col-span-5 bg-slate-800/80 border border-slate-700 rounded-md p-4">
          <div class="flex items-center justify-between border-b border-slate-700 pb-2.5 mb-3">
            <span class="font-mono text-xs font-bold text-amber-400 uppercase">Thông Số Năng Lực Xưởng</span>
            <span class="font-mono text-[11px] text-slate-400">ISO / B2B VAT</span>
          </div>
          <dl class="grid grid-cols-2 gap-3 text-xs">
            <div class="bg-slate-900/70 border border-slate-700/80 rounded p-2.5">
              <dt class="text-slate-400 mb-0.5">Độ dày gia công</dt>
              <dd class="font-mono tabular-nums font-bold text-white">0.3 mm – 5.0 mm</dd>
            </div>
            <div class="bg-slate-900/70 border border-slate-700/80 rounded p-2.5">
              <dt class="text-slate-400 mb-0.5">Chiết khấu số lượng</dt>
              <dd class="font-mono tabular-nums font-bold text-amber-400">-10% từ 1.000 tem</dd>
            </div>
            <div class="bg-slate-900/70 border border-slate-700/80 rounded p-2.5">
              <dt class="text-slate-400 mb-0.5">File kỹ thuật nhận</dt>
              <dd class="font-mono font-semibold text-white">.CDR / .AI / .PDF / .SVG</dd>
            </div>
            <div class="bg-slate-900/70 border border-slate-700/80 rounded p-2.5">
              <dt class="text-slate-400 mb-0.5">Quy trình đơn đặt</dt>
              <dd class="font-mono font-semibold text-white">Duyệt mẫu → Cọc 50%</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>

    <div class="max-w-7xl mx-auto px-4 py-8 space-y-10">
      @if (toastMessage()) {
        <div class="fixed bottom-4 right-4 z-50 bg-slate-900 text-white border border-amber-500 px-4 py-2.5 rounded-md text-xs font-medium">
          {{ toastMessage() }}
        </div>
      }

      <!-- Category Grid -->
      <section>
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-lg font-bold text-slate-900">Danh Mục Gia Công & Vật Tư</h2>
            <p class="text-xs text-slate-500">Chọn nhóm vật liệu hoặc thiết bị xưởng để lọc nhanh</p>
          </div>
          <a routerLink="/products" class="text-xs font-semibold text-amber-700 hover:underline">
            Xem tất cả →
          </a>
        </div>

        @if (categories().length > 0) {
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            @for (cat of categories(); track cat.id) {
              <a
                routerLink="/products"
                [queryParams]="{ categoryId: cat.id }"
                class="bg-white border border-slate-300 hover:border-amber-600 rounded-md p-3.5 transition-colors flex flex-col justify-between"
              >
                <div class="font-semibold text-sm text-slate-900 mb-1">{{ cat.name }}</div>
                <div class="text-xs text-slate-500 line-clamp-2">{{ cat.description || 'Gia công chuẩn kích thước & vật tư xưởng' }}</div>
              </a>
            }
          </div>
        } @else {
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            @for (fallback of fallbackCategories; track fallback.label) {
              <a
                routerLink="/products"
                [queryParams]="{ search: fallback.search }"
                class="bg-white border border-slate-300 hover:border-amber-600 rounded-md p-3.5 transition-colors"
              >
                <div class="font-semibold text-sm text-slate-900 mb-1">{{ fallback.label }}</div>
                <div class="text-xs text-slate-500">{{ fallback.sub }}</div>
              </a>
            }
          </div>
        }
      </section>

      <!-- Featured Products Grid -->
      <section>
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-lg font-bold text-slate-900">Mẫu Tem Gia Công & Sản Phẩm Tiêu Biểu</h2>
            <p class="text-xs text-slate-500">Hỗ trợ tùy chỉnh kích thước 3D trực tiếp hoặc đặt mua vật tư có sẵn</p>
          </div>
          <a routerLink="/products" class="text-xs font-semibold text-amber-700 hover:underline">
            Toàn bộ kho mẫu →
          </a>
        </div>

        @if (loadingProducts()) {
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            @for (n of [1, 2, 3, 4]; track n) {
              <div class="bg-white border border-slate-200 rounded-md h-72 animate-pulse"></div>
            }
          </div>
        } @else {
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            @for (product of featuredProducts(); track product.id) {
              <app-product-card [product]="product" (addToCart)="handleAddToCart($event)" />
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
        productId: product.id,
        productName: product.name,
        productType: 'STANDARD_ITEM',
        quantity: product.minOrderQuantity || 1,
      })
      .subscribe({
        next: () => {
          this.toastMessage.set(`Đã thêm "${product.name}" vào giỏ hàng.`);
          setTimeout(() => this.toastMessage.set(''), 2500);
        },
      });
  }
}
