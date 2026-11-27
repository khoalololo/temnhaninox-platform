import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-paginator',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (totalPages > 1) {
      <nav
        aria-label="Phân trang"
        class="pagination-bar flex items-center justify-between gap-3 px-4 py-4 text-sm font-sans tabular-nums"
      >
        <button type="button" class="pagination-step" [disabled]="page <= 0" (click)="selectPage(page - 1)">
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M19 12H5m0 0 6 6m-6-6 6-6" /></svg><span class="hidden sm:inline">Trước</span>
        </button>
        <ol class="flex items-center justify-center gap-1.5 overflow-x-auto px-1" aria-label="Trang">
          @for (p of visiblePages(); track $index) {
            @if (p === -1) {
              <li class="px-1 text-text-muted" aria-hidden="true">…</li>
            } @else {
              <li>
                <button
                  type="button"
                  (click)="selectPage(p)"
                  class="pagination-number"
                  [class.pagination-number-current]="p === page"
                  [attr.aria-current]="p === page ? 'page' : null"
                  [attr.aria-label]="'Trang ' + (p + 1)"
                >
                  {{ p + 1 }}
                </button>
              </li>
            }
          }
        </ol>
        <button type="button" class="pagination-step" [disabled]="page + 1 >= totalPages" (click)="selectPage(page + 1)">
          <span class="hidden sm:inline">Sau</span><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12h14m0 0-6-6m6 6-6 6" /></svg>
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
