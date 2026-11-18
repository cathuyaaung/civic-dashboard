# Civic Dashboard — context for Claude Code

This file is here so any Claude Code session opened in this repo picks up
the project's intent automatically, without the person having to re-explain
it.

## What this is

A civic dashboard for **Mississauga**, built by Thuya as a portfolio/GitHub
project: what the city spends, who lives here, what it costs to live here,
and who makes the decisions.

**Rescoped on 2026-11-17** from three resident questions to ten sections.
"At a glance" is the landing page — one headline number per section, each
linking through — not a nav item:

1. **At a glance** — the city in one screen, linking through to each section
2. **Budget** — income and spending by service area *(built)*
3. **Debt and reserves** — what the city owes and what it has put aside *(next)*
4. **Demographics** — age, gender, income brackets, growth *(population only so far)*
5. **Cost of living** — what it costs to live here, compared with other cities
6. **Housing** — homes, prices, rent vs buy, supply, new development *(applications only)*
7. **Education** — funding, spending, students
8. **Who decides** — mayor, councillors, senior staff: pay, funders, voting records *(councillors only)*
9. **Elections** — turnout, votes per seat, candidates
10. **Council meetings** — agendas and decisions, past and future *(agendas built)*

Three of these are built. See "The eight sections" in
`docs/design-notes.md` for the per-section data source and state.

**Ward drill-down was demoted the same day.** Debt, reserves, census income
brackets, school enrolment and CPI are not published per ward, so a ward
filter only ever applied to development applications and your own
councillor — a filter on two sections, not the backbone. Ward 11
(Councillor Brad Butt) is the builder's own ward and handy to test against.

Full design rationale, data sources, and open questions:
[`docs/design-notes.md`](./docs/design-notes.md) — read that first before
making architectural decisions. It's a mirror of a living design doc; if it
looks out of date, ask the person whether the doc has moved on.

## Why it's built this way

This is explicitly **not a platform** — no accounts, no user-generated
content, no network effect required. It replaced an earlier neighborhood
tool-sharing app concept that was shelved because it needed other people to
adopt it and the founder couldn't seed that. The no-platform constraint is
what keeps this project finishable, and it still holds: a static site over
already-public city open data.

**The ward-only scope was reversed on 2026-11-17.** The project is now
city-centric, with drill-down to a ward (see "Design principles" below). The
single-user premise — "useful to exactly one person on day one" — went with
it; a city-wide view serves any resident. What did *not* change is the
no-platform constraint above: dropping ward-only is not licence to add
accounts or anything needing an audience to seed.

## Tech approach

- **Angular/TypeScript** front end (matches the person's professional
  background — this is also a resume piece, so idiomatic, well-structured
  Angular matters, not just "something that works")
- **No backend database at first.** Data refreshes infrequently (budget is
  annual, ward boundaries rarely change), so the plan is periodic data pulls
  + a statically generated site, not a live server.
- **A ward map, not an address lookup.** The planned address → ward
  point-in-polygon lookup was dropped on 2026-11-17: the user already knows
  their ward, and the city's Address dataset already carries a `WARD` per
  address. Instead, the "What's happening" screen has a Leaflet map of the
  Ward 11 boundary with development applications plotted. Map tiles are the
  one thing fetched from a third party at runtime (OpenStreetMap standard
  tiles: keyless, but under the OSMF usage policy; CARTO now needs a key).

## Design principles

- **Visual first — it should feel like a dashboard, not a document.**
  (Standing decision, 2026-11-17.) The audience is an average resident, so
  lead each screen with something visual: maps, charts, stat tiles, hero
  numbers, colour and clear hierarchy. Plain lists and paragraphs are
  supporting detail, not the main event. Things cannot look dull. Follow the
  dataviz skill's rules so "visual" stays honest (no misleading charts,
  accessible colours, a table view behind every chart).
- **No footnotes — easy to read is the whole point.** (Standing decision,
  2026-11-17.) A resident should understand a screen without reading notes
  at the bottom. Put explanations where the eye already is: in labels
  ("Property taxes (City's share)"), short qualifiers in headings ("cash
  only"), or in the visual itself (e.g. a money-in vs money-out bar instead
  of a paragraph about surpluses). Nuance that truly doesn't fit goes in a
  small on-demand ⓘ info tip (`app-info-tip`), used sparingly — never a
  notes list. Source attribution at the bottom is fine.
- **Officials: the public record only, and name the gap.** (Standing
  decision, 2026-11-17.) Ontario municipal officials file no statement of
  assets or net worth, so this dashboard never carries one — inferring one
  would be guesswork about private finances presented as fact. What it does
  carry is sourced and linkable: pay and expenses from the city's annual
  Municipal Act s.284 remuneration reports, senior staff pay from the
  provincial Public Sector Salary Disclosure list, campaign funding from the
  statements filed with the Clerk, and declared conflicts from the Municipal
  Conflict of Interest Act registry. Each profile also says plainly that no
  net-worth disclosure is required, so the absence is part of the story.
- **Positions are voting records, not characterisations.** (Standing
  decision, 2026-11-17.) "Where they stand" is answered with how a member
  actually voted on recorded votes, parsed from the eSCRIBE minutes — and
  for candidates, who have no voting record, with quotations from their own
  published platform, linked to it. Never a summary of someone's views in
  the dashboard's own voice.
- **City first; a ward is a filter, not the backbone.** (Standing decision,
  2026-11-17, replacing "v1 is one ward only"; drill-down demoted the same
  day.) Mississauga as a whole is the view. Almost nothing is published per
  ward — not debt, reserves, census income brackets, school enrolment or
  CPI — so a ward filter only ever applies to development applications and
  your own councillor. Build it where the data supports it and nowhere else,
  and never let a selector imply a ward number exists when it doesn't.

## Current state

Three of the ten sections have screens. See "Next steps" at the bottom of
`docs/design-notes.md` for what's actually queued next. Data sources for
those three were confirmed on 2026-11-17, and sources for the wider scope
were found on the same day but not yet fetched (see "Confirmed data sources"
and "Sources for the wider scope" in the design notes). `npm run data` (`scripts/fetch-data.mts`)
pulls them into `public/data/`, which is committed; the app reads those files
with `httpResource`, never the city's APIs directly. The "Who's deciding"
screen, the "Where my money goes" budget screen and the "What's happening" activity screen exist.

That work was merged into `main` on 2026-11-17 (PR #1, from the
`data-pipeline` branch). The budget screen has three tabs — spending,
revenue and a population-only Demographics tab — and the tab list is
data-driven (`sides()` in `budget.ts`), so a panel only appears when its
data does.

**Next: debt and reserves from the Ontario Financial Information Return.**
Chosen first because the FIR covers every Ontario municipality, so it
delivers what the city owes and holds *and* establishes the peer-comparison
pattern that cost of living and housing reuse later.

**The 2026 election changed the council.** Polls were 2026-10-26 and the
term began 2026-11-15. Alvin Tedjo is mayor; Brad Butt held Ward 11. The
ward boundary pull of 2026-11-17 already carries the new council, so the
councillor screen is current — but the mayor appears in no ward dataset and
is missing from "who decides" entirely. Don't assume pre-election facts
about who holds office.

## Working style notes

- The person wants to actually finish this one — prior ideas were
  intentionally abandoned when they turned out to need a user base, or when
  the problem was already well-solved elsewhere. Keep solutions scoped and
  simple; don't gold-plate.
- Prefer real public data over anything scraped from a page not meant to be
  machine-read, unless no API/file alternative exists — check before
  assuming scraping is necessary.
