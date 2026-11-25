import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, Phone, MessageCircle, MapPin, Mail, Globe } from 'lucide-angular';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  template: `
    <footer class="bg-[#6b6b6b] text-white border-t border-border mt-14">
      <div class="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-sm">
        <!-- Col 1: KĨ NGHỆ NVX - SÀI GÒN -->
        <div>
          <div class="flex items-center gap-3 mb-4">
            @if (!logoBroken()) {
              <img
                src="/assets/images/logo-nvx.png"
                alt="Logo NVX"
                (error)="logoBroken.set(true)"
                class="h-12 w-auto object-contain bg-white/95 rounded-[6px] p-1"
              />
            }
            <h3 class="font-bold text-base uppercase tracking-wide text-white">
              KĨ NGHỆ NVX - SÀI GÒN
            </h3>
          </div>
          <p class="text-white/90 leading-relaxed">
            Kĩ Nghệ NVX - Sài Gòn hiện diện là một trong những đơn vị tiên phong trong việc kết hợp giữa nghệ thuật thủ công truyền thống và công nghệ hiện đại trên các chất liệu Inox, Nhôm, Đồng, Mica.
          </p>
        </div>

        <!-- Col 2: NHẬN BÁO GIÁ MIỄN PHÍ -->
        <div>
          <h3 class="font-bold text-base uppercase tracking-wide text-white mb-4">
            NHẬN BÁO GIÁ MIỄN PHÍ
          </h3>
          <a
            href="tel:0989820101"
            class="block text-xl font-bold text-white hover:text-[#a8f0a5] transition-colors mb-3"
          >
            098 9820 101
          </a>
          <p class="text-white/90 leading-relaxed mb-4">
            Khách hàng hiện tại, vui lòng gửi file thiết kế (.CDR, .AI, .PDF) hoặc sử dụng công cụ báo giá tự động trực tuyến.
          </p>
          <a
            routerLink="/quote-builder"
            class="inline-block bg-[#187115] hover:bg-[#1e8a1b] text-white font-semibold uppercase text-xs px-4 py-2.5 rounded-[5px] transition-colors"
          >
            BÁO GIÁ & XEM MẪU 3D
          </a>
        </div>

        <!-- Col 3: THÔNG TIN LIÊN HỆ (with circular green icons matching OG site) -->
        <div>
          <h3 class="font-bold text-base uppercase tracking-wide text-white mb-4">
            THÔNG TIN LIÊN HỆ
          </h3>
          <ul class="space-y-3 text-white/95">
            <li class="flex items-center gap-3">
              <span class="w-8 h-8 rounded-full bg-[#187115] flex items-center justify-center shrink-0">
                <lucide-icon [img]="PhoneIcon" [size]="15" />
              </span>
              <a href="tel:0989820101" class="hover:underline">098 98 20 101</a>
            </li>
            <li class="flex items-center gap-3">
              <span class="w-8 h-8 rounded-full bg-[#187115] flex items-center justify-center shrink-0">
                <lucide-icon [img]="MailIcon" [size]="15" />
              </span>
              <a href="mailto:hoangvunew@gmail.com" class="hover:underline">hoangvunew&#64;gmail.com</a>
            </li>
            <li class="flex items-start gap-3">
              <span class="w-8 h-8 rounded-full bg-[#187115] flex items-center justify-center shrink-0 mt-0.5">
                <lucide-icon [img]="MapPinIcon" [size]="15" />
              </span>
              <span>1006/3g Đường An Phú Đông 25, An Phú Đông, Quận 12, Sài Gòn, Việt Nam</span>
            </li>

          </ul>
        </div>

        <!-- Col 4: VỊ TRÍ CỬA HÀNG / LIÊN KẾT -->
        <div>
          <h3 class="font-bold text-base uppercase tracking-wide text-white mb-4">
            VỊ TRÍ CỬA HÀNG
          </h3>
          <div class="rounded-[8px] overflow-hidden border border-white/25 bg-white/10">
            <iframe
              title="Bản đồ Kĩ Nghệ NVX Sài Gòn"
              src="https://www.google.com/maps?q=1006/3g+Duong+An+Phu+Dong+25,+Quan+12,+TP.HCM&output=embed"
              class="w-full h-44 border-0"
              loading="lazy"
            ></iframe>
          </div>
        </div>
      </div>

      <!-- Dark bottom copyright bar matching OG site -->
      <div class="bg-[#4a4a4a] py-4">
        <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs sm:text-sm text-white/85">
          <span>Copyright © 2026 by Tem Nhãn Inox NVX - Sài Gòn. All rights reserved.</span>
          <span>Hỗ trợ file thiết kế: .CDR, .AI, .PDF, .DXF, .PNG</span>
        </div>
      </div>
    </footer>

    <!-- Floating Contact Dock (Maps, WhatsApp/Zalo, Phone — matching OG right-side dock) -->
    <div class="fixed bottom-4 right-4 z-40 flex flex-col gap-2.5">
      <a
        href="https://maps.google.com/?q=1006/3g+Duong+An+Phu+Dong+25,+Quan+12,+TP.HCM"
        target="_blank"
        rel="noopener noreferrer"
        title="Mở bản đồ Google Maps"
        class="w-11 h-11 rounded-full bg-[#187115] text-white hover:bg-[#1e8a1b] flex items-center justify-center shadow-lg transition-transform hover:scale-105"
      >
        <lucide-icon [img]="MapPinIcon" [size]="20" />
      </a>
      <a
        href="https://wa.me/84989820101"
        target="_blank"
        rel="noopener noreferrer"
        title="Chat WhatsApp / Zalo: 098 98 20 101"
        class="w-11 h-11 rounded-full bg-[#25D366] text-white hover:opacity-95 flex items-center justify-center shadow-lg transition-transform hover:scale-105"
      >
        <lucide-icon [img]="MessageIcon" [size]="20" />
      </a>
      <a
        href="tel:0989820101"
        title="Gọi Hotline: 098 98 20 101"
        class="w-11 h-11 rounded-full bg-[#d32f2f] text-white hover:opacity-95 flex items-center justify-center shadow-lg transition-transform hover:scale-105"
      >
        <lucide-icon [img]="PhoneIcon" [size]="20" />
      </a>
    </div>
  `,
})
export class FooterComponent {
  readonly PhoneIcon = Phone;
  readonly MessageIcon = MessageCircle;
  readonly MapPinIcon = MapPin;
  readonly MailIcon = Mail;
  readonly GlobeIcon = Globe;

  readonly logoBroken = signal(false);
}
