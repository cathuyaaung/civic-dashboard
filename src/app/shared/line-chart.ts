import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

const W = 720;
const H = 260;
const PAD = { top: 20, right: 22, bottom: 30, left: 64 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
/** Most x labels we draw; the rest are dropped so they never collide. */
const MAX_X_LABELS = 8;

export interface LinePoint {
  /** Axis label, e.g. "2025". */
  label: string;
  value: number;
}

interface Plotted extends LinePoint {
  x: number;
  y: number;
}

/**
 * Round tick values covering [min, max], and the domain they imply.
 * Levels (a population, a price) are plotted on their own range rather than
 * from zero, so the shape is readable; the axis labels say where it starts.
 */
function niceTicks(min: number, max: number, count = 4) {
  if (!(max > min)) {
    const v = min || 1;
    return { ticks: [v], lo: v * 0.95, hi: v * 1.05 };
  }
  const rough = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= rough) ?? 10 * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Number(v.toPrecision(12)));
  return { ticks, lo, hi };
}

/**
 * One measure over time as a line, with a hover crosshair and a tooltip.
 * A single series needs no legend — the heading names it. Two measures of
 * different scale get two of these, never one chart with two axes.
 */
@Component({
  selector: 'app-line-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.viewBox]="'0 0 ' + W + ' ' + H"
      role="img"
      [attr.aria-label]="ariaLabel()"
      (pointermove)="onPointerMove($event)"
      (pointerleave)="hovered.set(null)"
    >
      <!-- Gridlines sit behind the data and stay recessive. -->
      @for (t of yTicks(); track t.value) {
        <line
          class="grid"
          [attr.x1]="PAD.left"
          [attr.x2]="W - PAD.right"
          [attr.y1]="t.y"
          [attr.y2]="t.y"
        />
        <text class="tick y" [attr.x]="PAD.left - 10" [attr.y]="t.y + 4">{{ t.text }}</text>
      }

      @for (p of xLabels(); track p.label) {
        <text class="tick x" [attr.x]="p.x" [attr.y]="H - PAD.bottom + 20">{{ p.label }}</text>
      }

      <polyline class="line" [attr.points]="linePoints()" />

      @if (hoverPoint(); as h) {
        <line
          class="cross"
          [attr.x1]="h.x"
          [attr.x2]="h.x"
          [attr.y1]="PAD.top"
          [attr.y2]="H - PAD.bottom"
        />
        <circle class="dot" [attr.cx]="h.x" [attr.cy]="h.y" r="5" />
      } @else if (endPoint(); as e) {
        <circle class="dot" [attr.cx]="e.x" [attr.cy]="e.y" r="5" />
        <text class="end-label" [attr.x]="W - PAD.right" [attr.y]="endLabelY()">
          {{ format()(e.value) }}
        </text>
      }
    </svg>

    @if (hoverPoint(); as h) {
      <div class="tip" [style.left.%]="(h.x / W) * 100" role="status">
        <strong>{{ format()(h.value) }}</strong>
        <span class="tip-label">· {{ h.label }}</span>
      </div>
    }
  `,
  styles: `
    :host {
      position: relative;
      display: block;
    }
    svg {
      display: block;
      width: 100%;
      /* The viewBox sets the aspect ratio, so the text is never stretched. */
      height: auto;
      overflow: visible;
      touch-action: pan-y;
    }
    .grid {
      stroke: var(--border);
      stroke-width: 1;
    }
    .tick {
      fill: var(--muted);
      font-size: 12px;
    }
    .tick.y {
      text-anchor: end;
    }
    .tick.x {
      text-anchor: middle;
    }
    .line {
      fill: none;
      stroke: var(--accent);
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      vector-effect: non-scaling-stroke;
    }
    .cross {
      stroke: var(--muted);
      stroke-width: 1;
      stroke-dasharray: 3 3;
    }
    .dot {
      fill: var(--accent);
      /* A surface ring keeps the marker legible over the line. */
      stroke: var(--surface);
      stroke-width: 2;
    }
    .end-label {
      fill: var(--text);
      font-size: 12px;
      font-weight: 600;
      text-anchor: end;
    }
    .tip {
      position: absolute;
      top: -0.25rem;
      transform: translateX(-50%);
      padding: 0.25rem 0.5rem;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--surface);
      color: var(--text);
      font-size: 0.8125rem;
      white-space: nowrap;
      pointer-events: none;
    }
    .tip-label {
      color: var(--muted);
    }
  `,
})
export class LineChart {
  readonly points = input.required<readonly LinePoint[]>();
  /** Formats values for the tooltip, the end label and the y axis. */
  readonly format = input.required<(value: number) => string>();
  readonly ariaLabel = input('');

  protected readonly W = W;
  protected readonly H = H;
  protected readonly PAD = PAD;

  protected readonly hovered = signal<number | null>(null);

  private readonly scale = computed(() => {
    const values = this.points().map((p) => p.value);
    return niceTicks(Math.min(...values), Math.max(...values));
  });

  protected readonly plotted = computed<Plotted[]>(() => {
    const points = this.points();
    const { lo, hi } = this.scale();
    const span = hi - lo || 1;
    const step = points.length > 1 ? PLOT_W / (points.length - 1) : 0;
    return points.map((p, i) => ({
      ...p,
      x: PAD.left + (points.length > 1 ? i * step : PLOT_W / 2),
      y: PAD.top + PLOT_H - ((p.value - lo) / span) * PLOT_H,
    }));
  });

  protected readonly linePoints = computed(() =>
    this.plotted()
      .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' '),
  );

  protected readonly yTicks = computed(() => {
    const { ticks, lo, hi } = this.scale();
    const span = hi - lo || 1;
    const format = this.format();
    return ticks.map((value) => ({
      value,
      y: PAD.top + PLOT_H - ((value - lo) / span) * PLOT_H,
      text: format(value),
    }));
  });

  /** First and last always get a label; the middle thins out to avoid collisions. */
  protected readonly xLabels = computed(() => {
    const points = this.plotted();
    const stride = Math.max(1, Math.ceil(points.length / MAX_X_LABELS));
    return points.filter((_, i) => i % stride === 0 || i === points.length - 1);
  });

  protected readonly endPoint = computed(() => this.plotted().at(-1));

  /** Nudge the end label below the line when the series ends up high. */
  protected readonly endLabelY = computed(() => {
    const end = this.endPoint();
    if (!end) return PAD.top;
    return end.y < PAD.top + 24 ? end.y + 20 : end.y - 12;
  });

  protected readonly hoverPoint = computed(() => {
    const i = this.hovered();
    return i === null ? undefined : this.plotted()[i];
  });

  protected onPointerMove(event: PointerEvent): void {
    const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
    if (!rect.width) return;
    const x = ((event.clientX - rect.left) / rect.width) * W;
    const points = this.plotted();
    if (!points.length) return;
    let nearest = 0;
    for (let i = 1; i < points.length; i++) {
      if (Math.abs(points[i].x - x) < Math.abs(points[nearest].x - x)) nearest = i;
    }
    this.hovered.set(nearest);
  }
}
