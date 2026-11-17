import { DOCUMENT } from '@angular/common';
import { computed, effect, inject, Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

/** Same key as the inline script in index.html that applies it before boot. */
export const THEME_STORAGE_KEY = 'theme';

function readStored(): Theme | null {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null; // storage blocked (private mode, sandboxed preview)
  }
}

function store(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Not persisted; the choice still applies for this visit.
  }
}

/**
 * Light/dark theme. Follows the OS setting until the viewer picks one, then
 * remembers their pick in this browser. Applied as <html data-theme="…">,
 * which the colour tokens in styles.scss key off.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly root = inject(DOCUMENT).documentElement;
  private readonly media =
    typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;

  private readonly system = signal<Theme>(this.media?.matches ? 'dark' : 'light');
  private readonly chosen = signal<Theme | null>(readStored());

  readonly theme = computed<Theme>(() => this.chosen() ?? this.system());

  constructor() {
    this.media?.addEventListener('change', (e) => this.system.set(e.matches ? 'dark' : 'light'));
    effect(() => {
      this.root.dataset['theme'] = this.theme();
    });
  }

  toggle(): void {
    const next: Theme = this.theme() === 'dark' ? 'light' : 'dark';
    this.chosen.set(next);
    store(next);
  }
}
