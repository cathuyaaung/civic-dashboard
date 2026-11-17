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

This address/ward/roll-number lookup is also the first real technical problem the dashboard needs to solve: the city publishes ward boundaries as open data (shapefile/GeoJSON), so an address → ward mapping in the real app would be a point-in-polygon lookup against that boundary data, the same way the city's own property tool resolves it.

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

**Open question:** whether the property-lookup tool and the council agenda/by-law pages expose a public API or only an interactive web UI — needs checking before deciding how v1 pulls this data (API call vs. scraping a published page vs. manual periodic download).

## Tech approach

Keep it simple given the data refreshes infrequently (budget is annual, ward boundaries rarely change):

- **Front end:** Angular/TypeScript — matches existing professional background, natural portfolio fit.
- **No backend database needed at first.** Data can be pulled periodically (budget PDF parsed once a year, open data CSVs pulled on a schedule) and the site statically generated from that pulled data, rather than running a live server-side database.
- **Address → ward lookup:** point-in-polygon check against the city's ward boundary GeoJSON/shapefile from the open data catalogue — this is the first concrete technical piece (see Anchor facts).
- Hosting/repo: GitHub — [`cathuyaaung/civic-dashboard`](https://github.com/cathuyaaung/civic-dashboard).

## Naming

Repo name settled: `civic-dashboard`. A friendlier project/display name is still open, if one is wanted beyond the repo slug.

## Next steps

1. ~~Pick a name and create the GitHub repo.~~ Done — `civic-dashboard` repo created, Angular scaffold committed.
2. Check whether the open data catalogue exposes ward boundary data as a direct file (GeoJSON/shapefile) and confirm it covers Ward 11.
3. Locate and pull the budget data in a usable (non-PDF-only) form, or confirm PDF parsing is the only option.
4. Check whether council agendas/by-laws have any API or structured feed, or only published web pages.
5. Screen-by-screen spec for the three pillars (councillor info, budget breakdown, ward activity).
