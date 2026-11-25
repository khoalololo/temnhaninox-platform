import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Product } from '../../../core/models/catalog.models';
import { VndCurrencyPipe } from '../../../core/pipes/vnd-currency.pipe';
import { ButtonDirective } from '../button/button.component';
import { ImagePlaceholderComponent } from '../image-placeholder/image-placeholder.component';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterLink, VndCurrencyPipe, ButtonDirective, ImagePlaceholderComponent],
  template: `
    <div class="industrial-card overflow-hidden flex flex-col h-full hover:border-steel">
      <!-- Image -->
      <a [routerLink]="['/products', product.slug]" class="relative block aspect-[4/3] bg-bg border-b border-border overflow-hidden">
        @if (product.imageUrl) {
          <img
            [src]="product.imageUrl"
            [alt]="product.name"
            class="w-full h-full object-cover"
            loading="lazy"
          />
        } @else {
          <app-image-placeholder [sku]="product.sku" />
        }

        <span
          class="absolute top-2 left-2 text-[10px] font-mono font-medium uppercase px-2 py-0.5 rounded-full border bg-bg/90"
          [class]="product.productType === 'CUSTOM_TEMPLATE'
            ? 'text-accent border-accent/70'
            : 'text-steel border-steel/70'"
        >
          {{ product.productType === 'CUSTOM_TEMPLATE' ? 'Gia công 3D' : 'Có sẵn' }}
        </span>
      </a>

      <!-- Body -->
      <div class="p-3.5 flex flex-col flex-1">
        <div class="text-[11px] font-mono text-text-muted mb-1 truncate">
          {{ product.sku }}
          @if (product.materialName) {
            <span> · {{ product.materialName }}</span>
          }
        </div>

        <a
          [routerLink]="['/products', product.slug]"
          class="text-sm font-semibold text-text-primary hover:text-steel-hover line-clamp-2 mb-2 leading-snug transition-colors"
        >
          {{ product.name }}
        </a>

        <div class="mt-auto pt-2.5 border-t border-border">
          @if (product.productType === 'CUSTOM_TEMPLATE') {
            <div class="text-xs text-text-secondary mb-2.5 flex items-center justify-between gap-2">
              <span>Kích thước mẫu:</span>
              <span class="font-mono tabular-nums font-medium text-text-primary">
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
            <div class="flex items-baseline justify-between mb-2.5">
              <span class="font-mono tabular-nums text-sm font-semibold text-text-primary">
                {{ product.basePrice | vnd }}
              </span>
              <span class="text-[11px] font-mono tabular-nums text-text-muted">
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
  @Input({ required: true }) product!: Product;
  @Output() addToCart = new EventEmitter<Product>();
}
