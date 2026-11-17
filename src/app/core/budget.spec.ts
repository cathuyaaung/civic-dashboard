import {
  adjustForInflation,
  BudgetData,
  foldSmallCategories,
  latestActualYear,
  BudgetSummary,
  summarizeRevenue,
  summarizeSpending,
} from './budget';

describe('adjustForInflation', () => {
  const data: BudgetData = {
    unit: 'thousands of CAD',
    years: [2012, 2025],
    rows: [{ section: 'Expenses', line: 'Roads', actual: [100, 150], budget: [null, 140] }],
  };

  it('restates every year in the target year’s dollars', () => {
    const adj = adjustForInflation(data, { '2012': 100, '2025': 150 }, 2025)!;
    expect(adj.rows[0].actual).toEqual([150, 150]); // flat in real terms
    expect(adj.rows[0].budget).toEqual([null, 140]);
    expect(adj.unit).toBe('thousands of 2025 CAD');
  });

  it('returns null when the index is missing a year', () => {
    expect(adjustForInflation(data, { '2025': 150 }, 2025)).toBeNull();
  });

  it('finds the latest year with actuals', () => {
    expect(latestActualYear(data)).toBe(2025);
  });
});

describe('foldSmallCategories', () => {
  const cat = (label: string, share: number, series: (number | null)[]) => ({
    line: label,
    label,
    amount: series.at(-1) ?? 0,
    share,
    series,
    baseline: series[0],
    change: null,
  });
  const summary: BudgetSummary = {
    year: 2013,
    firstYear: 2012,
    years: [2012, 2013],
    total: 1000,
    totalBaseline: 902,
    totalChange: null,
    excluded: 0,
    categories: [
      cat('Roads', 0.996, [900, 996]),
      cat('Health', 0.003, [1, 3]),
      cat('Social', 0.001, [1, 1]),
    ],
  };

  it('combines categories under the threshold into one Other row', () => {
    const rows = foldSmallCategories(summary);
    expect(rows.map((r) => r.label)).toEqual(['Roads', 'Other (health, social)']);
    expect(rows[1].amount).toBe(4);
    expect(rows[1].series).toEqual([2, 4]);
    expect(rows[1].change).toBeCloseTo(1);
  });

  it('does not fold a single small category', () => {
    expect(foldSmallCategories(summary, 0.002).map((r) => r.label)).toEqual([
      'Roads',
      'Health',
      'Social',
    ]);
  });
});

const data: BudgetData = {
  unit: 'thousands of CAD',
  years: [2012, 2013, 2014],
  rows: [
    { section: 'Revenues', line: 'Property taxes', actual: [500, 550, 600], budget: [0, 0, 0] },
    {
      section: 'Expenses',
      line: 'Transportation services',
      actual: [100, 150, 300],
      budget: [0, 0, 0],
    },
    {
      section: 'Expenses',
      line: 'Social and family services',
      actual: [50, 50, 100],
      budget: [0, 0, 0],
    },
    {
      section: 'Expenses',
      line: 'Loss on disposal of tangible capital assets',
      actual: [7, 3, null],
      budget: [0, 0, 0],
    },
    { section: 'Expenses', line: 'Total Expenses', actual: [157, 203, 400], budget: [0, 0, 0] },
  ],
};

describe('summarizeSpending', () => {
  it('defaults to the latest year and ranks service categories largest first', () => {
    const s = summarizeSpending(data);
    expect(s.year).toBe(2014);
    expect(s.categories.map((c) => c.label)).toEqual(['Transportation', 'Social & family']);
  });

  it('converts thousands to dollars and leaves out non-service lines', () => {
    const s = summarizeSpending(data);
    expect(s.total).toBe(400_000);
    expect(s.categories[0].amount).toBe(300_000);
    expect(s.categories[0].share).toBeCloseTo(0.75);
  });

  it('measures change from the first year', () => {
    const s = summarizeSpending(data);
    expect(s.categories[0].change).toBeCloseTo(2); // 100 → 300
    expect(s.categories[0].baseline).toBe(100_000);
    expect(s.totalChange).toBeCloseTo(400 / 150 - 1);
    expect(s.totalBaseline).toBe(150_000);
  });

  it('can summarise an earlier year', () => {
    const s = summarizeSpending(data, 2013);
    expect(s.total).toBe(200_000);
    expect(s.categories[0].change).toBeCloseTo(0.5);
  });

  it('rejects a year with no data', () => {
    expect(() => summarizeSpending(data, 1999)).toThrow();
  });
});

describe('summarizeRevenue', () => {
  const rev = (line: string, actual: (number | null)[]) => ({
    section: 'Revenues',
    line,
    actual,
    budget: actual.map(() => null),
  });
  const data: BudgetData = {
    unit: 'thousands of CAD',
    years: [2023, 2024, 2025],
    rows: [
      rev('Property taxes', [600, 650, 700]),
      rev('Payment in lieu of taxes', [null, 30, 40]),
      rev('User charges', [200, 220, 250]),
      rev('Development and other contributions applied', [100, 0, 0]),
      rev('Obligatory reserve fund revenue applied', [null, 90, 110]),
      rev('Contributed and assumed assets', [50, 500, 30]),
      rev('Some new line the city adds', [null, null, 5]),
      rev('Total Revenues', [950, 1490, 1135]),
      { section: 'Expenses', line: 'Transportation services', actual: [1, 1, 1], budget: [] },
    ],
  };

  it('groups lines into plain-language sources, ranked largest first', () => {
    const r = summarizeRevenue(data);
    expect(r.categories.map((c) => [c.label, c.amount])).toEqual([
      ["Property taxes (City's share)", 740_000], // includes payments in lieu
      ['Fees and charges', 250_000],
      ['Development charges and reserve funds', 110_000],
      ['Other', 5_000], // unknown lines can't vanish
    ]);
  });

  it('bridges reclassified lines so trends stay continuous', () => {
    const dev = summarizeRevenue(data).categories.find((c) => c.line.startsWith('Development'))!;
    expect(dev.series).toEqual([100_000, 90_000, 110_000]);
  });

  it('leaves non-cash revenue out of the total and reports it', () => {
    const r = summarizeRevenue(data, 2024);
    expect(r.excluded).toBe(500_000);
    expect(r.total).toBe(650_000 + 30_000 + 220_000 + 0 + 90_000);
  });
});
