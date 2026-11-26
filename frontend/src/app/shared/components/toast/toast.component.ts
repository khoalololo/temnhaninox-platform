import { Component, Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  readonly messages = signal<ToastMessage[]>([]);

  show(message: string, type: ToastMessage['type'] = 'success'): void {
    const toast = { id: ++this.nextId, message, type };
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
  template: `
    <div class="fixed right-4 top-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
      @for (toast of toastService.messages(); track toast.id) {
        <div
          class="flex items-start justify-between gap-3 rounded-[6px] border bg-bg-elevated p-3 text-sm shadow-card-hover"
          [class]="toast.type === 'error' ? 'border-danger text-danger' : 'border-success text-success'"
          role="status"
        >
          <span>{{ toast.message }}</span>
          <button type="button" (click)="toastService.dismiss(toast.id)" [attr.aria-label]="'Đóng thông báo'">×</button>
        </div>
      }
    </div>
  `,
})
export class ToastViewportComponent {
  constructor(readonly toastService: ToastService) {}
}
