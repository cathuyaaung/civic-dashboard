# Accountability data — what was pulled, and what it shows

Pulled 2026-11-17. Everything here comes from public records. The scrapers that
produced it are beside this file; the extracted data is in `data/`.

Scope of this pass: the **conflict-of-interest and voting record** side of the
"who decides" section. Campaign finance, pay and land ownership were researched
but not pulled — see "Not pulled yet" below.

## What was pulled

| Dataset | Source | Coverage | File |
| --- | --- | --- | --- |
| Meeting minutes corpus | eSCRIBE `PostMinutes` HTML | 78 meetings, 2026-01-01 to 2026-11-17, 1.9 MB text | not committed (re-run `scrape_minutes.mjs`) |
| Declaration sections | same | 78 of 78 meetings | `data/declarations-classified.json` |
| Recorded votes | same | 396 votes, 589 side-blocks | `data/votes.json` |
| Per-member tallies | derived | 12 members | `data/member-votes-2026.json` |
| Non-unanimous votes | derived | 47 votes | `data/split-votes-2026.json` |
| Gift declarations | city PDF, Aug 2026 quarter | 11 forms + 7 disposition forms | not committed (scanned, see below) |

`scrape_minutes.mjs` caches each minutes document to disk, so re-running it is
cheap and does not re-hit eSCRIBE.

## The main finding: the conflict registry is empty

Across **78 meetings** in 2026, every single one carried the standing agenda item
`DECLARATION OF CONFLICT OF INTEREST`. Procedural compliance is 100%.

The content of those 78 sections:

- **76** recorded as `Nil`, `None`, or "there were no conflicts of interest"
- **2** actual declarations

Both of the two were made by **citizen committee members** of the Heritage
Advisory Committee, not by elected officials:

- 2026-01-06 — Jason De Brum, Citizen Member, on a request to demolish heritage
  listed properties at 12 and 16 Ontario Street West (Ward 11)
- 2026-07-21 — Alex Hardy, Citizen Member, on the proposed heritage designation
  of 1 Godfrey's Lane (Ward 1), because the heritage consultant on the item had
  worked on a project involving him within the past year

**No member of Council declared a pecuniary interest in any of the 78 meetings.**
Of 589 recorded-vote side-blocks, **zero** were labelled as a conflict
recusal — the tally labels observed were only YES, NO, ABSTAIN and ABSENT.

This is the finding, not a failure to find one. State it as the measured
emptiness of the register, and leave the inference to the reader.

## Voting record, 2026

396 recorded votes. **47 of them (11.9%) were not unanimous.** Per member,
surname-normalised, with all 589 side-blocks reconciling exactly against the
counts stated in the minutes:

| Member | YES | NO | ABSTAIN | ABSENT | Total | YES as % of votes cast |
| --- | --- | --- | --- | --- | --- | --- |
| Fonseca | 394 | 0 | 0 | 2 | 396 | 100.0% |
| Horneck | 388 | 2 | 1 | 4 | 395 | 99.2% |
| Dasko | 390 | 2 | 0 | 1 | 393 | 99.5% |
| Hart | 378 | 0 | 0 | 15 | 393 | 100.0% |
| Reid | 373 | 1 | 2 | 17 | 393 | 99.2% |
| Damerla | 306 | 7 | 27 | 52 | 392 | 90.0% |
| McFadden | 369 | 1 | 4 | 18 | 392 | 98.7% |
| Butt | 370 | 2 | 0 | 13 | 385 | 99.5% |
| Tedjo | 353 | 3 | 3 | 24 | 383 | 98.3% |
| Kovac | 350 | 0 | 0 | 14 | 364 | 100.0% |
| Mahoney | 221 | 0 | 0 | 48 | 269 | 100.0% |
| Parrish | 168 | 0 | 1 | 48 | 217 | 99.4% |

Read this carefully before building on it:

- Totals differ because members joined or left during the year. Natalie Hart won
  the Ward 5 by-election after Carolyn Parrish became mayor; Alvin Tedjo became
  mayor on 2026-11-15, after this window.
- A recorded vote is not every vote. Most items pass on a verbal motion with no
  recorded tally, so the denominator is "votes that were recorded", not "all
  decisions".
- **Near-unanimity is the norm.** Six of twelve members cast no recorded NO vote
  at all in 2026. Absent is not a position.
- Damerla is the clear outlier on 27 abstentions and 7 NO votes. She also sat as a
  mayoral candidate through much of this period, which is an obvious confound.
- An abstention is **not** a declared conflict. Several of Damerla's abstentions
  sit on items a candidate would plausibly abstain from on appearance grounds,
  and the declaration section for those same meetings reads `Nil`. The gap
  between "abstained" and "declared" is a question to ask, not an answer.

## The applicant-name problem

The planned join — donors against development applicants — does not work off the
GIS layer. The live ArcGIS schema for `ActiveDevApps` has 23 fields and **no
applicant, owner or agent name**. Confirmed against the live service, not just
the cached copy.

What it does have is **`PIN`** — the land registry Property Identification
Number, populated on all 17 cached features. That is the bridge to ownership, but
only via OnLand at roughly $36 per parcel, with no bulk access.

Applicant names *are* present in the minutes text, and they are extractable.
Real examples pulled from the 2026 corpus:

- 128 Lakeshore Developments Inc. (Ontario Land Tribunal appeal, 128 Lakeshore Rd E, Ward 1)
- EMTC Holdings Inc. (Ontario Land Tribunal appeal)
- 580 Hazelhurst Road GP Inc. (OPA 26-3 W2)
- IMH 1970 & 1980 Fowler Drive Ltd. (Ward 8)
- Whitehorn Investments Limited / Lynrob Investments Limited
- Suncor Energy Products Partnership (Committee of Adjustment A80/25, Ward 8)
- Quickchill Mobile Refrigeration Ltd.

Note the shape of these names: most are single-purpose vehicles named after the
address itself. That matters, because Ontario's register of individuals with
significant control is held at the corporation's own office and is disclosed only
to law enforcement, tax and regulators — it is not public. Extracting the company
name is easy; getting behind it is closed by statute.

Extraction is viable but needs filtering. The naive regex also catches the
eSCRIBE footer ("Powered by eSCRIBE Software Ltd.", once per file) and truncated
phrases like "Diversity and Inc[lusion]".

## The gift declarations are a dead end

The quarterly "Declarations" PDFs on the city site are **not** the
Municipal Conflict of Interest Act register. They are gift declarations under the
Council Code of Conduct: each member attests to having received no gift or
benefit over $500 in the quarter.

The August 2026 filing, examined in full:

- 24 pages, 9.4 MB, **scanned images of signed paper forms**
- 11 quarterly councillor declarations and 7 disposition forms
- Every one a nil return — no gifts, "No Items received"
- OCR of the handwritten name fields is largely unusable; only a few forms were
  typed and are machine-readable
- Routing is inconsistent between forms: some say to file with the Integrity
  Commissioner, others with the Director of Legislative Services and City Clerk

The forms name the Integrity Commissioner as **Principles Integrity**
(`postoffice@principlesintegrity.org`). Secondary sources naming an individual
commissioner are out of date — go by the forms.

As a conflict detector this is worthless: it is all nil returns, and it is not
machine-readable. As a transparency finding it is useful: a register kept as
scanned paper cannot be audited at scale.

## Integrity Commissioner reports stop in 2023

Council amended the Code of Conduct in February 2022 to require **quarterly**
reporting instead of one annual report. The city's public Integrity Commissioner
reports page lists seven documents, the most recent dated **2023-03-14**.

If quarterly reporting has continued, the reports are not on that page. That is a
checkable gap worth raising with the Clerk before publishing a claim about it.

## No lobbyist registry

Lobbyist and gift registries are optional under Ontario law. Mississauga
investigated a lobbyist registry and chose not to establish one, alongside
London, Brantford, Milton, Caledon and Greater Sudbury. Toronto, Ottawa, Vaughan
and Hamilton have them.

Still to confirm against the city's own site rather than a third-party summary.
If it holds, it is a concrete and defensible finding: who lobbies Mississauga
council is not recorded, while in Toronto it is.

## Not pulled yet

- **Campaign contributions.** Mississauga does **not** post candidate financial
  statements online. The 2022 and 2024 pages list who filed, with no documents
  attached, and say statements are "available upon request" by email to
  `Election.Office@mississauga.ca`. Contributor lists over $100 are public by
  statute, but getting them means a request, not a scrape.
- **2026 statements** are not filed until **2027-03-30**, so there is no donor
  data for the current term either way.
- **Council pay and expenses** — s.284 reports, PDF, 2011–2025 plus quarterly.
- **Region of Peel.** Mississauga councillors also sit on Regional Council, where
  significant planning and housing decisions are made. None of the above covers
  it. Peel keeps its own minutes, votes and declarations, and roughly half the
  conflict surface is there.

## Standing cautions

- These numbers are scraped from minutes and **not verified against official
  records**. Before publishing any per-member figure, reconcile a sample by hand.
- The records support "received money from", "voted on", "did not declare". They
  do not support "corrupt". Keep the published claim narrower than the suspicion:
  a narrow claim is durable and a broad one is both legally exposed and easy to
  dismiss.
- Absence of a declaration is not evidence of a hidden interest. It is evidence
  about the register.
