import { Component, HostListener, input, output } from '@angular/core';

/** Full-screen image preview. Usage: @if (url()) { <app-image-lightbox [url]="url()!" [caption]="…" (closed)="url.set(null)" /> } */
@Component({
  selector: 'app-image-lightbox',
  standalone: true,
  template: `
    <div
      class="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-3 bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="caption() || 'Xem ảnh'"
      (click)="closed.emit()"
    >
      <img
        [src]="url()"
        [alt]="caption() || 'Ảnh xem trước'"
        class="max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl"
        (click)="$event.stopPropagation()"
      />
      <div class="flex items-center gap-3 text-sm text-white" (click)="$event.stopPropagation()">
        @if (caption()) { <span class="opacity-90">{{ caption() }}</span> }
        <a [href]="url()" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 rounded-md border border-white/40 px-3 py-1.5 hover:bg-white/10">
          Mở ảnh gốc
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M14 4h6v6m0-6-9 9" /><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" /></svg>
        </a>
        <button type="button" (click)="closed.emit()" class="rounded-md border border-white/40 px-3 py-1.5 hover:bg-white/10">Đóng (Esc)</button>
      </div>
    </div>
  `,
})
export class ImageLightboxComponent {
  readonly url = input.required<string>();
  readonly caption = input<string>('');
  readonly closed = output<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closed.emit();
  }
}
