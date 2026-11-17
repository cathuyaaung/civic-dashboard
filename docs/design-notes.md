# Ward 11 Civic Dashboard — Design Notes

2026-11-17 · Thuya

Live version of this doc: https://claude.ai/artifact/2LZe1n7yDJTr4KZJmAimUw

## Vision and scope

A civic dashboard for Mississauga answering three questions from the point of view of someone who actually lives here: where does my money go, what is my city doing that affects me, and who's making those decisions.

Built as a portfolio/GitHub project after shelving an earlier neighborhood tool-sharing concept (abandoned because the founder didn't know his neighbors and couldn't seed the trust model it required). Key differences this time:

- No platform, no network effect needed. This part stands, and it is what keeps the project finishable: no accounts, no user-generated content, nobody to recruit — a static site over public data. What was dropped on 2026-11-17 is the single-user rationale, not this.
- Real, already-public data, not scraped or sensitive — pulled from the City of Mississauga's open data catalogue and published budget/council documents.
- City-centric, with drill-down to a single ward. Reversed on 2026-11-17: ward-only stopped making sense, and the "useful to exactly one person on day one" framing went with it. Mississauga-wide is the default view; a ward selector narrows the screens to one ward.
- Doubles as a genuine personal utility (actually useful to know this) and a resume-worthy technical project (data ingestion from open data APIs/PDFs, a real dashboard UI — not just CRUD).

## Anchor facts

| Field | Value |
| --- | --- |
| Address | 6399 Spinnaker Circle, Mississauga |
| Ward | 11 |
| Councillor | Brad Butt |
| Roll number | 05-04-0-099-33691-0000 |

Confirmed via the City of Mississauga's property information tool (mississauga.ca/apps/#/property). This is a condo property — the building's base-building record and the specific unit record are separate lookups in that tool.

An address → ward lookup was originally planned here as the first technical piece. **Dropped (2026-11-17):** the user already knows their ward, and the city's Address dataset already includes a `WARD` field for every address, so a point-in-polygon lookup would re-derive published data. A map of the Ward 11 boundary serves residents better (see Design principles).

## Design principles

- **Visual first — a dashboard, not a document** (standing decision, 2026-11-17). The audience is an average resident. Each screen leads with something visual — maps, charts, stat tiles, hero numbers, colour and clear hierarchy — with lists and text as supporting detail. Things cannot look dull. Visuals still follow honest data-viz rules: no misleading charts, accessible colours, a table view behind every chart.
- **No footnotes — easy to read is the whole point** (standing decision, 2026-11-17). A resident should understand a screen without reading notes at the bottom. Explanations go where the eye already is: in labels ("Property taxes (City's share)"), short qualifiers in headings ("cash only"), or in the visual itself (a money-in vs money-out bar instead of a paragraph about surpluses). Nuance that truly doesn't fit goes in a small on-demand ⓘ info tip, used sparingly — never a notes list. Source attribution at the bottom is fine.
- **City first, then drill down to a ward** (standing decision, 2026-11-17, replacing "v1 is one ward only"). Mississauga as a whole is the default view; a ward selector in the header narrows the screens to one ward and is remembered across them. This reverses the earlier ward-only scope, and with it the premise that the dashboard only had to be useful to one person. The no-platform constraints are unaffected: still no accounts, still a static site over public open data. Where a dataset has no ward dimension (the budget), the city-wide view stands and the selector doesn't pretend otherwise.

## v1 scope — the three pillars

1. **Who's deciding** — all 11 councillors and how to reach them, from the ward boundaries dataset; narrowing to a ward shows just that ward's councillor. Committees aren't in any dataset yet.
2. **Where my money goes** — Mississauga's budget broken down by service area (fire, roads, library, etc.), pulled from the published budget data and shown as a simple visual instead of the dense multi-hundred-page PDF. Stretch: apply the city-wide percentages against the user's own roll number/assessed value for a personalized dollar breakdown, not just the city-wide average.
3. **What's happening** — upcoming council/committee agenda items, recent by-laws, nearby development applications (the city's open data includes development-application history per property/area).

**Deliberately out of v1 scope:**

- Spending broken down by ward — the city publishes operating results by service function, not by ward, so the budget screen stays city-wide even when a ward is selected
- Live/real-time council vote tracking (agenda items and by-laws update continuously; v1 treats this as a periodic pull, not a live feed)
- Any account login, personal tax bill lookup requiring authentication, or anything beyond public open data + a manually entered roll number/value

## Data sources

| Source | What it gives | Format | Update cadence |
| --- | --- | --- | --- |
| [data.mississauga.ca](https://data.mississauga.ca) — Open Data Catalogue | Hundreds of datasets: ward boundaries, budget data, census, development applications, infrastructure | CSV, KML, Shapefile, GeoJSON | Continual additions |
| Published annual Budget & Business Plan PDF | Full operating/capital budget by service area | PDF (hundreds of pages) | Annual |
| [mississauga.ca/apps/#/property](https://mississauga.ca/apps/#/property) | Per-property ward, councillor, zoning, development/permit history | Interactive web app (not a public API found yet) | Live |
| Council/committee agendas and by-laws | Upcoming votes, recent by-laws | Published on mississauga.ca, format TBD | Continuous |

### Confirmed data sources (checked 2026-11-17)

All of the open data below is served from the city's ArcGIS Online org (`services6.arcgis.com/hM5ymMLbxIyWTjn2`), which is what data.mississauga.ca is built on. Every layer supports `query?...&f=geojson`, so no shapefile conversion is needed.

| Pillar | Dataset | Endpoint | Notes |
| --- | --- | --- | --- |
| Who's deciding | **Ward Boundaries** (updated 2026-11-16) | `.../Ward_Boundaries/FeatureServer/2` (note: layer **2**, not 0) | 11 polygons, ~300 KB as GeoJSON. Attributes include `WARD`, `COUNCILLOR`, `PHONE`, `URL`, `IMAGE_URL` — Ward 11 = Brad Butt, 905-896-5011. Covers the ward map and the councillor card. |
| Where my money goes | **Consolidated Statement of Operations – 2012 to 2025** (CSV, updated 2026-07-09) | `https://www.arcgis.com/sharing/rest/content/items/e86fa318eae44578a64de5507b6a4c1e/data` | ~35 rows, 7.5 KB. Revenues and expenses by function (General government, Protection, Transportation, Environmental, Health, Social & family, Recreation & cultural, Planning & development), **actuals and budgets for every year 2012–2025**, in $000s. Enough for v1's budget visual and year-over-year trends. |
| Where my money goes (finer grain) | Approved Operating/Capital Budget appendices | Open data, CSV/Feature Service | Only **2016–2019**. Anything newer at service-area granularity (Fire, Library, etc.) is PDF-only. |
| What's happening | **Growth Management – Active Development Applications** (updated 2026-09-11) | `.../Growth_Management_%E2%80%93_Active_Development_Applications/FeatureServer/0` | 214 points city-wide, has a `Ward` field — `where=Ward=11` returns 17. Includes application number, status, address, description, units, storeys, submission date. |
| What's happening | **eSCRIBE meetings portal** (pub-mississauga.escribemeetings.com) | `POST /MeetingsCalendarView.aspx/GetCalendarMeetings` with `{"calendarStartDate":"YYYY-MM-DD","calendarEndDate":"YYYY-MM-DD"}` | Returns JSON: meeting name, date, location, cancelled flag, links to agenda PDF/HTML. This is the endpoint the portal's own calendar uses — undocumented, not an official API, so treat as best-effort and fail gracefully. Its `Url` field 404s; the working meeting page is `/Meeting.aspx?Id=<id>&lang=English`, and it is an empty shell until an agenda is published (`HasAgenda`). |
| Where my money goes (inflation) | **Statistics Canada CPI, annual average, all-items, Toronto** (table 18-10-0005-01, vector v41695186) | `POST https://www150.statcan.gc.ca/t1/wds/rest/getDataFromCubePidCoordAndLatestNPeriods` with `[{"productId":18100005,"coordinate":"16.2.0.0.0.0.0.0.0.0","latestN":30}]` | Official StatCan Web Data Service, keyless. Toronto is the closest published index to Mississauga. Used to restate past spending in the latest year's dollars: prices rose 37.7% from 2012 (121.8) to 2025 (167.7), so +82% nominal spending growth is +32% real. |
| Where my money goes (per resident — pulled, not yet shown) | **Statistics Canada population estimates, July 1, Mississauga (CY)** (table 17-10-0155-01, 2021 boundaries, vector v1592182774) | Same Web Data Service, coordinate `2134.0.0.0.0.0.0.0.0.0` | 2001–2025. Estimates are revised every year. 2025 = 764,597, down 2.1% from 2024 (781,304). For a per-resident view: 2025 city spending was $1,666 per resident vs $1,490 in 2024 (2025 dollars). |

**Still open:**

- **By-laws:** no feed or dataset found. By-laws are enacted at Council meetings, so the Council agenda/minutes from eSCRIBE may be the practical source; otherwise the mississauga.ca by-laws page would have to be scraped. Decide during the ward-activity screen spec.
- **Agenda items per ward:** eSCRIBE gives meetings and agenda documents, not ward-tagged items. Filtering to "Ward 11 items" would mean parsing agenda HTML for ward mentions — keep v1 to a list of upcoming meetings with agenda links.
- **Property-lookup tool:** no public API found; not needed for v1 given the datasets above.

## Tech approach

Keep it simple given the data refreshes infrequently (budget is annual, ward boundaries rarely change):

- **Front end:** Angular/TypeScript — matches existing professional background, natural portfolio fit.
- **No backend database needed at first.** Data can be pulled periodically (budget PDF parsed once a year, open data CSVs pulled on a schedule) and the site statically generated from that pulled data, rather than running a live server-side database.
- **Ward map:** Leaflet 1.9 with OpenStreetMap standard tiles (keyless; OSMF tile usage policy — attribution, light use; CARTO basemaps now require an API key), greyed with a CSS filter and inverted for dark mode. Draws the Ward 11 boundary from `wards.geojson` and plots development applications as circles sized by proposed homes. Tiles are the only runtime request to a third party.
- Hosting/repo: GitHub — [`cathuyaaung/civic-dashboard`](https://github.com/cathuyaaung/civic-dashboard).

## Naming

Repo name settled: `civic-dashboard`. A friendlier project/display name is still open, if one is wanted beyond the repo slug.

## Next steps

1. ~~Pick a name and create the GitHub repo.~~ Done — `civic-dashboard` repo created, Angular scaffold committed.
2. ~~Confirm ward boundary data.~~ Done — GeoJSON via ArcGIS layer, Ward 11 present (see Confirmed data sources).
3. ~~Find non-PDF budget data.~~ Done — Consolidated Statement of Operations CSV, 2012–2025, by function. Service-area detail beyond that is PDF-only after 2019.
4. ~~Check for a council agenda feed.~~ Done — eSCRIBE JSON endpoint for meetings. By-laws still have no feed.
5. ~~Ward-activity screen.~~ Done — "What's happening" at `/activity`: Ward 11 development applications (newest first, plain-language type, map link) and upcoming meetings, defaulting to Council, General, Planning & Development and Budget committees with an "All meetings" toggle.
6. ~~Data-pull script.~~ Done — `npm run data` (`scripts/fetch-data.mts`) writes wards, budget, development applications and meetings into `public/data/`.
7. ~~First screen.~~ Done — "Who's deciding" councillor card at `/councillor`, read from `wards.geojson`. Committees aren't in any dataset yet.
8. ~~Budget screen.~~ Done — "Where my money goes" at `/budget`: a donut of 2025 spending by service (total in the centre; requested pie, built as a donut so the centre holds the total), a "39¢ of every dollar goes to transportation" headline, stat tiles, ranked bars coloured to match the donut with 2012–2025 sparklines, hover linking donut and list, categories under 0.5% folded into "Other", full year-by-year table. Service colours are fixed per service (`categoryColor`), not by rank. Dollar changes shown alongside percentages, with an "Actual dollars / Adjusted for inflation" switch (Toronto CPI, `adjustForInflation`), defaulting to adjusted. All changes are vs the previous year (`compareYear`), not a fixed start year — 2012 was just where the data begins and the chosen start year changed the story wildly; the long view lives in the 2012–2025 trend lines. A second "Where the money comes from" section uses the same breakdown component (`BudgetBreakdown`) for revenue: 15 revenue lines grouped into 6 plain-language sources (`REVENUE_GROUPS`, which also bridge the 2022 payments-in-lieu split and the 2024 development-contribution reclassification), non-cash revenue (contributed assets, one-time gains) excluded — flagged as "cash only" with an ⓘ — and a money-in vs money-out bar at the top showing the difference as "left over for new roads, buildings and savings". No footnotes.
9. ~~Address → ward lookup.~~ Dropped — replaced by a Ward 11 map on the "What's happening" screen.
10. Per-resident view on the budget screen — population data is pulled (`public/data/population.json`), not yet shown.
11. Open: by-laws (no feed found), committees the councillor sits on (not in any dataset), and what the city means by the "Withheld" application status.
12. Go city-centric with a ward selector (decided 2026-11-17). Smaller than it sounds: `wards.geojson` already holds all 11 wards and councillors (`where: '1=1'`), and the budget, revenue, CPI, population and meetings data was never ward-scoped. Four changes: `WARD = '11'` in `core/ward.ts` becomes a selected-ward signal with an "All of Mississauga" default; `where: Ward=11` in `scripts/fetch-data.mts` becomes `1=1` for development applications, keeping the `Ward` field for client-side filtering; the councillor screen lists all 11 and narrows to one; "Ward 11" comes out of the page titles and the header.
