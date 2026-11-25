import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule, CheckCircle2, ArrowRight, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-angular';
import { CatalogApiService } from '../../../core/services/catalog-api.service';
import { CartApiService } from '../../../core/services/cart-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Product } from '../../../core/models/catalog.models';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card.component';
import { ImagePlaceholderComponent } from '../../../shared/components/image-placeholder/image-placeholder.component';
import { ButtonDirective } from '../../../shared/components/button/button.component';

interface VisualCategoryCard {
  title: string;
  subtitle: string;
  imageUrl: string;
  skuHint: string;
  search?: string;
  productType?: 'STANDARD_ITEM' | 'CUSTOM_TEMPLATE';
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    LucideAngularModule,
    ProductCardComponent,
    ImagePlaceholderComponent,
    ButtonDirective,
  ],
  template: `
    <!-- SECTION 1: Full-Width Video Hero Banner (matches temnhaninox.com hero + 3D quote CTA) -->
    <section class="relative w-full min-h-[460px] lg:min-h-[540px] flex items-center bg-[#142414] text-white overflow-hidden">
      @if (!videoBroken()) {
        <video
          class="absolute inset-0 w-full h-full object-cover"
          src="/assets/videos/hero-workshop.mp4"
          poster="/assets/images/workshop-1.jpg"
          autoplay
          muted
          loop
          playsinline
          (error)="videoBroken.set(true)"
        ></video>
      } @else if (!brokenImages()['/assets/images/project-bg.jpg']) {
        <img
          src="/assets/images/project-bg.jpg"
          alt="Xưởng Tem Nhãn Inox NVX"
          (error)="markImageBroken('/assets/images/project-bg.jpg')"
          class="absolute inset-0 w-full h-full object-cover"
        />
      }

      <!-- Dark forest overlay for crisp text legibility -->
      <div class="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/35"></div>

      <div class="relative z-10 max-w-7xl mx-auto px-4 py-14 lg:py-20 w-full">
        <div class="max-w-2xl space-y-5">
          <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#187115]/90 text-white text-xs sm:text-sm font-semibold">
            <span>INOX 304 · NHÔM · ĐỒNG · MICA</span>
            <span>|</span>
            <span>SAI SỐ ±0.05 MM</span>
          </div>

          <h1 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold uppercase tracking-tight leading-tight text-white">
            Xưởng Gia Công Tem Nhãn Kim Loại & Bảng Tên Máy
          </h1>

          <div class="w-48 h-1.5 bg-[#65c20e] rounded-full"></div>

          <p class="text-base sm:text-lg text-white/90 leading-relaxed">
            Kĩ Nghệ NVX – Sài Gòn chuyên ăn mòn điện hóa, khắc Laser Fiber, phay CNC và in UV phẳng.
            Tính báo giá tự động theo kích thước mm, xem trước mô hình 3D và duyệt mẫu thực tế trước khi sản xuất.
          </p>

          <div class="flex flex-wrap items-center gap-3.5 pt-2">
            <a
              routerLink="/quote-builder"
              class="inline-flex items-center gap-2 bg-[#187115] hover:bg-[#1e8a1b] text-white font-bold uppercase text-sm sm:text-base px-6 py-3.5 rounded-[5px] shadow-lg transition-colors"
            >
              <span>Báo Giá & Xem Mẫu 3D</span>
              <lucide-icon [img]="ArrowRightIcon" [size]="18" />
            </a>
            <a
              routerLink="/products"
              class="inline-flex items-center gap-2 bg-white/95 hover:bg-white text-[#187115] font-bold uppercase text-sm sm:text-base px-6 py-3.5 rounded-[5px] shadow-lg transition-colors"
            >
              Xem Sản Phẩm
            </a>
          </div>
        </div>
      </div>
    </section>

    <div class="max-w-7xl mx-auto px-4 py-12 space-y-16">
      @if (toastMessage()) {
        <div class="fixed bottom-4 left-4 z-50 bg-accent text-white px-5 py-3 rounded-[6px] text-sm font-semibold shadow-lg">
          {{ toastMessage() }}
        </div>
      }

      <!-- SECTION 2: SẢN PHẨM CHÚNG TÔI (Exact OG 3-column + 2-column image gallery) -->
      <section class="space-y-8">
        <h2 class="fs-section-title text-2xl sm:text-3xl font-extrabold uppercase tracking-wide">
          Sản Phẩm Chúng Tôi
        </h2>

        <!-- Top 3-column row: TEM NHÃN, CNC, LASER -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          @for (item of topVisualCategories; track item.title) {
            <div class="industrial-card group overflow-hidden flex flex-col hover:border-accent">
              <a
                routerLink="/products"
                [queryParams]="item.productType ? { productType: item.productType } : { search: item.search }"
                class="relative block aspect-video bg-surface overflow-hidden"
              >
                @if (!brokenImages()[item.imageUrl]) {
                  <img
                    [src]="item.imageUrl"
                    [alt]="item.title"
                    (error)="markImageBroken(item.imageUrl)"
                    class="w-full h-full object-cover fs-img-zoom"
                    loading="lazy"
                  />
                } @else {
                  <app-image-placeholder [sku]="item.skuHint" />
                }
              </a>
              <div class="p-5 flex flex-col flex-1 text-center">
                <h3 class="text-xl font-extrabold uppercase text-accent mb-2">
                  {{ item.title }}
                </h3>
                <p class="text-sm text-text-secondary mb-5 flex-1">
                  {{ item.subtitle }}
                </p>
                <a
                  routerLink="/products"
                  [queryParams]="item.productType ? { productType: item.productType } : { search: item.search }"
                  appButton
                  variant="primary"
                  size="md"
                  [fullWidth]="true"
                >
                  XEM THÊM
                </a>
              </div>
            </div>
          }
        </div>

        <!-- Bottom 2-column row: MÁY MÓC, VẬT PHẨM LƯU NIỆM -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          @for (item of bottomVisualCategories; track item.title) {
            <div class="industrial-card group overflow-hidden flex flex-col hover:border-accent">
              <a
                routerLink="/products"
                [queryParams]="item.productType ? { productType: item.productType } : { search: item.search }"
                class="relative block aspect-video bg-surface overflow-hidden"
              >
                @if (!brokenImages()[item.imageUrl]) {
                  <img
                    [src]="item.imageUrl"
                    [alt]="item.title"
                    (error)="markImageBroken(item.imageUrl)"
                    class="w-full h-full object-cover fs-img-zoom"
                    loading="lazy"
                  />
                } @else {
                  <app-image-placeholder [sku]="item.skuHint" />
                }
              </a>
              <div class="p-5 flex flex-col flex-1 text-center">
                <h3 class="text-xl font-extrabold uppercase text-accent mb-2">
                  {{ item.title }}
                </h3>
                <p class="text-sm text-text-secondary mb-5 flex-1">
                  {{ item.subtitle }}
                </p>
                <a
                  routerLink="/products"
                  [queryParams]="item.productType ? { productType: item.productType } : { search: item.search }"
                  appButton
                  variant="primary"
                  size="md"
                  [fullWidth]="true"
                >
                  XEM THÊM
                </a>
              </div>
            </div>
          }
        </div>
      </section>

      <!-- SECTION 3: VỀ CHÚNG TÔI (Exact OG 2-column rounded video + green heading split) -->
      <section class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div class="lg:col-span-6">
          <div class="relative aspect-video rounded-[20px] overflow-hidden shadow-md border border-border bg-surface">
            @if (!videoBroken()) {
              <video
                class="w-full h-full object-cover"
                src="/assets/videos/hero-workshop.mp4"
                poster="/assets/images/workshop-1.jpg"
                autoplay
                muted
                loop
                playsinline
                (error)="videoBroken.set(true)"
              ></video>
            } @else if (!brokenImages()['/assets/images/workshop-1.jpg']) {
              <img
                src="/assets/images/workshop-1.jpg"
                alt="Xưởng sản xuất Tem Nhãn Inox NVX"
                (error)="markImageBroken('/assets/images/workshop-1.jpg')"
                class="w-full h-full object-cover"
              />
            } @else {
              <app-image-placeholder sku="NVX-WORKSHOP" />
            }
          </div>
        </div>

        <div class="lg:col-span-6 space-y-4">
          <div class="text-sm font-bold uppercase tracking-wider text-text-secondary">
            VỀ CHÚNG TÔI
          </div>
          <h2 class="text-2xl sm:text-3xl font-extrabold uppercase text-accent leading-tight">
            NGHỆ THUẬT TRUYỀN THỐNG & CÔNG NGHỆ HIỆN ĐẠI
          </h2>
          <div class="w-48 h-1.5 bg-steel rounded-full"></div>
          <p class="text-base text-text-secondary leading-relaxed">
            KĨ NGHỆ NVX – SÀI GÒN hãnh diện là một trong những đơn vị tiên phong trong việc kết hợp giữa nghệ thuật thủ công truyền thống và công nghệ hiện đại. Chúng tôi không chỉ chú trọng đến việc sử dụng các phương pháp cổ điển như ăn mòn hoá chất và ăn mòn hoá lý để tạo ra những chi tiết tinh tế trên các chất liệu khác nhau, mà còn đầu tư mạnh mẽ vào các thiết bị tiên tiến như máy Laser Fiber, CNC, và công nghệ in UV lượng tử.
          </p>
          <div class="pt-2">
            <a routerLink="/quote-builder" appButton variant="primary" size="md">
              XEM THÊM & TẠO BÁO GIÁ 3D
            </a>
          </div>
        </div>
      </section>

      <!-- SECTION 4: ROLLABLE WORKSHOP GALLERY CAROUSEL -->
      <section class="relative group/carousel">
        <button
          type="button"
          (click)="scrollGallery(-1)"
          aria-label="Ảnh trước"
          class="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-bg-elevated/95 border border-border shadow-md flex items-center justify-center text-text-primary hover:bg-accent hover:text-white hover:border-accent transition-all opacity-90 sm:opacity-0 sm:group-hover/carousel:opacity-100"
        >
          <lucide-icon [img]="ChevronLeftIcon" [size]="20" />
        </button>

        <div
          #galleryTrack
          class="flex gap-5 overflow-x-auto scroll-smooth snap-x snap-mandatory no-scrollbar pb-1"
        >
          @for (photo of workshopPhotos; track photo.src) {
            <div class="group snap-start shrink-0 w-[72%] sm:w-[44%] lg:w-[calc(25%-15px)] rounded-[16px] overflow-hidden border border-border shadow-sm bg-surface aspect-square">
              @if (!brokenImages()[photo.src]) {
                <img
                  [src]="photo.src"
                  [alt]="photo.caption"
                  (error)="markImageBroken(photo.src)"
                  class="w-full h-full object-cover fs-img-zoom"
                  loading="lazy"
                />
              } @else {
                <app-image-placeholder [sku]="photo.code" />
              }
            </div>
          }
        </div>

        <button
          type="button"
          (click)="scrollGallery(1)"
          aria-label="Ảnh tiếp theo"
          class="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-bg-elevated/95 border border-border shadow-md flex items-center justify-center text-text-primary hover:bg-accent hover:text-white hover:border-accent transition-all opacity-90 sm:opacity-0 sm:group-hover/carousel:opacity-100"
        >
          <lucide-icon [img]="ChevronRightIcon" [size]="20" />
        </button>
      </section>

      <!-- SECTION 5: LIVE CATALOG FEATURED PRODUCTS -->
      <section class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 class="text-2xl sm:text-3xl font-extrabold uppercase text-accent">
              Mẫu Tem Gia Công & Sản Phẩm Tiêu Biểu
            </h2>
            <p class="text-sm sm:text-base text-text-secondary mt-1">
              Tùy chỉnh kích thước 3D trực tiếp hoặc đặt mua vật tư phôi có sẵn tại xưởng
            </p>
          </div>
          <a routerLink="/products" class="text-sm font-bold text-accent hover:text-accent-hover transition-colors">
            Xem toàn bộ kho mẫu →
          </a>
        </div>

        @if (loadingProducts()) {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            @for (n of [1, 2, 3, 4]; track n) {
              <div class="bg-surface border border-border rounded-[10px] h-80 animate-pulse"></div>
            }
          </div>
        } @else {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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

    <!-- SECTION 6: DỰ ÁN CỦA CHÚNG TÔI + 4 GREEN COUNTERS (Full-bleed background photo like OG site) -->
    <section class="relative w-full border-y border-border overflow-hidden bg-surface">
      @if (!brokenImages()['/assets/images/project-bg.jpg']) {
        <img
          src="/assets/images/project-bg.jpg"
          alt="Dự án gia công tem nhãn kim loại"
          (error)="markImageBroken('/assets/images/project-bg.jpg')"
          class="absolute inset-0 w-full h-full object-cover opacity-35"
          loading="lazy"
        />
      }
      <div class="absolute inset-0 bg-gradient-to-r from-bg/95 via-bg/85 to-bg/55"></div>

      <div class="relative z-10 max-w-7xl mx-auto px-4 py-14 space-y-10">
        <div class="max-w-2xl space-y-4">
          <h2 class="text-2xl sm:text-3xl font-extrabold uppercase text-accent">
            DỰ ÁN CỦA CHÚNG TÔI
          </h2>
          <p class="text-base text-text-secondary leading-relaxed">
            Chúng tôi luôn đặt tiêu chí hài hoà môi trường lên hàng đầu trong mọi quyết định và hành động. Toàn bộ quy trình sản xuất được kiểm soát nghiêm ngặt để bảo đảm hiệu quả và thân thiện với môi sinh:
          </p>
          <ul class="space-y-2 text-sm sm:text-base text-text-primary">
            <li class="flex items-center gap-2.5">
              <lucide-icon [img]="CheckIcon" [size]="18" class="text-accent shrink-0" />
              <span>Tái chế kim loại, xử lý sạch nước thải sau sản xuất.</span>
            </li>
            <li class="flex items-center gap-2.5">
              <lucide-icon [img]="CheckIcon" [size]="18" class="text-accent shrink-0" />
              <span>Giảm thiểu phát thải các hợp chất hữu cơ bay hơi (VOCs).</span>
            </li>
            <li class="flex items-center gap-2.5">
              <lucide-icon [img]="CheckIcon" [size]="18" class="text-accent shrink-0" />
              <span>Ứng dụng công nghệ hiện đại nhằm tiết kiệm năng lượng và giảm rác thải.</span>
            </li>
            <li class="flex items-center gap-2.5">
              <lucide-icon [img]="CheckIcon" [size]="18" class="text-accent shrink-0" />
              <span>Ưu tiên nguyên liệu thân thiện với môi trường & độ bền cao.</span>
            </li>
          </ul>
          <div class="pt-2">
            <a routerLink="/products" appButton variant="primary" size="md">
              XEM THÊM
            </a>
          </div>
        </div>

        <!-- 4 Big Green Counters -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-4 border-t border-border">
          @for (stat of workshopStats; track stat.label) {
            <div>
              <div class="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-accent tabular-nums">
                {{ stat.value }}
              </div>
              <div class="text-sm sm:text-base font-bold text-text-primary mt-1">
                {{ stat.label }}
              </div>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- SECTION 7: CHUẨN MỰC VỀ PHẨM CHẤT BANNER (matches OG bottom banner) -->
    <section class="max-w-5xl mx-auto px-4 pt-12 text-center space-y-3">
      <h2 class="text-2xl sm:text-3xl font-extrabold uppercase text-accent">
        CHUẨN MỰC VỀ PHẨM CHẤT
      </h2>
      <p class="text-base text-text-secondary max-w-2xl mx-auto leading-relaxed">
        Chúng tôi cam kết tạo ra những sản phẩm khắc kim loại đạt tiêu chuẩn cao nhất, không lỗi, đúng thời hẹn, và sắc nét. Mỗi sản phẩm là sự kết hợp hoàn hảo giữa nghệ thuật và kỹ thuật.
      </p>
      <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
        <a
          href="https://wa.me/84989820101"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 bg-[#25D366] hover:opacity-95 text-white font-bold uppercase text-sm px-6 py-3 rounded-full shadow-sm transition-opacity"
        >
          NHẮN TIN QUA WHATSAPP
        </a>
        <a
          href="tel:0989820101"
          class="inline-flex items-center gap-2 bg-[#187115] hover:bg-[#1e8a1b] text-white font-bold uppercase text-sm px-6 py-3 rounded-full shadow-sm transition-colors"
        >
          GỌI NGAY 098 98 20 101
        </a>
      </div>
    </section>
  `,
})
export class HomeComponent implements OnInit {
  private readonly catalogApi = inject(CatalogApiService);
  private readonly cartApi = inject(CartApiService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly ArrowRightIcon = ArrowRight;
  readonly CheckIcon = CheckCircle2;
  readonly ShieldCheckIcon = ShieldCheck;
  readonly ChevronLeftIcon = ChevronLeft;
  readonly ChevronRightIcon = ChevronRight;

  @ViewChild('galleryTrack') galleryTrack?: ElementRef<HTMLDivElement>;

  readonly featuredProducts = signal<Product[]>([]);
  readonly loadingProducts = signal(true);
  readonly toastMessage = signal('');
  readonly videoBroken = signal(false);
  readonly brokenImages = signal<Record<string, boolean>>({});

  readonly topVisualCategories: VisualCategoryCard[] = [
    {
      title: 'TEM NHÃN',
      subtitle: 'Tem Inox 304, Tem Nhôm xước, Tem Đồng giả cổ, Tem Mica in UV sắc nét',
      imageUrl: '/assets/images/cat-tem-nhan.jpg',
      skuHint: 'CAT-TEM-NHAN',
      search: 'Tem',
    },
    {
      title: 'CNC',
      subtitle: 'Phay, cắt, khoan lỗ định vị và tạo hình chi tiết kim loại độ chính xác cao',
      imageUrl: '/assets/images/cat-cnc.jpg',
      skuHint: 'CAT-CNC',
      search: 'CNC',
    },
    {
      title: 'LASER',
      subtitle: 'Khắc Laser Fiber mã QR, số serial nhảy tự động, logo sắc nét không phai',
      imageUrl: '/assets/images/cat-laser.jpg',
      skuHint: 'CAT-LASER',
      search: 'Laser',
    },
  ];

  readonly bottomVisualCategories: VisualCategoryCard[] = [
    {
      title: 'MÁY MÓC',
      subtitle: 'Phôi tem Inox cắt sẵn, keo 3M công nghiệp, thiết bị & hóa chất gia công',
      imageUrl: '/assets/images/cat-may-moc.jpg',
      skuHint: 'CAT-MAY-MOC',
      productType: 'STANDARD_ITEM',
    },
    {
      title: 'VẬT PHẨM LƯU NIỆM',
      subtitle: 'Huy hiệu cài áo, bảng vinh danh, thẻ tên nhân viên và quà tặng kim loại',
      imageUrl: '/assets/images/cat-luu-niem.jpg',
      skuHint: 'CAT-LUU-NIEM',
      search: 'Lưu niệm',
    },
  ];

  readonly workshopPhotos = [
    { src: '/assets/images/workshop-1.jpg', caption: 'Gia công ăn mòn & đổ sơn nền', code: 'NVX-01' },
    { src: '/assets/images/workshop-2.jpg', caption: 'Khắc Laser Fiber thông số máy', code: 'NVX-02' },
    { src: '/assets/images/workshop-3.jpg', caption: 'Kiểm tra thành phẩm Inox 304', code: 'NVX-03' },
    { src: '/assets/images/workshop-4.jpg', caption: 'Đóng gói & bàn giao đơn B2B', code: 'NVX-04' },
    { src: '/assets/images/cat-tem-nhan.jpg', caption: 'Tem nhãn kim loại ăn mòn điện hóa', code: 'NVX-05' },
    { src: '/assets/images/cat-cnc.jpg', caption: 'Phay & cắt CNC chi tiết chính xác', code: 'NVX-06' },
    { src: '/assets/images/cat-laser.jpg', caption: 'Khắc Laser Fiber số serial & QR', code: 'NVX-07' },
    { src: '/assets/images/cat-luu-niem.jpg', caption: 'Vật phẩm lưu niệm & bảng vinh danh', code: 'NVX-08' },
  ];

  readonly workshopStats = [
    { value: '+1200', label: 'Đánh giá tốt' },
    { value: '+68', label: 'Dự án trong năm' },
    { value: '+88', label: 'Giải thưởng giành được' },
    { value: '+668', label: 'Hỗ trợ cho khách hàng' },
  ];

  ngOnInit(): void {
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

  scrollGallery(direction: number): void {
    const el = this.galleryTrack?.nativeElement;
    if (!el) return;
    const step = Math.max(260, Math.round(el.clientWidth * 0.75));
    el.scrollBy({ left: direction * step, behavior: 'smooth' });
  }

  markImageBroken(url: string): void {
    this.brokenImages.update((prev) => ({ ...prev, [url]: true }));
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
