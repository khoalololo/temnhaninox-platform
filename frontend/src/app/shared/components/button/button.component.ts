import { Component, Directive, HostBinding, Input, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { cva, type VariantProps } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-[6px] font-body transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-45 disabled:pointer-events-none select-none cursor-pointer whitespace-nowrap',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-white hover:bg-accent-hover border border-transparent font-semibold tracking-wide',
        secondary: 'bg-transparent text-accent border border-accent hover:bg-accent/10 hover:border-accent-hover hover:text-accent-hover font-semibold',
        ghost: 'bg-transparent text-text-secondary border border-transparent hover:text-accent hover:bg-surface-raised font-medium',
        danger: 'bg-transparent text-danger border border-danger/60 hover:bg-danger/10 font-medium',
      },
      size: {
        xs: 'px-3 py-1.5 text-xs',
        sm: 'px-3.5 py-2 text-xs sm:text-sm',
        md: 'px-4 py-2.5 text-sm',
        lg: 'px-6 py-3 text-sm sm:text-base',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
);

export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>;
export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>;

@Directive({
  selector: 'button[appButton], a[appButton]',
  standalone: true,
})
export class ButtonDirective {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly fullWidth = input<boolean>(false);

  @Input('class') userClass = '';

  @HostBinding('class')
  get computedClass(): string {
    const base = buttonVariants({
      variant: this.variant(),
      size: this.size(),
      fullWidth: this.fullWidth(),
    });
    return this.userClass ? `${base} ${this.userClass}` : base;
  }
}

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type()"
      [disabled]="disabled()"
      [class]="classes()"
    >
      <ng-content />
    </button>
  `,
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly fullWidth = input<boolean>(false);
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input<boolean>(false);
  readonly extraClass = input<string>('');

  readonly classes = computed(() => {
    const base = buttonVariants({
      variant: this.variant(),
      size: this.size(),
      fullWidth: this.fullWidth(),
    });
    return this.extraClass() ? `${base} ${this.extraClass()}` : base;
  });
}
