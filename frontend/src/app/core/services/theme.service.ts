import { Injectable, effect, signal } from '@angular/core';

export type ThemeMode = 'dark' | 'light';

const STORAGE_KEY = 'tni_theme_v2';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<ThemeMode>(this.readStoredTheme());

  constructor() {
    effect(() => {
      const current = this.theme();
      if (typeof document !== 'undefined') {
        document.documentElement.dataset['theme'] = current;
      }
      try {
        localStorage.setItem(STORAGE_KEY, current);
      } catch {
        // Ignore storage errors
      }
    });
  }

  toggle(): void {
    this.theme.update((t) => (t === 'light' ? 'dark' : 'light'));
  }

  setTheme(mode: ThemeMode): void {
    this.theme.set(mode);
  }

  private readStoredTheme(): ThemeMode {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    } catch {
      // Ignore storage errors
    }
    return 'light';
  }
}
