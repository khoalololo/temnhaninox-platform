import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CartApiService } from '../../../core/services/cart-api.service';
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
            <label class="block text-xs font-medium text-text-secondary mb-1">Mật khẩu</label>
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

        <div class="mt-5 pt-4 border-t border-border text-xs text-text-secondary flex items-center justify-between">
          <span>Chưa có tài khoản doanh nghiệp / cá nhân?</span>
          <a routerLink="/register" class="font-semibold text-steel hover:text-steel-hover hover:underline">Đăng ký ngay</a>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly cartService = inject(CartApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  email = '';
  password = '';
  readonly loading = signal(false);
  readonly errorMessage = signal('');

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
