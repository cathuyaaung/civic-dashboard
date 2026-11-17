# Related work / prior art

Other civic-dashboard efforts to be aware of — for inspiration, differentiation,
or to avoid duplicating something that already exists.

## "One Mississauga Dashboard" — Dipika Damerla mayoral campaign platform

- **Link:** https://dipikaformayor.ca/platform/one-mississauga-dashboard/
- **Who:** Dipika Damerla, Ward 7 councillor, campaign platform item (mayoral
  run)
- **What it appears to be:** a campaign promise for a city-wide transparency
  dashboard — same general space as this project (council/budget/decisions
  visibility for residents), but as a *municipal-government-run* initiative
  rather than an independent resident-built tool.
- **Status:** page content not yet reviewed in detail (not reachable from
  this session at time of writing — fetch was blocked/redirected). Needs a
  proper read-through.

### Why it matters for this project

- If the city itself ships something like this, it changes the "is there a
  gap here" calculus — worth checking what it actually promises/delivers
  before assuming the gap still exists.
- It's also a campaign promise, not a shipped product — campaign platforms
  frequently don't ship, or ship years later in a much reduced form. That's
  not a reason to ignore it, but it's not a reason to abandon this project
  either.
- Possible differentiation regardless of outcome: this project is resident-
  built, ward-scoped first, source-transparent (public open data + public
  repo), and doesn't depend on who wins an election or whether a city
  initiative gets funded/built/maintained after being promised.

### To do

- [ ] Actually read the platform page content and summarize what's promised
  (scope, timeline, specific data it claims to surface)
- [ ] Check if Mississauga has any existing or in-progress dashboard/open-data
  portal beyond data.mississauga.ca itself
- [ ] Revisit this note once the page has been read properly

## City of Mississauga — Planning Information Hub (ArcGIS StoryMaps)

- **Link:** https://storymaps.arcgis.com/collections/db242b3ddff14816b4421598f65d1bf2
  (title: "Development Data")
- **What it is:** an *existing, already-shipped* City of Mississauga web app
  (launched ~2016, built on ArcGIS StoryMaps templates) presenting the city's
  planning and building data in one place.
- **Who built/maintains it:** the City itself (Policy Planning, Development &
  Design, and Building Divisions supply the data). Development application
  data updates monthly; other layers update on an ongoing basis.
- **What it covers:** planning projects, development applications and
  permits, 25-year growth forecasts (population/employment/housing), urban
  design awards, employment density/trends, vacant lands, environment, and
  existing land use. A "Projects" tab maps significant city-led planning
  projects.
- **What it does *not* cover (per what's documented):** no mention of wards,
  council agendas/votes, or budget — this is a planning/development-data tool,
  not a council-decisions or spending tool.
- Source consulted: [Esri Canada — "Mississauga engages public with new
  planning information hub"](https://resources.esri.ca/news-and-updates/mississauga-engages-public-with-new-planning-information-hub)
  (2016 article; current contents may have evolved since).

### Why it matters for this project

- **Directly overlaps with pillar 3** ("what's happening in Ward 11" —
  development applications specifically). Worth checking whether this hub
  already surfaces development-application data per-ward/per-address well
  enough that this project should just **link to it** for that slice rather
  than rebuild it.
- **Does not overlap** with pillar 1 (councillor info) or pillar 2 (budget) —
  no evidence it touches council votes, agendas, by-laws, or spending data.
  Those two pillars still look like a real gap.
- Reinforces the open question already in `design-notes.md`: check whether
  this hub (or the data behind it) exposes a usable API/export, since it's
  built on ArcGIS — ArcGIS-backed city data often has a queryable REST
  endpoint even when the public-facing page doesn't advertise one.

### To do

- [ ] Open the hub itself and see what a Ward 11 development-application
  lookup actually looks like today
- [ ] Check if the underlying ArcGIS feature layers are queryable directly
  (ArcGIS REST API) — would be a much better data source than PDF/scraping
  if so
