import { Component, Injectable, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

export interface ToastMessage {
  id: number;
  message: string;
  title: string;
  type: 'success' | 'error';
  action: 'cart' | null;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  readonly messages = signal<ToastMessage[]>([]);

  show(
    message: string,
    type: ToastMessage['type'] = 'success',
    title?: string,
    action: ToastMessage['action'] = null,
  ): void {
    const toast = {
      id: ++this.nextId,
      message,
      title: title ?? (type === 'success' ? 'Thành công' : 'Có lỗi xảy ra'),
      type,
      action,
    };
    this.messages.update((messages) => [...messages, toast]);
    window.setTimeout(() => this.dismiss(toast.id), 4000);
  }

  dismiss(id: number): void {
    this.messages.update((messages) => messages.filter((message) => message.id !== id));
  }
}

@Component({
  selector: 'app-toast-viewport',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="fixed inset-x-0 bottom-4 z-[100] flex justify-center px-4 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[min(26rem,calc(100vw-3rem))] sm:px-0" aria-live="polite">
      @for (toast of toastService.messages(); track toast.id) {
        <div
          class="toast-enter w-full overflow-hidden rounded-[10px] border border-border bg-bg-elevated text-text-primary shadow-2xl ring-1 ring-black/5"
          [attr.role]="toast.type === 'error' ? 'alert' : 'status'"
          [attr.aria-live]="toast.type === 'error' ? 'assertive' : 'polite'"
        >
          <div class="h-1 w-full" [ngClass]="toast.type === 'success' ? 'bg-accent' : 'bg-danger'"></div>
          <div class="flex items-start gap-3.5 p-4">
            <span
              class="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px]"
              [ngClass]="toast.type === 'success' ? 'bg-accent/10 text-accent' : 'bg-danger/10 text-danger'"
            >
              @if (toast.type === 'success') {
                <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M3 4h2l2.2 10.1a2 2 0 0 0 2 1.6h8.5a2 2 0 0 0 1.9-1.4L21 8H6" />
                  <circle cx="10" cy="19" r="1.3" />
                  <circle cx="18" cy="19" r="1.3" />
                </svg>
              } @else {
                <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7.5v5.5m0 3h.01" />
                </svg>
              }
            </span>
            <span class="min-w-0 flex-1 pt-0.5">
              <span class="block text-sm font-bold text-text-primary">{{ toast.title }}</span>
              <span class="mt-1 block text-sm leading-5 text-text-secondary">{{ toast.message }}</span>
              @if (toast.action === 'cart') {
                <a
                  routerLink="/cart"
                  (click)="toastService.dismiss(toast.id)"
                  class="mt-3 inline-flex min-h-9 items-center rounded-[6px] bg-accent px-3.5 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-accent-hover"
                >
                  Xem giỏ hàng
                </a>
              }
            </span>
            <button
              type="button"
              (click)="toastService.dismiss(toast.id)"
              class="rounded-[6px] p-1 text-text-muted transition-colors hover:bg-surface hover:text-text-primary"
              aria-label="Đóng thông báo"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-enter {
      animation: fadeSlideUp 1500ms cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    @media (prefers-reduced-motion: reduce) {
      .toast-enter {
        animation: none;
      }
    }
  `],
})
export class ToastViewportComponent {
  constructor(readonly toastService: ToastService) {}
}
