import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { animate, query, style, transition, trigger } from '@angular/animations';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { ThemeService } from './core/services/theme.service';

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const routeFadeAnimation = trigger('routeFade', [
  transition('* <=> *', [
    query(
      ':enter',
      [
        style({ opacity: 0 }),
        animate(
          prefersReducedMotion() ? '0ms' : '180ms ease',
          style({ opacity: 1 })
        ),
      ],
      { optional: true }
    ),
  ]),
]);

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent],
  animations: [routeFadeAnimation],
  template: `
    <div class="min-h-screen flex flex-col bg-bg text-text-primary font-body">
      <app-navbar />
      <main class="flex-1" [@routeFade]="getRouteState(outlet)">
        <router-outlet #outlet="outlet" />
      </main>
      <app-footer />
    </div>
  `,
})
export class AppComponent {
  // Eagerly initialize theme signal & data-theme attribute on app boot
  private readonly _theme = inject(ThemeService);

  getRouteState(outlet: RouterOutlet): string {
    return outlet.isActivated ? outlet.activatedRoute.snapshot.url.join('/') || 'home' : '';
  }
}
