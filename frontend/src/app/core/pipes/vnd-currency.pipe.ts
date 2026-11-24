import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'vnd',
  standalone: true,
})
export class VndCurrencyPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '0 ₫';
    }
    return new Intl.NumberFormat('vi-VN').format(Math.round(value)) + ' ₫';
  }
}
