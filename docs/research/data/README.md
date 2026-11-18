# Raw accountability data

Pulled 2026-11-17 from public records. Findings and caveats are in
[`../accountability-data.md`](../accountability-data.md) — read that before using
any of this.

This is a **point-in-time snapshot**, committed so the analysis stays
reproducible. eSCRIBE re-posts and amends minutes, so a later re-scrape will not
necessarily match. Nothing here is verified against official records.

| Path | What it is |
| --- | --- |
| `minutes-2026/` | 78 meeting minutes as extracted text, `YYYY-MM-DD_<id8>.txt`, 2026-01-01 to 2026-11-17 |
| `minutes-index.json` | One row per meeting: id, name, date, source URL, text length, vote count |
| `declarations-classified.json` | The `DECLARATION OF CONFLICT OF INTEREST` section of each meeting, with a `nil` flag |
| `votes.json` | All 396 recorded votes: subject, each side with its stated count and named members, outcome |
| `member-votes-2026.json` | Per-member YES/NO/ABSTAIN/ABSENT tallies, surname-normalised |
| `split-votes-2026.json` | The 47 votes that were not unanimous |
| `escribe-calendar-2026.json` | Raw eSCRIBE calendar response, all 200 meetings with their document links |
| `arcgis-devapps-schema.json` | Live field schema for the `ActiveDevApps` layer — the evidence it carries no applicant name |
| `gift-declarations/` | Text extracted from the city's August 2026 quarterly gift declarations PDF |

## Regenerating

From the repo root:

```sh
node docs/research/scrape_minutes.mjs <outdir>   # fetches + caches minutes, extracts declarations and votes
node docs/research/classify.mjs <outdir>         # re-classifies declaration sections, summarises votes
node docs/research/normalize.mjs <outdir>        # surname-normalises members, reconciles against stated counts
```

`scrape_minutes.mjs` caches each minutes document to `<outdir>/minutes/`, so
re-runs are cheap and do not re-hit eSCRIBE. `normalize.mjs` prints how many vote
blocks reconcile against the counts printed in the minutes; on this snapshot all
589 reconcile, which is the check that the parse is sound.

## Sources

- Minutes and votes — eSCRIBE, `https://pub-mississauga.escribemeetings.com`
- Development application schema — `https://services6.arcgis.com/hM5ymMLbxIyWTjn2/arcgis/rest/services/Growth_Management_%E2%80%93_Active_Development_Applications/FeatureServer/0`
- Gift declarations — `https://www.mississauga.ca/wp-content/uploads/2026/08/04143226/Declarations-Aug-2026.pdf`
  (24 pages, 9.4 MB of scanned paper; the PDF itself is not committed)
