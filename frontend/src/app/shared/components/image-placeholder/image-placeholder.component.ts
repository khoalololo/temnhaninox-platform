import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ImageOff } from 'lucide-angular';

@Component({
  selector: 'app-image-placeholder',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div
      class="w-full h-full flex flex-col items-center justify-center gap-1.5 px-3 py-4 text-center select-none bg-bg"
      style="background-image: repeating-linear-gradient(-45deg, var(--color-hatch) 0, var(--color-hatch) 1px, transparent 1px, transparent 10px);"
    >
      <div class="w-9 h-9 rounded-[6px] border border-border bg-surface flex items-center justify-center text-text-muted">
        <lucide-icon [img]="ImageOffIcon" [size]="18" [strokeWidth]="1.75" />
      </div>
      @if (sku) {
        <span class="font-mono text-[11px] font-medium text-text-secondary tracking-wider uppercase">
          {{ sku }}
        </span>
      }
      <span class="font-mono text-[11px] text-text-muted">
        {{ label || 'Chưa có ảnh' }}
      </span>
    </div>
  `,
})
export class ImagePlaceholderComponent {
  @Input() sku?: string;
  @Input() label = 'Chưa có ảnh';

  readonly ImageOffIcon = ImageOff;
}
