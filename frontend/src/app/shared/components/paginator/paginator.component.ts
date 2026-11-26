import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonDirective } from '../button/button.component';

@Component({
  selector: 'app-paginator',
  standalone: true,
  imports: [CommonModule, ButtonDirective],
  template: `
    @if (totalPages > 1) {
      <nav
        aria-label="Phân trang"
        class="mt-6 flex flex-wrap items-center justify-center gap-1.5 text-xs font-sans tabular-nums"
      >
        <button
          type="button"
          [disabled]="page <= 0"
          (click)="selectPage(page - 1)"
          appButton
          variant="secondary"
          size="sm"
        >
          ← Trước
        </button>

        @for (p of visiblePages(); track p) {
          @if (p === -1) {
            <span class="px-2 text-text-muted">…</span>
          } @else {
            <button
              type="button"
              (click)="selectPage(p)"
              class="min-w-[32px] h-8 px-2.5 rounded-[6px] border font-semibold transition-colors"
              [class]="
                p === page
                  ? 'bg-accent text-white border-accent'
                  : 'bg-surface text-text-primary border-border hover:border-accent hover:text-accent'
              "
            >
              {{ p + 1 }}
            </button>
          }
        }

        <button
          type="button"
          [disabled]="page + 1 >= totalPages"
          (click)="selectPage(page + 1)"
          appButton
          variant="secondary"
          size="sm"
        >
          Sau →
        </button>
      </nav>
    }
  `,
})
export class PaginatorComponent {
  @Input() page = 0;
  @Input() totalPages = 0;
  @Output() pageChange = new EventEmitter<number>();

  selectPage(next: number): void {
    if (next < 0 || next >= this.totalPages || next === this.page) return;
    this.pageChange.emit(next);
  }

  visiblePages(): number[] {
    if (this.totalPages <= 7) {
      return Array.from({ length: this.totalPages }, (_, i) => i);
    }
    const pages: number[] = [0];
    const start = Math.max(1, this.page - 1);
    const end = Math.min(this.totalPages - 2, this.page + 1);
    if (start > 1) pages.push(-1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < this.totalPages - 2) pages.push(-1);
    pages.push(this.totalPages - 1);
    return pages;
  }
}
