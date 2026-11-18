import { BudgetSummary } from './budget';

/** Shape of public/data/population.json, written by scripts/fetch-data.mts. */
export interface PopulationData {
  geography: string;
  series: string;
  table: string;
  /** Population by year ("2025": 764597). */
  values: Record<string, number>;
}

export interface PopulationPoint {
  year: number;
  people: number;
}

export interface PopulationSummary {
  /** Latest year with an estimate. */
  year: number;
  people: number;
  /** The year before `year`, or null when there is none. */
  compareYear: number | null;
  comparePeople: number | null;
  /** Change from `comparePeople`, in people and as a fraction. */
  changePeople: number | null;
  change: number | null;
  firstYear: number;
  firstPeople: number;
  sinceFirstPeople: number;
  sinceFirst: number | null;
  /** Every year with an estimate, oldest first. */
  points: PopulationPoint[];
}

/**
 * The population series in year order, with the latest year's change and the
 * change over the whole series. Returns undefined if there are no estimates.
 */
export function summarizePopulation(data: PopulationData): PopulationSummary | undefined {
  const points = Object.entries(data.values ?? {})
    .map(([year, people]) => ({ year: Number(year), people: Number(people) }))
    .filter((p) => Number.isFinite(p.year) && Number.isFinite(p.people) && p.people > 0)
    .sort((a, b) => a.year - b.year);
  if (!points.length) return undefined;

  const last = points[points.length - 1];
  const previous = points.length > 1 ? points[points.length - 2] : null;
  const first = points[0];

  return {
    year: last.year,
    people: last.people,
    compareYear: previous?.year ?? null,
    comparePeople: previous?.people ?? null,
    changePeople: previous ? last.people - previous.people : null,
    change: previous ? last.people / previous.people - 1 : null,
    firstYear: first.year,
    firstPeople: first.people,
    sinceFirstPeople: last.people - first.people,
    sinceFirst: first === last ? null : last.people / first.people - 1,
    points,
  };
}

export interface PerResident {
  years: number[];
  /** Dollars per resident, aligned to `years`; null where either figure is missing. */
  values: (number | null)[];
  /** The year the headline figure is for. */
  year: number;
  value: number | null;
  compareYear: number | null;
  compareValue: number | null;
  change: number | null;
}

/**
 * City spending per resident: the budget's yearly totals over the population
 * of the same year. Both sides must exist for a year to get a figure, so the
 * series is shorter than the population one (the budget starts later).
 */
export function perResidentSpending(
  summary: BudgetSummary,
  population: PopulationData,
): PerResident {
  const totals = summary.years.map((_, i) =>
    summary.categories.every((c) => c.series[i] == null)
      ? null
      : summary.categories.reduce((sum, c) => sum + (c.series[i] ?? 0), 0),
  );

  const values = summary.years.map((year, i) => {
    const people = Number(population.values?.[String(year)]);
    const total = totals[i];
    return total === null || !Number.isFinite(people) || people <= 0 ? null : total / people;
  });

  const idx = summary.years.indexOf(summary.year);
  const at = (i: number) => (i >= 0 && i < values.length ? values[i] : null);
  const value = at(idx);
  const compareValue = at(idx - 1);

  return {
    years: summary.years,
    values,
    year: summary.year,
    value,
    compareYear: idx > 0 ? summary.years[idx - 1] : null,
    compareValue,
    change: value !== null && compareValue ? value / compareValue - 1 : null,
  };
}
