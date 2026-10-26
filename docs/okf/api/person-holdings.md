---
type: API Endpoint
title: Person stock holdings and P&L
description: Dated personal, fund or tracked-strategy holdings, sourced valuations and unrealized position profit or loss.
resource: "../../../src/app/api/people/[id]/holdings/route.ts"
tags: [api, admin, people, stocks]
---

# Person holdings

Every person detail page has a holdings section and jump link, including people
without published positions. An empty section says holdings and P&L are unknown;
it does not imply no investments or zero profit. Latest disclosed snapshots are
dated, linked to their source and marked as older when more than seven days old.
They are not live brokerage positions. Partial coverage is explicitly labelled.

The initial research catalog (`src/server/data/personHoldings.json`) covers 70
people, 104 distinct public Autopilot strategies, 108 person/strategy connections
and 324 visible security rows. All 104 official JSON sources were opened and
validated on 2026-10-25; source URLs and SHA-256 hashes are retained. Holdings are
dated 2026-10-25, while strategy returns have their own source dates. These are
tracked-strategy positions and client-strategy returns, never asserted to be
the subjects' personal holdings or profits. Firm principals can share the same
strategy. ETFs and other listed securities retain their published names. The
public sources generally expose only three positions; the number and weight of
additional unpublished positions are shown rather than invented. Landing-page
creators Molly Cantillon and Antonio Marrazzo have no public strategy snapshot
in the reviewed catalog, so they have the empty state.

Autopilot does not publish the acquisition cost and position value needed for
individual stock P&L. All Autopilot-imported position P&L therefore remains undisclosed; the primary
company cost tables described below support dated P&L for nine holdings.
The separate portfolio-return panel shows available last-month, YTD, one-year
and since-inception returns, along with dates and the publisher's methodology.
It never substitutes these returns for individual stock or personal P&L.

## Storage and updates

This feature requires its initial application deployment and migration
`0218_person_holdings.sql`. Only the local migration has been applied during
implementation; no production deployment was requested or performed. Bundled
source snapshots provide the initial baseline. A saved `PersonHoldings` record
overrides matching portfolio keys; subsequent deployments do not overwrite those
edits. Newly introduced source keys remain available.
Native overrides are included in People backups/restores. Overrides win per portfolio key; newly added primary-source keys remain visible alongside older saved strategy keys. Updates invalidate
the People cache and do not subsequently require a deployment.

`GET /api/people/:id/holdings` returns `{ portfolios: [...] }` and an `ETag`.
Unknown people return 404. An existing person with no published holdings returns
an empty array. `PUT` requires an authenticated admin and the current `If-Match`
header. It merges the supplied portfolio keys while preserving other portfolios,
locking the Person row to make the comparison and write atomic. Missing ETag
returns 428, concurrent changes 412, invalid source data 400 and an attempt to
replace newer evidence with an older snapshot 409. Empty input is a no-op; it
does not clear published portfolios. A changed key replaces its complete dated
snapshot, including positions removed by the new disclosure.

Each snapshot records `key`, `name`, `scope` (`personal`, `fund`, `strategy`),
`asOf`, `checkedAt`, `sourceUrl`, optional `sourceDataUrl`, `complete`,
`undisclosedCount`, `undisclosedWeightPercent` and `holdings`. Securities contain
`symbol`, `name`, `weightPercent`, `shares`, `side`, `currency`, `costBasis`,
`marketValue`, `valuationDate`, `costSourceUrl` and `valueSourceUrl`. Unknown
figures are null, not zero. Cost basis and market value are **whole-position
totals in the same stated currency**, not per-share prices. For a short position,
the entry total is the initial sale proceeds and the market total is the cost
to cover. No currency conversion is inferred.

Unrealized P&L is market value minus cost basis for longs, and the inverse for
shorts; its percentage is that result divided by the positive entry total.
Both evidence URLs and a dated valuation are required. The result excludes
dividends and realized gains. A missing or zero entry basis produces an unknown
percentage/P&L rather than infinity or a fabricated estimate. Real zero gains
and a zero current value are valid. Transaction amount ranges, share weights,
client assets and portfolio returns cannot establish acquisition costs.

The optional `performance` records source-date, start-date, decimal returns and
the publisher's disclosure. Return ratios are normalized to twelve decimal
places so harmless floating-point/JSON compilation differences cannot trigger
repeated updates. Full source response hashes remain in the research audit.

## Refresh and replay

`npx tsx scripts/people/holdings.ts --refresh` opens the public strategy JSON
sources linked by the reviewed Autopilot people catalog and rebuilds the bundled
research snapshot. Every response and identity is validated before the file is
written. This changes a research artifact, not runtime overrides.

`npx tsx scripts/people/holdings.ts` previews runtime updates; add `--apply` to
save, and `--base https://www.chronopin.com` for production after the feature is
deployed. `--refresh --apply` fetches fresh sources and saves them through the
API in one run. It never creates or renames people, authenticates using existing
admin environment variables, saves before-images for changed people, sends
ETags, preserves other portfolio keys and verifies each update by a new GET.
Run this refresh when updating holdings; there is no brokerage connection or
claim of continuous synchronization. If evidence cannot be refreshed, the
previous dated snapshot remains available with its age shown.

## Validation

Four focused test suites (14 passing tests) cover long/short P&L, gains/losses/zero/unknown values,
source/date validation, complete versus partial holdings, duplicate positions,
scope labels, empty profiles, dated strategy returns, concurrent edits and
preserving other portfolios. Local authenticated API checks reject missing and
stale preconditions and invalid data without changing saved holdings; anonymous
writes return 401. Local dry-run/application reports all 70 people unchanged
against the bundled baseline. TypeScript and targeted ESLint pass. All 73 checked local detail pages (70 populated and three empty profiles)
render their holdings section and jump links; every imported ticker and
portfolio-return panel was checked. Japanese, Chinese and Spanish sections
also render correctly. Chrome checks verify the Burry table, dates, coverage
and separate return cards. The production endpoint still returns 404 pending
deployment.

## Primary sources added after the source-quality review

Official SEC manager filings and House annual reports now lead the relevant
profiles, with Autopilot strategies displayed separately afterward. The reviewed
registry is `scripts/people/data/primary-holdings-sources.json`; the compiled
baseline is `src/server/data/personHoldingsPrimary.json`. It adds 22 snapshots
and 1,388 position/owner rows across 21 people. Thirteen manager disclosures
cover 14 named people (the Baker brothers share one firm). Seven House annual
reports contribute 566 stock/owner rows. Nine Berkshire cost-table holdings
contribute sourced, cumulative unrealized P&L at 2025-12-31; the other primary
positions still lack purchase cost. None of this is annual personal income.

SEC submissions identify the exact filer and latest report period. Covers and
XML information tables are opened and cross-checked for entry counts and dollar
totals. Later RESTATEMENT amendments replace earlier reports; subsequent NEW
HOLDINGS amendments add to the effective base. Duplicate CUSIP share lines are
aggregated, while put/call, principal-amount, warrant and debt rows are excluded.
Option notional values are never treated as option premiums or equity share
positions. Dollar figures from these post-2023 filings are not multiplied by
1,000. The display includes up to the 100 largest reported share positions,
with the displayed/available counts stated and the complete original filing
linked. Weights refer to the reported non-option share positions, not all fund
assets. Missing tickers are represented explicitly as CUSIP identifiers; no
ticker is guessed from an issuer name.

House annual indexes are keyed by reporting year, not publication year. Exact
first/last name and district resolve the reviewed filers, then the printed name
and report year are checked. The parser reads the asset-value column rather
than the adjacent income column, carries asset/value continuations across page
headers and stops before Schedule B transactions. Only positive-value [ST]
assets are included. Family owners remain distinct; multiple accounts for an
issuer and owner combine disclosed exact values or range endpoints. Symbols
are reproduced as filed, including historical symbols. None/zero assets,
options and other asset types are excluded. Unknown bounds remain unknown;
no range midpoint or reconstructed position is substituted.

The holdings payload additionally supports `identifierType` (`ticker` or
`cusip`), `owner` (`self`, `spouse`, `joint`, `dependent`), optional
`marketValueLow`/`marketValueHigh`, `filedDate` and `coverageNote`. A valuation
range requires its source and date, cannot coexist with an exact value and
cannot generate P&L. Ownership and ranges render directly in the native table.
Long tables scroll within their card; small tables remain fully expanded.

`python3 scripts/people/primaryHoldings.py` previews the source plan;
`--refresh` fetches and validates the reviewed sources and rebuilds the primary
catalog. HTTP evidence, source URLs and SHA-256 hashes are retained; failures
leave the prior artifact intact. This script writes no runtime data. Use
`npx tsx scripts/people/holdings.ts --file src/server/data/personHoldingsPrimary.json`
to preview runtime merges, adding `--apply` and the appropriate `--base` to save.
The primary and Autopilot catalogs refresh independently and cannot overwrite
each other. The native API merges and concurrency protections apply to both.

Primary-source limitations are explicit: Scion's newest available 13F ends
2025-09-30; it does not establish Burry's 2026 holdings. Renaissance and
Bridgewater describe associated firms, including after their founders' death
or departure, rather than those founders' personal investment decisions.
Crenshaw's latest annual report located in the reviewed indexes covers 2024;
it is dated accordingly. Ro Khanna's 2025 annual report is a 353-page image-only
PDF with no readable asset text; it remains a documented OCR/manual-review gap
and no positions are inferred from transaction reports. Creators without a
better public disclosure retain their separately labelled strategy snapshots.

Validation adds six Python extraction tests to the 21 TypeScript tests. These
cover restatements/additive amendments, unit and cover-total checks, option and
principal-amount exclusions, House page continuations, family ownership,
valuation ranges, zero/None assets versus income, primary-source priority and
preserving newly added baselines alongside runtime overrides. Every primary
profile, native field and rendered position row is checked against its catalog.
This source upgrade is local and ready for the initially required deployment;
production still returned 404 for the new endpoint during verification.
