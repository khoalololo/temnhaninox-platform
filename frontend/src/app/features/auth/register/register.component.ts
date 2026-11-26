import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ButtonDirective } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ButtonDirective],
  template: `
    <div class="max-w-md mx-auto px-4 py-12">
      <div class="industrial-card p-6">
        <div class="border-b border-border pb-4 mb-5">
          <div class="text-[11px] font-mono uppercase tracking-wider text-accent font-medium">
            Đăng ký đối tác & khách hàng
          </div>
          <h1 class="font-heading text-xl font-bold text-text-primary mt-1">Tạo tài khoản mới</h1>
        </div>

        @if (errorMessage()) {
          <div class="mb-4 p-3 rounded-[6px] border border-danger/50 bg-danger/10 text-xs text-danger">
            {{ errorMessage() }}
          </div>
        }

        <form (ngSubmit)="onSubmit()" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-text-secondary mb-1">Họ và tên / Người liên hệ *</label>
            <input
              type="text"
              [(ngModel)]="fullName"
              name="fullName"
              required
              placeholder="Nguyễn Văn A"
              class="industrial-input w-full px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-text-secondary mb-1">Email *</label>
            <input
              type="email"
              [(ngModel)]="email"
              name="email"
              required
              placeholder="muahang@congty.vn"
              class="industrial-input w-full px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-text-secondary mb-1">Số điện thoại / Zalo</label>
            <input
              type="tel"
              [(ngModel)]="phone"
              name="phone"
              pattern="^(0[0-9]{9}|\\+84[0-9]{9})$"
              placeholder="0909123456"
              class="industrial-input w-full px-3 py-2 text-sm font-mono"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-text-secondary mb-1">Mật khẩu (tối thiểu 6 ký tự) *</label>
            <input
              type="password"
              [(ngModel)]="password"
              name="password"
              required
              minlength="6"
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
            {{ loading() ? 'Đang khởi tạo...' : 'Đăng ký tài khoản' }}
          </button>
        </form>

        <div class="mt-5 pt-4 border-t border-border text-xs text-text-secondary flex items-center justify-between">
          <span>Đã có tài khoản?</span>
          <a routerLink="/login" class="font-semibold text-steel hover:text-steel-hover hover:underline">Đăng nhập</a>
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
    if (this.phone.trim() && !/^(?:0\d{9}|\+84\d{9})$/.test(this.phone.trim())) {
      this.errorMessage.set('Số điện thoại cần gồm 10 chữ số bắt đầu bằng 0 hoặc mã +84 và 9 chữ số.');
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
