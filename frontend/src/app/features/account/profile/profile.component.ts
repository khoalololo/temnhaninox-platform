import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { UserProfile, VatProfile } from '../../../core/models/auth.models';
import { ButtonDirective } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonDirective],
  template: `
    <div class="max-w-5xl mx-auto px-4 py-8">
      <div class="mb-6">
        <div class="text-xs font-mono uppercase tracking-wider text-text-muted">Quản lý tài khoản</div>
        <h1 class="font-heading text-2xl font-bold text-text-primary">Hồ sơ liên hệ & Thông tin xuất hóa đơn VAT đỏ</h1>
      </div>

      @if (notice()) {
        <div class="mb-4 p-3 rounded-[6px] border border-success/50 bg-success/10 text-xs text-success font-medium">
          {{ notice() }}
        </div>
      }
      @if (error()) {
        <div class="mb-4 p-3 rounded-[6px] border border-danger/50 bg-danger/10 text-xs text-danger">
          {{ error() }}
        </div>
      }

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Personal / Contact Profile -->
        <div class="lg:col-span-5 industrial-card p-5 h-fit">
          <h2 class="font-heading text-sm font-bold text-text-primary uppercase tracking-wide border-b border-border pb-3 mb-4">
            1. Thông tin giao nhận mặc định
          </h2>

          <form (ngSubmit)="saveProfile()" class="space-y-3.5">
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">Email đăng nhập</label>
              <input
                type="text"
                [value]="profile()?.email || ''"
                disabled
                class="w-full bg-bg border border-border rounded-[6px] px-3 py-2 text-xs font-mono text-text-muted"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">Họ và tên *</label>
              <input
                type="text"
                [(ngModel)]="fullName"
                name="fullName"
                required
                class="industrial-input w-full px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">Số điện thoại nhận hàng</label>
              <input
                type="text"
                [(ngModel)]="phone"
                name="phone"
                pattern="^(0[0-9]{9}|\\+84[0-9]{9})$"
                placeholder="0912345678"
                class="industrial-input w-full px-3 py-2 text-sm font-sans tabular-nums"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">Địa chỉ giao hàng mặc định</label>
              <textarea
                rows="3"
                [(ngModel)]="defaultAddress"
                name="defaultAddress"
                placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành..."
                class="industrial-input w-full px-3 py-2 text-sm"
              ></textarea>
            </div>

            <button
              type="submit"
              [disabled]="savingProfile()"
              appButton
              variant="secondary"
              size="md"
              [fullWidth]="true"
            >
              {{ savingProfile() ? 'Đang lưu...' : 'Cập nhật hồ sơ' }}
            </button>
          </form>
        </div>

        <!-- Corporate Red VAT Profiles -->
        <div class="lg:col-span-7 industrial-card p-5">
          <div class="flex items-center justify-between border-b border-border pb-3 mb-4">
            <h2 class="font-heading text-sm font-bold text-text-primary uppercase tracking-wide">
              2. Danh sách pháp nhân xuất hóa đơn VAT (10%)
            </h2>
            <span class="text-[11px] font-mono text-text-muted">{{ vatProfiles().length }} hồ sơ</span>
          </div>

          <!-- Saved list -->
          @if (vatProfiles().length === 0) {
            <div class="p-4 border border-dashed border-border rounded-[6px] text-xs text-text-secondary mb-5 bg-bg">
              Chưa có thông tin công ty xuất hóa đơn VAT. Thêm mới bên dưới để tự động điền khi đặt hàng.
            </div>
          } @else {
            <div class="space-y-2.5 mb-6">
              @for (vp of vatProfiles(); track vp.id) {
                <div class="border border-border rounded-[6px] p-3 flex items-start justify-between gap-3 bg-bg">
                  <div class="text-xs space-y-1">
                    <div class="font-semibold text-text-primary flex items-center gap-2">
                      <span>{{ vp.companyName }}</span>
                      @if (vp.isDefault) {
                        <span class="tni-chip no-dot" data-tone="success">
                          Mặc định
                        </span>
                      }
                    </div>
                    <div class="font-mono tabular-nums text-text-secondary">MST: {{ vp.taxCode }}</div>
                    <div class="text-text-muted">{{ vp.companyAddress }}</div>
                  </div>
                  <button
                    type="button"
                    (click)="removeVat(vp.id)"
                    appButton
                    variant="danger"
                    size="xs"
                  >
                    Xóa
                  </button>
                </div>
              }
            </div>
          }

          <!-- Add new VAT profile -->
          <form (ngSubmit)="addVatProfile()" class="border-t border-border pt-4 space-y-3">
            <div class="text-xs font-semibold text-text-primary">Thêm thông tin công ty mới</div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-medium text-text-secondary mb-1">Tên công ty (theo GPKD) *</label>
                <input
                  type="text"
                  [(ngModel)]="newCompanyName"
                  name="newCompanyName"
                  required
                  placeholder="CÔNG TY TNHH CƠ KHÍ..."
                  class="industrial-input w-full px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label class="block text-[11px] font-medium text-text-secondary mb-1">Mã số thuế (MST) *</label>
                <input
                  type="text"
                  [(ngModel)]="newTaxCode"
                  name="newTaxCode"
                  required
                  pattern="^[0-9]{10}(-[0-9]{3})?$"
                  maxlength="14"
                  placeholder="0316892304"
                  class="industrial-input w-full px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>
            <div>
              <label class="block text-[11px] font-medium text-text-secondary mb-1">Địa chỉ đăng ký kinh doanh *</label>
              <input
                type="text"
                [(ngModel)]="newCompanyAddress"
                name="newCompanyAddress"
                required
                placeholder="Địa chỉ xuất hóa đơn đỏ..."
                class="industrial-input w-full px-3 py-2 text-xs"
              />
            </div>
            <div class="flex items-center justify-between pt-1">
              <label class="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                <input type="checkbox" [(ngModel)]="newIsDefault" name="newIsDefault" class="rounded border-border accent-accent" />
                <span>Đặt làm MST mặc định</span>
              </label>
              <button
                type="submit"
                [disabled]="savingVat()"
                appButton
                variant="primary"
                size="sm"
              >
                {{ savingVat() ? 'Đang thêm...' : '+ Lưu thông tin VAT' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
})
export class ProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);

  readonly profile = signal<UserProfile | null>(null);
  readonly vatProfiles = signal<VatProfile[]>([]);
  readonly notice = signal('');
  readonly error = signal('');
  readonly savingProfile = signal(false);
  readonly savingVat = signal(false);

  fullName = '';
  phone = '';
  defaultAddress = '';

  newCompanyName = '';
  newTaxCode = '';
  newCompanyAddress = '';
  newIsDefault = false;

  ngOnInit(): void {
    this.authService.getProfile().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.profile.set(res.data);
          this.fullName = res.data.fullName;
          this.phone = res.data.phone || '';
          this.defaultAddress = res.data.defaultAddress || '';
        }
      },
    });
    this.loadVatProfiles();
  }

  loadVatProfiles(): void {
    this.authService.getVatProfiles().subscribe({
      next: (res) => {
        if (res.success) {
          this.vatProfiles.set(res.data || []);
        }
      },
    });
  }

  saveProfile(): void {
    if (!this.fullName.trim()) return;
    if (this.phone.trim() && !/^(?:0\d{9}|\+84\d{9})$/.test(this.phone.trim())) {
      this.error.set('Số điện thoại không hợp lệ. Vui lòng nhập số Việt Nam bắt đầu bằng 0 hoặc +84.');
      return;
    }
    this.savingProfile.set(true);
    this.notice.set('');
    this.error.set('');

    this.authService
      .updateProfile({
        fullName: this.fullName.trim(),
        phone: this.phone.trim() || undefined,
        defaultAddress: this.defaultAddress.trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.savingProfile.set(false);
          if (res.success) {
            this.profile.set(res.data);
            this.notice.set('Đã cập nhật thông tin liên hệ.');
          }
        },
        error: (err) => {
          this.savingProfile.set(false);
          this.error.set(err?.error?.message || 'Cập nhật thất bại.');
        },
      });
  }

  addVatProfile(): void {
    if (!this.newCompanyName.trim() || !this.newTaxCode.trim() || !this.newCompanyAddress.trim()) {
      this.error.set('Vui lòng nhập đầy đủ Tên công ty, Mã số thuế và Địa chỉ.');
      return;
    }
    if (!/^\d{10}(-\d{3})?$/.test(this.newTaxCode.trim())) {
      this.error.set('Mã số thuế cần gồm 10 hoặc 13 chữ số.');
      return;
    }

    this.savingVat.set(true);
    this.notice.set('');
    this.error.set('');

    this.authService
      .createVatProfile({
        companyName: this.newCompanyName.trim(),
        taxCode: this.newTaxCode.trim(),
        companyAddress: this.newCompanyAddress.trim(),
        isDefault: this.newIsDefault,
      })
      .subscribe({
        next: (res) => {
          this.savingVat.set(false);
          if (res.success) {
            this.newCompanyName = '';
            this.newTaxCode = '';
            this.newCompanyAddress = '';
            this.newIsDefault = false;
            this.notice.set('Đã lưu hồ sơ xuất hóa đơn VAT.');
            this.loadVatProfiles();
          }
        },
        error: (err) => {
          this.savingVat.set(false);
          this.error.set(err?.error?.message || 'Không thể lưu thông tin VAT.');
        },
      });
  }

  removeVat(id: string): void {
    this.authService.deleteVatProfile(id).subscribe({
      next: () => {
        this.notice.set('Đã xóa hồ sơ VAT.');
        this.loadVatProfiles();
      },
    });
  }
}
