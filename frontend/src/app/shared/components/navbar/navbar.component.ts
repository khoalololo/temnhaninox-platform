import { Component, ElementRef, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import {
  LucideAngularModule,
  Search,
  ShoppingCart,
  ChevronDown,
  ChevronRight,
  Sun,
  Moon,
  Menu,
  X,
  Phone,
  Mail,
} from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { CartApiService } from '../../../core/services/cart-api.service';
import { CatalogApiService } from '../../../core/services/catalog-api.service';
import { ThemeService } from '../../../core/services/theme.service';
import { Category, Product } from '../../../core/models/catalog.models';
import { ButtonDirective } from '../button/button.component';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';

interface MegaMenuColumn {
  title: string;
  search?: string;
  categoryId?: string;
  productType?: 'STANDARD_ITEM' | 'CUSTOM_TEMPLATE';
  items: { label: string; search?: string; categoryId?: string }[];
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, LucideAngularModule, ButtonDirective],
  template: `
    <header class="sticky top-0 z-50 bg-bg-elevated text-text-primary border-b border-border shadow-sm">
      <!-- Top Forest-Green Contact Strip (matches temnhaninox.com #187115 bar) -->
      <div class="bg-accent text-white text-xs sm:text-sm">
        <div class="max-w-7xl mx-auto px-4 h-8 flex items-center justify-between">
          <div class="flex items-center gap-4 truncate">
            <a href="mailto:hoangvunew@gmail.com" class="inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity">
              <lucide-icon [img]="MailIcon" [size]="14" />
              <span>hoangvunew&#64;gmail.com</span>
            </a>
            <span class="hidden md:inline opacity-40">|</span>
            <a href="tel:0989820101" class="inline-flex items-center gap-1.5 font-semibold hover:opacity-90 transition-opacity">
              <lucide-icon [img]="PhoneIcon" [size]="14" />
              <span>098 98 20 101</span>
            </a>
          </div>
          <div class="hidden sm:flex items-center gap-4 text-xs opacity-95">
            <span>Xưởng gia công: Q.12, TP.HCM</span>
            <span class="opacity-40">|</span>
            <span>Xuất hóa đơn VAT đỏ</span>
          </div>
        </div>
      </div>

      <!-- Main Header Bar -->
      <div class="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between gap-4 bg-bg-elevated">
        <!-- Mobile Menu + Brand Logo -->
        <div class="flex items-center gap-3 shrink-0">
          <button
            type="button"
            (click)="mobileDrawerOpen.set(true)"
            aria-label="Mở menu danh mục"
            class="md:hidden p-2 rounded-[6px] border border-border text-text-primary hover:border-accent"
          >
            <lucide-icon [img]="MenuIcon" [size]="20" />
          </button>

          <a routerLink="/" class="flex items-center gap-3 group">
            @if (!logoBroken()) {
              <img
                src="/assets/images/logo-nvx.png"
                alt="Tem Nhãn Inox NVX"
                (error)="logoBroken.set(true)"
                class="h-12 sm:h-14 w-auto object-contain"
              />
            } @else {
              <div class="w-10 h-10 rounded-[8px] bg-accent flex items-center justify-center font-bold text-base text-white">
                NVX
              </div>
            }
            <div class="leading-tight hidden sm:block">
              <div class="font-bold tracking-wide text-base sm:text-lg text-accent">
                TEM NHÃN INOX
              </div>
              <div class="text-xs text-text-secondary font-medium">
                KĨ NGHỆ NVX · SÀI GÒN
              </div>
            </div>
          </a>
        </div>

        <!-- Search bar -->
        <form (ngSubmit)="onSearch()" class="hidden lg:flex flex-1 max-w-md">
          <div class="relative w-full flex">
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (input)="onSearchInput()"
              name="searchQuery"
              autocomplete="off"
              placeholder="Tìm tem inox 304, tem nhôm, khắc laser..."
              class="w-full bg-surface border border-border text-sm text-text-primary placeholder-text-muted rounded-l-[6px] px-3.5 py-2 focus:outline-none focus:border-accent"
            />
            <button
              type="submit"
              appButton
              variant="primary"
              size="sm"
              class="rounded-l-none"
            >
              <lucide-icon [img]="SearchIcon" [size]="15" />
              <span>Tìm</span>
            </button>
            @if (searchSuggestionsOpen()) {
              <div class="absolute left-0 right-0 top-full z-[60] border border-border bg-bg-elevated text-text-primary shadow-card-hover">
                @if (searchSuggestionsError()) {
                  <p class="p-3 text-xs text-danger">{{ searchSuggestionsError() }}</p>
                } @else if (searchSuggestions().length) {
                  @for (product of searchSuggestions(); track product.id) {
                    <button type="button" (click)="openProduct(product)" class="block w-full border-b border-border px-3 py-2 text-left hover:bg-surface-raised">
                      <span class="block text-xs font-semibold">{{ product.name }}</span>
                      <span class="block text-[11px] text-text-muted">{{ product.sku }}</span>
                    </button>
                  }
                } @else {
                  <p class="p-3 text-xs text-text-muted">Không tìm thấy sản phẩm phù hợp.</p>
                }
              </div>
            }
          </div>
        </form>

        <!-- Actions -->
        <div class="flex items-center gap-2.5 shrink-0">
          <a
            routerLink="/quote-builder"
            appButton
            variant="primary"
            size="sm"
          >
            <span class="hidden sm:inline">Báo Giá & Xem Mẫu 3D</span>
            <span class="sm:hidden">Báo Giá 3D</span>
          </a>

          <a
            routerLink="/cart"
            appButton
            variant="secondary"
            size="sm"
          >
            <lucide-icon [img]="CartIcon" [size]="16" />
            <span class="hidden sm:inline">Giỏ hàng</span>
            @if (cartService.cartCount() > 0) {
              <span class="bg-accent text-white font-mono tabular-nums text-xs font-bold px-2 py-0.5 rounded-full">
                {{ cartService.cartCount() }}
              </span>
            }
          </a>

          <button
            type="button"
            (click)="themeService.toggle()"
            [attr.aria-label]="themeService.theme() === 'light' ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng'"
            [title]="themeService.theme() === 'light' ? 'Giao diện tối' : 'Giao diện sáng'"
            appButton
            variant="ghost"
            size="sm"
            class="px-2.5 border border-border"
          >
            <lucide-icon [img]="themeService.theme() === 'light' ? MoonIcon : SunIcon" [size]="16" />
          </button>

          @if (authService.isAuthenticated()) {
            <div class="relative">
              <button
                type="button"
                (click)="menuOpen.set(!menuOpen())"
                appButton
                variant="secondary"
                size="sm"
              >
                <span class="max-w-[110px] truncate">{{ authService.currentUser()?.fullName }}</span>
                <lucide-icon [img]="ChevronDownIcon" [size]="15" />
              </button>

              @if (menuOpen()) {
                <div
                  class="absolute right-0 mt-1.5 w-56 bg-bg-elevated text-text-primary border border-border rounded-[10px] py-1.5 z-50 shadow-card-hover"
                >
                  <a
                    routerLink="/account/orders"
                    (click)="menuOpen.set(false)"
                    class="block px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-surface-raised hover:text-accent transition-colors border-b border-border"
                  >
                    Đơn hàng & Tiến độ xưởng
                  </a>
                  <a
                    routerLink="/account/profile"
                    (click)="menuOpen.set(false)"
                    class="block px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-surface-raised hover:text-accent transition-colors"
                  >
                    Hồ sơ & MST (VAT đỏ)
                  </a>
                  @if (authService.isAdmin()) {
                    <a
                      routerLink="/admin"
                      (click)="menuOpen.set(false)"
                      class="block px-4 py-2.5 text-sm font-semibold text-accent hover:bg-surface-raised border-t border-border transition-colors"
                    >
                      Quản trị xưởng (Admin)
                    </a>
                  }
                  <button
                    type="button"
                    (click)="logout()"
                    class="w-full text-left px-4 py-2.5 text-sm font-medium text-danger hover:bg-danger/10 border-t border-border transition-colors"
                  >
                    Đăng xuất
                  </button>
                </div>
              }
            </div>
          } @else {
            <a
              routerLink="/login"
              appButton
              variant="ghost"
              size="sm"
              class="hidden sm:inline-flex"
            >
              Đăng nhập
            </a>
          }
        </div>
      </div>

      <!-- Desktop Navigation Bar (Flatsome uppercase green-bar hover links + Mega-menu) -->
      <nav class="hidden md:block bg-surface border-t border-border relative">
        <div class="max-w-7xl mx-auto px-4 h-11 flex items-center gap-7 text-sm font-semibold uppercase tracking-wide text-text-primary">
          <a
            routerLink="/"
            routerLinkActive="text-accent active-nav"
            [routerLinkActiveOptions]="{ exact: true }"
            class="h-full inline-flex items-center fs-nav-underline hover:text-accent whitespace-nowrap"
          >
            Trang chủ
          </a>
          @if (authService.isAdmin()) {
            <a
              routerLink="/admin"
              routerLinkActive="text-accent active-nav"
              class="h-full inline-flex items-center fs-nav-underline hover:text-accent whitespace-nowrap"
            >
              Quản trị xưởng
            </a>
          }

          <!-- Mega-Menu Trigger: SẢN PHẨM -->
          <div
            class="h-full flex items-center"
            (mouseenter)="megaMenuOpen.set(true)"
            (mouseleave)="megaMenuOpen.set(false)"
          >
            <button
              type="button"
              (click)="megaMenuOpen.set(!megaMenuOpen())"
              class="h-full inline-flex items-center gap-1.5 fs-nav-underline hover:text-accent uppercase tracking-wide whitespace-nowrap"
              [class.text-accent]="megaMenuOpen()"
            >
              <span>Sản phẩm</span>
              <lucide-icon [img]="ChevronDownIcon" [size]="15" />
            </button>

            @if (megaMenuOpen()) {
              <div
                class="absolute left-0 right-0 top-full bg-bg-elevated border-b border-border shadow-card-hover z-50 normal-case tracking-normal"
              >
                <div class="max-w-7xl mx-auto px-4 py-6 grid grid-cols-12 gap-6">
                  <div class="col-span-8 grid grid-cols-3 gap-6">
                    @for (col of megaMenuColumns(); track col.title) {
                      <div class="space-y-2.5">
                        <a
                          routerLink="/products"
                          [queryParams]="col.categoryId ? { categoryId: col.categoryId } : (col.search ? { search: col.search } : (col.productType ? { productType: col.productType } : {}))"
                          (click)="megaMenuOpen.set(false)"
                          class="block text-sm font-bold uppercase tracking-wide text-accent hover:text-accent-hover pb-1.5 border-b border-border"
                        >
                          {{ col.title }}
                        </a>
                        @if (col.items.length > 0) {
                          <ul class="space-y-2">
                            @for (sub of col.items; track sub.label) {
                              <li>
                                <a
                                  routerLink="/products"
                                  [queryParams]="sub.categoryId ? { categoryId: sub.categoryId } : { search: sub.search }"
                                  (click)="megaMenuOpen.set(false)"
                                  class="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-accent transition-colors"
                                >
                                  <lucide-icon [img]="ChevronRightIcon" [size]="14" class="text-accent" />
                                  <span>{{ sub.label }}</span>
                                </a>
                              </li>
                            }
                          </ul>
                        }
                      </div>
                    }
                  </div>

                  <div class="col-span-4 bg-surface border border-border rounded-[10px] p-5 flex flex-col justify-between">
                    <div>
                      <span class="inline-block text-xs font-semibold uppercase px-2.5 py-0.5 rounded-full bg-accent/10 text-accent">
                        Báo giá tự động tại xưởng
                      </span>
                      <h4 class="text-base font-bold text-text-primary mt-2.5">
                        Thiết Lập Kích Thước & Xem Mẫu 3D
                      </h4>
                      <p class="text-sm text-text-secondary mt-1.5 leading-relaxed">
                        Nhập dài × rộng × dày (mm), chọn Inox 304, Nhôm, Đồng, Mica, tải file .CDR/.AI và nhận báo giá ngay lập tức.
                      </p>
                    </div>
                    <a
                      routerLink="/quote-builder"
                      (click)="megaMenuOpen.set(false)"
                      appButton
                      variant="primary"
                      size="sm"
                      [fullWidth]="true"
                      class="mt-4"
                    >
                      Mở Công Cụ 3D Ngay
                    </a>
                  </div>
                </div>
              </div>
            }
          </div>

          <a
            routerLink="/products"
            [queryParams]="{ search: 'Inox' }"
            class="h-full inline-flex items-center fs-nav-underline hover:text-accent whitespace-nowrap"
          >
            Tem Inox 304
          </a>
          <a
            routerLink="/products"
            [queryParams]="{ search: 'Nhôm' }"
            class="h-full inline-flex items-center fs-nav-underline hover:text-accent whitespace-nowrap"
          >
            Tem Nhôm
          </a>
          <a
            routerLink="/products"
            [queryParams]="{ search: 'Đồng' }"
            class="h-full inline-flex items-center fs-nav-underline hover:text-accent whitespace-nowrap"
          >
            Tem Đồng
          </a>
          <a
            routerLink="/products"
            [queryParams]="{ productType: 'CUSTOM_TEMPLATE' }"
            class="h-full inline-flex items-center fs-nav-underline hover:text-accent whitespace-nowrap"
          >
            Gia công theo yêu cầu
          </a>
          <a
            routerLink="/products"
            [queryParams]="{ productType: 'STANDARD_ITEM' }"
            class="h-full inline-flex items-center fs-nav-underline hover:text-accent whitespace-nowrap"
          >
            Máy móc & Vật tư
          </a>
        </div>
      </nav>
    </header>

    <!-- Mobile Slide-Out Navigation Drawer -->
    @if (mobileDrawerOpen()) {
      <div class="fixed inset-0 z-50 md:hidden flex">
        <div
          class="fixed inset-0 bg-black/50"
          (click)="mobileDrawerOpen.set(false)"
        ></div>

        <aside class="relative w-80 max-w-[85vw] bg-bg-elevated text-text-primary border-r border-border h-full flex flex-col z-10 overflow-y-auto">
          <div class="p-4 border-b border-border flex items-center justify-between">
            <span class="font-bold text-base text-accent">TEM NHÃN INOX NVX</span>
            <button
              type="button"
              (click)="mobileDrawerOpen.set(false)"
              aria-label="Đóng menu"
              class="p-1.5 rounded-[6px] border border-border text-text-secondary hover:text-text-primary"
            >
              <lucide-icon [img]="XIcon" [size]="18" />
            </button>
          </div>

          <form (ngSubmit)="onSearch(); mobileDrawerOpen.set(false)" class="relative p-3.5 border-b border-border flex gap-2">
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (input)="onSearchInput()"
              name="mobileSearchQuery"
              autocomplete="off"
              placeholder="Tìm tem inox, nhôm, laser..."
              class="industrial-input w-full px-3 py-2 text-sm"
            />
            <button type="submit" appButton variant="primary" size="sm">Tìm</button>
            @if (searchSuggestionsOpen()) {
              <div class="absolute left-3 right-3 top-full z-[60] border border-border bg-bg-elevated text-text-primary shadow-card-hover">
                @if (searchSuggestionsError()) {
                  <p class="p-3 text-xs text-danger">{{ searchSuggestionsError() }}</p>
                } @else if (searchSuggestions().length) {
                  @for (product of searchSuggestions(); track product.id) {
                    <button type="button" (click)="openProduct(product); mobileDrawerOpen.set(false)" class="block w-full border-b border-border px-3 py-2 text-left hover:bg-surface-raised">
                      <span class="block text-xs font-semibold">{{ product.name }}</span>
                      <span class="block text-[11px] text-text-muted">{{ product.sku }}</span>
                    </button>
                  }
                } @else {
                  <p class="p-3 text-xs text-text-muted">Không tìm thấy sản phẩm phù hợp.</p>
                }
              </div>
            }
          </form>

          <div class="p-4 space-y-4 flex-1 text-sm">
            <div class="space-y-1">
              <a
                routerLink="/"
                (click)="mobileDrawerOpen.set(false)"
                class="block px-3 py-2 rounded-[6px] font-semibold hover:bg-surface-raised"
              >
                Trang chủ
              </a>
              <a
                routerLink="/products"
                (click)="mobileDrawerOpen.set(false)"
                class="block px-3 py-2 rounded-[6px] font-semibold hover:bg-surface-raised"
              >
                Tất cả sản phẩm
              </a>
              <a
                routerLink="/quote-builder"
                (click)="mobileDrawerOpen.set(false)"
                class="block px-3 py-2 rounded-[6px] font-bold text-accent hover:bg-surface-raised"
              >
                Báo Giá & Xem Mẫu 3D
              </a>
              @if (authService.isAdmin()) {
                <a
                  routerLink="/admin"
                  (click)="mobileDrawerOpen.set(false)"
                  class="block px-3 py-2 rounded-[6px] font-bold text-accent bg-accent/10 hover:bg-accent/20"
                >
                  Quản trị xưởng (Admin)
                </a>
              }
            </div>

            @for (col of megaMenuColumns(); track col.title) {
              <div class="border-t border-border pt-3">
                <div class="px-3 font-bold uppercase text-xs text-accent mb-2">
                  {{ col.title }}
                </div>
                <div class="space-y-1">
                  @for (sub of col.items; track sub.label) {
                    <a
                      routerLink="/products"
                      [queryParams]="sub.categoryId ? { categoryId: sub.categoryId } : { search: sub.search }"
                      (click)="mobileDrawerOpen.set(false)"
                      class="block px-3 py-1.5 rounded-[6px] text-text-secondary hover:bg-surface-raised hover:text-accent"
                    >
                      {{ sub.label }}
                    </a>
                  }
                </div>
              </div>
            }
          </div>

          <div class="p-4 border-t border-border space-y-2.5">
            @if (!authService.isAuthenticated()) {
              <a
                routerLink="/login"
                (click)="mobileDrawerOpen.set(false)"
                appButton
                variant="primary"
                size="sm"
                [fullWidth]="true"
              >
                Đăng nhập / Đăng ký
              </a>
            }
            <a
              href="tel:0989820101"
              class="block text-center font-semibold text-sm text-accent py-1"
            >
              Hotline: 098 98 20 101
            </a>
          </div>
        </aside>
      </div>
    }
  `,
})
export class NavbarComponent implements OnInit, OnDestroy {
  readonly authService = inject(AuthService);
  readonly cartService = inject(CartApiService);
  readonly catalogApi = inject(CatalogApiService);
  readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef);
  private readonly searchTerms = new Subject<string>();
  private searchSubscription?: { unsubscribe(): void };

  readonly SearchIcon = Search;
  readonly CartIcon = ShoppingCart;
  readonly ChevronDownIcon = ChevronDown;
  readonly ChevronRightIcon = ChevronRight;
  readonly SunIcon = Sun;
  readonly MoonIcon = Moon;
  readonly MenuIcon = Menu;
  readonly XIcon = X;
  readonly PhoneIcon = Phone;
  readonly MailIcon = Mail;

  searchQuery = '';
  readonly menuOpen = signal(false);
  readonly megaMenuOpen = signal(false);
  readonly mobileDrawerOpen = signal(false);
  readonly logoBroken = signal(false);
  readonly categories = signal<Category[]>([]);
  readonly searchSuggestions = signal<Product[]>([]);
  readonly searchSuggestionsOpen = signal(false);
  readonly searchSuggestionsError = signal('');

  readonly megaMenuColumns = signal<MegaMenuColumn[]>([
    {
      title: 'Tem Nhãn',
      search: 'Tem',
      items: [
        { label: 'Tem Nhãn Inox', search: 'Inox' },
        { label: 'Tem Nhãn Nhôm', search: 'Nhôm' },
        { label: 'Tem nhãn đồng', search: 'Đồng' },
        { label: 'Tem nhãn mica', search: 'Mica' },
        { label: 'Tem nhãn decal', search: 'Decal' },
      ],
    },
    {
      title: 'CNC & LASER',
      productType: 'CUSTOM_TEMPLATE',
      items: [
        { label: 'CNC', search: 'CNC' },
        { label: 'LASER', search: 'Laser' },
      ],
    },
    {
      title: 'Máy Móc, Hoá Chất & Lưu Niệm',
      productType: 'STANDARD_ITEM',
      items: [
        { label: 'Máy Móc', search: 'Máy' },
        { label: 'HOÁ CHẤT', search: 'Hoá chất' },
        { label: 'Vật Phẩm Lưu Niệm', search: 'Lưu niệm' },
      ],
    },
  ]);

  ngOnInit(): void {
    this.searchSubscription = this.searchTerms
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((query) => {
          if (query.length < 2) return of(null);
          this.searchSuggestionsOpen.set(true);
          this.searchSuggestionsError.set('');
          return this.catalogApi.getProducts({ search: query, page: 0, size: 5 }).pipe(
            catchError(() => {
              this.searchSuggestionsError.set('Không thể tải gợi ý tìm kiếm.');
              return of(null);
            })
          );
        })
      )
      .subscribe((response) => {
        this.searchSuggestions.set(response?.success ? response.data?.content || [] : []);
        if (response && !response.success) {
          this.searchSuggestionsError.set(response.message || 'Không thể tải gợi ý tìm kiếm.');
        }
      });

    if (this.authService.isAuthenticated()) {
      this.cartService.loadCart().subscribe({ error: () => {} });
    }

    this.catalogApi.getCategories().subscribe({
      next: (res) => {
        if (res.success && res.data && res.data.length > 0) {
          this.categories.set(res.data);
          const topCategories = res.data.filter((c) => !c.parentId);
          if (topCategories.length > 0) {
            const temNhan = topCategories.find((c) => c.slug === 'tem-nhan');
            const otherTop = topCategories.filter((c) => c.slug !== 'tem-nhan');
            const cols: MegaMenuColumn[] = [];
            if (temNhan) {
              cols.push({
                title: temNhan.name,
                categoryId: temNhan.id,
                items: (temNhan.children ?? []).map((child) => ({
                  label: child.name,
                  categoryId: child.id,
                })),
              });
            }
            const mid = Math.ceil(otherTop.length / 2);
            if (otherTop.slice(0, mid).length > 0) {
              cols.push({
                title: 'Gia Công & Kỹ Thuật',
                items: otherTop.slice(0, mid).map((c) => ({ label: c.name, categoryId: c.id })),
              });
            }
            if (otherTop.slice(mid).length > 0) {
              cols.push({
                title: 'Thiết Bị, Vật Tư & Lưu Niệm',
                items: otherTop.slice(mid).map((c) => ({ label: c.name, categoryId: c.id })),
              });
            }
            if (cols.length > 0) {
              this.megaMenuColumns.set(cols);
            }
          }
        }
      },
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.menuOpen.set(false);
      this.megaMenuOpen.set(false);
      this.searchSuggestionsOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.menuOpen.set(false);
    this.megaMenuOpen.set(false);
    this.mobileDrawerOpen.set(false);
    this.searchSuggestionsOpen.set(false);
  }

  onSearchInput(): void {
    const query = this.searchQuery.trim();
    if (query.length < 2) {
      this.searchSuggestions.set([]);
      this.searchSuggestionsError.set('');
      this.searchSuggestionsOpen.set(false);
      return;
    }
    this.searchSuggestionsOpen.set(true);
    this.searchTerms.next(query);
  }

  onSearch(): void {
    const query = this.searchQuery.trim();
    this.searchSuggestionsOpen.set(false);
    this.router.navigate(['/products'], {
      queryParams: query ? { search: query } : {},
    });
  }

  openProduct(product: Product): void {
    this.searchSuggestionsOpen.set(false);
    this.searchQuery = '';
    this.router.navigate(['/products', product.slug]);
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
    this.searchTerms.complete();
  }

  logout(): void {
    this.menuOpen.set(false);
    this.cartService.resetLocalCart();
    this.authService.logout();
  }
}
