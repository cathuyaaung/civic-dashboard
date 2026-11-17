/**
 * Pulls the public datasets the dashboard is built from into public/data/.
 *
 *   npm run data   (scripts/fetch-data.mts)
 *
 * Each source is fetched independently: if one fails, its previous file is
 * left in place and the script exits non-zero after trying the rest.
 * Sources are documented in docs/design-notes.md ("Confirmed data sources").
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const WARD = 11;
const OUT_DIR = join(import.meta.dirname, '..', 'public', 'data');

const ARCGIS = 'https://services6.arcgis.com/hM5ymMLbxIyWTjn2/arcgis/rest/services';
const BUDGET_CSV =
  'https://www.arcgis.com/sharing/rest/content/items/e86fa318eae44578a64de5507b6a4c1e/data';
const ESCRIBE = 'https://pub-mississauga.escribemeetings.com';
const STATCAN_WDS = 'https://www150.statcan.gc.ca/t1/wds/rest';
const CPI_TABLE = 18100005;
/** Geography 16 = Toronto, Ontario; product 2 = All-items. */
const CPI_TORONTO_ALL_ITEMS = '16.2.0.0.0.0.0.0.0.0';
const POPULATION_TABLE = 17100155;
/** Geography member 2134 = Mississauga (CY), Ontario. */
const POPULATION_MISSISSAUGA = '2134.0.0.0.0.0.0.0.0.0';

// Meetings window, relative to today.
const MEETINGS_DAYS_BACK = 30;
const MEETINGS_DAYS_AHEAD = 90;

type Json = Record<string, unknown>;

async function get(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res;
}

/** Query an ArcGIS feature layer as GeoJSON in WGS84 (lon/lat). */
async function arcgisGeoJson(layerPath: string, params: Record<string, string>): Promise<Json> {
  const qs = new URLSearchParams({
    outSR: '4326',
    geometryPrecision: '6',
    f: 'geojson',
    ...params,
  });
  const body = (await (await get(`${ARCGIS}/${layerPath}/query?${qs}`)).json()) as Json;
  if (body['error']) throw new Error(`ArcGIS error: ${JSON.stringify(body['error'])}`);
  return body;
}

// --- Sources -----------------------------------------------------------------

async function wards(): Promise<Json> {
  // Layer id is 2, not 0 — see design notes.
  return arcgisGeoJson('Ward_Boundaries/FeatureServer/2', {
    where: '1=1',
    outFields: 'WARD,COUNCILLOR,PHONE,URL,IMAGE_URL',
    orderByFields: 'MSLINK',
  });
}

async function developmentApplications(): Promise<Json> {
  return arcgisGeoJson(
    'Growth_Management_%E2%80%93_Active_Development_Applications/FeatureServer/0',
    {
      where: `Ward=${WARD}`,
      outFields: '*',
      orderByFields: 'SubmissionDate DESC',
    },
  );
}

/** Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * The consolidated statement CSV has one row per line item and two blocks of
 * year columns ("2012 Actuals (000s)" … and "2012 Budgets (000s)" …), with
 * slightly inconsistent header spellings. Normalise it to:
 *   { years, rows: [{ section, line, actual: (number|null)[], budget: (number|null)[] }] }
 * with actual/budget arrays aligned to `years`.
 */
async function budget(): Promise<Json> {
  const [header, ...body] = parseCsv(await (await get(BUDGET_CSV)).text());

  const actualCols = new Map<number, number>();
  const budgetCols = new Map<number, number>();
  header.forEach((h, col) => {
    const m = /^(\d{4}) (Actuals|Budgets)\b/.exec(h.trim());
    if (m) (m[2] === 'Actuals' ? actualCols : budgetCols).set(Number(m[1]), col);
  });
  const years = [...new Set([...actualCols.keys(), ...budgetCols.keys()])].sort();
  if (years.length === 0) throw new Error('Budget CSV: no year columns found — format changed?');

  const num = (cell: string | undefined): number | null => {
    const v = (cell ?? '').trim();
    return v === '' ? null : Number(v.replace(/,/g, ''));
  };

  const rows = body
    .filter((r) => r[0]?.trim() && r[2]?.trim()) // drop blank and footnote rows
    .map((r) => ({
      section: r[1].trim(),
      line: r[2].trim(),
      actual: years.map((y) => (actualCols.has(y) ? num(r[actualCols.get(y)!]) : null)),
      budget: years.map((y) => (budgetCols.has(y) ? num(r[budgetCols.get(y)!]) : null)),
    }));

  return { unit: 'thousands of CAD', years, rows };
}

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * eSCRIBE has no documented API; this is the JSON endpoint its own calendar
 * page calls. Times are Mississauga local time (America/Toronto).
 */
async function meetings(): Promise<Json> {
  const now = new Date();
  const start = new Date(now.getTime() - MEETINGS_DAYS_BACK * 86_400_000);
  const end = new Date(now.getTime() + MEETINGS_DAYS_AHEAD * 86_400_000);

  const res = await get(`${ESCRIBE}/MeetingsCalendarView.aspx/GetCalendarMeetings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ calendarStartDate: ymd(start), calendarEndDate: ymd(end) }),
  });
  const raw = ((await res.json()) as { d?: Json[] }).d;
  if (!Array.isArray(raw)) throw new Error('eSCRIBE: unexpected response shape');

  // eSCRIBE mixes absolute URLs and root-relative paths.
  const abs = (u: unknown) => (typeof u === 'string' && u ? new URL(u, `${ESCRIBE}/`).href : null);

  const items = raw
    .map((m) => {
      const docs = (m['MeetingDocumentLink'] as Json[] | null) ?? [];
      const agenda = (format: string) =>
        abs(docs.find((d) => d['Type'] === 'Agenda' && d['Format'] === format)?.['Url']);
      const name = String(m['MeetingName'] ?? '').trim();
      return {
        id: String(m['ID']),
        name,
        // "2026/11/19 13:00:00" → "2026-11-19T13:00:00" (local time, no offset)
        start: String(m['StartDate']).replace(/\//g, '-').replace(' ', 'T'),
        location: (m['Location'] as string | null) || null,
        cancelled: /\bcancel/i.test(name),
        // eSCRIBE's own Url field 404s, and a meeting page is an empty shell
        // until its agenda is published, so only link meetings that have one.
        url: m['HasAgenda']
          ? `${ESCRIBE}/Meeting.aspx?Id=${encodeURIComponent(String(m['ID']))}&lang=English`
          : null,
        agendaPdf: agenda('.pdf'),
        agendaHtml: agenda('HTML'),
      };
    })
    .sort((a, b) => a.start.localeCompare(b.start));

  return { timeZone: 'America/Toronto', from: ymd(start), to: ymd(end), meetings: items };
}

/**
 * Statistics Canada CPI, annual average, all-items, Toronto (table 18-10-0005-01,
 * vector v41695186). Toronto is the closest published index to Mississauga.
 * Used to restate past spending in the latest year's dollars.
 */
async function cpi(): Promise<Json> {
  return {
    geography: 'Toronto, Ontario',
    series: 'Consumer Price Index, all-items, annual average (2002=100)',
    table: '18-10-0005-01',
    values: await statcanAnnual(CPI_TABLE, CPI_TORONTO_ALL_ITEMS, 'CPI'),
  };
}

/**
 * Statistics Canada population estimates, July 1, Mississauga (CY)
 * (table 17-10-0155-01, 2021 census boundaries). Estimates are revised each
 * year, so re-pulling can change past values slightly.
 */
async function population(): Promise<Json> {
  return {
    geography: 'Mississauga (CY), Ontario',
    series: 'Population estimates, July 1 (2021 boundaries)',
    table: '17-10-0155-01',
    values: await statcanAnnual(POPULATION_TABLE, POPULATION_MISSISSAUGA, 'population'),
  };
}

/** One annual series from the StatCan Web Data Service, as { "2012": value, … }. */
async function statcanAnnual(
  productId: number,
  coordinate: string,
  what: string,
): Promise<Record<string, number>> {
  const res = await get(`${STATCAN_WDS}/getDataFromCubePidCoordAndLatestNPeriods`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([{ productId, coordinate, latestN: 30 }]),
  });
  const [series] = (await res.json()) as {
    status: string;
    object?: { vectorDataPoint?: { refPer: string; value: number | null }[] };
  }[];
  const points = series?.object?.vectorDataPoint?.filter((p) => p.value !== null);
  if (series?.status !== 'SUCCESS' || !points?.length) {
    throw new Error(`StatCan ${what}: ${series?.status ?? 'no response'}`);
  }
  return Object.fromEntries(points.map((p) => [p.refPer.slice(0, 4), p.value as number]));
}

// --- Runner ------------------------------------------------------------------

const sources: Record<string, { file: string; url: string; fetch: () => Promise<Json> }> = {
  wards: { file: 'wards.geojson', url: `${ARCGIS}/Ward_Boundaries/FeatureServer/2`, fetch: wards },
  developmentApplications: {
    file: 'development-applications.geojson',
    url: `${ARCGIS}/Growth_Management_%E2%80%93_Active_Development_Applications/FeatureServer/0`,
    fetch: developmentApplications,
  },
  budget: { file: 'budget.json', url: BUDGET_CSV, fetch: budget },
  meetings: { file: 'meetings.json', url: ESCRIBE, fetch: meetings },
  cpi: {
    file: 'cpi.json',
    url: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810000501',
    fetch: cpi,
  },
  population: {
    file: 'population.json',
    url: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1710015501',
    fetch: population,
  },
};

await mkdir(OUT_DIR, { recursive: true });

const fetchedAt = new Date().toISOString();
const metaPath = join(OUT_DIR, 'meta.json');
// Keep previous entries so a failed source still shows when it last succeeded.
const meta: Record<string, Json> = await readFile(metaPath, 'utf8')
  .then((t) => (JSON.parse(t) as { sources?: Record<string, Json> }).sources ?? {})
  .catch(() => ({}));
let failed = 0;

for (const [name, src] of Object.entries(sources)) {
  try {
    const data = await src.fetch();
    // GeoJSON is mostly coordinates: keep it compact. Other files are pretty-printed
    // so data refreshes produce readable diffs.
    const indent = src.file.endsWith('.geojson') ? undefined : 2;
    await writeFile(join(OUT_DIR, src.file), JSON.stringify(data, null, indent) + '\n');
    meta[name] = { file: src.file, source: src.url, fetchedAt };
    console.log(`✓ ${name.padEnd(24)} → public/data/${src.file}`);
  } catch (err) {
    failed++;
    console.error(`✗ ${name.padEnd(24)} ${(err as Error).message} (kept previous file, if any)`);
  }
}

await writeFile(metaPath, JSON.stringify({ ward: WARD, sources: meta }, null, 2) + '\n');
process.exitCode = failed ? 1 : 0;
