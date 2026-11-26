import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-static-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (page === 'about') {
      <main class="max-w-4xl mx-auto px-4 py-12">
        <p class="text-xs font-semibold uppercase tracking-wider text-accent">Kĩ Nghệ NVX · Sài Gòn</p>
        <h1 class="mt-2 font-heading text-3xl font-bold text-text-primary">Về chúng tôi</h1>
        <div class="industrial-card mt-6 space-y-4 p-6 text-sm leading-relaxed text-text-secondary">
          <p>Kĩ Nghệ NVX chuyên gia công tem nhãn và sản phẩm theo yêu cầu trên chất liệu Inox, Nhôm, Đồng, Mica và Decal.</p>
          <p>Xưởng kết hợp kỹ thuật gia công chính xác với quy trình duyệt mẫu thực tế, báo giá minh bạch và hỗ trợ xuất hóa đơn điện tử theo thông tin đơn hàng.</p>
          <a routerLink="/products" class="font-semibold text-steel hover:underline">Khám phá sản phẩm →</a>
        </div>
      </main>
    } @else if (page === 'contact') {
      <main class="max-w-4xl mx-auto px-4 py-12">
        <p class="text-xs font-semibold uppercase tracking-wider text-accent">Chúng tôi sẵn sàng hỗ trợ</p>
        <h1 class="mt-2 font-heading text-3xl font-bold text-text-primary">Liên hệ</h1>
        <div class="industrial-card mt-6 space-y-4 p-6 text-sm text-text-secondary">
          <p><strong class="text-text-primary">Điện thoại/Zalo:</strong> <a href="tel:0989820101" class="text-steel hover:underline">098 98 20 101</a></p>
          <p><strong class="text-text-primary">Email:</strong> <a href="mailto:hoangvunew@gmail.com" class="text-steel hover:underline">hoangvunew&#64;gmail.com</a></p>
          <p><strong class="text-text-primary">Địa chỉ xưởng:</strong> 350/21/51, Đường T15, An Phú Đông, Hồ Chí Minh 70000, Việt Nam</p>
          @if (authService.isAdmin()) {
            <p class="text-sm text-text-muted">Đang xem với tư cách quản trị viên</p>
          } @else {
            <a routerLink="/quote-builder" class="inline-flex font-semibold text-steel hover:underline">Tạo yêu cầu báo giá →</a>
          }
        </div>
      </main>
    } @else {
      <main class="max-w-2xl mx-auto px-4 py-20 text-center">
        <p class="font-sans tabular-nums text-6xl font-bold text-accent">{{ isServerError ? '500' : '404' }}</p>
        <h1 class="mt-4 font-heading text-2xl font-bold text-text-primary">
          {{ isServerError ? 'Máy chủ đang gặp sự cố' : 'Không tìm thấy trang' }}
        </h1>
        <p class="mt-2 text-sm text-text-secondary">
          {{ isServerError ? 'Vui lòng thử lại sau hoặc quay lại trang trước.' : 'Đường dẫn có thể đã thay đổi hoặc không còn tồn tại.' }}
        </p>
        <div class="mt-6 flex justify-center gap-3">
          @if (isServerError && returnUrl) {
            <button type="button" (click)="retry()" class="rounded-[6px] border border-border px-4 py-2 text-sm font-semibold text-text-primary hover:border-accent">Thử lại</button>
          }
          <a routerLink="/" class="rounded-[6px] bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">Về trang chủ</a>
        </div>
      </main>
    }
  `,
})
export class StaticPagesComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);
  readonly page = this.route.snapshot.data['page'] as string;
  readonly isServerError = this.page === 'server-error';
  readonly returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

  retry(): void {
    const target = this.returnUrl && this.returnUrl.startsWith('/') && !this.returnUrl.startsWith('//')
      ? this.returnUrl
      : '/';
    this.router.navigateByUrl(target);
  }
}
