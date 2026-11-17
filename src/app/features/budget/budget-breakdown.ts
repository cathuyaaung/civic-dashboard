import { LowerCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { BudgetSummary, categoryColor, foldSmallCategories } from '../../core/budget';
import { money, share, signedMoney, signedPercent } from '../../core/format';
import { Donut, DonutSlice } from '../../shared/donut';
import { InfoTip } from '../../shared/info-tip';
import { Sparkline } from '../../shared/sparkline';
import { StatTile } from '../../shared/stat-tile';

export type BreakdownKind = 'spending' | 'revenue';

const TEXT = {
  spending: {
    noun: 'Spending',
    item: 'Service',
    centre: 'spent in',
    verb: 'goes to',
    whole: 'spending by service',
    items: 'service',
  },
  revenue: {
    noun: 'Revenue',
    item: 'Source',
    centre: 'received in',
    verb: 'comes from',
    whole: 'revenue by source',
    items: 'source',
  },
} as const;

/**
 * One side of the budget — where money goes or where it comes from — as a
 * donut with a headline and stat tiles, ranked bars with trends, and a
 * year-by-year table. Hovering a row or a slice highlights both.
 */
@Component({
  selector: 'app-budget-breakdown',
  imports: [LowerCasePipe, Donut, InfoTip, Sparkline, StatTile],
  templateUrl: './budget-breakdown.html',
  styleUrl: './budget-breakdown.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetBreakdown {
  readonly summary = input.required<BudgetSummary>();
  readonly kind = input.required<BreakdownKind>();
  /** True when amounts are inflation-adjusted; only changes labels. */
  readonly isReal = input(false);
  /** Short qualifier shown after the heading, e.g. "cash only". */
  readonly qualifier = input('');
  /** Optional one-or-two-sentence explanation behind an ⓘ next to the heading. */
  readonly info = input('');

  protected readonly text = computed(() => TEXT[this.kind()]);
  protected readonly afterInflation = computed(() => (this.isReal() ? ', after inflation' : ''));

  /** Ranked rows with colours; tiny ones folded into "Other". The table keeps them all. */
  protected readonly ranked = computed(() =>
    foldSmallCategories(this.summary()).map((c) => ({ ...c, color: categoryColor(c.line) })),
  );

  protected readonly slices = computed<DonutSlice[]>(() =>
    this.ranked().map((c) => ({
      id: c.line,
      // The donut centre is narrow; "Other (health, …)" is spelled out in the list.
      label: c.line === 'Other' ? 'Other' : c.label,
      value: c.amount,
      color: c.color.fill,
      ink: c.color.ink,
    })),
  );

  protected readonly top = computed(() => this.ranked()[0]);

  /**
   * The second tile. Spending: the fastest-growing service. Revenue: property
   * taxes — what residents pay directly, and steadier than the development
   * charge lines, whose percentage swings off a small 2012 base mean little.
   */
  protected readonly focus = computed(() => {
    const rows = this.ranked();
    if (this.kind() === 'revenue') {
      const tax = rows.find((c) => c.line === 'Property taxes');
      return tax ? { label: `Property taxes since ${this.summary().firstYear}`, row: tax } : null;
    }
    const fastest = rows
      .filter((c) => c.line !== 'Other' && c.change !== null)
      .reduce<(typeof rows)[number] | undefined>(
        (best, c) => (!best || (c.change ?? 0) > (best.change ?? 0) ? c : best),
        undefined,
      );
    return fastest ? { label: 'Fastest growing', row: fastest } : null;
  });

  protected readonly caption = computed(
    () =>
      `${this.text().noun}, ` +
      (this.isReal()
        ? `millions of ${this.summary().year} dollars (adjusted for inflation)`
        : 'millions of dollars as recorded each year'),
  );

  /** Bars scale to the largest row so it fills the track. */
  protected readonly maxShare = computed(() => this.ranked()[0]?.share || 1);

  /** Row highlighted in both the donut and the list. */
  protected readonly active = signal<string | null>(null);

  protected readonly money = money;
  protected readonly share = share;
  protected readonly signedMoney = signedMoney;
  protected readonly signedPercent = signedPercent;
  protected readonly cents = (fraction: number) => Math.round(fraction * 100);
  /** amount − baseline, or null without a baseline. */
  protected readonly delta = (amount: number, baseline: number | null) =>
    baseline === null ? null : amount - baseline;
}
