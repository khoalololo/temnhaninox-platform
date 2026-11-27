import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ButtonDirective } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink, ButtonDirective],
  template: `
    <div class="max-w-md mx-auto px-4 py-12">
      <div class="industrial-card p-6">
        <div class="border-b border-border pb-4 mb-5">
          <h1 class="font-heading text-xl font-bold text-text-primary">Quên mật khẩu</h1>
          <p class="text-xs text-text-secondary mt-1">
            Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết đặt lại mật khẩu (hiệu lực 1 giờ).
          </p>
        </div>

        @if (sent()) {
          <div class="p-3 rounded-[6px] border border-success/50 bg-success/10 text-sm text-text-primary">
            Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra hộp thư (kể cả mục Spam).
          </div>
        } @else {
          @if (errorMessage()) {
            <div class="mb-4 p-3 rounded-[6px] border border-danger/50 bg-danger/10 text-xs text-danger">{{ errorMessage() }}</div>
          }
          <form (ngSubmit)="submit()" class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">Email</label>
              <input type="email" [(ngModel)]="email" name="email" required placeholder="congty@example.com"
                     class="industrial-input w-full px-3 py-2 text-sm" />
            </div>
            <button type="submit" [disabled]="loading()" appButton variant="primary" size="lg" [fullWidth]="true">
              {{ loading() ? 'Đang gửi...' : 'Gửi liên kết đặt lại' }}
            </button>
          </form>
        }

        <div class="mt-5 pt-4 border-t border-border text-xs">
          <a routerLink="/login" class="inline-flex items-center gap-1.5 font-semibold text-steel hover:text-steel-hover hover:underline">
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M19 12H5m0 0 6 6m-6-6 6-6" /></svg>
            Quay lại đăng nhập
          </a>
        </div>
      </div>
    </div>
  `,
})
export class ForgotPasswordComponent {
  private readonly auth = inject(AuthService);

  email = '';
  readonly loading = signal(false);
  readonly sent = signal(false);
  readonly errorMessage = signal('');

  submit(): void {
    if (!this.email.trim()) {
      this.errorMessage.set('Vui lòng nhập email.');
      return;
    }
    this.loading.set(true);
    this.errorMessage.set('');
    this.auth.forgotPassword(this.email.trim()).subscribe({
      next: () => {
        this.loading.set(false);
        this.sent.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message || 'Không thể gửi yêu cầu. Vui lòng thử lại.');
      },
    });
  }
}
