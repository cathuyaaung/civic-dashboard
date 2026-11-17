# Civic Dashboard — context for Claude Code

This file is here so any Claude Code session opened in this repo picks up
the project's intent automatically, without the person having to re-explain
it.

## What this is

A single-user civic dashboard for **Ward 11, Mississauga** (Councillor Brad
Butt), built by Thuya as a portfolio/GitHub project. It answers three
questions from a resident's point of view:

1. **Who's deciding** — councillor info, committees, contact
2. **Where my money goes** — city budget by service area, visualized instead
   of buried in a hundreds-of-pages PDF
3. **What's happening in Ward 11** — council/committee agenda items, by-laws,
   nearby development applications

Full design rationale, data sources, and open questions:
[`docs/design-notes.md`](./docs/design-notes.md) — read that first before
making architectural decisions. It's a mirror of a living design doc; if it
looks out of date, ask the person whether the doc has moved on.

## Why it's built this way

This is explicitly **not a platform** — no accounts, no other users, no
network effect required. It replaced an earlier neighborhood tool-sharing app
concept that was shelved because it needed other people to adopt it and the
founder couldn't seed that. This project's whole premise is that it's useful
to exactly one person (the builder) on day one, using already-public city
open data.

v1 is scoped to one ward only. All 11 wards is an explicit stretch goal, not
a v1 requirement — resist scope creep back toward "the whole city."

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

## Current state

All three pillars have screens. See "Next steps" at
the bottom of `docs/design-notes.md` for what's actually queued next. Data
sources for all three pillars were confirmed on 2026-11-17 (see "Confirmed
data sources" in the design notes). `npm run data` (`scripts/fetch-data.mts`)
pulls them into `public/data/`, which is committed; the app reads those files
with `httpResource`, never the city's APIs directly. The "Who's deciding"
screen, the "Where my money goes" budget screen and the "What's happening" activity screen exist.

## Working style notes

- The person wants to actually finish this one — prior ideas were
  intentionally abandoned when they turned out to need a user base, or when
  the problem was already well-solved elsewhere. Keep solutions scoped and
  simple; don't gold-plate.
- Prefer real public data over anything scraped from a page not meant to be
  machine-read, unless no API/file alternative exists — check before
  assuming scraping is necessary.
