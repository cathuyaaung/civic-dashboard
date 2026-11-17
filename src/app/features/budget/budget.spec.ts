import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BudgetData } from '../../core/budget';
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
      h.expectOne('data/meta.json').flush({ ward: 11, sources: {} });
    });

    expect(el.querySelector('.hero-value')?.textContent?.trim()).toBe('$693M');
    expect(el.querySelector('.hero')?.textContent).toContain('in 2025');

    const names = [...el.querySelectorAll('ol .name')].map((n) => n.textContent?.trim());
    expect(names).toEqual(['Transportation', 'Protection', 'Other (health, social & family)']);
    expect(el.querySelector('ol .change')?.textContent?.trim()).toBe('+81%');

    // The full table still lists every category separately.
    const tableRows = [...el.querySelectorAll('tbody th')].map((t) => t.textContent?.trim());
    expect(tableRows).toContain('Health');
  });

  it('explains how to fix a missing data file', async () => {
    const el = await render((h) => {
      h.expectOne('data/budget.json').flush('', { status: 404, statusText: 'Not Found' });
      h.expectOne('data/meta.json').flush('', { status: 404, statusText: 'Not Found' });
    });

    expect(el.querySelector('.error')?.textContent).toContain('npm run data');
  });
});
