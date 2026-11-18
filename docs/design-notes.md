# Ward 11 Civic Dashboard — Design Notes

2026-11-17 · Thuya

Live version of this doc: https://claude.ai/artifact/2LZe1n7yDJTr4KZJmAimUw

## Vision and scope

A civic dashboard for Mississauga: what the city spends, what it owes, who lives here, what it costs to live here, and who makes the decisions. Rescoped on 2026-11-17 from three resident questions to the ten sections below — the original three (money, activity, who decides) are now three sections among them.

Built as a portfolio/GitHub project after shelving an earlier neighborhood tool-sharing concept (abandoned because the founder didn't know his neighbors and couldn't seed the trust model it required). Key differences this time:

- No platform, no network effect needed. This part stands, and it is what keeps the project finishable: no accounts, no user-generated content, nobody to recruit — a static site over public data. What was dropped on 2026-11-17 is the single-user rationale, not this.
- Real, already-public data, not scraped or sensitive — pulled from the City of Mississauga's open data catalogue and published budget/council documents.
- City-centric. Reversed on 2026-11-17: ward-only stopped making sense, and the "useful to exactly one person on day one" framing went with it. Ward drill-down was demoted the same day — debt, reserves, census income brackets, school enrolment and CPI are not published per ward, so a ward filter only ever applied to development applications and your own councillor. A filter on two sections out of eight, not the backbone.
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
- **City first; a ward is a filter, not the backbone** (standing decision, 2026-11-17, replacing "v1 is one ward only"; drill-down demoted the same day). Mississauga as a whole is the view. This reverses the earlier ward-only scope, and with it the premise that the dashboard only had to be useful to one person. The no-platform constraints are unaffected: still no accounts, still a static site over public open data. Almost nothing is published per ward — not debt, reserves, census income brackets, school enrolment or CPI — so a ward filter only ever applies to development applications and your own councillor: build it where the data supports it and nowhere else.

## Scope — eight sections, three built

1. **Who's deciding** — all 11 councillors and how to reach them, from the ward boundaries dataset; narrowing to a ward shows just that ward's councillor. Committees aren't in any dataset yet.
2. **Where my money goes** — Mississauga's budget broken down by service area (fire, roads, library, etc.), pulled from the published budget data and shown as a simple visual instead of the dense multi-hundred-page PDF. Stretch: apply the city-wide percentages against the user's own roll number/assessed value for a personalized dollar breakdown, not just the city-wide average.
3. **What's happening** — upcoming council/committee agenda items, recent by-laws, nearby development applications (the city's open data includes development-application history per property/area).

**Deliberately out of v1 scope:**

- Spending broken down by ward — the city publishes operating results by service function, not by ward, so the budget screen stays city-wide even when a ward is selected
- Live/real-time council vote tracking (agenda items and by-laws update continuously; v1 treats this as a periodic pull, not a live feed)
- Any account login, personal tax bill lookup requiring authentication, or anything beyond public open data + a manually entered roll number/value

### The eight sections

Rescoped 2026-11-17. "At a glance" becomes the landing page — one headline number per section — not a nav item. The three built screens become three sections of eight.

| Section | What it answers | Main source | State |
| --- | --- | --- | --- |
| At a glance | The city in one screen | the sections below | Not started |
| Budget | Income and spending by service | Consolidated Statement of Operations CSV | Built |
| Debt and reserves | What the city owes and has put aside | Ontario FIR, Sch. 53 / 60 / 61 | Next |
| Demographics | Age, gender, income brackets, growth | StatCan Census Profile WDS | Population only |
| Cost of living | What it costs here, and how that compares | StatCan CPI, Toronto CMA | Inflation switch only |
| Housing | Homes, prices, rent vs buy, supply, development | CMHC rental survey; development applications | Applications only |
| Education | Funding, spending, students | Ontario public schools enrolment (OnSIS) | Not started |
| Who decides | Mayor, councillors, staff: pay, funders, votes | Ward boundaries; s.284 reports; eSCRIBE minutes | Councillors only |
| Elections | Turnout, votes per seat, candidates | City certified results | Not started |
| Council meetings | Agendas and decisions | eSCRIBE | Agendas built |

The three weakest data points are average home price (TRREB and CREA are licensed, MPAC is not public in bulk), cost of living (no Mississauga CPI exists — only Toronto CMA, which contains it) and anything resembling an official's net worth (no such disclosure exists in Ontario). None of them gates a section.

### Sources for the wider scope (checked 2026-11-17)

Found by search, not yet fetched, so formats are as advertised rather than as proven.

| What | Source | Format | Note |
| --- | --- | --- | --- |
| Net debt, reserves, all Ontario municipalities | [Financial Information Return](https://data2.ontario.ca/dataset/financial-information-return-fir-for-municipalities) (Municipal Act s.294) | CSV / XLSX by year, 1977–current | Sch. 53 net debt, Sch. 60/61 reserves; peer comparison comes free |
| Age, gender, income brackets | [Census Profile web data service](https://www12.statcan.gc.ca/wds-sdw/2021profile-profil2021-eng.cfm) | SDMX REST: JSON/XML/CSV | 2021 is current; 2026 results ≈ early 2027. Mississauga geography code still to look up |
| Students by board | [Ontario public schools enrolment](https://data.ontario.ca/en/dataset/ontario-public-schools-enrolment) (OnSIS) | CSV, yearly | Peel DSB = B66125. Education is provincial/board, not city — the section must say so |
| Rent and vacancy | [CMHC HMIP](https://www03.cmhc-schl.gc.ca/hmip-pimh/en/Help) | CSV export | Behind a licence agreement; read redistribution terms before committing data |
| Council pay and expenses | [Elected Official Remuneration and Expenses](https://www.mississauga.ca/?p=1426) (s.284) | PDF, 2011–2025 + quarterly | Excludes Region of Peel pay |
| 2026 election results | [Official certified results](https://www.mississauga.ca/wp-content/uploads/sites/12/2026/10/28153013/2026-Official-Certified-Results-Summary-Report.pdf) | PDF | Turnout and per-candidate votes by ward |
| Declared conflicts | [MCIA](https://www.ontario.ca/laws/statute/90m50) registry, held by the Clerk | Public inspection | No API; may be request-only |

**The 2026 election changed the council.** Polls were 2026-10-26, term began 2026-11-15. Alvin Tedjo is mayor on 74,479 votes (38.9%), ahead of Carolyn Parrish and Bonnie Crombie; Dipika Damerla, whose campaign dashboard is in `related-work.md`, came fourth on 6.1%. Brad Butt held Ward 11 on 10,099 votes (62.15%). The 2026-11-17 ward pull already carries the new council, so the councillor screen is current — but the mayor is in no ward dataset and is missing from "who decides".

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
10. ~~Per-resident view on the budget screen.~~ Done — a third "Demographics" tab on the budget screen, built on `public/data/population.json` (StatCan 17-10-0155-01, 2001–2025): population headline (the 2025 estimate fell 2.1%), tiles for the year-on-year and since-2001 change and city spending per resident ($1,666 in 2025), a line chart each for population and per-resident dollars (different scales, so never one chart with two axes), and a year-by-year table behind them. Tabs are data-driven — `sides()` in `budget.ts` — so a panel only appears when its data does.
11. Open: by-laws (no feed found), committees the councillor sits on (not in any dataset), and what the city means by the "Withheld" application status.
12. ~~Go city-centric with a ward selector.~~ Partly done, partly dropped (2026-11-17). Done: "Ward 11" is out of the page titles, the header and the nav, and the app reads as a city dashboard. Dropped: the ward selector itself, when the rescope showed almost no dataset has a ward dimension. `WARD = '11'` still sits in `core/ward.ts` and `where: Ward=${WARD}` still filters development applications in `scripts/fetch-data.mts` — both only matter to the two sections that genuinely have a ward, so they stay until those sections are rebuilt.
13. Rescoped to ten sections (2026-11-17) — see "The eight sections" above. Order from here, chosen so each step leaves something finished:
    1. **Debt and reserves from the FIR**, first because it covers every Ontario municipality: it delivers what the city owes and holds *and* establishes the peer-comparison pattern that cost of living and housing reuse later.
    2. Add the mayor to "who decides" — he is in no ward dataset, and the office changed hands on 2026-11-15.
    3. Census demographics (age, gender, income brackets), replacing the population-only tab.
    4. The at-a-glance landing page, once enough real headline numbers exist to fill it honestly.
    5. Elections from the certified 2026 results, then council pay and funders, then voting records from the minutes.
    6. Housing and cost of living last: weakest data, and the licence terms need reading first.
14. Confirm the CMHC licence allows republishing rent figures in a public repo before committing any of it.
15. Find where campaign financial statements are published, or whether they are request-only from the Clerk.
16. Decide what "background" means for an official, given it has to come from their own published biography or the city's, not from a characterisation.
