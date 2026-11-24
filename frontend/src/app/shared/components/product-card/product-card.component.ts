import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Product } from '../../../core/models/catalog.models';
import { VndCurrencyPipe } from '../../../core/pipes/vnd-currency.pipe';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterLink, VndCurrencyPipe],
  template: `
    <div class="bg-white border border-slate-300 rounded-md overflow-hidden flex flex-col h-full hover:border-slate-400 transition-colors">
      <!-- Image -->
      <a [routerLink]="['/products', product.slug]" class="relative block aspect-[4/3] bg-slate-100 border-b border-slate-200 overflow-hidden">
        @if (product.imageUrl) {
          <img
            [src]="product.imageUrl"
            [alt]="product.name"
            class="w-full h-full object-cover"
            loading="lazy"
          />
        } @else {
          <div class="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100">
            <span class="font-mono text-xs font-semibold tracking-wider uppercase">{{ product.sku }}</span>
            <span class="text-[11px] mt-1">{{ product.materialName || 'Kim loại' }}</span>
          </div>
        }

        <span
          class="absolute top-2 left-2 text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded border"
          [class]="product.productType === 'CUSTOM_TEMPLATE'
            ? 'bg-amber-50 text-amber-800 border-amber-300'
            : 'bg-slate-900 text-white border-slate-700'"
        >
          {{ product.productType === 'CUSTOM_TEMPLATE' ? 'Gia công 3D' : 'Có sẵn' }}
        </span>
      </a>

      <!-- Body -->
      <div class="p-3 flex flex-col flex-1">
        <div class="text-[11px] font-mono text-slate-500 mb-1 truncate">
          {{ product.sku }}
          @if (product.materialName) {
            <span> · {{ product.materialName }}</span>
          }
        </div>

        <a
          [routerLink]="['/products', product.slug]"
          class="text-sm font-semibold text-slate-900 hover:text-amber-700 line-clamp-2 mb-2 leading-snug"
        >
          {{ product.name }}
        </a>

        <div class="mt-auto pt-2 border-t border-slate-100">
          @if (product.productType === 'CUSTOM_TEMPLATE') {
            <div class="text-xs text-slate-600 mb-2 flex items-center justify-between">
              <span>Kích thước mẫu:</span>
              <span class="font-mono tabular-nums font-medium text-slate-900">
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
              class="block w-full text-center bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold py-2 px-3 rounded-md transition-colors"
            >
              Tùy chỉnh kích thước 3D
            </a>
          } @else {
            <div class="flex items-baseline justify-between mb-2">
              <span class="font-mono tabular-nums text-sm font-bold text-slate-900">
                {{ product.basePrice | vnd }}
              </span>
              <span class="text-[11px] font-mono tabular-nums text-slate-500">
                Kho: {{ product.stockQuantity ?? 0 }}
              </span>
            </div>
            <button
              type="button"
              (click)="addToCart.emit(product)"
              [disabled]="(product.stockQuantity ?? 0) <= 0"
              class="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500 text-white text-xs font-semibold py-2 px-3 rounded-md transition-colors"
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
