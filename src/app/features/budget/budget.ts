import { DatePipe, LowerCasePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  adjustForInflation,
  BudgetData,
  categoryColor,
  CpiData,
  foldSmallCategories,
  latestActualYear,
  summarizeSpending,
} from '../../core/budget';
import { money, share, signedMoney, signedPercent } from '../../core/format';
import { DataMeta } from '../../core/ward';
import { Donut, DonutSlice } from '../../shared/donut';
import { Sparkline } from '../../shared/sparkline';
import { StatTile } from '../../shared/stat-tile';

/** "actual": dollars as spent. "real": past years restated in the latest year's dollars. */
export type DollarMode = 'actual' | 'real';

@Component({
  selector: 'app-budget',
  imports: [DatePipe, LowerCasePipe, Donut, Sparkline, StatTile],
  templateUrl: './budget.html',
  styleUrl: './budget.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Budget {
  private readonly data = httpResource<BudgetData>(() => 'data/budget.json');
  private readonly cpi = httpResource<CpiData>(() => 'data/cpi.json');
  private readonly meta = httpResource<DataMeta>(() => 'data/meta.json');

  protected readonly status = computed(() => this.data.status());

  /** Inflation-adjusted by default; falls back to actual dollars if the CPI is unavailable. */
  protected readonly mode = signal<DollarMode>('real');

  /** Budget restated in the latest year's dollars, or null if the CPI can't cover it. */
  private readonly realData = computed(() => {
    if (!this.data.hasValue() || !this.cpi.hasValue()) return null;
    const data = this.data.value();
    const year = latestActualYear(data);
    return year === undefined ? null : adjustForInflation(data, this.cpi.value().values, year);
  });

  protected readonly inflationAvailable = computed(() => this.realData() !== null);

  protected readonly summary = computed(() => {
    if (!this.data.hasValue()) return undefined;
    // Wait for the price index rather than flashing actual dollars first.
    if (this.mode() === 'real' && this.cpi.isLoading()) return undefined;
    const real = this.mode() === 'real' ? this.realData() : null;
    return summarizeSpending(real ?? this.data.value());
  });

  protected readonly isReal = computed(() => this.mode() === 'real' && this.inflationAvailable());

  /** Price change over the period, from the CPI, for the explanatory note. */
  protected readonly priceRise = computed(() => {
    const s = this.summary();
    if (!s || !this.cpi.hasValue()) return null;
    const v = this.cpi.value().values;
    const from = v[String(s.firstYear)];
    const to = v[String(s.year)];
    return from && to ? to / from - 1 : null;
  });

  /** One-line explanation of the current dollar mode. */
  protected readonly modeNote = computed(() => {
    const s = this.summary();
    if (!s) return '';
    if (!this.isReal()) return 'Dollars as spent each year, not adjusted for inflation.';
    const rise = this.priceRise();
    const prices =
      rise === null
        ? ''
        : ` (prices rose ${Math.round(rise * 100)}% from ${s.firstYear} to ${s.year})`;
    return (
      `Past years shown in ${s.year} dollars, using Statistics Canada's consumer price ` +
      `index for Toronto${prices}.`
    );
  });

  /** Ranked services with their colours; tiny ones folded into "Other". The table keeps them all. */
  protected readonly ranked = computed(() => {
    const s = this.summary();
    return s ? foldSmallCategories(s).map((c) => ({ ...c, color: categoryColor(c.line) })) : [];
  });

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

  /** Fastest-growing service since the first year (ignores the folded "Other"). */
  protected readonly fastest = computed(() =>
    this.ranked()
      .filter((c) => c.line !== 'Other' && c.change !== null)
      .reduce<ReturnType<typeof this.ranked>[number] | undefined>(
        (best, c) => (!best || (c.change ?? 0) > (best.change ?? 0) ? c : best),
        undefined,
      ),
  );

  /** Bars scale to the largest category so it fills the track. */
  protected readonly maxShare = computed(() => this.ranked()[0]?.share || 1);

  /** Service highlighted in both the donut and the list. */
  protected readonly active = signal<string | null>(null);

  protected readonly fetchedAt = computed(() => {
    if (!this.meta.hasValue()) return undefined;
    const s = this.meta.value().sources;
    return { budget: s['budget']?.fetchedAt, cpi: s['cpi']?.fetchedAt };
  });

  protected readonly money = money;
  protected readonly share = share;
  protected readonly signedMoney = signedMoney;
  protected readonly signedPercent = signedPercent;
  protected readonly cents = (fraction: number) => Math.round(fraction * 100);
  /** amount − baseline, or null without a baseline. */
  protected readonly delta = (amount: number, baseline: number | null) =>
    baseline === null ? null : amount - baseline;
}
