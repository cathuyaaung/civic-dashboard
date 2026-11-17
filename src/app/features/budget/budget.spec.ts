import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BudgetData, CpiData } from '../../core/budget';
import { Budget } from './budget';

const row = (line: string, actual: number[]) => ({
  section: 'Expenses',
  line,
  actual,
  budget: actual.map(() => 0),
});

const data: BudgetData = {
  unit: 'thousands of CAD',
  years: [2012, 2025],
  rows: [
    row('Transportation services', [274_632, 495_967]),
    row('Protection services', [108_309, 196_115]),
    row('Health services', [72, 932]),
    row('Social and family services', [524, 407]),
    row('Total Expenses', [383_537, 693_421]),
  ],
};

// Prices up 50% from 2012 to 2025.
const cpi: CpiData = {
  geography: 'Toronto, Ontario',
  series: 'CPI',
  table: '18-10-0005-01',
  values: { '2012': 100, '2025': 150 },
};

describe('Budget', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Budget],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function render(respond: (http: HttpTestingController) => void) {
    const fixture = TestBed.createComponent(Budget);
    TestBed.tick();
    respond(http);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('leads with the total and ranks services, folding tiny ones into Other', async () => {
    const el = await render((h) => {
      h.expectOne('data/budget.json').flush(data);
      h.expectOne('data/cpi.json').flush(cpi);
      h.expectOne('data/meta.json').flush({ ward: 11, sources: {} });
    });

    // Donut: one slice per ranked row, total in the centre.
    expect(el.querySelectorAll('app-donut path').length).toBe(3);
    expect(el.querySelector('app-donut .c-value')?.textContent?.trim()).toBe('$693M');
    expect(el.querySelector('app-donut .c-label')?.textContent?.trim()).toBe('spent in 2025');

    // Headline: largest share as cents of a dollar ($496M of $693M ≈ 72%).
    const headline = el.querySelector('.headline')?.textContent?.replace(/\s+/g, ' ');
    expect(headline).toContain('72¢ of every dollar');
    expect(headline).toContain('goes to transportation');

    const names = [...el.querySelectorAll('ol .name')].map((n) => n.textContent?.trim());
    expect(names).toEqual(['Transportation', 'Protection', 'Other (health, social & family)']);
    // Inflation-adjusted by default. Transportation: $274.6M in 2012 = $411.9M
    // in 2025 dollars, so $496M is +$84M / +20%.
    expect(el.querySelector('ol .change-money')?.textContent?.trim()).toBe('+$84M');
    expect(el.querySelector('ol .change-pct')?.textContent?.trim()).toBe('+20%');

    // The full table still lists every category separately.
    const tableRows = [...el.querySelectorAll('tbody th')].map((t) => t.textContent?.trim());
    expect(tableRows).toContain('Health');
  });

  it('links the list and the donut on hover', async () => {
    const el = await render((h) => {
      h.expectOne('data/budget.json').flush(data);
      h.expectOne('data/cpi.json').flush(cpi);
      h.expectOne('data/meta.json').flush({ ward: 11, sources: {} });
    });

    el.querySelectorAll('ol li')[1].dispatchEvent(new Event('pointerenter'));
    await TestBed.inject(ApplicationRef).whenStable();

    expect(el.querySelector('app-donut .c-value')?.textContent?.trim()).toBe('$196M');
    expect(el.querySelectorAll('app-donut path.dim').length).toBe(2);
    expect(el.querySelectorAll('ol li.dim').length).toBe(2);
  });

  it('defaults to inflation-adjusted and can switch to actual dollars', async () => {
    const el = await render((h) => {
      h.expectOne('data/budget.json').flush(data);
      h.expectOne('data/cpi.json').flush(cpi);
      h.expectOne('data/meta.json').flush({ ward: 11, sources: {} });
    });

    const [actual, real] = el.querySelectorAll<HTMLButtonElement>('.segmented button');
    expect(real.getAttribute('aria-pressed')).toBe('true');
    expect(el.querySelector('.mode-note')?.textContent).toContain(
      '(prices rose 50% from 2012 to 2025).',
    );
    expect(el.querySelector('caption')?.textContent).toContain('2025 dollars');

    actual.click();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(actual.getAttribute('aria-pressed')).toBe('true');
    expect(el.querySelector('ol .change-money')?.textContent?.trim()).toBe('+$221M');
    expect(el.querySelector('ol .change-pct')?.textContent?.trim()).toBe('+81%');
    // 2025 itself is the same in both modes.
    expect(el.querySelector('app-donut .c-value')?.textContent?.trim()).toBe('$693M');
    expect(el.querySelector('caption')?.textContent).toContain('as spent');
  });

  it('hides the inflation switch when the price index is unavailable', async () => {
    const el = await render((h) => {
      h.expectOne('data/budget.json').flush(data);
      h.expectOne('data/cpi.json').flush('', { status: 404, statusText: 'Not Found' });
      h.expectOne('data/meta.json').flush({ ward: 11, sources: {} });
    });
    expect(el.querySelector('.segmented')).toBeNull();
    expect(el.querySelector('ol .change-pct')?.textContent?.trim()).toBe('+81%');
  });

  it('explains how to fix a missing data file', async () => {
    const el = await render((h) => {
      h.expectOne('data/budget.json').flush('', { status: 404, statusText: 'Not Found' });
      h.expectOne('data/cpi.json').flush('', { status: 404, statusText: 'Not Found' });
      h.expectOne('data/meta.json').flush('', { status: 404, statusText: 'Not Found' });
    });

    expect(el.querySelector('.error')?.textContent).toContain('npm run data');
  });
});
