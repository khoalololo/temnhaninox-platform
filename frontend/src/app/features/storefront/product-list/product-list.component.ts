import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogApiService } from '../../../core/services/catalog-api.service';
import { CartApiService } from '../../../core/services/cart-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Category, Product, ProductType } from '../../../core/models/catalog.models';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card.component';
import { ButtonDirective } from '../../../shared/components/button/button.component';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { ToastService } from '../../../shared/components/toast/toast.component';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductCardComponent, ButtonDirective, PaginatorComponent],
  template: `
    <div class="max-w-7xl mx-auto px-4 py-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-6 border-b border-border">
        <div>
          <h1 class="font-heading text-xl font-bold text-text-primary">Danh Mục Tem Nhãn & Vật Tư Xưởng</h1>
          <p class="text-xs text-text-secondary font-mono tabular-nums">
            Hiển thị {{ products().length }} / {{ totalElements() }} mã sản phẩm
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Left Filter Sidebar -->
        <aside class="lg:col-span-3 space-y-5">
          <div class="industrial-card p-4 space-y-4">
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                Tìm theo từ khóa / SKU
              </label>
              <div class="flex gap-1.5">
                <input
                  type="text"
                  [(ngModel)]="search"
                  (keyup.enter)="applyFilters()"
                  placeholder="VD: Inox 304, Laser..."
                  class="industrial-input w-full px-2.5 py-1.5 text-xs"
                />
                <button
                  type="button"
                  (click)="applyFilters()"
                  appButton
                  variant="secondary"
                  size="sm"
                >
                  Lọc
                </button>
              </div>
            </div>

            <div class="border-t border-border pt-3">
              <div class="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                Hình thức đặt hàng
              </div>
              <div class="space-y-1.5 text-xs text-text-primary">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="ptype" [value]="''" [(ngModel)]="selectedType" (change)="applyFilters()" class="accent-accent" />
                  <span>Tất cả sản phẩm</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="ptype" value="CUSTOM_TEMPLATE" [(ngModel)]="selectedType" (change)="applyFilters()" class="accent-accent" />
                  <span>Gia công theo kích thước (3D)</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="ptype" value="STANDARD_ITEM" [(ngModel)]="selectedType" (change)="applyFilters()" class="accent-accent" />
                  <span>Hàng có sẵn giao ngay</span>
                </label>
              </div>
            </div>

            <div class="border-t border-border pt-3">
              <div class="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                Danh mục vật liệu
              </div>
              <div class="space-y-1 text-xs">
                <button
                  type="button"
                  (click)="selectCategory('')"
                  class="w-full text-left px-2.5 py-1.5 rounded-[6px] transition-colors border"
                  [class]="selectedCategoryId === '' ? 'bg-surface-raised text-steel border-steel font-medium' : 'border-transparent text-text-secondary hover:bg-surface-raised hover:text-text-primary'"
                >
                  Tất cả danh mục
                </button>
                @for (cat of categories(); track cat.id) {
                  <button
                    type="button"
                    (click)="selectCategory(cat.id)"
                    class="w-full text-left px-2.5 py-1.5 rounded-[6px] transition-colors border"
                    [class]="selectedCategoryId === cat.id ? 'bg-surface-raised text-accent border-accent font-semibold' : 'border-transparent text-text-primary font-medium hover:bg-surface-raised hover:text-accent'"
                  >
                    {{ cat.name }}
                  </button>
                  @for (sub of (cat.children || []); track sub.id) {
                    <button
                      type="button"
                      (click)="selectCategory(sub.id)"
                      class="w-full text-left pl-6 pr-2.5 py-1 rounded-[6px] transition-colors border text-[11px]"
                      [class]="selectedCategoryId === sub.id ? 'bg-surface-raised text-accent border-accent font-semibold' : 'border-transparent text-text-secondary hover:bg-surface-raised hover:text-accent'"
                    >
                      <span class="mr-1 inline-flex align-middle text-text-muted" aria-hidden="true">
                        <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 5v8a5 5 0 0 0 5 5h7m0 0-4-4m4 4-4 4" /></svg>
                      </span>
                      {{ sub.name }}
                    </button>
                  }
                }
              </div>
            </div>

            <button
              type="button"
              (click)="resetFilters()"
              appButton
              variant="ghost"
              size="sm"
              [fullWidth]="true"
            >
              Đặt lại bộ lọc
            </button>
          </div>
        </aside>

        <!-- Product Grid -->
        <div class="lg:col-span-9">
          @if (loading()) {
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
              @for (n of [1, 2, 3, 4, 5, 6]; track n) {
                <div class="bg-surface border border-border rounded-[10px] h-72 animate-pulse"></div>
              }
            </div>
          } @else if (loadError()) {
            <div class="industrial-card p-10 text-center space-y-3 border-danger/40">
              <div class="font-heading text-sm font-bold text-danger">Không thể tải danh sách sản phẩm</div>
              <p class="text-xs text-text-secondary">{{ loadError() }}</p>
              <button type="button" (click)="fetchProducts()" appButton variant="primary" size="sm">
                Thử lại
              </button>
            </div>
          } @else if (products().length === 0) {
            <div class="industrial-card p-10 text-center space-y-2">
              <div class="font-heading text-sm font-bold text-text-primary">Không tìm thấy sản phẩm phù hợp</div>
              <p class="text-xs text-text-secondary">Thử đổi từ khóa hoặc mở công cụ báo giá 3D để nhập kích thước tùy ý.</p>
            </div>
          } @else {
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
              @for (product of products(); track product.id) {
                <app-product-card
                  class="block h-full"
                  [product]="product"
                  (addToCart)="handleAddToCart($event)"
                />
              }
            </div>

            <app-paginator
              [page]="page()"
              [totalPages]="totalPages()"
              (pageChange)="goToPage($event)"
            />
          }
        </div>
      </div>
    </div>
  `,
})
export class ProductListComponent implements OnInit {
  private readonly catalogApi = inject(CatalogApiService);
  private readonly cartApi = inject(CartApiService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly categories = signal<Category[]>([]);
  readonly products = signal<Product[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly page = signal(0);
  readonly totalPages = signal(0);
  readonly totalElements = signal(0);
  private readonly toast = inject(ToastService);
  selectedCategoryId = '';
  selectedType: ProductType | '' = '';
  search = '';

  ngOnInit(): void {
    this.catalogApi.getCategories().subscribe({
      next: (res) => {
        if (res.success) this.categories.set(res.data || []);
      },
    });

    this.route.queryParamMap.subscribe((params) => {
      this.selectedCategoryId = params.get('categoryId') || '';
      this.selectedType = (params.get('productType') as ProductType) || '';
      this.search = params.get('search') || '';
      this.page.set(0);
      this.fetchProducts();
    });
  }

  fetchProducts(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.catalogApi
      .getProducts({
        categoryId: this.selectedCategoryId || undefined,
        productType: this.selectedType || undefined,
        search: this.search || undefined,
        page: this.page(),
        size: 12,
      })
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.success && res.data) {
            this.products.set(res.data.content || []);
            this.totalPages.set(res.data.totalPages || 0);
            this.totalElements.set(res.data.totalElements || 0);
          }
        },
        error: () => {
          this.loading.set(false);
          this.loadError.set('Không kết nối được tới máy chủ danh mục. Vui lòng thử lại.');
        },
      });
  }

  selectCategory(categoryId: string): void {
    this.selectedCategoryId = categoryId;
    this.applyFilters();
  }

  applyFilters(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        categoryId: this.selectedCategoryId || null,
        productType: this.selectedType || null,
        search: this.search.trim() || null,
      },
      queryParamsHandling: 'merge',
    });
  }

  resetFilters(): void {
    this.selectedCategoryId = '';
    this.selectedType = '';
    this.search = '';
    this.router.navigate(['/products']);
  }

  goToPage(nextPage: number): void {
    this.page.set(nextPage);
    this.fetchProducts();
  }

  handleAddToCart(product: Product): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    this.cartApi
      .addItem({
        itemType: 'STANDARD_ITEM',
        productId: product.id,
        quantity: 1,
      })
      .subscribe({
        next: (res) => {
          if (!res.success || !res.data) {
            this.toast.show(res.message || 'Không thể thêm sản phẩm vào giỏ hàng.', 'error', 'Không thể thêm sản phẩm');
            return;
          }
          this.toast.show(`"${product.name}" đã được thêm vào giỏ hàng của bạn.`, 'success', 'Đã thêm vào giỏ hàng', 'cart');
        },
        error: (err) => this.toast.show(
          err?.error?.message || 'Không thể thêm sản phẩm vào giỏ hàng. Vui lòng thử lại.',
          'error',
          'Không thể thêm sản phẩm'
        ),
      });
  }
}
