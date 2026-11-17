import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { WardCollection } from '../../core/ward';
import { Councillor } from './councillor';

const wards: WardCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [] },
      properties: {
        WARD: '10',
        COUNCILLOR: 'Someone Else',
        PHONE: '896-5010',
        URL: 'https://example.com/ward-10',
        IMAGE_URL: null,
      },
    },
    {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [] },
      properties: {
        WARD: '11',
        COUNCILLOR: 'Brad Butt',
        PHONE: '896-5011',
        URL: 'https://example.com/ward-11',
        // The city sometimes puts the profile page here instead of an image.
        IMAGE_URL: 'https://example.com/ward-11/',
      },
    },
  ],
};

describe('Councillor', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Councillor],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function render(respond: (http: HttpTestingController) => void) {
    const fixture = TestBed.createComponent(Councillor);
    // Run change detection so the resources issue their requests. Don't await
    // whenStable() yet: pending requests keep the app unstable until flushed.
    TestBed.tick();
    respond(http);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the Ward 11 councillor with a dialable phone number', async () => {
    const el = await render((h) => {
      h.expectOne('data/wards.geojson').flush(wards);
      h.expectOne('data/meta.json').flush({
        ward: 11,
        sources: {
          wards: { file: 'wards.geojson', source: '', fetchedAt: '2026-11-17T16:00:00Z' },
        },
      });
    });

    expect(el.querySelector('h3')?.textContent).toBe('Brad Butt');
    const tel = el.querySelector<HTMLAnchorElement>('a[href^="tel:"]');
    expect(tel?.getAttribute('href')).toBe('tel:+19058965011');
    expect(tel?.textContent).toBe('905-896-5011');
    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent).toContain('fetched Nov 17, 2026');
  });

  it('explains how to fix a missing data file', async () => {
    const el = await render((h) => {
      h.expectOne('data/wards.geojson').flush('', { status: 404, statusText: 'Not Found' });
      h.expectOne('data/meta.json').flush('', { status: 404, statusText: 'Not Found' });
    });

    expect(el.querySelector('.error')?.textContent).toContain('npm run data');
  });
});
