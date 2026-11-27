import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CatalogApiService } from '../../../core/services/catalog-api.service';
import { CartApiService } from '../../../core/services/cart-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Product } from '../../../core/models/catalog.models';
import { VndCurrencyPipe } from '../../../core/pipes/vnd-currency.pipe';
import { LucideAngularModule, ChevronLeft, ChevronRight, Minus, Plus, X, ZoomIn } from 'lucide-angular';
import { ButtonDirective } from '../../../shared/components/button/button.component';
import { ImagePlaceholderComponent } from '../../../shared/components/image-placeholder/image-placeholder.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card.component';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, VndCurrencyPipe, LucideAngularModule, ButtonDirective, ImagePlaceholderComponent, ProductCardComponent],
  template: `
    <div class="mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-8">
      <div class="mb-4 flex min-w-0 flex-wrap items-center gap-2 text-xs text-text-muted">
        <a routerLink="/" class="hover:text-steel-hover transition-colors">Trang chủ</a>
        <span>/</span>
        @if (product()) {
          <a
            routerLink="/products"
            [queryParams]="{ categoryId: product()!.categoryId }"
            class="hover:text-steel-hover transition-colors"
          >{{ product()!.categoryName || 'Danh mục sản phẩm' }}</a>
        } @else {
          <a routerLink="/products" class="hover:text-steel-hover transition-colors">Danh mục sản phẩm</a>
        }
        @if (product()) {
          <span>/</span>
          <span class="min-w-0 max-w-full truncate font-sans tabular-nums text-text-secondary">{{ product()!.name }}</span>
        }
      </div>

      @if (loading()) {
        <div class="bg-surface border border-border rounded-[10px] h-96 animate-pulse"></div>
      } @else if (loadError()) {
        <div class="industrial-card p-8 text-center space-y-3">
          <p class="font-heading text-sm font-bold text-danger">{{ loadError() }}</p>
          <button type="button" (click)="loadProduct()" appButton variant="primary" size="sm">Thử lại</button>
        </div>
      } @else if (!product()) {
        <div class="industrial-card p-8 text-center">
          <p class="font-heading text-sm font-bold text-text-primary mb-2">Không tìm thấy sản phẩm</p>
          <a routerLink="/products" class="text-xs font-medium text-steel hover:text-steel-hover hover:underline">
            <span class="inline-flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M19 12H5m0 0 6 6m-6-6 6-6" /></svg>
              Quay lại danh mục
            </span>
          </a>
        </div>
      } @else {
        <section class="grid min-w-0 overflow-hidden rounded-[10px] border border-border bg-bg-elevated shadow-sm lg:grid-cols-12">
          <div class="min-w-0 bg-bg-elevated p-4 sm:p-6 lg:col-span-7">
            <div class="flex flex-col gap-3 md:flex-row">
              @if (galleryImages().length > 1) {
                <div class="no-scrollbar order-2 flex gap-2 overflow-x-auto md:order-1 md:w-20 md:shrink-0 md:flex-col md:overflow-y-auto">
                  @for (img of galleryImages(); track img) {
                    <button
                      type="button"
                      (click)="selectImage(img)"
                      class="h-16 w-16 shrink-0 overflow-hidden rounded-[6px] border-2 bg-bg transition-colors sm:h-20 sm:w-20"
                      [class]="activeImage() === img ? 'border-accent' : 'border-border hover:border-accent'"
                      [attr.aria-label]="'Xem ảnh ' + product()!.name"
                      [attr.aria-pressed]="activeImage() === img"
                    >
                      <img [src]="img" [alt]="product()!.name" class="h-full w-full object-cover" />
                    </button>
                  }
                </div>
              }
              <div
                class="relative order-1 flex min-h-[280px] min-w-0 flex-1 items-center justify-center overflow-hidden rounded-[8px] border border-border bg-bg p-3 sm:min-h-[420px] sm:p-6"
                (pointerdown)="startProductGalleryDrag($event)"
                (pointermove)="moveProductGalleryDrag($event)"
                (pointerup)="endProductGalleryDrag($event)"
                (pointercancel)="endProductGalleryDrag($event)"
              >
                <span class="absolute right-3 top-3 z-10 rounded-full border border-border bg-bg-elevated px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-text-primary shadow-sm">
                  {{ product()!.productType === 'CUSTOM_TEMPLATE' ? 'Gia công 3D' : 'Hàng có sẵn' }}
                </span>
                @if (activeImage() && !mainImageBroken()) {
                  <img
                    [src]="activeImage()!"
                    [alt]="product()!.name"
                    (error)="markGalleryImageBroken(activeImage()!)"
                    (click)="openLightbox()"
                    (keydown.enter)="openLightbox()"
                    role="button"
                    tabindex="0"
                    draggable="false"
                    class="max-h-[520px] w-full cursor-zoom-in select-none object-contain"
                  />
                } @else {
                  <app-image-placeholder [sku]="product()!.sku" />
                }
                @if (galleryImages().length > 1) {
                  <button type="button" (click)="navigateGallery(-1)" aria-label="Ảnh trước" class="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-bg-elevated/95 text-text-primary shadow hover:bg-surface-raised">
                    <lucide-icon [img]="ChevronLeftIcon" [size]="18" />
                  </button>
                  <button type="button" (click)="navigateGallery(1)" aria-label="Ảnh tiếp theo" class="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-bg-elevated/95 text-text-primary shadow hover:bg-surface-raised">
                    <lucide-icon [img]="ChevronRightIcon" [size]="18" />
                  </button>
                }
              </div>
            </div>
          </div>

          <div class="flex min-w-0 flex-col bg-bg-elevated p-4 text-text-primary sm:p-8 lg:col-span-5 lg:rounded-none">
            <p class="font-mono text-sm font-bold tracking-widest text-warning tabular-nums">{{ product()!.sku }}</p>
            <h1 class="mt-2 break-words text-2xl font-bold leading-tight text-text-primary sm:text-3xl">{{ product()!.name }}</h1>
            <p class="mt-2 text-sm text-text-secondary">{{ product()!.materialName || product()!.categoryName || 'Sản phẩm NVX' }}</p>
            @if (product()!.shortDescription) {
              <p class="mt-4 text-sm leading-6 text-text-secondary">{{ product()!.shortDescription }}</p>
            }

            <div class="mt-6 border-y border-border py-5">
              @if (product()!.productType === 'STANDARD_ITEM') {
                <div class="price-text break-words text-2xl font-bold tabular-nums sm:text-3xl">{{ product()!.basePrice | vnd }}</div>
                <div class="mt-1 text-xs text-text-muted">Giá bán / cái</div>
              } @else {
                <div class="text-xl font-bold text-text-primary">Báo giá theo kích thước 3D</div>
                <div class="mt-1 text-xs text-text-muted">Tùy chỉnh kích thước và vật liệu theo yêu cầu</div>
              }
            </div>

            @if (product()!.productType === 'STANDARD_ITEM') {
              <div class="mt-5">
                <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">Số lượng đặt nhanh</div>
                <div class="flex flex-wrap items-center gap-2">
                  @for (preset of [1, 5, 10]; track preset) {
                    <button
                      type="button"
                      (click)="setQuantityPreset(preset)"
                      class="rounded-[6px] border bg-bg-elevated px-3 py-2 text-sm text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 sm:px-4"
                      [class]="quantity === preset
                        ? 'border-accent bg-accent font-semibold text-white hover:border-accent-hover hover:bg-accent-hover'
                        : 'border-border bg-bg-elevated text-text-primary hover:border-accent hover:bg-accent hover:text-white'"
                      [attr.aria-pressed]="quantity === preset"
                    >{{ preset }} cái</button>
                  }
                  <div class="flex items-center overflow-hidden rounded-[6px] border border-border bg-bg-elevated">
                    <button type="button" (click)="quantity = quantity > 1 ? quantity - 1 : 1" class="px-3 py-2 text-text-primary hover:bg-surface-raised" aria-label="Giảm số lượng">-</button>
                    <input type="number" [(ngModel)]="quantity" min="1" class="w-14 border-x border-border bg-bg-elevated py-2 text-center text-sm text-text-primary focus:outline-none" aria-label="Số lượng" />
                    <button type="button" (click)="quantity = quantity + 1" class="px-3 py-2 text-text-primary hover:bg-surface-raised" aria-label="Tăng số lượng">+</button>
                  </div>
                </div>
              </div>
            }

            <div class="mt-6 space-y-2 rounded-[8px] border border-border bg-surface p-3 text-sm sm:p-4">
              <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-3"><span class="text-text-secondary">Vật liệu</span><span class="break-words text-right text-text-primary">{{ product()!.materialName || 'Theo tùy chọn' }}</span></div>
              <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-3"><span class="text-text-secondary">Kích thước chuẩn</span><span class="break-words text-right font-mono tabular-nums text-text-primary">{{ product()!.defaultWidthMm || 80 }} × {{ product()!.defaultHeightMm || 40 }} × {{ product()!.defaultThicknessMm || 0.8 }} mm</span></div>
              <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-3"><span class="text-text-secondary">Gia công</span><span class="break-words text-right text-text-primary">{{ product()!.processingMethodName || 'Theo tùy chọn' }}</span></div>
              <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-3"><span class="text-text-secondary">Thời gian dự kiến</span><span class="break-words text-right text-text-primary">{{ product()!.productType === 'CUSTOM_TEMPLATE' ? '3–5 ngày làm việc' : 'Giao trong 24–48 giờ' }}</span></div>
              @if (product()!.productType === 'STANDARD_ITEM') {
                <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-3"><span class="text-text-secondary">Tình trạng kho</span><span class="break-words text-right text-text-primary">{{ (product()!.stockQuantity ?? 0) > 0 ? 'Còn hàng' : 'Hết hàng' }}</span></div>
              }
            </div>

            <div class="mt-6 space-y-3">
              @if (authService.isAdmin()) {
                <p class="text-sm text-text-secondary">Đang xem với tư cách quản trị viên</p>
              } @else if (product()!.productType === 'CUSTOM_TEMPLATE') {
                <a routerLink="/quote-builder" [queryParams]="quoteBuilderParams()" appButton variant="primary" size="lg" [fullWidth]="true">
                  Mở trình thiết kế &amp; Báo giá 3D
                </a>
              } @else {
                <button type="button" (click)="addToCart()" [disabled]="adding() || (product()!.stockQuantity ?? 0) <= 0" appButton variant="primary" size="lg" [fullWidth]="true">
                  {{ adding() ? 'Đang thêm...' : 'Thêm vào giỏ hàng' }}
                </button>
              }
              <div class="grid grid-cols-2 gap-3">
                <button type="button" (click)="downloadSpecification()" class="min-h-10 rounded-[6px] border border-border px-3 text-center text-xs font-semibold text-text-primary transition-colors hover:border-accent hover:bg-surface-raised hover:text-accent">Tải bảng thông số</button>
                <a href="tel:0989820101" class="flex min-h-10 items-center justify-center rounded-[6px] border border-border px-3 text-center text-xs font-semibold text-text-primary transition-colors hover:border-accent hover:bg-surface-raised hover:text-accent">Liên hệ tư vấn xưởng</a>
              </div>
              @if (addedNotice()) { <p class="text-sm font-medium text-success" role="status">Đã thêm vào giỏ hàng.</p> }
              @if (actionError()) { <p class="text-sm text-danger" role="alert">{{ actionError() }}</p> }
            </div>
          </div>
        </section>

        <ng-template>
        <div class="industrial-card p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <!-- Gallery -->
          <div class="lg:col-span-6 space-y-3">
            <div
              class="relative aspect-[4/3] bg-bg border border-border rounded-[10px] overflow-hidden group touch-pan-y cursor-grab active:cursor-grabbing select-none"
              (pointerdown)="startProductGalleryDrag($event)"
              (pointermove)="moveProductGalleryDrag($event)"
              (pointerup)="endProductGalleryDrag($event)"
              (pointercancel)="endProductGalleryDrag($event)"
            >
              <div
                class="flex h-full w-full"
                [style.transform]="productCarouselTransform()"
                [style.transition]="productCarouselTransition()"
                (transitionend)="finishProductCarouselTransition()"
              >
                @for (image of carouselImages(); track $index) {
                  <div class="relative h-full w-full shrink-0 flex items-center justify-center">
                    @if (image === activeImage() && mainImageBroken()) {
                      <app-image-placeholder [sku]="product()!.sku" />
                    } @else {
                      <img
                        [src]="image"
                        [alt]="product()!.name"
                        (error)="markGalleryImageBroken(image)"
                        (click)="handleGalleryImageClick($event)"
                        (keydown.enter)="openLightbox()"
                        role="button"
                        tabindex="0"
                        draggable="false"
                        class="h-full w-full object-contain cursor-zoom-in pointer-events-auto"
                      />
                    }
                  </div>
                }
              </div>

              @if (galleryImages().length > 1) {
                <button
                  type="button"
                  (click)="navigateGallery(-1)"
                  aria-label="Ảnh sản phẩm trước"
                  class="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-bg-elevated/95 border border-border shadow-md flex items-center justify-center text-text-primary hover:bg-accent hover:text-white hover:border-accent transition-colors"
                >
                  <lucide-icon [img]="ChevronLeftIcon" [size]="18" />
                </button>
                <button
                  type="button"
                  (click)="navigateGallery(1)"
                  aria-label="Ảnh sản phẩm tiếp theo"
                  class="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-bg-elevated/95 border border-border shadow-md flex items-center justify-center text-text-primary hover:bg-accent hover:text-white hover:border-accent transition-colors"
                >
                  <lucide-icon [img]="ChevronRightIcon" [size]="18" />
                </button>
              }
              @if (activeImage() && !mainImageBroken()) {
                <button
                  type="button"
                  (click)="openLightbox()"
                  aria-label="Phóng to ảnh sản phẩm"
                  title="Phóng to ảnh"
                  class="absolute right-3 bottom-3 w-9 h-9 rounded-full bg-bg-elevated/95 border border-border shadow-md flex items-center justify-center text-text-primary hover:bg-accent hover:text-white hover:border-accent transition-colors"
                >
                  <lucide-icon [img]="ZoomInIcon" [size]="17" />
                </button>
              }
              @if (galleryImages().length > 1) {
                <span class="absolute left-3 bottom-3 rounded-full bg-bg-elevated/95 border border-border px-2.5 py-1 text-xs tabular-nums text-text-secondary">
                  {{ activeImageIndex() + 1 }} / {{ galleryImages().length }}
                </span>
              }
            </div>

            @if (galleryImages().length > 1) {
              <div class="flex gap-2 overflow-x-auto">
                @for (img of galleryImages(); track img) {
                  <button
                    type="button"
                    (click)="selectImage(img)"
                    class="w-16 h-16 border rounded-[6px] overflow-hidden shrink-0 bg-bg"
                    [class]="activeImage() === img ? 'border-accent border-2' : 'border-border'"
                    [attr.aria-label]="'Xem ảnh ' + product()!.name"
                  >
                    <img [src]="img" [alt]="product()!.name" class="w-full h-full object-cover" />
                  </button>
                }
              </div>
            }
          </div>

          <!-- Technical Specs & Order Actions -->
          <div class="lg:col-span-6 flex flex-col">
            <div class="flex items-center gap-2 mb-2">
              <span class="font-sans tabular-nums text-xs px-2.5 py-0.5 bg-bg border border-border rounded-full text-text-secondary">
                SKU: {{ product()!.sku }}
              </span>
              <span
                class="font-sans text-xs px-2.5 py-0.5 rounded-full border font-medium"
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
                      <td class="price-text px-3.5 py-2.5 font-sans tabular-nums text-base font-bold text-accent">
                        {{ product()!.basePrice | vnd }}
                      </td>
                    </tr>
                    <tr>
                      <td class="px-3.5 py-2.5 text-text-secondary">Tồn kho sẵn sàng</td>
                      <td class="px-3.5 py-2.5 font-sans tabular-nums text-text-primary">
                        {{ product()!.stockQuantity ?? 0 }} đơn vị
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Action Box -->
            <div class="mt-auto pt-4 border-t border-border">
              @if (authService.isAdmin()) {
                <p class="text-sm text-text-muted">Đang xem với tư cách quản trị viên</p>
              } @else {
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
                    <span>Tùy chỉnh kích thước &amp; Xem trước 3D</span>
                    <svg viewBox="0 0 24 24" class="ml-2 inline h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12h14m0 0-6-6m6 6-6 6" /></svg>
                  </a>
                } @else {
                  <div class="flex flex-wrap items-center gap-3">
                    <div class="flex items-center border border-border rounded-[6px] bg-bg">
                      <button
                        type="button"
                        (click)="quantity = quantity > 1 ? quantity - 1 : 1"
                        class="px-3 py-2 text-sm font-sans tabular-nums text-text-primary hover:bg-surface-raised"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        [(ngModel)]="quantity"
                        min="1"
                        class="w-16 text-center font-sans tabular-nums text-sm bg-bg text-text-primary border-x border-border py-2 focus:outline-none"
                      />
                      <button
                        type="button"
                        (click)="quantity = quantity + 1"
                        class="px-3 py-2 text-sm font-sans tabular-nums text-text-primary hover:bg-surface-raised"
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
                      <svg viewBox="0 0 24 24" class="mr-1 inline h-4 w-4 align-text-bottom" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M3 4h2l2.2 10.1a2 2 0 0 0 2 1.6h8.5a2 2 0 0 0 1.9-1.4L21 8H6" />
                        <circle cx="10" cy="19" r="1.3" />
                        <circle cx="18" cy="19" r="1.3" />
                      </svg>
                      Đã thêm vào giỏ hàng. <a routerLink="/cart" class="underline font-semibold text-steel hover:text-steel-hover">Xem giỏ hàng</a>
                    </div>
                  }
                  @if (actionError()) {
                    <p class="mt-3 text-xs text-danger" role="alert">{{ actionError() }}</p>
                  }
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
        </ng-template>

        <section class="mt-8 rounded-[10px] border border-border bg-bg-elevated p-5 sm:p-7">
          <h2 class="border-b border-border pb-3 text-lg font-bold text-text-primary">Thông số kỹ thuật chi tiết</h2>
          <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div class="rounded-[6px] bg-surface p-3"><div class="text-xs text-text-muted">SKU</div><div class="mt-1 font-mono text-sm font-semibold text-text-primary">{{ product()!.sku }}</div></div>
            <div class="rounded-[6px] bg-surface p-3"><div class="text-xs text-text-muted">Danh mục</div><div class="mt-1 text-sm font-semibold text-text-primary">{{ product()!.categoryName || 'Chưa phân loại' }}</div></div>
            <div class="rounded-[6px] bg-surface p-3"><div class="text-xs text-text-muted">Vật liệu</div><div class="mt-1 text-sm font-semibold text-text-primary">{{ product()!.materialName || 'Theo tùy chọn' }}</div></div>
            <div class="rounded-[6px] bg-surface p-3"><div class="text-xs text-text-muted">Kích thước chuẩn</div><div class="mt-1 font-mono text-sm font-semibold tabular-nums text-text-primary">{{ product()!.defaultWidthMm || 80 }} × {{ product()!.defaultHeightMm || 40 }} × {{ product()!.defaultThicknessMm || 0.8 }} mm</div></div>
            <div class="rounded-[6px] bg-surface p-3"><div class="text-xs text-text-muted">Công nghệ gia công</div><div class="mt-1 text-sm font-semibold text-text-primary">{{ product()!.processingMethodName || 'Theo tùy chọn' }}</div></div>
            <div class="rounded-[6px] bg-surface p-3"><div class="text-xs text-text-muted">Loại sản phẩm</div><div class="mt-1 text-sm font-semibold text-text-primary">{{ product()!.productType === 'CUSTOM_TEMPLATE' ? 'Gia công theo yêu cầu' : 'Hàng có sẵn' }}</div></div>
          </div>
          @if (product()!.description) {
            <div class="mt-5 whitespace-pre-line text-sm leading-6 text-text-secondary">{{ product()!.description }}</div>
          }
        </section>

        @if (relatedProducts().length) {
          <section class="mt-10">
            <h2 class="mb-5 text-lg font-bold text-text-primary">Sản phẩm cùng danh mục</h2>
            <div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              @for (related of relatedProducts(); track related.id) {
                <app-product-card [product]="related" (addToCart)="addRelatedToCart($event)" />
              }
            </div>
          </section>
        } @else if (relatedError()) {
          <p class="mt-6 text-sm text-text-secondary" role="status">{{ relatedError() }}</p>
        }

        @if (lightboxOpen() && activeImage() && !mainImageBroken()) {
          <div
            class="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
            role="dialog"
            aria-modal="true"
            [attr.aria-label]="'Ảnh sản phẩm ' + product()!.name"
            (click)="closeLightbox()"
          >
            <div class="relative w-full h-full max-w-[1400px] flex flex-col items-center justify-center" (click)="$event.stopPropagation()">
              <p class="absolute top-0 left-0 right-14 truncate text-sm font-medium text-white/85 sm:text-base">
                {{ product()!.name }}
              </p>
              <button
                type="button"
                (click)="closeLightbox()"
                aria-label="Đóng ảnh phóng to"
                class="absolute top-0 right-0 z-10 w-10 h-10 rounded-full border border-white/25 bg-black/35 flex items-center justify-center text-white hover:bg-white hover:text-black transition-colors"
              >
                <lucide-icon [img]="CloseIcon" [size]="22" />
              </button>
              @if (galleryImages().length > 1) {
                <button
                  type="button"
                  (click)="navigateGallery(-1)"
                  aria-label="Ảnh sản phẩm trước"
                  class="absolute left-0 sm:left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full border border-white/25 bg-black/35 flex items-center justify-center text-white hover:bg-white hover:text-black transition-colors"
                >
                  <lucide-icon [img]="ChevronLeftIcon" [size]="22" />
                </button>
                <button
                  type="button"
                  (click)="navigateGallery(1)"
                  aria-label="Ảnh sản phẩm tiếp theo"
                  class="absolute right-0 sm:right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full border border-white/25 bg-black/35 flex items-center justify-center text-white hover:bg-white hover:text-black transition-colors"
                >
                  <lucide-icon [img]="ChevronRightIcon" [size]="22" />
                </button>
              }
              <div class="max-w-full max-h-[82vh] overflow-auto flex items-center justify-center">
                <img
                  [src]="activeImage()!"
                  [alt]="product()!.name"
                  [style.transform]="'scale(' + lightboxZoom() + ')'"
                  class="max-w-full max-h-[78vh] object-contain transition-transform duration-200 origin-center"
                />
              </div>
              <div class="absolute bottom-0 flex items-center gap-2 rounded-full border border-white/15 bg-black/55 px-3 py-2 text-white shadow-lg backdrop-blur-md">
                <button type="button" (click)="adjustLightboxZoom(-0.5)" [disabled]="lightboxZoom() <= 1" aria-label="Thu nhỏ ảnh" class="rounded-full p-1.5 hover:bg-white/15 disabled:opacity-40">
                  <lucide-icon [img]="MinusIcon" [size]="20" />
                </button>
                <span class="min-w-12 text-center text-xs font-medium tabular-nums">{{ lightboxZoom() * 100 }}%</span>
                <button type="button" (click)="adjustLightboxZoom(0.5)" [disabled]="lightboxZoom() >= 3" aria-label="Phóng to ảnh" class="rounded-full p-1.5 hover:bg-white/15 disabled:opacity-40">
                  <lucide-icon [img]="PlusIcon" [size]="20" />
                </button>
                @if (galleryImages().length > 1) {
                  <span class="border-l border-white/25 pl-3 text-xs tabular-nums text-white/75">{{ activeImageIndex() + 1 }} / {{ galleryImages().length }}</span>
                }
              </div>
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
  readonly authService = inject(AuthService);

  readonly product = signal<Product | null>(null);
  readonly relatedProducts = signal<Product[]>([]);
  readonly relatedError = signal('');
  readonly galleryImages = computed(() => {
    const product = this.product();
    return [...new Set([product?.imageUrl, ...(product?.galleryUrls || []), ...(product?.images || [])]
      .filter((image): image is string => !!image))];
  });
  readonly carouselImages = computed(() => {
    const images = this.galleryImages();
    return images.length > 1 ? [images[images.length - 1], ...images, images[0]] : images;
  });
  readonly activeImage = signal<string | null>(null);
  readonly lightboxOpen = signal(false);
  readonly lightboxZoom = signal(1);
  readonly productCarouselPosition = signal(0);
  readonly productCarouselTransitionEnabled = signal(true);
  readonly productCarouselDragOffset = signal(0);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly adding = signal(false);
  readonly addedNotice = signal(false);
  readonly actionError = signal('');
  private readonly toast = inject(ToastService);
  quantity = 1;
  readonly ChevronLeftIcon = ChevronLeft;
  readonly ChevronRightIcon = ChevronRight;
  readonly MinusIcon = Minus;
  readonly PlusIcon = Plus;
  readonly CloseIcon = X;
  readonly ZoomInIcon = ZoomIn;
  private productGalleryDragStartX = 0;
  private productGalleryLastX = 0;
  private productGalleryLastMoveAt = 0;
  private productGalleryVelocity = 0;
  private productGalleryDragging = false;
  private suppressGalleryClick = false;
  private productGalleryFrame?: HTMLElement;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      if (!slug) return;
      this.loadProduct(slug);
    });
  }

  quoteBuilderParams(): Record<string, string | number | undefined> {
    const p = this.product();
    return {
      productId: p?.id,
      materialId: p?.materialId,
      processingMethodId: p?.processingMethodId,
      w: p?.defaultWidthMm || 80,
      h: p?.defaultHeightMm || 40,
      t: p?.defaultThicknessMm || 0.8,
    };
  }

  setQuantityPreset(quantity: number): void {
    const max = this.product()?.stockQuantity;
    this.quantity = Math.min(quantity, max && max > 0 ? max : quantity);
  }

  downloadSpecification(): void {
    const p = this.product();
    if (!p) return;
    const lines = [
      `Tên sản phẩm: ${p.name}`,
      `SKU: ${p.sku}`,
      `Danh mục: ${p.categoryName || 'Chưa phân loại'}`,
      `Vật liệu: ${p.materialName || 'Theo tùy chọn'}`,
      `Kích thước chuẩn: ${p.defaultWidthMm || 80} x ${p.defaultHeightMm || 40} x ${p.defaultThicknessMm || 0.8} mm`,
      `Công nghệ gia công: ${p.processingMethodName || 'Theo tùy chọn'}`,
      `Thời gian dự kiến: ${p.productType === 'CUSTOM_TEMPLATE' ? '3-5 ngày làm việc' : 'Giao trong 24-48 giờ'}`,
      `Giá: ${p.productType === 'STANDARD_ITEM' ? `${p.basePrice ?? 0} VND / cái` : 'Báo giá theo kích thước 3D'}`,
      '',
      p.description || p.shortDescription || '',
    ];
    const objectUrl = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `${p.sku}-thong-so.txt`;
    link.click();
    URL.revokeObjectURL(objectUrl);
  }

  loadProduct(slug = this.route.snapshot.paramMap.get('slug') || ''): void {
    if (!slug) {
      this.loadError.set('Đường dẫn sản phẩm không hợp lệ.');
      this.loading.set(false);
      return;
    }
      this.loading.set(true);
      this.loadError.set('');
      this.product.set(null);
      this.relatedProducts.set([]);
      this.relatedError.set('');
      this.activeImage.set(null);
      this.productCarouselPosition.set(0);
      this.lightboxOpen.set(false);
      this.lightboxZoom.set(1);
      this.mainImageBroken.set(false);
      this.catalogApi.getProductBySlug(slug).subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.success && res.data) {
            this.product.set(res.data);
            this.activeImage.set(this.galleryImages()[0] || null);
            this.productCarouselPosition.set(this.galleryImages().length > 1 ? 1 : 0);
            this.quantity = res.data.minOrderQuantity || 1;
            if (res.data.categoryId) {
              this.catalogApi.getProducts({ categoryId: res.data.categoryId, page: 0, size: 5 }).subscribe({
                next: (relatedRes) => {
                  if (relatedRes.success && relatedRes.data) {
                    this.relatedProducts.set(relatedRes.data.content.filter((item) => item.id !== res.data!.id).slice(0, 4));
                  } else {
                    this.relatedError.set('Không thể tải sản phẩm cùng danh mục.');
                  }
                },
                error: () => this.relatedError.set('Không thể tải sản phẩm cùng danh mục.'),
              });
            }
          } else {
            this.product.set(null);
            this.loadError.set('Không thể tải thông tin sản phẩm. Vui lòng thử lại.');
          }
        },
        error: () => {
          this.loading.set(false);
          this.product.set(null);
          this.loadError.set('Không thể kết nối máy chủ để tải sản phẩm.');
        },
      });
  }

  selectImage(image: string): void {
    const index = this.galleryImages().indexOf(image);
    if (index < 0) return;
    this.activeImage.set(image);
    this.mainImageBroken.set(false);
    this.lightboxZoom.set(1);
    this.productCarouselTransitionEnabled.set(true);
    this.productCarouselPosition.set(this.galleryImages().length > 1 ? index + 1 : index);
  }

  readonly mainImageBroken = signal(false);

  activeImageIndex(): number {
    return this.galleryImages().indexOf(this.activeImage() || '');
  }

  navigateGallery(direction: number): void {
    const images = this.galleryImages();
    if (images.length < 2) return;
    const currentIndex = Math.max(0, this.activeImageIndex());
    const nextIndex = (currentIndex + direction + images.length) % images.length;
    const nextPosition = this.productCarouselPosition() + direction;
    this.activeImage.set(images[nextIndex]);
    this.mainImageBroken.set(false);
    this.lightboxZoom.set(1);
    this.productCarouselTransitionEnabled.set(true);
    this.productCarouselPosition.set(nextPosition);
  }

  productCarouselTransform(): string {
    const offset = this.productCarouselPosition() * 100;
    return `translate3d(calc(-${offset}% + ${this.productCarouselDragOffset()}px), 0, 0)`;
  }

  productCarouselTransition(): string {
    return this.productCarouselTransitionEnabled()
      ? 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)'
      : 'none';
  }

  finishProductCarouselTransition(): void {
    const images = this.galleryImages();
    if (images.length < 2) return;
    const position = this.productCarouselPosition();
    if (position === 0 || position === images.length + 1) {
      this.productCarouselTransitionEnabled.set(false);
      this.productCarouselPosition.set(position === 0 ? images.length : 1);
      requestAnimationFrame(() => this.productCarouselTransitionEnabled.set(true));
    }
  }

  startProductGalleryDrag(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const target = event.target;
    if (target instanceof HTMLElement && target.closest('button')) return;
    const frame = event.currentTarget as HTMLElement;
    if (!frame) return;
    this.productGalleryFrame = frame;
    this.productGalleryDragging = true;
    this.productGalleryDragStartX = event.clientX;
    this.productGalleryLastX = event.clientX;
    this.productGalleryLastMoveAt = performance.now();
    this.productGalleryVelocity = 0;
    this.suppressGalleryClick = false;
    this.productCarouselTransitionEnabled.set(false);
    frame.setPointerCapture(event.pointerId);
  }

  moveProductGalleryDrag(event: PointerEvent): void {
    if (!this.productGalleryDragging || !this.productGalleryFrame) return;
    const now = performance.now();
    const delta = event.clientX - this.productGalleryLastX;
    this.productGalleryVelocity = delta / Math.max(1, now - this.productGalleryLastMoveAt);
    this.productGalleryLastX = event.clientX;
    this.productGalleryLastMoveAt = now;
    const total = event.clientX - this.productGalleryDragStartX;
    if (Math.abs(total) > 5) {
      this.suppressGalleryClick = true;
      event.preventDefault();
    }
    this.productCarouselDragOffset.set(total);
  }

  endProductGalleryDrag(event: PointerEvent): void {
    if (!this.productGalleryDragging) return;
    this.productGalleryDragging = false;
    const frame = this.productGalleryFrame;
    if (frame?.hasPointerCapture(event.pointerId)) frame.releasePointerCapture(event.pointerId);
    const distance = event.clientX - this.productGalleryDragStartX;
    const width = frame?.clientWidth || 1;
    const projectedDistance = distance + this.productGalleryVelocity * 180;
    this.productCarouselDragOffset.set(0);
    this.productCarouselTransitionEnabled.set(true);
    if (Math.abs(projectedDistance) > width * 0.18) {
      this.navigateGallery(projectedDistance < 0 ? 1 : -1);
    }
    if (this.suppressGalleryClick) {
      setTimeout(() => (this.suppressGalleryClick = false));
    }
  }

  markGalleryImageBroken(image: string): void {
    if (image === this.activeImage()) this.mainImageBroken.set(true);
  }

  handleGalleryImageClick(event: MouseEvent): void {
    if (this.suppressGalleryClick) {
      event.preventDefault();
      event.stopPropagation();
      this.suppressGalleryClick = false;
      return;
    }
    this.openLightbox();
  }

  openLightbox(): void {
    if (!this.activeImage() || this.mainImageBroken()) return;
    this.lightboxZoom.set(1);
    this.lightboxOpen.set(true);
  }

  closeLightbox(): void {
    this.lightboxOpen.set(false);
    this.lightboxZoom.set(1);
  }

  adjustLightboxZoom(amount: number): void {
    this.lightboxZoom.update((zoom) => Math.min(3, Math.max(1, zoom + amount)));
  }

  @HostListener('window:keydown', ['$event'])
  handleLightboxKeydown(event: KeyboardEvent): void {
    if (!this.lightboxOpen()) return;
    if (event.key === 'Escape') {
      this.closeLightbox();
    } else if (event.key === 'ArrowLeft') {
      this.navigateGallery(-1);
    } else if (event.key === 'ArrowRight') {
      this.navigateGallery(1);
    } else if (event.key === '+' || event.key === '=') {
      this.adjustLightboxZoom(0.5);
    } else if (event.key === '-') {
      this.adjustLightboxZoom(-0.5);
    }
  }

  addRelatedToCart(product: Product): void {
    this.addToCart(product, product.minOrderQuantity || 1);
  }

  addToCart(p = this.product(), quantity = this.quantity): void {
    if (!p || this.adding()) return;
    this.actionError.set('');
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    this.adding.set(true);
    this.cartApi
      .addItem({
        itemType: 'STANDARD_ITEM',
        productId: p.id,
        quantity: Math.max(1, Math.min(Number(quantity) || 1, p.stockQuantity ?? Number.MAX_SAFE_INTEGER)),
      })
      .subscribe({
        next: (res) => {
          this.adding.set(false);
          if (!res.success || !res.data) {
            const message = res.message || 'Không thể thêm sản phẩm vào giỏ hàng. Vui lòng thử lại.';
            this.actionError.set(message);
            this.toast.show(message, 'error', 'Không thể thêm sản phẩm');
            return;
          }
          this.addedNotice.set(true);
          this.toast.show(`"${p.name}" đã được thêm vào giỏ hàng của bạn.`, 'success', 'Đã thêm vào giỏ hàng', 'cart');
        },
        error: (err) => {
          this.adding.set(false);
          const message = err?.error?.message || 'Không thể thêm sản phẩm vào giỏ hàng. Vui lòng thử lại.';
          this.actionError.set(message);
          this.toast.show(message, 'error', 'Không thể thêm sản phẩm');
        },
      });
  }
}
