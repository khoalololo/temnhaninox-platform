import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule, Search, ShoppingCart, ChevronDown, Sun, Moon } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { CartApiService } from '../../../core/services/cart-api.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ButtonDirective } from '../button/button.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, LucideAngularModule, ButtonDirective],
  template: `
    <header class="sticky top-0 z-50 bg-bg-elevated text-text-primary border-b border-border">
      <!-- Top utility strip -->
      <div class="bg-bg-elevated border-b border-border text-xs text-text-secondary">
        <div class="max-w-7xl mx-auto px-4 h-7 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <span>Xưởng gia công: Q. Bình Tân, TP.HCM</span>
            <span class="hidden sm:inline text-border">|</span>
            <span class="hidden sm:inline">Xuất hóa đơn VAT đỏ đầy đủ</span>
          </div>
          <div class="flex items-center gap-4 font-mono tabular-nums text-text-secondary">
            <span>Hotline: 0909.888.304</span>
          </div>
        </div>
      </div>

      <!-- Main navbar -->
      <div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4 bg-bg-elevated">
        <!-- Brand -->
        <a routerLink="/" class="flex items-center gap-2.5 shrink-0 group">
          <div class="w-8 h-8 rounded-[6px] bg-accent flex items-center justify-center font-mono font-bold text-sm text-[#0B0F17] tracking-tighter">
            TNI
          </div>
          <div class="leading-tight">
            <div class="font-heading font-bold tracking-wide text-sm text-text-primary group-hover:text-accent transition-colors">
              TEM NHÃN INOX
            </div>
            <div class="text-[10px] font-mono text-text-muted uppercase tracking-wider">
              PRECISION METAL LAB
            </div>
          </div>
        </a>

        <!-- Search bar -->
        <form (ngSubmit)="onSearch()" class="hidden md:flex flex-1 max-w-md">
          <div class="relative w-full flex">
            <input
              type="text"
              [(ngModel)]="searchQuery"
              name="searchQuery"
              placeholder="Tìm tem inox 304, tem nhôm, khắc laser..."
              class="w-full bg-bg border border-border text-sm text-text-primary placeholder-text-muted rounded-l-[6px] px-3 py-1.5 focus:outline-none focus:border-steel"
            />
            <button
              type="submit"
              appButton
              variant="secondary"
              size="sm"
              class="rounded-l-none border-l-0"
            >
              <lucide-icon [img]="SearchIcon" [size]="14" />
              <span>Tìm</span>
            </button>
          </div>
        </form>

        <!-- Actions -->
        <div class="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <a
            routerLink="/quote-builder"
            appButton
            variant="primary"
            size="sm"
          >
            Báo Giá & Xem Mẫu 3D
          </a>

          <a
            routerLink="/cart"
            appButton
            variant="secondary"
            size="sm"
          >
            <lucide-icon [img]="CartIcon" [size]="15" />
            <span class="hidden sm:inline">Giỏ hàng</span>
            @if (cartService.cartCount() > 0) {
              <span class="bg-accent text-[#0B0F17] font-mono tabular-nums text-[11px] font-bold px-1.5 py-0.5 rounded-full">
                {{ cartService.cartCount() }}
              </span>
            }
          </a>

          <button
            type="button"
            (click)="themeService.toggle()"
            [attr.aria-label]="themeService.theme() === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'"
            [title]="themeService.theme() === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'"
            appButton
            variant="ghost"
            size="sm"
            class="px-2 border border-border"
          >
            <lucide-icon [img]="themeService.theme() === 'dark' ? SunIcon : MoonIcon" [size]="15" />
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
                <span class="max-w-[100px] truncate">{{ authService.currentUser()?.fullName }}</span>
                <lucide-icon [img]="ChevronDownIcon" [size]="14" />
              </button>

              @if (menuOpen()) {
                <div
                  class="absolute right-0 mt-1.5 w-52 bg-surface text-text-primary border border-border rounded-[10px] py-1 z-50 hover:shadow-card-hover"
                  (mouseleave)="menuOpen.set(false)"
                >
                  <a
                    routerLink="/account/orders"
                    (click)="menuOpen.set(false)"
                    class="block px-3.5 py-2 text-xs font-medium text-text-primary hover:bg-surface-raised hover:text-steel transition-colors border-b border-border"
                  >
                    Đơn hàng & Tiến độ xưởng
                  </a>
                  <a
                    routerLink="/account/profile"
                    (click)="menuOpen.set(false)"
                    class="block px-3.5 py-2 text-xs font-medium text-text-primary hover:bg-surface-raised hover:text-steel transition-colors"
                  >
                    Hồ sơ & MST (VAT đỏ)
                  </a>
                  @if (authService.isAdmin()) {
                    <a
                      routerLink="/admin"
                      (click)="menuOpen.set(false)"
                      class="block px-3.5 py-2 text-xs font-semibold text-accent hover:bg-surface-raised border-t border-border transition-colors"
                    >
                      Quản trị xưởng (Admin)
                    </a>
                  }
                  <button
                    type="button"
                    (click)="logout()"
                    class="w-full text-left px-3.5 py-2 text-xs font-medium text-danger hover:bg-danger/10 border-t border-border transition-colors"
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
            >
              Đăng nhập
            </a>
          }
        </div>
      </div>

      <!-- Category quick-links -->
      <nav class="bg-bg-elevated border-t border-border">
        <div class="max-w-7xl mx-auto px-4 h-9 flex items-center gap-6 overflow-x-auto text-xs font-medium text-text-secondary">
          <a routerLink="/products" routerLinkActive="text-steel" [routerLinkActiveOptions]="{ exact: true }" class="hover:text-steel-hover transition-colors whitespace-nowrap">
            Tất cả sản phẩm
          </a>
          <a routerLink="/products" [queryParams]="{ search: 'Inox' }" class="hover:text-steel-hover transition-colors whitespace-nowrap">
            Tem Inox 304
          </a>
          <a routerLink="/products" [queryParams]="{ search: 'Nhôm' }" class="hover:text-steel-hover transition-colors whitespace-nowrap">
            Tem Nhôm
          </a>
          <a routerLink="/products" [queryParams]="{ search: 'Đồng' }" class="hover:text-steel-hover transition-colors whitespace-nowrap">
            Tem Đồng
          </a>
          <a routerLink="/products" [queryParams]="{ productType: 'CUSTOM_TEMPLATE' }" class="hover:text-steel-hover transition-colors whitespace-nowrap">
            Gia công theo yêu cầu
          </a>
          <a routerLink="/products" [queryParams]="{ productType: 'STANDARD_ITEM' }" class="hover:text-steel-hover transition-colors whitespace-nowrap">
            Vật tư & Máy móc có sẵn
          </a>
        </div>
      </nav>
    </header>
  `,
})
export class NavbarComponent implements OnInit {
  readonly authService = inject(AuthService);
  readonly cartService = inject(CartApiService);
  readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);

  readonly SearchIcon = Search;
  readonly CartIcon = ShoppingCart;
  readonly ChevronDownIcon = ChevronDown;
  readonly SunIcon = Sun;
  readonly MoonIcon = Moon;

  searchQuery = '';
  readonly menuOpen = signal(false);

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.cartService.loadCart().subscribe({ error: () => {} });
    }
  }

  onSearch(): void {
    this.router.navigate(['/products'], {
      queryParams: this.searchQuery.trim() ? { search: this.searchQuery.trim() } : {},
    });
  }

  logout(): void {
    this.menuOpen.set(false);
    this.cartService.resetLocalCart();
    this.authService.logout();
  }
}
