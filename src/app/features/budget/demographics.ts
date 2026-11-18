import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BudgetSummary } from '../../core/budget';
import { count, dollars, signedCount, signedPercent } from '../../core/format';
import {
  PerResident,
  perResidentSpending,
  PopulationData,
  summarizePopulation,
} from '../../core/population';
import { InfoTip } from '../../shared/info-tip';
import { LineChart, LinePoint } from '../../shared/line-chart';
import { StatTile } from '../../shared/stat-tile';

/**
 * Who the city spends on: the population it serves, and what its spending
 * works out to per resident. Population and dollars are different scales, so
 * they get a chart and a trend tile rather than one chart with two axes.
 */
@Component({
  selector: 'app-demographics',
  imports: [InfoTip, LineChart, StatTile],
  templateUrl: './demographics.html',
  styleUrl: './demographics.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Demographics {
  readonly population = input.required<PopulationData>();
  /** The spending side, in the dollars currently on show. */
  readonly spending = input.required<BudgetSummary>();
  /** True when amounts are inflation-adjusted; only changes labels. */
  readonly isReal = input(false);

  protected readonly summary = computed(() => summarizePopulation(this.population()));

  protected readonly perResident = computed<PerResident>(() =>
    perResidentSpending(this.spending(), this.population()),
  );

  protected readonly chartPoints = computed<LinePoint[]>(
    () => this.summary()?.points.map((p) => ({ label: String(p.year), value: p.people })) ?? [],
  );

  /** Dollars per resident, skipping years the budget doesn't cover. */
  protected readonly perResidentPoints = computed<LinePoint[]>(() => {
    const pr = this.perResident();
    return pr.years
      .map((year, i) => ({ label: String(year), value: pr.values[i] }))
      .filter((p): p is LinePoint => p.value !== null);
  });

  protected readonly perResidentLabel = computed(() => {
    const pr = this.perResident();
    const points = this.perResidentPoints();
    if (points.length < 2 || pr.value === null) return '';
    return (
      `City spending per resident from ${points[0].label} to ${pr.year}: ` +
      `${dollars(points[0].value)} to ${dollars(pr.value)}.`
    );
  });

  protected readonly chartLabel = computed(() => {
    const s = this.summary();
    if (!s) return '';
    return (
      `Population of Mississauga from ${s.firstYear} to ${s.year}: ` +
      `${count(s.firstPeople)} to ${count(s.people)}.`
    );
  });

  /**
   * The table view behind the charts: every year with a population estimate,
   * newest first. Years the budget doesn't reach have no per-resident figure.
   */
  protected readonly perResidentRows = computed(() => {
    const s = this.summary();
    if (!s) return [];
    const pr = this.perResident();
    const byYear = new Map(pr.years.map((year, i) => [year, pr.values[i]]));
    return s.points
      .map((p) => ({ year: p.year, people: p.people, perResident: byYear.get(p.year) ?? null }))
      .reverse();
  });

  protected readonly afterInflation = computed(() => (this.isReal() ? ', after inflation' : ''));

  /** The estimate is a July 1 figure on fixed boundaries — nuance behind an ⓘ. */
  protected readonly sourceInfo = computed(() => {
    const p = this.population();
    return (
      `${p.series || 'Population estimates'} for ${p.geography || 'Mississauga'}, ` +
      `from Statistics Canada table ${p.table || '17-10-0155-01'}. Estimates are revised ` +
      `between censuses, so recent years can move.`
    );
  });

  protected readonly count = count;
  protected readonly dollars = dollars;
  protected readonly signedCount = signedCount;
  protected readonly signedPercent = signedPercent;
}
