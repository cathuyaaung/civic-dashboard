import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DevApplicationCollection, Meeting, MeetingsData } from '../../core/activity';
import { WardCollection } from '../../core/ward';
import { Activity } from './activity';
import { markerRadius } from './ward-map';

const app = (n: string, date: string, units: number | null) => ({
  type: 'Feature' as const,
  geometry: { type: 'Point' as const, coordinates: [-79.7, 43.6] as [number, number] },
  properties: {
    ApplicationNumber: n,
    SubmissionDate: date,
    ApplicationStatus: 'Withheld',
    ApplicationDescription: `Description of ${n}`,
    SiteAddress: `${n} Main St`,
    ProposedUse: 'Residential Apartments',
    ResidentialUnits: units,
    Ward: 11,
  },
});

const applications: DevApplicationCollection = {
  type: 'FeatureCollection',
  features: [app('SP 21 1', '2021-01-05', 79), app('OZ 25 2', '2025-03-11', 1043)],
};

// Far-future dates so "upcoming" doesn't depend on when the test runs.
const meeting = (name: string, start: string, agenda = false): Meeting => ({
  id: name + start,
  name,
  start,
  location: 'Council Chambers',
  cancelled: false,
  url: agenda ? `https://example.com/${encodeURIComponent(name)}` : null,
  agendaPdf: null,
  agendaHtml: agenda ? 'https://example.com/agenda' : null,
});

const meetings: MeetingsData = {
  timeZone: 'America/Toronto',
  from: '2099-01-01',
  to: '2099-12-31',
  meetings: [
    meeting('Council', '2099-01-14T09:30:00', true),
    meeting('Committee of Adjustment', '2099-01-08T13:00:00'),
    meeting('General Committee', '2099-01-07T09:30:00'),
  ],
};

const wards: WardCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { WARD: '11', COUNCILLOR: 'X', PHONE: '', URL: '', IMAGE_URL: null },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-79.8, 43.5],
            [-79.6, 43.5],
            [-79.6, 43.7],
            [-79.8, 43.7],
            [-79.8, 43.5],
          ],
        ],
      },
    },
  ],
};

describe('markerRadius', () => {
  it('scales circle area with homes and keeps a floor for non-residential', () => {
    expect(markerRadius(0, 1000)).toBe(5);
    expect(markerRadius(1000, 1000)).toBe(18);
    // Quarter of the homes → half the extra radius (area ∝ homes).
    expect(markerRadius(250, 1000)).toBeCloseTo(5 + 13 / 2);
  });
});

describe('Activity', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Activity],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function render() {
    const fixture = TestBed.createComponent(Activity);
    TestBed.tick();
    http.expectOne('data/development-applications.geojson').flush(applications);
    http.expectOne('data/meetings.json').flush(meetings);
    http.expectOne('data/wards.geojson').flush(wards);
    http.expectOne('data/meta.json').flush({ ward: 11, sources: {} });
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('lists development applications newest first with a plain-language type', async () => {
    const { el } = await render();
    const addresses = [...el.querySelectorAll('.address')].map((a) => a.textContent?.trim());
    expect(addresses).toEqual(['OZ 25 2 Main St', 'SP 21 1 Main St']);
    expect(el.querySelector('.facts')?.textContent).toContain('Rezoning');
    expect(el.querySelector('.facts')?.textContent).toContain('1,043 homes');
  });

  it('leads with stat tiles and a map with one circle per application', async () => {
    const { el } = await render();
    const tiles = [...el.querySelectorAll('app-stat-tile')].map((t) =>
      t.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(tiles[0]).toContain('2');
    expect(tiles[1]).toContain('1,043 homes');
    expect(tiles[2]).toContain('Jan 14');

    expect(el.querySelector('app-ward-map .leaflet-container')).not.toBeNull();
    expect(el.querySelectorAll('app-ward-map path.wm-app').length).toBe(2);
  });

  it('shows key meetings by default and all meetings on request', async () => {
    const { fixture, el } = await render();
    const names = () => [...el.querySelectorAll('.meetings .name')].map((n) => n.textContent);
    expect(names()).toEqual(['General Committee', 'Council']);
    expect(el.querySelector('.meetings')?.textContent).toContain('Agenda not out yet');

    el.querySelectorAll<HTMLButtonElement>('.scope button')[1].click();
    await fixture.whenStable();
    expect(names()).toEqual(['General Committee', 'Committee of Adjustment', 'Council']);
  });
});
