import { TestBed } from '@angular/core/testing';
import { BudgetData, summarizeSpending } from '../../core/budget';
import { PopulationData } from '../../core/population';
import { Demographics } from './demographics';

const population: PopulationData = {
  geography: 'Mississauga (CY), Ontario',
  series: 'Population estimates, July 1',
  table: '17-10-0155-01',
  values: { '2001': 638_334, '2024': 781_304, '2025': 764_597 },
};

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

describe('Demographics', () => {
  async function render(data: PopulationData = population) {
    const fixture = TestBed.createComponent(Demographics);
    fixture.componentRef.setInput('population', data);
    fixture.componentRef.setInput('spending', summarizeSpending(budget));
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('leads with the population and says which way it moved', async () => {
    const el = await render();

    expect(el.querySelector('.big')?.textContent?.trim()).toBe('764,597');
    // The 2025 estimate fell, so the subtitle says "down".
    expect(el.querySelector('.big-sub')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'down −16,707 from 2024',
    );
    expect(el.querySelector('.eyebrow')?.textContent).toContain('population, 2025');
  });

  it('tiles the year-on-year change, the long run, and spending per resident', async () => {
    const el = await render();
    const tiles = [...el.querySelectorAll('app-stat-tile')].map((t) =>
      t.textContent?.replace(/\s+/g, ' ').trim(),
    );

    expect(tiles[0]).toContain('Population vs 2024');
    expect(tiles[0]).toContain('−2%');
    expect(tiles[1]).toContain('Population since 2001');
    expect(tiles[1]).toContain('+20%');
    // Exact dollars, not compact: $1,666 rather than $1.67K.
    expect(tiles[2]).toContain('City spending per resident, 2025');
    expect(tiles[2]).toContain('$1,666');
    expect(tiles[2]).toContain('$1,463 in 2024');
  });

  it('plots population and spending per resident as separate charts', async () => {
    const el = await render();
    const charts = el.querySelectorAll('app-line-chart');

    // Two measures of different scale: two charts, never one with two axes.
    expect(charts.length).toBe(2);
    expect(charts[0].querySelector('svg')?.getAttribute('aria-label')).toContain(
      '638,334 to 764,597',
    );
    expect(charts[1].querySelector('svg')?.getAttribute('aria-label')).toContain(
      '$1,463 to $1,666',
    );
    // A single series needs no legend, but the numbers stay readable in a table.
    const years = [...el.querySelectorAll('tbody th')].map((t) => t.textContent?.trim());
    expect(years).toEqual(['2025', '2024', '2001']);
    expect(el.querySelector('tbody td')?.textContent?.trim()).toBe('764,597');
  });

  it('labels amounts as inflation-adjusted when they are', async () => {
    const fixture = TestBed.createComponent(Demographics);
    fixture.componentRef.setInput('population', population);
    fixture.componentRef.setInput('spending', summarizeSpending(budget));
    fixture.componentRef.setInput('isReal', true);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('app-stat-tile')?.textContent).not.toContain('after inflation');
    expect(el.textContent).toContain('after inflation');
  });

  it('says so when there are no estimates', async () => {
    const el = await render({ ...population, values: {} });
    expect(el.querySelector('.muted')?.textContent).toContain('No population estimates');
    expect(el.querySelector('app-line-chart')).toBeNull();
  });
});
