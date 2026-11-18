# Civic Dashboard

A civic dashboard for Mississauga: what the city spends, what it owes, who lives here, what it costs to live here, and who makes the decisions.

Ten sections, three of them built so far:

- **Budget** — income and spending by service area *(built)*
- **Demographics** — population, with age, gender and income brackets to come *(partly built)*
- **What's happening** — council agenda items and development applications *(built)*
- **Debt and reserves**, **cost of living**, **housing**, **education**, **who decides**, **elections**, and an **at-a-glance** landing page *(planned)*

Built as a portfolio project: no accounts, no backend database initially, just public open data surfaced clearly.

Full design notes: https://claude.ai/artifact/2LZe1n7yDJTr4KZJmAimUw

## Running locally

Requires Node.js 22.22+, 24.15+ or 26+.

```sh
npm ci          # install dependencies
npm start       # dev server at http://localhost:4200
npm test        # unit tests (Vitest)
npm run data    # refresh public/data/ from City of Mississauga open data
```

The app reads only the files in `public/data/`, which are committed, so `npm run data` is needed only to pull newer data.

Data: City of Mississauga Open Data (ward boundaries, consolidated statement of operations, active development applications) and the city's eSCRIBE meetings portal.
