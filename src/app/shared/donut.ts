import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

export interface DonutSlice {
  id: string;
  label: string;
  value: number;
  /** CSS colour for the slice. */
  color: string;
  /** Colour for the percentage printed inside the slice. */
  ink: string;
}

const SIZE = 260;
const C = SIZE / 2;
const R_OUT = 124;
const R_IN = 80;
/** Slices narrower than this (radians, ≈ 20°) get no inside label. */
const MIN_LABEL_ANGLE = 0.35;

const point = (r: number, a: number) => [C + r * Math.cos(a), C + r * Math.sin(a)] as const;

/** SVG path for one ring segment from angle a0 to a1 (radians, 0 = 3 o'clock). */
export function arcPath(a0: number, a1: number, rOut = R_OUT, rIn = R_IN): string {
  // A full circle can't be drawn as one arc; stop just short of it.
  const end = a1 - a0 >= 2 * Math.PI ? a0 + 2 * Math.PI - 1e-4 : a1;
  const large = end - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = point(rOut, a0);
  const [x1, y1] = point(rOut, end);
  const [x2, y2] = point(rIn, end);
  const [x3, y3] = point(rIn, a0);
  const f = (n: number) => n.toFixed(2);
  return (
    `M${f(x0)},${f(y0)} A${rOut},${rOut} 0 ${large} 1 ${f(x1)},${f(y1)} ` +
    `L${f(x2)},${f(y2)} A${rIn},${rIn} 0 ${large} 0 ${f(x3)},${f(y3)} Z`
  );
}

/**
 * Part-to-whole donut. Slices run clockwise from 12 o'clock in the order
 * given. The centre shows the total, or the hovered/focused slice. `active`
 * is two-way bindable so a list elsewhere on the page can drive and follow it.
 */
@Component({
  selector: 'app-donut',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.viewBox]="'0 0 ' + SIZE + ' ' + SIZE" role="group" [attr.aria-label]="ariaLabel()">
      @for (a of arcs(); track a.id) {
        <path
          [attr.d]="a.d"
          [style.fill]="a.color"
          [class.dim]="active() !== null && active() !== a.id"
          tabindex="0"
          role="img"
          [attr.aria-label]="a.aria"
          (pointerenter)="active.set(a.id)"
          (pointerleave)="active.set(null)"
          (focus)="active.set(a.id)"
          (blur)="active.set(null)"
        />
      }
      @for (a of arcs(); track a.id) {
        @if (a.showLabel) {
          <text
            class="pct"
            [attr.x]="a.lx"
            [attr.y]="a.ly"
            [style.fill]="a.ink"
            [class.dim]="active() !== null && active() !== a.id"
            aria-hidden="true"
          >
            {{ a.pct }}
          </text>
        }
      }
      <g class="centre" aria-hidden="true">
        <text class="c-value" [attr.x]="C" [attr.y]="C - 4">{{ centre().value }}</text>
        <text class="c-label" [attr.x]="C" [attr.y]="C + 18">{{ centre().label }}</text>
        @if (centre().detail; as d) {
          <text class="c-label" [attr.x]="C" [attr.y]="C + 36">{{ d }}</text>
        }
      </g>
    </svg>
  `,
  styles: `
    :host {
      display: block;
      max-width: 260px;
    }
    svg {
      display: block;
      width: 100%;
      height: auto;
      overflow: visible;
    }
    path {
      stroke: var(--bg);
      stroke-width: 2;
      stroke-linejoin: round;
      cursor: pointer;
      transition: opacity 0.15s;
      outline: none;
    }
    path:focus-visible {
      stroke: var(--text);
    }
    .dim {
      opacity: 0.3;
    }
    .pct {
      font-size: 13px;
      font-weight: 600;
      text-anchor: middle;
      dominant-baseline: central;
      pointer-events: none;
      transition: opacity 0.15s;
    }
    .centre text {
      text-anchor: middle;
      fill: var(--text);
    }
    .c-value {
      font-size: 30px;
      font-weight: 600;
    }
    .c-label {
      font-size: 12px;
      fill: var(--muted) !important;
    }
  `,
})
export class Donut {
  readonly slices = input.required<DonutSlice[]>();
  readonly centreValue = input('');
  readonly centreLabel = input('');
  readonly format = input<(v: number) => string>((v) => v.toLocaleString());
  readonly ariaLabel = input('');
  /** Id of the highlighted slice; two-way bindable. */
  readonly active = model<string | null>(null);

  protected readonly SIZE = SIZE;
  protected readonly C = C;

  private readonly total = computed(() =>
    this.slices().reduce((s, x) => s + Math.max(0, x.value), 0),
  );

  protected readonly arcs = computed(() => {
    const total = this.total() || 1;
    let a = -Math.PI / 2; // 12 o'clock
    return this.slices().map((s) => {
      const share = Math.max(0, s.value) / total;
      const a0 = a;
      const a1 = a + share * 2 * Math.PI;
      a = a1;
      const [lx, ly] = point((R_OUT + R_IN) / 2, (a0 + a1) / 2);
      const pct = `${Math.round(share * 100)}%`;
      return {
        id: s.id,
        d: arcPath(a0, a1),
        color: s.color,
        ink: s.ink,
        showLabel: a1 - a0 >= MIN_LABEL_ANGLE,
        lx: lx.toFixed(1),
        ly: ly.toFixed(1),
        pct,
        share,
        aria: `${s.label}: ${this.format()(s.value)}, ${(share * 100).toFixed(1)}%`,
      };
    });
  });

  protected readonly centre = computed(() => {
    const id = this.active();
    const slice = id === null ? undefined : this.slices().find((s) => s.id === id);
    if (!slice) return { value: this.centreValue(), label: this.centreLabel(), detail: '' };
    const share = (Math.max(0, slice.value) / (this.total() || 1)) * 100;
    return {
      value: this.format()(slice.value),
      label: slice.label,
      detail: `${share < 0.1 && share > 0 ? '<0.1' : share.toFixed(1)}% of total`,
    };
  });
}
