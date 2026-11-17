import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  adjustForInflation,
  BudgetData,
  CpiData,
  latestActualYear,
  summarizeRevenue,
  summarizeSpending,
} from '../../core/budget';
import { money } from '../../core/format';
import { DataMeta } from '../../core/ward';
import { BudgetBreakdown } from './budget-breakdown';

/** "actual": dollars as recorded. "real": past years restated in the latest year's dollars. */
export type DollarMode = 'actual' | 'real';

@Component({
  selector: 'app-budget',
  imports: [DatePipe, BudgetBreakdown],
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
  protected readonly isReal = computed(() => this.mode() === 'real' && this.inflationAvailable());

  /** The data in the selected dollars; undefined while the CPI is still loading. */
  private readonly shown = computed(() => {
    if (!this.data.hasValue()) return undefined;
    // Wait for the price index rather than flashing actual dollars first.
    if (this.mode() === 'real' && this.cpi.isLoading()) return undefined;
    return (this.mode() === 'real' ? this.realData() : null) ?? this.data.value();
  });

  protected readonly spending = computed(() => {
    const d = this.shown();
    return d ? summarizeSpending(d) : undefined;
  });

  protected readonly revenue = computed(() => {
    const d = this.shown();
    const r = d ? summarizeRevenue(d) : undefined;
    return r?.categories.length ? r : undefined; // no revenue lines → no section
  });

  /** Price change over the period, from the CPI, for the explanatory note. */
  protected readonly priceRise = computed(() => {
    const s = this.spending();
    if (!s || !this.cpi.hasValue()) return null;
    const v = this.cpi.value().values;
    const from = v[String(s.firstYear)];
    const to = v[String(s.year)];
    return from && to ? to / from - 1 : null;
  });

  /** Short qualifier beside the switch: what the numbers are in. */
  protected readonly modeNote = computed(() => {
    const s = this.spending();
    if (!s) return '';
    if (!this.isReal()) return 'Dollars as recorded each year';
    const rise = this.priceRise();
    return rise === null
      ? `In ${s.year} dollars`
      : `In ${s.year} dollars · prices rose ${Math.round(rise * 100)}% since ${s.firstYear}`;
  });

  /**
   * Money in vs money out for the latest year, scaled to the larger of the two.
   * The difference is drawn, not footnoted.
   */
  protected readonly flow = computed(() => {
    const s = this.spending();
    const r = this.revenue();
    if (!s || !r) return undefined;
    const max = Math.max(s.total, r.total) || 1;
    const diff = r.total - s.total;
    return {
      year: s.year,
      in: r.total,
      out: s.total,
      diff,
      inPct: (r.total / max) * 100,
      outPct: (s.total / max) * 100,
      gapPct: (Math.abs(diff) / max) * 100,
    };
  });

  /** Why revenue says "cash only" — behind an ⓘ, not a footnote. */
  protected readonly nonCashInfo = computed(() => {
    const r = this.revenue();
    if (!r?.excluded) return '';
    return (
      `Leaves out ${money(r.excluded)} of roads, parks and pipes that developers built and ` +
      `handed over to the City in ${r.year}. The City's books count them as revenue, but no ` +
      `money changes hands.`
    );
  });

  protected readonly fetchedAt = computed(() => {
    if (!this.meta.hasValue()) return undefined;
    const s = this.meta.value().sources;
    return { budget: s['budget']?.fetchedAt, cpi: s['cpi']?.fetchedAt };
  });

  protected readonly money = money;
}
