import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ButtonDirective } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, RouterLink, ButtonDirective],
  template: `
    <div class="max-w-md mx-auto px-4 py-12">
      <div class="industrial-card p-6">
        <div class="border-b border-border pb-4 mb-5">
          <h1 class="font-heading text-xl font-bold text-text-primary">Đặt lại mật khẩu</h1>
        </div>

        @if (!token) {
          <div class="p-3 rounded-[6px] border border-danger/50 bg-danger/10 text-sm text-danger">
            Liên kết không hợp lệ. Vui lòng yêu cầu liên kết mới.
          </div>
          <a routerLink="/forgot-password" class="inline-block mt-4 text-xs font-semibold text-steel hover:underline">Yêu cầu liên kết mới</a>
        } @else if (done()) {
          <div class="p-3 rounded-[6px] border border-success/50 bg-success/10 text-sm text-text-primary">
            Đặt lại mật khẩu thành công. Đang chuyển đến trang đăng nhập...
          </div>
        } @else {
          @if (errorMessage()) {
            <div class="mb-4 p-3 rounded-[6px] border border-danger/50 bg-danger/10 text-xs text-danger">{{ errorMessage() }}</div>
          }
          <form (ngSubmit)="submit()" class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">Mật khẩu mới (tối thiểu 6 ký tự)</label>
              <input type="password" [(ngModel)]="password" name="password" required minlength="6" autocomplete="new-password"
                     class="industrial-input w-full px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">Nhập lại mật khẩu</label>
              <input type="password" [(ngModel)]="confirm" name="confirm" required autocomplete="new-password"
                     class="industrial-input w-full px-3 py-2 text-sm" />
            </div>
            <button type="submit" [disabled]="loading()" appButton variant="primary" size="lg" [fullWidth]="true">
              {{ loading() ? 'Đang lưu...' : 'Đặt lại mật khẩu' }}
            </button>
          </form>
        }
      </div>
    </div>
  `,
})
export class ResetPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token') ?? '';

  password = '';
  confirm = '';
  readonly loading = signal(false);
  readonly done = signal(false);
  readonly errorMessage = signal('');

  submit(): void {
    if (this.password.length < 6) {
      this.errorMessage.set('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (this.password !== this.confirm) {
      this.errorMessage.set('Mật khẩu nhập lại không khớp.');
      return;
    }
    this.loading.set(true);
    this.errorMessage.set('');
    this.auth.resetPassword(this.token, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.done.set(true);
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message || 'Liên kết không hợp lệ hoặc đã hết hạn.');
      },
    });
  }
}
