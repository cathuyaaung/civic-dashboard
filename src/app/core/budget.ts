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
  /** Fractional change from the first year with data to `year`; null if no baseline. */
  change: number | null;
}

export interface SpendingSummary {
  year: number;
  firstYear: number;
  years: number[];
  /** Dollars. Sum of the categories shown. */
  total: number;
  totalChange: number | null;
  categories: SpendingCategory[];
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

function change(series: (number | null)[], to: number): number | null {
  const from = series.find((v) => v !== null && v > 0);
  const end = series[to];
  return from == null || end == null ? null : end / from - 1;
}

/**
 * City spending by service category for one year (default: the latest year
 * with actuals), ranked largest first, with each category's history.
 */
export function summarizeSpending(data: BudgetData, year?: number): SpendingSummary {
  const expenses = data.rows.filter(
    (r) => r.section === 'Expenses' && !NON_SERVICE_LINES.has(r.line),
  );

  const idx =
    year === undefined
      ? data.years.findLastIndex((_, i) => expenses.some((r) => r.actual[i] != null))
      : data.years.indexOf(year);
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
        change: change(r.series, idx),
      };
    })
    .sort((a, b) => b.amount - a.amount);

  return {
    year: data.years[idx],
    firstYear: data.years[0],
    years: data.years,
    total,
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
      change: change(series, idx),
    },
  ];
}
