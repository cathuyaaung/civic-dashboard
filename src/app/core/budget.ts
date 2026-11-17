/** Shape of public/data/budget.json, written by scripts/fetch-data.mts. */
export interface BudgetData {
  unit: string;
  years: number[];
  rows: BudgetRow[];
}

export interface BudgetRow {
  section: string;
  line: string;
  /** Aligned to BudgetData.years; null where the city published no figure. */
  actual: (number | null)[];
  budget: (number | null)[];
}

export interface SpendingCategory {
  /** Name as published, e.g. "Transportation services". */
  line: string;
  /** Short display name, e.g. "Transportation". */
  label: string;
  /** Dollars (not thousands). */
  amount: number;
  /** 0–1 share of the year's total. */
  share: number;
  /** Actual spending in dollars for every year, aligned to SpendingSummary.years. */
  series: (number | null)[];
  /** Dollars in the first year with data (what `change` is measured from); null if none. */
  baseline: number | null;
  /** Fractional change from `baseline` to `year`; null if no baseline. */
  change: number | null;
}

export interface SpendingSummary {
  year: number;
  firstYear: number;
  years: number[];
  /** Dollars. Sum of the categories shown. */
  total: number;
  totalBaseline: number | null;
  totalChange: number | null;
  categories: SpendingCategory[];
}

/** Shape of public/data/cpi.json: annual CPI by year ("2012": 121.8). */
export interface CpiData {
  geography: string;
  series: string;
  table: string;
  values: Record<string, number>;
}

/**
 * Expense lines that are accounting adjustments, not services, and are left
 * out of "where the money goes".
 */
const NON_SERVICE_LINES = new Set([
  'Total Expenses',
  'Loss on disposal of tangible capital assets',
]);

const THOUSANDS = 1000;

/**
 * Colour per service, keyed by the published line name so a service keeps
 * its colour whatever its rank in a given year. Slots follow the validated
 * categorical order (styles.scss --cat-N); anything unlisted is grey.
 */
const COLOR_SLOT: Record<string, number> = {
  'Transportation services': 1,
  'General government services': 2,
  'Recreation and cultural services': 3,
  'Protection services': 4,
  'Planning and development services': 5,
  'Environmental services': 6,
};

export interface CategoryColor {
  /** CSS colour for the mark. */
  fill: string;
  /** Text colour for a label drawn inside the mark. */
  ink: string;
}

export function categoryColor(line: string): CategoryColor {
  const slot = COLOR_SLOT[line];
  if (!slot) return { fill: 'var(--cat-other)', ink: '#ffffff' };
  // White labels on every slot except yellow (4), per the palette's label rule.
  return { fill: `var(--cat-${slot})`, ink: slot === 4 ? '#0b0b0b' : '#ffffff' };
}

const label = (line: string) =>
  line.replace(/ services$/i, '').replace(/^Social and family$/, 'Social & family');

/** First positive value up to and including index `to`: the base for "change since". */
function baselineOf(series: (number | null)[], to: number): number | null {
  return series.slice(0, to + 1).find((v): v is number => v !== null && v > 0) ?? null;
}

function change(series: (number | null)[], to: number): number | null {
  const from = baselineOf(series, to);
  const end = series[to];
  return from === null || end == null ? null : end / from - 1;
}

/** Latest year with any actual expense figure. */
export function latestActualYear(data: BudgetData): number | undefined {
  const i = data.years.findLastIndex((_, i) =>
    data.rows.some((r) => r.section === 'Expenses' && r.actual[i] != null),
  );
  return i < 0 ? undefined : data.years[i];
}

/**
 * Restates every figure in `toYear` dollars using a price index:
 * value × CPI[toYear] / CPI[year]. Returns null if the index is missing any
 * year needed, so callers can fall back to actual dollars.
 */
export function adjustForInflation(
  data: BudgetData,
  cpi: Record<string, number>,
  toYear: number,
): BudgetData | null {
  const target = cpi[String(toYear)];
  const factors = data.years.map((y) => {
    const base = cpi[String(y)];
    return target && base ? target / base : null;
  });
  if (factors.some((f) => f === null)) return null;
  const scale = (vals: (number | null)[]) =>
    vals.map((v, i) => (v === null ? null : v * factors[i]!));
  return {
    ...data,
    unit: `thousands of ${toYear} CAD`,
    rows: data.rows.map((r) => ({ ...r, actual: scale(r.actual), budget: scale(r.budget) })),
  };
}

/**
 * City spending by service category for one year (default: the latest year
 * with actuals), ranked largest first, with each category's history.
 */
export function summarizeSpending(data: BudgetData, year?: number): SpendingSummary {
  const expenses = data.rows.filter(
    (r) => r.section === 'Expenses' && !NON_SERVICE_LINES.has(r.line),
  );

  const idx = data.years.indexOf(year ?? latestActualYear(data) ?? NaN);
  if (idx < 0) throw new Error(`No spending data for ${year ?? 'any year'}`);

  const toDollars = (v: number | null) => (v === null ? null : v * THOUSANDS);
  const rows = expenses.map((r) => ({ line: r.line, series: r.actual.map(toDollars) }));
  const total = rows.reduce((sum, r) => sum + (r.series[idx] ?? 0), 0);
  const totals = data.years.map((_, i) =>
    rows.every((r) => r.series[i] === null)
      ? null
      : rows.reduce((s, r) => s + (r.series[i] ?? 0), 0),
  );

  const categories = rows
    .map((r) => {
      const amount = r.series[idx] ?? 0;
      return {
        line: r.line,
        label: label(r.line),
        amount,
        share: total ? amount / total : 0,
        series: r.series,
        baseline: baselineOf(r.series, idx),
        change: change(r.series, idx),
      };
    })
    .sort((a, b) => b.amount - a.amount);

  return {
    year: data.years[idx],
    firstYear: data.years[0],
    years: data.years,
    total,
    totalBaseline: baselineOf(totals, idx),
    totalChange: change(totals, idx),
    categories,
  };
}

/**
 * Folds categories below `minShare` into one "Other" row at the end, so tiny
 * lines (and their large percentage swings off a small base) don't compete
 * with the services that make up the budget. Leaves the list alone if fewer
 * than two categories would fold.
 */
export function foldSmallCategories(
  summary: SpendingSummary,
  minShare = 0.005,
): SpendingCategory[] {
  const keep = summary.categories.filter((c) => c.share >= minShare);
  const small = summary.categories.filter((c) => c.share < minShare);
  if (small.length < 2) return summary.categories;

  const idx = summary.years.indexOf(summary.year);
  const series = summary.years.map((_, i) =>
    small.every((c) => c.series[i] === null)
      ? null
      : small.reduce((s, c) => s + (c.series[i] ?? 0), 0),
  );
  const amount = series[idx] ?? 0;
  return [
    ...keep,
    {
      line: 'Other',
      label: `Other (${small.map((c) => c.label.toLowerCase()).join(', ')})`,
      amount,
      share: summary.total ? amount / summary.total : 0,
      series,
      baseline: baselineOf(series, idx),
      change: change(series, idx),
    },
  ];
}
