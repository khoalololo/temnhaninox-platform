import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CartApiService } from '../../../core/services/cart-api.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  template: `
    <header class="sticky top-0 z-50 bg-slate-900 text-white border-b border-slate-800">
      <!-- Top utility strip -->
      <div class="bg-slate-950 border-b border-slate-800/80 text-xs text-slate-400">
        <div class="max-w-7xl mx-auto px-4 h-7 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <span>Xưởng gia công: Q. Bình Tân, TP.HCM</span>
            <span class="hidden sm:inline text-slate-600">|</span>
            <span class="hidden sm:inline">Xuất hóa đơn VAT đỏ đầy đủ</span>
          </div>
          <div class="flex items-center gap-4 font-mono tabular-nums">
            <span>Hotline: 0909.888.304</span>
          </div>
        </div>
      </div>

      <!-- Main navbar -->
      <div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <!-- Brand -->
        <a routerLink="/" class="flex items-center gap-2.5 shrink-0 group">
          <div class="w-8 h-8 rounded bg-amber-600 flex items-center justify-center font-mono font-bold text-sm text-white tracking-tighter">
            TNI
          </div>
          <div class="leading-tight">
            <div class="font-bold tracking-wide text-sm text-white group-hover:text-amber-400 transition-colors">
              TEM NHÃN INOX
            </div>
            <div class="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
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
              class="w-full bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-400 rounded-l-md px-3 py-1.5 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              class="bg-slate-700 hover:bg-slate-600 border border-l-0 border-slate-700 px-3 py-1.5 rounded-r-md text-xs font-medium text-slate-200 transition-colors"
            >
              Tìm
            </button>
          </div>
        </form>

        <!-- Actions -->
        <div class="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <a
            routerLink="/quote-builder"
            class="bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 rounded-md transition-colors whitespace-nowrap"
          >
            Báo Giá & Xem Mẫu 3D
          </a>

          <a
            routerLink="/cart"
            class="relative flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors"
          >
            <svg class="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span class="hidden sm:inline">Giỏ hàng</span>
            @if (cartService.cartCount() > 0) {
              <span class="bg-amber-600 text-white font-mono tabular-nums text-[11px] font-bold px-1.5 py-0.5 rounded">
                {{ cartService.cartCount() }}
              </span>
            }
          </a>

          @if (authService.isAuthenticated()) {
            <div class="relative">
              <button
                type="button"
                (click)="menuOpen.set(!menuOpen())"
                class="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors"
              >
                <span class="max-w-[100px] truncate">{{ authService.currentUser()?.fullName }}</span>
                <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              @if (menuOpen()) {
                <div
                  class="absolute right-0 mt-1.5 w-48 bg-white text-slate-900 border border-slate-300 rounded-md py-1 z-50"
                  (mouseleave)="menuOpen.set(false)"
                >
                  <a
                    routerLink="/account/orders"
                    (click)="menuOpen.set(false)"
                    class="block px-3.5 py-2 text-xs font-medium hover:bg-slate-100 border-b border-slate-200"
                  >
                    Đơn hàng & Tiến độ xưởng
                  </a>
                  <a
                    routerLink="/account/profile"
                    (click)="menuOpen.set(false)"
                    class="block px-3.5 py-2 text-xs font-medium hover:bg-slate-100"
                  >
                    Hồ sơ & MST (VAT đỏ)
                  </a>
                  @if (authService.isAdmin()) {
                    <a
                      routerLink="/admin"
                      (click)="menuOpen.set(false)"
                      class="block px-3.5 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 border-t border-slate-200"
                    >
                      Quản trị xưởng (Admin)
                    </a>
                  }
                  <button
                    type="button"
                    (click)="logout()"
                    class="w-full text-left px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 border-t border-slate-200"
                  >
                    Đăng xuất
                  </button>
                </div>
              }
            </div>
          } @else {
            <a
              routerLink="/login"
              class="text-xs sm:text-sm font-medium text-slate-300 hover:text-white px-2.5 py-2 transition-colors"
            >
              Đăng nhập
            </a>
          }
        </div>
      </div>

      <!-- Category quick-links -->
      <nav class="bg-slate-800/90 border-t border-slate-800">
        <div class="max-w-7xl mx-auto px-4 h-9 flex items-center gap-6 overflow-x-auto text-xs font-medium text-slate-300">
          <a routerLink="/products" routerLinkActive="text-amber-400" [routerLinkActiveOptions]="{ exact: true }" class="hover:text-white whitespace-nowrap">
            Tất cả sản phẩm
          </a>
          <a routerLink="/products" [queryParams]="{ search: 'Inox' }" class="hover:text-white whitespace-nowrap">
            Tem Inox 304
          </a>
          <a routerLink="/products" [queryParams]="{ search: 'Nhôm' }" class="hover:text-white whitespace-nowrap">
            Tem Nhôm
          </a>
          <a routerLink="/products" [queryParams]="{ search: 'Đồng' }" class="hover:text-white whitespace-nowrap">
            Tem Đồng
          </a>
          <a routerLink="/products" [queryParams]="{ productType: 'CUSTOM_TEMPLATE' }" class="hover:text-white whitespace-nowrap">
            Gia công theo yêu cầu
          </a>
          <a routerLink="/products" [queryParams]="{ productType: 'STANDARD_ITEM' }" class="hover:text-white whitespace-nowrap">
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
  private readonly router = inject(Router);

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
