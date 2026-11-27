import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { animate, query, style, transition, trigger } from '@angular/animations';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  imports: [RouterOutlet, RouterLink, NavbarComponent, FooterComponent, ToastViewportComponent],
  animations: [routeFadeAnimation],
  template: `
    <div class="min-h-screen flex flex-col bg-bg text-text-primary font-body">
      @if (isAdminRoute()) {
        <header class="sticky top-0 z-50 border-b border-border bg-bg-elevated">
          <div class="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
            <a routerLink="/admin" class="min-w-0 font-heading text-sm font-bold text-text-primary sm:text-base">
              <span class="text-accent">NVX Admin</span>
              <span class="hidden text-text-secondary sm:inline"> · Quản lý xưởng</span>
            </a>
            <div class="flex shrink-0 items-center gap-2 sm:gap-4">
              <a routerLink="/" class="hidden text-sm font-medium text-text-secondary hover:text-accent sm:inline">
                <span class="inline-flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M19 12H5m0 0 6 6m-6-6 6-6" /></svg>
                  Xem trang bán hàng
                </span>
              </a>
              <button
                type="button"
                (click)="theme.toggle()"
                class="rounded-[6px] border border-border px-3 py-2 text-sm font-medium hover:border-accent"
                [attr.aria-label]="theme.theme() === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'"
              >
                <span class="inline-flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                    @if (theme.theme() === 'dark') {
                      <circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
                    } @else {
                      <path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5Z" />
                    }
                  </svg>
                  {{ theme.theme() === 'dark' ? 'Sáng' : 'Tối' }}
                </span>
              </button>
              <details class="relative">
                <summary class="max-w-[7rem] truncate cursor-pointer list-none rounded-[6px] border border-border px-3 py-2 text-sm font-medium hover:border-accent sm:max-w-48">
                  {{ auth.currentUser()?.fullName || 'Quản trị viên' }}
                </summary>
                <div class="absolute right-0 top-full z-50 mt-2 w-56 rounded-[8px] border border-border bg-bg-elevated p-3 shadow-lg">
                  <p class="truncate text-sm font-semibold text-text-primary">{{ auth.currentUser()?.fullName }}</p>
                  <p class="mb-3 truncate text-xs text-text-secondary">{{ auth.currentUser()?.email }}</p>
                  <a routerLink="/" class="mb-2 block text-sm text-accent sm:hidden">Xem trang bán hàng</a>
                  <button type="button" (click)="auth.logout()" class="w-full rounded-[6px] border border-border px-3 py-2 text-left text-sm hover:border-danger hover:text-danger">
                    Đăng xuất
                  </button>
                </div>
              </details>
            </div>
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
