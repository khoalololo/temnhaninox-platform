import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CartApiService } from '../../../core/services/cart-api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="max-w-md mx-auto px-4 py-12">
      <div class="bg-white border border-slate-300 rounded-md p-6">
        <div class="border-b border-slate-200 pb-4 mb-5">
          <div class="text-[11px] font-mono uppercase tracking-wider text-amber-700 font-semibold">
            Tài khoản khách hàng & xưởng
          </div>
          <h1 class="text-xl font-bold text-slate-900 mt-1">Đăng nhập hệ thống</h1>
        </div>

        @if (errorMessage()) {
          <div class="mb-4 p-3 rounded border border-red-300 bg-red-50 text-xs text-red-700">
            {{ errorMessage() }}
          </div>
        }

        <form (ngSubmit)="onSubmit()" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              [(ngModel)]="email"
              name="email"
              required
              placeholder="congty@example.com"
              class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-amber-600"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Mật khẩu</label>
            <input
              type="password"
              [(ngModel)]="password"
              name="password"
              required
              placeholder="••••••••"
              class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-amber-600"
            />
          </div>

          <button
            type="submit"
            [disabled]="loading()"
            class="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-slate-400 text-white font-semibold text-sm py-2.5 rounded-md transition-colors"
          >
            {{ loading() ? 'Đang xác thực...' : 'Đăng nhập' }}
          </button>
        </form>

        <div class="mt-5 pt-4 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between">
          <span>Chưa có tài khoản doanh nghiệp / cá nhân?</span>
          <a routerLink="/register" class="font-semibold text-amber-700 hover:underline">Đăng ký ngay</a>
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
