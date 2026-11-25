import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="bg-surface text-text-secondary border-t border-border mt-12">
      <div class="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-xs">
        <div>
          <div class="flex items-center gap-2 mb-3">
            <div class="w-6 h-6 rounded-[6px] bg-accent flex items-center justify-center font-mono font-bold text-[11px] text-[#0B0F17]">
              TNI
            </div>
            <span class="font-heading font-bold text-sm text-text-primary tracking-wide">TEM NHÃN INOX</span>
          </div>
          <p class="text-text-secondary leading-relaxed mb-2">
            Xưởng gia công tem nhãn kim loại chính xác: Ăn mòn điện hóa, Khắc Laser Fiber, In UV Phẳng trên Inox 304, Nhôm, Đồng, Mica.
          </p>
          <p class="font-mono tabular-nums text-text-muted">MST: 0316892304</p>
        </div>

        <div>
          <h3 class="font-heading text-text-primary font-semibold uppercase tracking-wider mb-3">Xưởng Sản Xuất TP.HCM</h3>
          <ul class="space-y-1.5 text-text-secondary">
            <li>Địa chỉ: 142 Đường Số 7, P. Bình Hưng Hòa B, Q. Bình Tân, TP.HCM</li>
            <li class="font-mono tabular-nums">Hotline / Zalo: 0909.888.304</li>
            <li>Email: baogia&#64;temnhaninox.com</li>
            <li>Giờ làm việc: T2 - T7 (08:00 - 17:30)</li>
          </ul>
        </div>

        <div>
          <h3 class="font-heading text-text-primary font-semibold uppercase tracking-wider mb-3">Liên Kết Nhanh</h3>
          <ul class="space-y-1.5 text-text-secondary">
            <li><a routerLink="/products" class="hover:text-steel-hover transition-colors">Danh mục sản phẩm</a></li>
            <li><a routerLink="/quote-builder" class="hover:text-steel-hover transition-colors">Báo giá & Xem mẫu 3D</a></li>
            <li><a routerLink="/cart" class="hover:text-steel-hover transition-colors">Giỏ hàng của bạn</a></li>
            <li><a routerLink="/account/profile" class="hover:text-steel-hover transition-colors">Thông tin xuất hóa đơn VAT đỏ</a></li>
          </ul>
        </div>
      </div>

      <div class="bg-bg border-t border-border py-3">
        <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono text-text-muted">
          <span>© 2026 Tem Nhãn Inox Platform. Precision Metal Fabrication.</span>
          <span>Hỗ trợ file thiết kế: .CDR, .AI, .PDF, .DXF, .PNG</span>
        </div>
      </div>
    </footer>
  `,
})
export class FooterComponent {}
