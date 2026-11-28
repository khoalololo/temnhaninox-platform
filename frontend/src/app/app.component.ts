import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { animate, query, style, transition, trigger } from '@angular/animations';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideAngularModule, Moon, Sun } from 'lucide-angular';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { ToastViewportComponent } from './shared/components/toast/toast.component';
import { ThemeService } from './core/services/theme.service';
import { AuthService } from './core/services/auth.service';

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const routeFadeAnimation = trigger('routeFade', [
  transition('* <=> *', [
    query(
      ':enter',
      [
        style({ opacity: 0 }),
        animate(
          prefersReducedMotion() ? '0ms' : '180ms ease',
          style({ opacity: 1 })
        ),
      ],
      { optional: true }
    ),
  ]),
]);

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule, NavbarComponent, FooterComponent, ToastViewportComponent],
  animations: [routeFadeAnimation],
  template: `
    <div class="min-h-screen flex flex-col bg-bg text-text-primary font-body">
      @if (isAdminRoute()) {
        <header class="sticky top-0 z-50 border-b border-border bg-bg-elevated">
          <div class="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
            <a routerLink="/admin" class="fs-nav-underline inline-flex min-h-14 shrink-0 items-center font-heading text-sm font-bold text-text-primary sm:text-base">
              <span class="text-accent">NVX Admin</span>
              <span class="hidden text-text-secondary sm:inline"> · Quản lý xưởng</span>
            </a>
            <nav class="flex min-w-0 items-center gap-3 sm:gap-6" aria-label="Điều hướng quản trị">
              <a routerLink="/" class="fs-nav-underline hidden min-h-14 items-center text-sm font-medium text-text-secondary hover:text-accent sm:inline-flex">
                <span class="inline-flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M19 12H5m0 0 6 6m-6-6 6-6" /></svg>
                  Xem trang bán hàng
                </span>
              </a>
              <button
                type="button"
                (click)="theme.toggle()"
                class="fs-nav-underline inline-flex min-h-14 items-center px-1 text-text-secondary transition-colors hover:text-accent"
                [attr.aria-label]="theme.theme() === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'"
                [title]="theme.theme() === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'"
              >
                <lucide-icon [img]="theme.theme() === 'dark' ? SunIcon : MoonIcon" [size]="20" />
              </button>
              <details class="relative">
                <summary class="fs-nav-underline flex min-h-14 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-text-primary transition-colors hover:text-accent">
                  <svg viewBox="0 0 24 24" class="h-5 w-5 shrink-0 text-accent" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                    <circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" />
                  </svg>
                  <span class="hidden max-w-40 truncate sm:inline">System Administrator</span>
                  <svg viewBox="0 0 24 24" class="h-3.5 w-3.5 shrink-0 text-text-muted" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                </summary>
                <div class="absolute right-0 top-full z-50 mt-2 w-56 rounded-[8px] border border-border bg-bg-elevated p-3 shadow-lg">
                  <p class="truncate text-sm font-semibold text-text-primary">{{ auth.currentUser()?.fullName }}</p>
                  <p class="mb-3 truncate text-xs text-text-secondary">{{ auth.currentUser()?.email }}</p>
                  <a routerLink="/" class="mb-2 block text-sm text-accent sm:hidden">Xem trang bán hàng</a>
                  <button type="button" (click)="auth.logout()" class="w-full px-1 py-2 text-left text-sm font-medium text-text-secondary transition-colors hover:text-danger">
                    Đăng xuất
                  </button>
                </div>
              </details>
            </nav>
          </div>
        </header>
      } @else {
        <app-navbar />
      }
      <main class="flex-1" [@routeFade]="getRouteState(outlet)">
        <router-outlet #outlet="outlet" />
      </main>
      @if (!isAdminRoute()) {
        <app-footer />
      }
      <app-toast-viewport />
    </div>
  `,
})
export class AppComponent {
  readonly SunIcon = Sun;
  readonly MoonIcon = Moon;
  readonly theme = inject(ThemeService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly isAdminRoute = signal(this.router.url.startsWith('/admin'));

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe((event) => this.isAdminRoute.set(event.urlAfterRedirects.startsWith('/admin')));
  }

  getRouteState(outlet: RouterOutlet): string {
    return outlet.isActivated ? outlet.activatedRoute.snapshot.url.join('/') || 'home' : '';
  }
}
