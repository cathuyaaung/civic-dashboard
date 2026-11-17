# Civic Dashboard

A civic dashboard for Mississauga — answering three questions for a resident:

- **Who's deciding** — councillors and ward info
- **Where my money goes** — city budget, by service area
- **What's happening** — council agenda items, by-laws, development applications

The city as a whole is the default view, with drill-down to a single ward.

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
