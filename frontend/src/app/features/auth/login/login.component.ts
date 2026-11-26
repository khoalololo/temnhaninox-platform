import { AfterViewInit, Component, ElementRef, NgZone, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CartApiService } from '../../../core/services/cart-api.service';
import { APP_CONFIG } from '../../../core/config/app-config';
import { ButtonDirective } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ButtonDirective],
  template: `
    <div class="max-w-md mx-auto px-4 py-12">
      <div class="industrial-card p-6">
        <div class="border-b border-border pb-4 mb-5">
          <div class="text-[11px] font-mono uppercase tracking-wider text-accent font-medium">
            Tài khoản khách hàng & xưởng
          </div>
          <h1 class="font-heading text-xl font-bold text-text-primary mt-1">Đăng nhập hệ thống</h1>
        </div>

        @if (errorMessage()) {
          <div class="mb-4 p-3 rounded-[6px] border border-danger/50 bg-danger/10 text-xs text-danger">
            {{ errorMessage() }}
          </div>
        }

        <form (ngSubmit)="onSubmit()" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-text-secondary mb-1">Email</label>
            <input
              type="email"
              [(ngModel)]="email"
              name="email"
              required
              placeholder="congty@example.com"
              class="industrial-input w-full px-3 py-2 text-sm"
            />
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-xs font-medium text-text-secondary">Mật khẩu</label>
              <a routerLink="/forgot-password" class="text-xs font-medium text-steel hover:text-steel-hover hover:underline">Quên mật khẩu?</a>
            </div>
            <input
              type="password"
              [(ngModel)]="password"
              name="password"
              required
              placeholder="••••••••"
              class="industrial-input w-full px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            [disabled]="loading()"
            appButton
            variant="primary"
            size="lg"
            [fullWidth]="true"
          >
            {{ loading() ? 'Đang xác thực...' : 'Đăng nhập' }}
          </button>
        </form>

        @if (googleEnabled) {
          <div class="flex items-center gap-3 my-4">
            <div class="flex-1 h-px bg-border"></div>
            <span class="text-[11px] uppercase tracking-wider text-text-muted">hoặc</span>
            <div class="flex-1 h-px bg-border"></div>
          </div>
          <div #googleButton class="flex justify-center min-h-[44px]"></div>
        }

        <div class="mt-5 pt-4 border-t border-border text-xs text-text-secondary flex items-center justify-between">
          <span>Chưa có tài khoản doanh nghiệp / cá nhân?</span>
          <a routerLink="/register" class="font-semibold text-steel hover:text-steel-hover hover:underline">Đăng ký ngay</a>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent implements AfterViewInit {
  private readonly authService = inject(AuthService);
  private readonly cartService = inject(CartApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly zone = inject(NgZone);

  readonly googleEnabled = !!APP_CONFIG.googleClientId;
  @ViewChild('googleButton') googleButton?: ElementRef<HTMLElement>;

  email = '';
  password = '';
  readonly loading = signal(false);
  readonly errorMessage = signal(
    this.route.snapshot.queryParamMap.has('expired')
      ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
      : ''
  );

  ngAfterViewInit(): void {
    if (!this.googleEnabled) return;
    this.loadGoogleScript().then(() => {
      const google = (window as any).google;
      if (!google || !this.googleButton) return;
      google.accounts.id.initialize({
        client_id: APP_CONFIG.googleClientId,
        callback: (resp: { credential: string }) => this.zone.run(() => this.onGoogleCredential(resp.credential)),
      });
      google.accounts.id.renderButton(this.googleButton.nativeElement, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        width: 320,
      });
    }).catch(() => this.errorMessage.set('Không tải được đăng nhập Google. Vui lòng dùng email và mật khẩu.'));
  }

  private loadGoogleScript(): Promise<void> {
    if ((window as any).google?.accounts?.id) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.head.appendChild(script);
    });
  }

  private onGoogleCredential(idToken: string): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.authService.googleLogin(idToken).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success) {
          this.cartService.loadCart().subscribe({ error: () => {} });
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
          this.router.navigateByUrl(returnUrl || '/');
        } else {
          this.errorMessage.set(res.message || 'Đăng nhập Google thất bại.');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message || 'Đăng nhập Google thất bại.');
      },
    });
  }

  onSubmit(): void {
    if (!this.email.trim() || !this.password) {
      this.errorMessage.set('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.authService.login({ email: this.email.trim(), password: this.password }).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success) {
          this.cartService.loadCart().subscribe({ error: () => {} });
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
          if (returnUrl) {
            this.router.navigateByUrl(returnUrl);
          } else if (res.data?.role === 'ADMIN') {
            this.router.navigate(['/admin']);
          } else {
            this.router.navigate(['/']);
          }
        } else {
          this.errorMessage.set(res.message || 'Đăng nhập thất bại.');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message || 'Sai email hoặc mật khẩu.');
      },
    });
  }
}
