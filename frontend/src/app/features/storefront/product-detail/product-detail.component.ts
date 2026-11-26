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

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, VndCurrencyPipe, LucideAngularModule, ButtonDirective, ImagePlaceholderComponent],
  template: `
    <div class="max-w-6xl mx-auto px-4 py-8">
      <div class="mb-4 text-xs text-text-muted flex items-center gap-2">
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
          <span class="font-sans tabular-nums text-text-secondary">{{ product()!.name }}</span>
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
            ← Quay lại danh mục
          </a>
        </div>
      } @else {
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
                      <td class="px-3.5 py-2.5 font-sans tabular-nums text-base font-bold text-accent">
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
                    Tùy chỉnh kích thước & Xem trước 3D →
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
                      ✓ Đã thêm vào giỏ hàng. <a routerLink="/cart" class="underline font-semibold text-steel hover:text-steel-hover">Xem giỏ hàng</a>
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

  loadProduct(slug = this.route.snapshot.paramMap.get('slug') || ''): void {
    if (!slug) {
      this.loadError.set('Đường dẫn sản phẩm không hợp lệ.');
      this.loading.set(false);
      return;
    }
      this.loading.set(true);
      this.loadError.set('');
      this.product.set(null);
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

  addToCart(): void {
    const p = this.product();
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
        quantity: Math.max(1, Math.min(Number(this.quantity) || 1, p.stockQuantity ?? Number.MAX_SAFE_INTEGER)),
      })
      .subscribe({
        next: () => {
          this.adding.set(false);
          this.addedNotice.set(true);
        },
        error: () => {
          this.adding.set(false);
          this.actionError.set('Không thể thêm sản phẩm vào giỏ hàng. Vui lòng thử lại.');
        },
      });
  }
}
