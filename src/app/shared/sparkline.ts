import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

const W = 120;
const H = 32;
const PAD = 4; // room for the end dot and its ring

/**
 * A small trend line with a hover crosshair. Each sparkline scales to its own
 * min–max, so it shows shape, not magnitude — pair it with a labelled change.
 */
@Component({
  selector: 'app-sparkline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="W"
      [attr.height]="H"
      [attr.viewBox]="'0 0 ' + W + ' ' + H"
      role="img"
      [attr.aria-label]="ariaLabel()"
      (pointermove)="onPointerMove($event)"
      (pointerleave)="hovered.set(null)"
    >
      <polyline class="line" [attr.points]="points()" />
      @if (hoverPoint(); as h) {
        <line class="cross" [attr.x1]="h.x" [attr.x2]="h.x" y1="0" [attr.y2]="H" />
        <circle class="dot" [attr.cx]="h.x" [attr.cy]="h.y" r="4" />
      } @else if (endPoint(); as e) {
        <circle class="dot" [attr.cx]="e.x" [attr.cy]="e.y" r="4" />
      }
    </svg>
    @if (hoverPoint(); as h) {
      <div class="tip" [style.left.px]="h.x" role="status">
        <strong>{{ format()(h.value) }}</strong> {{ h.label }}
      </div>
    }
  `,
  styles: `
    :host {
      position: relative;
      display: inline-block;
      line-height: 0;
    }
    svg {
      overflow: visible;
      touch-action: none;
      cursor: crosshair;
    }
    .line {
      fill: none;
      stroke: var(--muted);
      stroke-width: 2;
      stroke-linejoin: round;
      stroke-linecap: round;
    }
    .cross {
      stroke: var(--border);
      stroke-width: 1;
    }
    .dot {
      fill: var(--accent);
      stroke: var(--bg);
      stroke-width: 2;
    }
    .tip {
      position: absolute;
      bottom: calc(100% + 6px);
      transform: translateX(-50%);
      padding: 0.25rem 0.5rem;
      border: 1px solid var(--border);
      border-radius: 4px;
      background: var(--bg);
      font-size: 0.75rem;
      line-height: 1.3;
      white-space: nowrap;
      pointer-events: none;
      z-index: 1;
    }
  `,
})
export class Sparkline {
  readonly values = input.required<(number | null)[]>();
  /** One label per value, e.g. the year. */
  readonly labels = input.required<(string | number)[]>();
  readonly format = input<(v: number) => string>((v) => v.toLocaleString());
  readonly ariaLabel = input('');

  protected readonly W = W;
  protected readonly H = H;
  protected readonly hovered = signal<number | null>(null);

  private readonly coords = computed(() => {
    const vals = this.values();
    const present = vals.filter((v): v is number => v !== null);
    const min = Math.min(...present);
    const max = Math.max(...present);
    const span = max - min || 1;
    const step = vals.length > 1 ? (W - 2 * PAD) / (vals.length - 1) : 0;
    return vals.map((v, i) =>
      v === null
        ? null
        : { x: PAD + i * step, y: PAD + (1 - (v - min) / span) * (H - 2 * PAD), value: v },
    );
  });

  protected readonly points = computed(() =>
    this.coords()
      .filter((c) => c !== null)
      .map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`)
      .join(' '),
  );

  protected readonly endPoint = computed(() => this.coords().findLast((c) => c !== null) ?? null);

  protected readonly hoverPoint = computed(() => {
    const i = this.hovered();
    const c = i === null ? null : this.coords()[i];
    return c && i !== null ? { ...c, label: this.labels()[i] } : null;
  });

  protected onPointerMove(event: PointerEvent): void {
    const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
    const n = this.values().length;
    const t = (event.clientX - rect.left - PAD) / (rect.width - 2 * PAD);
    this.hovered.set(Math.min(n - 1, Math.max(0, Math.round(t * (n - 1)))));
  }
}
