import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="max-w-md mx-auto px-4 py-12">
      <div class="bg-white border border-slate-300 rounded-md p-6">
        <div class="border-b border-slate-200 pb-4 mb-5">
          <div class="text-[11px] font-mono uppercase tracking-wider text-amber-700 font-semibold">
            Đăng ký đối tác & khách hàng
          </div>
          <h1 class="text-xl font-bold text-slate-900 mt-1">Tạo tài khoản mới</h1>
        </div>

        @if (errorMessage()) {
          <div class="mb-4 p-3 rounded border border-red-300 bg-red-50 text-xs text-red-700">
            {{ errorMessage() }}
          </div>
        }

        <form (ngSubmit)="onSubmit()" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Họ và tên / Người liên hệ *</label>
            <input
              type="text"
              [(ngModel)]="fullName"
              name="fullName"
              required
              placeholder="Nguyễn Văn A"
              class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-amber-600"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
            <input
              type="email"
              [(ngModel)]="email"
              name="email"
              required
              placeholder="muahang@congty.vn"
              class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-amber-600"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại / Zalo</label>
            <input
              type="tel"
              [(ngModel)]="phone"
              name="phone"
              placeholder="0909123456"
              class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-600"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Mật khẩu (tối thiểu 6 ký tự) *</label>
            <input
              type="password"
              [(ngModel)]="password"
              name="password"
              required
              minlength="6"
              placeholder="••••••••"
              class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-amber-600"
            />
          </div>

          <button
            type="submit"
            [disabled]="loading()"
            class="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-slate-400 text-white font-semibold text-sm py-2.5 rounded-md transition-colors"
          >
            {{ loading() ? 'Đang khởi tạo...' : 'Đăng ký tài khoản' }}
          </button>
        </form>

        <div class="mt-5 pt-4 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between">
          <span>Đã có tài khoản?</span>
          <a routerLink="/login" class="font-semibold text-amber-700 hover:underline">Đăng nhập</a>
        </div>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  fullName = '';
  email = '';
  phone = '';
  password = '';
  readonly loading = signal(false);
  readonly errorMessage = signal('');

  onSubmit(): void {
    if (!this.fullName.trim() || !this.email.trim() || this.password.length < 6) {
      this.errorMessage.set('Vui lòng điền họ tên, email hợp lệ và mật khẩu từ 6 ký tự.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.authService
      .register({
        fullName: this.fullName.trim(),
        email: this.email.trim(),
        phone: this.phone.trim() || undefined,
        password: this.password,
      })
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.success) {
            this.router.navigate(['/']);
          } else {
            this.errorMessage.set(res.message || 'Không thể đăng ký tài khoản.');
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(err?.error?.message || 'Email đã tồn tại hoặc dữ liệu không hợp lệ.');
        },
      });
  }
}
