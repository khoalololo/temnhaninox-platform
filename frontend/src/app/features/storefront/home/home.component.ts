import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
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
import { ScrollRevealDirective } from '../../../shared/directives/scroll-reveal.directive';
import { ToastService } from '../../../shared/components/toast/toast.component';

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
    ScrollRevealDirective,
  ],
  template: `
    <!-- SECTION 1: Full-Width Video Hero Banner (matches temnhaninox.com hero + 3D quote CTA) -->
    <section class="home-hero relative w-full min-h-[460px] lg:min-h-[540px] flex items-center bg-[#142414] text-white overflow-hidden">
      @if (!videoBroken()) {
        <video
          class="absolute inset-0 w-full h-full object-cover"
          src="/assets/videos/hero-workshop.mp4"
          poster="/assets/images/workshop-1.jpg"
          autoplay
          [muted]="true"
          [volume]="0"
          loop
          playsinline
          (play)="muteVideo($event)"
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
          <div class="hero-stagger tni-chip no-dot" data-tone="success" style="--hero-delay: 0ms;">
            <span>INOX 304 · NHÔM · ĐỒNG · MICA</span>
          </div>

          <h1 class="hero-stagger whitespace-nowrap text-[clamp(1.1rem,3.5vw,3rem)] font-extrabold uppercase tracking-tight leading-tight text-white" style="--hero-delay: 90ms;">
            CÔNG TY TNHH NVX SÀI GÒN
          </h1>

          <div class="hero-stagger w-48 h-1.5 bg-[#65c20e] rounded-full" style="--hero-delay: 160ms;"></div>

          <p class="hero-stagger text-base sm:text-lg text-white/90 leading-relaxed" style="--hero-delay: 220ms;">
            Xưởng gia công tem nhãn kim loại & bảng tên máy. Chuyên ăn mòn điện hóa, khắc Laser Fiber, phay CNC và in UV phẳng.
            Tính báo giá tự động theo kích thước mm, xem trước mô hình 3D và duyệt mẫu thực tế trước khi sản xuất.
          </p>

          <div class="hero-stagger flex flex-wrap items-center gap-3.5 pt-2" style="--hero-delay: 300ms;">
            @if (authService.isAdmin()) {
              <span class="text-sm text-white/70">Đang xem với tư cách quản trị viên</span>
            } @else {
              <a
                routerLink="/quote-builder"
                class="inline-flex items-center gap-2 bg-[#187115] hover:bg-[#1e8a1b] hover:-translate-y-0.5 text-white font-bold uppercase text-sm sm:text-base px-6 py-3.5 rounded-[6px] shadow-lg transition-all"
              >
                <span>Báo Giá & Xem Mẫu 3D</span>
                <lucide-icon [img]="ArrowRightIcon" [size]="18" />
              </a>
            }
            <a
              routerLink="/products"
              class="inline-flex items-center gap-2 bg-white/95 hover:bg-white hover:-translate-y-0.5 text-[#187115] font-bold uppercase text-sm sm:text-base px-6 py-3.5 rounded-[6px] shadow-lg transition-all"
            >
              Xem Sản Phẩm
            </a>
          </div>
        </div>
      </div>
    </section>

    <div class="max-w-7xl mx-auto px-4 py-12 space-y-16">
      <!-- SECTION 2: SẢN PHẨM CHÚNG TÔI (Exact OG 3-column + 2-column image gallery) -->
      <section class="home-reveal space-y-8" appScrollReveal>
        <h2 class="fs-section-title text-2xl sm:text-3xl font-extrabold uppercase tracking-wide">
          Sản Phẩm Chúng Tôi
        </h2>

        <!-- Top 3-column row: TEM NHÃN, CNC, LASER -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          @for (item of topVisualCategories; track item.title; let idx = $index) {
            <div
              class="home-reveal industrial-card group overflow-hidden flex flex-col hover:border-accent"
              appScrollReveal
              [revealDelay]="idx * 80"
            >
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
                  <div class="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
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
          @for (item of bottomVisualCategories; track item.title; let idx = $index) {
            <div
              class="home-reveal industrial-card group overflow-hidden flex flex-col hover:border-accent"
              appScrollReveal
              [revealDelay]="idx * 90"
            >
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
                  <div class="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
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
      <section class="home-reveal grid grid-cols-1 lg:grid-cols-12 gap-8 items-center" appScrollReveal>
        <div class="lg:col-span-6">
          <div class="relative aspect-video rounded-[20px] overflow-hidden shadow-md border border-border bg-surface">
            @if (!videoBroken()) {
              <video
                class="w-full h-full object-cover"
                src="/assets/videos/hero-workshop.mp4"
                poster="/assets/images/workshop-1.jpg"
                autoplay
                [muted]="true"
                [volume]="0"
                loop
                playsinline
                (play)="muteVideo($event)"
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
            KĨ NGHỆ NVX - SÀI GÒN hãnh diện là một trong những đơn vị tiên phong trong việc kết hợp giữa nghệ thuật thủ công truyền thống và công nghệ hiện đại. Chúng tôi không chỉ chú trọng đến việc sử dụng các phương pháp cổ điển như ăn mòn hoá chất và ăn mòn hoá lý để tạo ra những chi tiết tinh tế trên các chất liệu khác nhau, mà còn đầu tư mạnh mẽ vào các thiết bị tiên tiến như máy Laser Fiber, CNC, và công nghệ in UV lượng tử.
          </p>
          <div class="pt-2">
            @if (authService.isAdmin()) {
              <span class="text-sm text-text-muted">Đang xem với tư cách quản trị viên</span>
            } @else {
              <a routerLink="/quote-builder" appButton variant="primary" size="md">
                XEM THÊM & TẠO BÁO GIÁ 3D
              </a>
            }
          </div>
        </div>
      </section>

      <!-- SECTION 4: FULL-BLEED WORKSHOP SHOWCASE -->
      <section
        class="relative ml-[calc(50%-50vw)] w-screen max-w-[100vw] overflow-hidden bg-[#101710] h-[72svh] min-h-[360px] max-h-[900px] sm:h-[78vh] sm:min-h-[480px] group/carousel"
        [style.height.px]="showcaseHeight()"
      >
        <button
          type="button"
          (click)="navigateShowcase(-1)"
          aria-label="Ảnh trước"
          class="absolute left-3 sm:left-8 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/35 border border-white/50 shadow-md backdrop-blur-sm flex items-center justify-center text-white hover:bg-white hover:text-[#142414] transition-all"
        >
          <lucide-icon [img]="ChevronLeftIcon" [size]="22" />
        </button>

        <div
          #galleryTrack
          class="relative h-full w-full overflow-hidden cursor-grab select-none"
          tabindex="0"
          aria-label="Thư viện hình ảnh xưởng và sản phẩm"
          (pointerdown)="startGalleryDrag($event)"
          (pointermove)="moveGalleryDrag($event)"
          (pointerup)="endGalleryDrag($event)"
          (pointercancel)="endGalleryDrag($event)"
        >
          <div
            class="flex h-full w-full"
            [style.transform]="showcaseTransform()"
            [style.transition]="showcaseTransition()"
            (transitionend)="finishShowcaseTransition()"
          >
            @for (photo of showcaseSlides; track $index) {
              <div class="relative h-full w-full shrink-0 overflow-hidden bg-[#101710]">
                @if (!brokenImages()[photo.src]) {
                  <img
                    [src]="photo.src"
                    [alt]="photo.caption"
                    (error)="markImageBroken(photo.src)"
                    (load)="onShowcaseImageLoad($event, photo.src)"
                    draggable="false"
                    class="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    loading="lazy"
                  />
                } @else {
                  <div class="absolute inset-0 flex items-center justify-center">
                    <app-image-placeholder [sku]="photo.code" />
                  </div>
                }
                <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/20 pointer-events-none"></div>
                <div class="absolute inset-x-0 bottom-0 mx-auto w-full max-w-7xl px-6 pb-10 sm:px-16 sm:pb-14 text-white pointer-events-none">
                  <p class="mb-2 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-white/80">Kĩ Nghệ NVX · Showcase</p>
                  <p class="max-w-3xl text-2xl sm:text-4xl lg:text-5xl font-semibold leading-tight drop-shadow-lg">{{ photo.caption }}</p>
                </div>
              </div>
            }
          </div>
        </div>

        <button
          type="button"
          (click)="navigateShowcase(1)"
          aria-label="Ảnh tiếp theo"
          class="absolute right-3 sm:right-8 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/35 border border-white/50 shadow-md backdrop-blur-sm flex items-center justify-center text-white hover:bg-white hover:text-[#142414] transition-all"
        >
          <lucide-icon [img]="ChevronRightIcon" [size]="22" />
        </button>
      </section>

      <!-- SECTION 5: LIVE CATALOG FEATURED PRODUCTS -->
      <section class="home-reveal space-y-6" appScrollReveal>
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
            <span>Xem toàn bộ kho mẫu</span>
            <svg viewBox="0 0 24 24" class="ml-1 inline h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12h14m0 0-6-6m6 6-6 6" /></svg>
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
        <div class="home-reveal reveal-from-left max-w-2xl space-y-4" appScrollReveal [revealDelay]="100">
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
        <div #statsGrid class="home-reveal reveal-from-right grid grid-cols-2 lg:grid-cols-4 gap-6 pt-4 border-t border-border" appScrollReveal [revealDelay]="260">
          @for (stat of workshopStats; track stat.label; let idx = $index) {
            <div>
              <div class="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-accent tabular-nums">
                +{{ animatedStatValues()[idx] }}
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
    <section class="home-reveal max-w-5xl mx-auto px-4 pt-12 text-center space-y-3" appScrollReveal>
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
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly catalogApi = inject(CatalogApiService);
  private readonly cartApi = inject(CartApiService);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private statsObserver?: IntersectionObserver;
  private statsRafId?: number;

  readonly ArrowRightIcon = ArrowRight;
  readonly CheckIcon = CheckCircle2;
  readonly ShieldCheckIcon = ShieldCheck;
  readonly ChevronLeftIcon = ChevronLeft;
  readonly ChevronRightIcon = ChevronRight;

  @ViewChild('galleryTrack') galleryTrack?: ElementRef<HTMLDivElement>;
  @ViewChild('statsGrid') statsGrid?: ElementRef<HTMLDivElement>;

  readonly featuredProducts = signal<Product[]>([]);
  readonly loadingProducts = signal(true);
  private readonly toast = inject(ToastService);
  readonly videoBroken = signal(false);
  readonly brokenImages = signal<Record<string, boolean>>({});

  muteVideo(event: Event): void {
    const video = event.currentTarget;
    if (video instanceof HTMLVideoElement) {
      video.muted = true;
      video.defaultMuted = true;
      video.volume = 0;
    }
  }

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
    { src: '/assets/products/tem-nhan-inox-1.png', caption: 'Thành phẩm tem nhãn Inox', code: 'NVX-09' },
    { src: '/assets/products/bang-hieu-cong-ty-inox-304-1.jpg', caption: 'Bảng hiệu công ty Inox 304', code: 'NVX-10' },
    { src: '/assets/products/gia-cong-khac-laser-fiber-ma-qr-serial-1.jpg', caption: 'Khắc Laser Fiber mã QR và serial', code: 'NVX-11' },
    { src: '/assets/products/cnc-nhom-67-1.png', caption: 'Gia công CNC trên nhôm', code: 'NVX-12' },
  ];
  readonly showcaseHeight = signal(560);
  private readonly showcaseImageRatios = signal<Record<string, number>>({});
  private showcaseActivePhotoIndex = 0;
  readonly showcasePosition = signal(1);
  readonly showcaseDragOffset = signal(0);
  readonly showcaseTransitionEnabled = signal(true);
  readonly showcaseSlides = [
    this.workshopPhotos[this.workshopPhotos.length - 1],
    ...this.workshopPhotos,
    this.workshopPhotos[0],
  ];

  private galleryDragStartX = 0;
  private galleryDragging = false;
  private galleryLastX = 0;
  private galleryLastMoveAt = 0;
  private galleryVelocity = 0;

  readonly workshopStats = [
    { target: 1200, label: 'Đánh giá tốt' },
    { target: 68, label: 'Dự án trong năm' },
    { target: 88, label: 'Giải thưởng giành được' },
    { target: 668, label: 'Hỗ trợ cho khách hàng' },
  ];

  readonly animatedStatValues = signal<number[]>(
    this.workshopStats.map(() => 0)
  );

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

  ngAfterViewInit(): void {
    requestAnimationFrame(() => {
      this.updateShowcaseHeight();
    });
    const el = this.statsGrid?.nativeElement;
    if (!el) return;

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion || typeof IntersectionObserver === 'undefined') {
      this.animatedStatValues.set(this.workshopStats.map((s) => s.target));
      return;
    }

    this.statsObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          this.startStatsCountUp();
          this.statsObserver?.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    this.statsObserver.observe(el);
  }

  ngOnDestroy(): void {
    this.statsObserver?.disconnect();
    if (this.statsRafId !== undefined) {
      cancelAnimationFrame(this.statsRafId);
    }
  }

  private startStatsCountUp(): void {
    const durationMs = 1400;
    const start = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      this.animatedStatValues.set(
        this.workshopStats.map((s) => Math.round(s.target * eased))
      );
      if (t < 1) {
        this.statsRafId = requestAnimationFrame(step);
      }
    };

    this.statsRafId = requestAnimationFrame(step);
  }

  navigateShowcase(direction: number): void {
    if (this.workshopPhotos.length < 2) return;
    this.showcaseTransitionEnabled.set(true);
    this.showcasePosition.update((position) => position + direction);
  }

  showcaseTransform(): string {
    return `translate3d(calc(-${this.showcasePosition() * 100}% + ${this.showcaseDragOffset()}px), 0, 0)`;
  }

  showcaseTransition(): string {
    return this.showcaseTransitionEnabled()
      ? 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)'
      : 'none';
  }

  finishShowcaseTransition(): void {
    const position = this.showcasePosition();
    if (position === 0 || position === this.workshopPhotos.length + 1) {
      this.showcaseTransitionEnabled.set(false);
      this.showcasePosition.set(position === 0 ? this.workshopPhotos.length : 1);
      requestAnimationFrame(() => this.showcaseTransitionEnabled.set(true));
    }
    this.showcaseActivePhotoIndex = (this.showcasePosition() - 1 + this.workshopPhotos.length) % this.workshopPhotos.length;
    this.updateShowcaseHeight();
  }

  startGalleryDrag(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    const el = this.galleryTrack?.nativeElement;
    if (!el) return;
    this.galleryDragging = true;
    this.galleryDragStartX = event.clientX;
    this.galleryLastX = event.clientX;
    this.galleryLastMoveAt = performance.now();
    this.galleryVelocity = 0;
    this.showcaseTransitionEnabled.set(false);
    el.classList.add('cursor-grabbing');
    el.setPointerCapture(event.pointerId);
  }

  moveGalleryDrag(event: PointerEvent): void {
    const el = this.galleryTrack?.nativeElement;
    if (!this.galleryDragging || !el) return;
    const now = performance.now();
    const distance = event.clientX - this.galleryLastX;
    const elapsed = Math.max(1, now - this.galleryLastMoveAt);
    this.galleryVelocity = distance / elapsed;
    this.galleryLastX = event.clientX;
    this.galleryLastMoveAt = now;
    const offset = event.clientX - this.galleryDragStartX;
    if (Math.abs(offset) > 4) {
      event.preventDefault();
      el.classList.add('cursor-grabbing');
    }
    this.showcaseDragOffset.set(offset);
  }

  endGalleryDrag(event: PointerEvent): void {
    const el = this.galleryTrack?.nativeElement;
    if (!this.galleryDragging) return;
    this.galleryDragging = false;
    if (el?.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
    el?.classList.remove('cursor-grabbing');
    const width = el?.clientWidth || 1;
    const distance = event.clientX - this.galleryDragStartX;
    const projectedDistance = distance + this.galleryVelocity * 180;
    this.showcaseDragOffset.set(0);
    this.showcaseTransitionEnabled.set(true);
    if (Math.abs(projectedDistance) > width * 0.16) {
      this.navigateShowcase(projectedDistance < 0 ? 1 : -1);
    }
  }

  onShowcaseImageLoad(event: Event, src: string): void {
    const image = event.currentTarget;
    if (!(image instanceof HTMLImageElement) || !image.naturalWidth || !image.naturalHeight) return;
    this.showcaseImageRatios.update((ratios) => ({
      ...ratios,
      [src]: image.naturalWidth / image.naturalHeight,
    }));
    if (this.workshopPhotos[this.showcaseActivePhotoIndex]?.src === src) {
      this.updateShowcaseHeight();
    }
  }

  @HostListener('window:resize')
  updateShowcaseHeight(): void {
    if (typeof window === 'undefined') return;
    const activePhoto = this.workshopPhotos[this.showcaseActivePhotoIndex];
    const ratio = activePhoto ? this.showcaseImageRatios()[activePhoto.src] : undefined;
    if (!ratio) return;
    const maxHeight = Math.min(window.innerHeight * 0.78, 900);
    this.showcaseHeight.set(Math.round(Math.max(320, Math.min(maxHeight, window.innerWidth / ratio))));
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
