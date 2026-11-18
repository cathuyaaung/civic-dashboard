import { BudgetData, summarizeSpending } from './budget';
import { perResidentSpending, PopulationData, summarizePopulation } from './population';

const population: PopulationData = {
  geography: 'Mississauga (CY), Ontario',
  series: 'Population estimates, July 1',
  table: '17-10-0155-01',
  values: { '2001': 638_334, '2024': 781_304, '2025': 764_597 },
};

describe('summarizePopulation', () => {
  it('reads the latest year, its change, and the change over the series', () => {
    const s = summarizePopulation(population)!;
    expect([s.year, s.people]).toEqual([2025, 764_597]);
    expect([s.compareYear, s.comparePeople]).toEqual([2024, 781_304]);
    // The 2025 estimate fell.
    expect(s.changePeople).toBe(-16_707);
    expect(s.change).toBeCloseTo(-0.0214, 4);
    expect([s.firstYear, s.firstPeople]).toEqual([2001, 638_334]);
    expect(s.sinceFirstPeople).toBe(126_263);
    expect(s.sinceFirst).toBeCloseTo(0.1978, 4);
  });

  it('sorts by year rather than trusting key order', () => {
    const s = summarizePopulation({
      ...population,
      values: { '2025': 764_597, '2001': 638_334 },
    })!;
    expect(s.points.map((p) => p.year)).toEqual([2001, 2025]);
  });

  it('ignores unusable entries and reports nothing when none are left', () => {
    expect(summarizePopulation({ ...population, values: {} })).toBeUndefined();
    const s = summarizePopulation({
      ...population,
      values: { '2025': 764_597, '2024': 0, nonsense: 123 },
    })!;
    expect(s.points.map((p) => p.year)).toEqual([2025]);
    // One point: no change to report, either year on year or over the series.
    expect([s.change, s.sinceFirst]).toEqual([null, null]);
  });
});

describe('perResidentSpending', () => {
  const budget: BudgetData = {
    unit: 'thousands of CAD',
    years: [2024, 2025],
    rows: [
      {
        section: 'Expenses',
        line: 'Transportation services',
        actual: [1_143_201, 1_273_523],
        budget: [],
      },
    ],
  };

  it('divides the year total by that year population', () => {
    const pr = perResidentSpending(summarizeSpending(budget), population);
    expect(pr.year).toBe(2025);
    // $1,273,523,000 over 764,597 residents.
    expect(pr.value).toBeCloseTo(1665.6, 1);
    expect(pr.compareYear).toBe(2024);
    expect(pr.compareValue).toBeCloseTo(1463.2, 1);
    // Spending per resident rose even though spending and population both moved.
    expect(pr.change).toBeCloseTo(0.1383, 3);
  });

  it('leaves years without a population estimate empty', () => {
    const pr = perResidentSpending(summarizeSpending(budget), {
      ...population,
      values: { '2025': 764_597 },
    });
    expect(pr.values[0]).toBeNull();
    expect(pr.values[1]).not.toBeNull();
    expect(pr.change).toBeNull();
  });
});
