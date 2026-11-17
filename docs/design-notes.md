# Ward 11 Civic Dashboard — Design Notes

2026-11-17 · Thuya

Live version of this doc: https://claude.ai/artifact/2LZe1n7yDJTr4KZJmAimUw

## Vision and scope

A single-user civic dashboard answering three questions from the point of view of someone who actually lives here: where does my money go, what is my city doing that affects me, and who's making those decisions.

Built as a portfolio/GitHub project after shelving an earlier neighborhood tool-sharing concept (abandoned because the founder didn't know his neighbors and couldn't seed the trust model it required). Key differences this time:

- No platform, no network effect needed. One person (the builder) gets full value alone; nobody else has to adopt it for it to be worth building.
- Real, already-public data, not scraped or sensitive — pulled from the City of Mississauga's open data catalogue and published budget/council documents.
- Scoped small enough to actually finish. Mississauga-wide, all 11 wards, is a stretch goal; v1 is one ward only.
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

## v1 scope — the three pillars

1. **Who's deciding** — Councillor Brad Butt (Ward 11): contact info, committees he sits on, how to reach him.
2. **Where my money goes** — Mississauga's budget broken down by service area (fire, roads, library, etc.), pulled from the published budget data and shown as a simple visual instead of the dense multi-hundred-page PDF. Stretch: apply the city-wide percentages against the user's own roll number/assessed value for a personalized dollar breakdown, not just the city-wide average.
3. **What's happening in Ward 11 specifically** — upcoming council/committee agenda items, recent by-laws, nearby development applications (the city's open data includes development-application history per property/area).

**Deliberately out of v1 scope:**

- All 11 wards (single-ward only, for now)
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
8. ~~Budget screen.~~ Done — "Where my money goes" at `/budget`: 2025 total, ranked bars by service with 2012–2025 sparklines and change, categories under 0.5% folded into "Other", full year-by-year table.
9. ~~Address → ward lookup.~~ Dropped — replaced by a Ward 11 map on the "What's happening" screen.
10. Open: by-laws (no feed found), committees the councillor sits on (not in any dataset), and what the city means by the "Withheld" application status.
