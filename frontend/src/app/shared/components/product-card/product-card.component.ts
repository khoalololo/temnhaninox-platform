import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Product } from '../../../core/models/catalog.models';
import { AuthService } from '../../../core/services/auth.service';
import { VndCurrencyPipe } from '../../../core/pipes/vnd-currency.pipe';
import { ButtonDirective } from '../button/button.component';
import { ImagePlaceholderComponent } from '../image-placeholder/image-placeholder.component';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterLink, VndCurrencyPipe, ButtonDirective, ImagePlaceholderComponent],
  template: `
    <div class="industrial-card group overflow-hidden flex flex-col h-full hover:border-accent">
      <!-- Image -->
      <a [routerLink]="['/products', product.slug]" class="relative block aspect-[4/3] bg-surface border-b border-border overflow-hidden">
        @if (product.imageUrl) {
          <img
            [src]="product.imageUrl"
            [alt]="product.name"
            class="w-full h-full object-cover fs-img-zoom"
            loading="lazy"
          />
        } @else {
          <app-image-placeholder [sku]="product.sku" />
        }

        <span
          class="tni-chip no-dot absolute left-2.5 top-2.5 shadow-sm"
          [attr.data-tone]="product.productType === 'CUSTOM_TEMPLATE' ? 'info' : 'success'"
        >
          {{ product.productType === 'CUSTOM_TEMPLATE' ? 'Gia công 3D' : 'Có sẵn' }}
        </span>
      </a>

      <!-- Body -->
      <div class="p-4 flex flex-col flex-1">
        <div class="text-xs font-mono text-text-muted mb-1 truncate">
          {{ product.sku }}
          @if (product.materialName) {
            <span> · {{ product.materialName }}</span>
          }
        </div>

        <a
          [routerLink]="['/products', product.slug]"
          class="text-base font-bold text-text-primary hover:text-accent line-clamp-2 mb-3 leading-snug transition-colors"
        >
          {{ product.name }}
        </a>

        <div class="mt-auto pt-3 border-t border-border">
          @if (authService.isAdmin()) {
            <p class="text-xs text-text-muted">Đang xem với tư cách quản trị viên</p>
          } @else if (product.productType === 'CUSTOM_TEMPLATE') {
            <div class="text-xs sm:text-sm text-text-secondary mb-3 flex items-center justify-between gap-2">
              <span>Kích thước mẫu:</span>
              <span class="font-mono tabular-nums font-semibold text-text-primary">
                {{ product.defaultWidthMm || 80 }} × {{ product.defaultHeightMm || 40 }} × {{ product.defaultThicknessMm || 0.8 }} mm
              </span>
            </div>
            <a
              routerLink="/quote-builder"
              [queryParams]="{
                productId: product.id,
                materialId: product.materialId,
                processingMethodId: product.processingMethodId,
                w: product.defaultWidthMm || 80,
                h: product.defaultHeightMm || 40,
                t: product.defaultThicknessMm || 0.8
              }"
              appButton
              variant="primary"
              size="sm"
              [fullWidth]="true"
            >
              Tùy chỉnh kích thước 3D
            </a>
          } @else {
            <div class="flex items-baseline justify-between mb-3">
              <span class="price-text font-mono tabular-nums text-base font-bold text-accent">
                {{ product.basePrice | vnd }}
              </span>
              <span class="text-xs font-mono tabular-nums text-text-muted">
                Kho: {{ product.stockQuantity ?? 0 }}
              </span>
            </div>
            <button
              type="button"
              (click)="addToCart.emit(product)"
              [disabled]="(product.stockQuantity ?? 0) <= 0"
              appButton
              variant="secondary"
              size="sm"
              [fullWidth]="true"
            >
              {{ (product.stockQuantity ?? 0) > 0 ? 'Thêm vào giỏ' : 'Hết hàng' }}
            </button>
          }
        </div>
      </div>
    </div>
  `,
})
export class ProductCardComponent {
  readonly authService = inject(AuthService);
  @Input({ required: true }) product!: Product;
  @Output() addToCart = new EventEmitter<Product>();
}
