import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  signal,
  viewChildren,
} from '@angular/core';
import {
  adjustForInflation,
  BudgetData,
  CpiData,
  latestActualYear,
  summarizeRevenue,
  summarizeSpending,
} from '../../core/budget';
import { money } from '../../core/format';
import { PopulationData, summarizePopulation } from '../../core/population';
import { DataMeta } from '../../core/ward';
import { BudgetBreakdown } from './budget-breakdown';
import { Demographics } from './demographics';

/** "actual": dollars as recorded. "real": past years restated in the latest year's dollars. */
export type DollarMode = 'actual' | 'real';

/** Which panel the tabs are showing. */
export type BudgetSide = 'spending' | 'revenue' | 'demographics';

@Component({
  selector: 'app-budget',
  imports: [DatePipe, BudgetBreakdown, Demographics],
  templateUrl: './budget.html',
  styleUrl: './budget.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Budget {
  private readonly data = httpResource<BudgetData>(() => 'data/budget.json');
  private readonly cpi = httpResource<CpiData>(() => 'data/cpi.json');
  private readonly meta = httpResource<DataMeta>(() => 'data/meta.json');
  private readonly populationData = httpResource<PopulationData>(() => 'data/population.json');

  protected readonly status = computed(() => this.data.status());

  /** Inflation-adjusted by default; falls back to actual dollars if the CPI is unavailable. */
  protected readonly mode = signal<DollarMode>('real');

  /** Spending leads: it answers "where does my money go". */
  private readonly requestedSide = signal<BudgetSide>('spending');

  private readonly tabButtons = viewChildren<ElementRef<HTMLButtonElement>>('tabButton');

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

  /** Population estimates, or undefined until they load or if none are usable. */
  protected readonly population = computed(() => {
    if (!this.populationData.hasValue()) return undefined;
    const data = this.populationData.value();
    // No usable estimates → no demographics tab, rather than an empty one.
    return summarizePopulation(data) ? data : undefined;
  });

  /** The tabs on offer, in order. Each needs its own data to be worth showing. */
  protected readonly sides = computed<BudgetSide[]>(() => {
    const sides: BudgetSide[] = ['spending'];
    if (this.revenue()) sides.push('revenue');
    if (this.population()) sides.push('demographics');
    return sides;
  });

  /**
   * The panel on show. Falls back to spending if the requested one goes away,
   * so a reload without revenue or population can't leave an empty panel up.
   */
  protected readonly activeSide = computed<BudgetSide>(() => {
    const requested = this.requestedSide();
    return this.sides().includes(requested) ? requested : 'spending';
  });

  /** Tabs only earn their place when there is more than one panel. */
  protected readonly hasTabs = computed(() => this.sides().length > 1);

  protected readonly tabLabels: Record<BudgetSide, string> = {
    spending: 'Where the money goes',
    revenue: 'Where the money comes from',
    demographics: 'Demographics',
  };

  protected select(side: BudgetSide): void {
    this.requestedSide.set(side);
    // Keep focus on the tab the user just chose, as a tab list should.
    const index = this.sides().indexOf(side);
    if (index >= 0) this.tabButtons()[index]?.nativeElement.focus();
  }

  /** Arrow keys move between tabs; Home/End jump to the ends. */
  protected onTabKeydown(event: KeyboardEvent): void {
    const sides = this.sides();
    const at = sides.indexOf(this.activeSide());
    switch (event.key) {
      case 'ArrowRight':
        this.select(sides[(at + 1) % sides.length]);
        break;
      case 'ArrowLeft':
        this.select(sides[(at - 1 + sides.length) % sides.length]);
        break;
      case 'Home':
        this.select(sides[0]);
        break;
      case 'End':
        this.select(sides[sides.length - 1]);
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  /** Price change since the comparison year, from the CPI, for the qualifier. */
  protected readonly priceRise = computed(() => {
    const s = this.spending();
    if (!s?.compareYear || !this.cpi.hasValue()) return null;
    const v = this.cpi.value().values;
    const from = v[String(s.compareYear)];
    const to = v[String(s.year)];
    return from && to ? to / from - 1 : null;
  });

  /** Short qualifier beside the switch: what the numbers are in. */
  protected readonly modeNote = computed(() => {
    const s = this.spending();
    if (!s) return '';
    if (!this.isReal()) return 'Dollars as recorded each year';
    const rise = this.priceRise();
    if (rise === null) return `In ${s.year} dollars`;
    const pct = Math.abs(rise) < 0.1 ? (rise * 100).toFixed(1) : Math.round(rise * 100);
    return `In ${s.year} dollars · prices rose ${pct}% vs ${s.compareYear}`;
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
