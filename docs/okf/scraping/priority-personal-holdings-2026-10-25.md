# Priority personal holdings — 2026-10-25

Applied directly through the authenticated holdings API to production. All seven
previously empty priority profiles now have a dated personal/household disclosure
snapshot. Existing fund, strategy and trade sources are preserved. The same
catalog is available locally. No deployment was performed.

## Saved coverage

| Person | Holding/owner rows | Evidence date | Coverage |
| --- | ---: | --- | --- |
| Donald J. Trump | 1 | 2025-12-31 | Selected DJT revocable-trust interest, 114,750,000 restricted common shares, reported value over $50m; not his full portfolio. |
| JD Vance | 5 | 2025-12-31 | Part 6 brokerage ETFs/trust units; household owner unspecified in source. |
| Tommy Tuberville | 51 | 2025-12-31 | Positive-value ticker-identified stocks and funds, with self/joint ownership preserved. |
| Ron Wyden | 28 | 2025-12-31 | Positive-value common stocks aggregated by issuer/owner, preserving spouse versus dependent ownership. |
| Marjorie Taylor Greene | 86 | 2026-01-05 | 185 Schedule A [ST] entries combined by issuer; termination report, not annual/year-end. |
| Ro Khanna | 12 | 2025-12-31 | Selected common stocks in the dependent trust on Schedule A page 2; not complete household coverage. |
| Markwayne Mullin | 79 | Report signed 2026-03-10 | 10 self retirement, 10 spouse retirement and 59 other reportable household/entity stock interests; no precise valuation day asserted. |

262 additional holding/owner rows. Every snapshot remains explicitly partial:
none establishes a live brokerage balance or the person's complete finances.
Acquisition costs and P&L are unknown, not zero. Disclosed asset ranges are not
trade consideration, cost basis, exact market values or portfolio weights.
Mullin's signing date is a report reference date; no exact valuation day or
filing/publication date is inferred from it. His monetary fields remain null.

## Sources and extraction

The catalog `src/server/data/personHoldingsReported.json` retains opened source
URLs, SHA-256 hashes of downloaded PDFs, and coverage notes. "Reported" is the
existing runtime catalog name; the seven additions use official disclosure
content, rather than Autopilot strategy estimates. Burry's earlier six positions
and source metadata are preserved.

- [OGE certification announcement, June 30, 2026](https://www2.oge.gov/web/oge.nsf/Resources/Now%2BAvailable%3A%2BThe%2BPresident%E2%80%99s%2Band%2BVice%2BPresident%E2%80%99s%2Bcertified%2Bannual%2Bfinancial%2Bdisclosure%2Breports)
  links the actual **2026 annual reports covering 2025**, not the 2025 reports
  covering 2024. [Trump PDF](https://oge.box.com/shared/static/zycb5i2ny8kssm51uzqm8ygyq2zkpkqq.pdf),
  [Vance PDF](https://oge.box.com/shared/static/o3xuu4cumw5a2pi39ij4jauekltvax4u.pdf).
  Trump Schedule 1 to Part 2 line 349 is PDF page 865, printed Schedule page 18.
  The 114,750,000 shares appear in that current annual asset table; they are not
  inferred solely from the earlier trust-transfer narrative. Vance's five ETF
  bands appear on PDF page 10. Relevant pages rendered and visually reviewed.
- [Wyden CY2025 annual report](https://efdsearch.senate.gov/search/view/annual/d7b3bb0a-8741-4b66-9a0c-73be372bc8b3/),
  filed August 8, 2026. Read Part 3 through the public browser after the statutory
  use notice. Plain HTTP agreement POST returned Akamai 403; the normal browser
  worked. Excluded under-threshold/None entries and funds, including DTCR which
  the filer classified as stock. Combined multiple accounts by adding reported
  range endpoints, preserving an open upper bound. The three children's rows
  aggregate under dependent ownership, separately from spouse rows.
- [Tuberville CY2025 annual report](https://efdsearch.senate.gov/search/view/annual/d4f1a4cf-d450-4f9f-bfaf-c98e41066c2b/),
  filed August 11, 2026; read in the same browser session. Selected positive-value
  ticker-identified stocks/funds, without substituting the **CY2024 amendment
  filed August 10, 2026**. Part 3 has self and joint holdings. Untickered NextEra,
  annuity subaccounts and other asset types remain outside this snapshot.
- [Greene termination report 10073322](https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2026/10073322.pdf),
  filed May 7, 2026. [Official House biography](https://history.house.gov/People/Detail/25769817233)
  establishes January 5, 2026 resignation. The [House instruction guide](https://ethics.house.gov/wp-content/uploads/2026/07/7-8-2026-2025-Published-Instruction-Guide.pdf)
  defines termination reporting through departure, and Schedule A period-end
  asset values. Do not use filing day or December 31, 2026 as the snapshot date.
  Read all Schedule A [ST] blocks before Schedule B; 185 source rows become 86
  issuers. Blank owner is the filer's reportable interest, including named family
  trusts; it does not prove sole direct ownership. Some filed [ST] securities are
  funds/notes, so preserve their actual names rather than calling all common stock.
  The existing annual-only parser was used only as a research comparison, with
  its type check substituted in memory. It missed ADP/DG page continuations and
  truncated several amounts at narrow header columns. Final data uses an
  independent full monetary-token extraction with merged page continuations,
  valid ascending range checks, all-source-row counts and sample visual review.
  No production parser was changed or fed altered evidence.
- [Khanna annual report 9116272](https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2025/9116272.pdf),
  filed August 10, 2026 under **Rohit Khanna, CA17**. The scan is image-only, not an
  identity mismatch. Rendered pages 1–5, then page 2 at 3000px. OCR assisted
  navigation only. Visually read ownership DC, the selected common-stock names
  and checked value-band columns. Excluded None-valued rows (including ABBV,
  GOOGL, AXP and ALL), options, preferreds and structured notes. GOOG is Class C;
  ACN/AON/APP are Class A. Symbols are issuer references mapped from printed
  names, not asserted to be printed ticker strings. Bands cover only this trust's
  page-2 entries and do not sum other accounts/pages.
- [Mullin official nominee report in ProPublica's DocumentCloud archive](https://www.documentcloud.org/documents/27895163-mullin-markwayne-final278/),
  [downloaded PDF](https://s3.documentcloud.org/documents/27895163/mullin-markwayne-final278.pdf),
  signed March 10 and certified March 17, 2026. This newer source takes priority
  over the CY2024 Senate annual report, the latest annual shown in Senate search.
  Read identifiable positive-value common stocks in Parts 2, 5 and 6; excluded
  None/under-threshold entries, debt, funds and unidentifiable assets. Ownership
  is self for Part 2 and spouse for Part 5; Part 6 is unspecified, including assets
  underneath Mullin Family Investments LLC and other reportable entities.
  Neither a 100% beneficial interest nor direct record ownership is inferred.
  Later divestitures/sales mean this cannot establish current remaining holdings.

## Remaining research limits

- Trump: the DJT position is verified, but other public securities, ETFs, bonds,
  private companies, cryptocurrency and real estate in the 927-page report are
  not reconstructed. No complete personal-portfolio claim.
- Khanna: the remaining 352 scan pages need further section/account verification;
  more holdings and repeated issuers may exist. Selected account bands are not
  entire-household totals.
- Mullin: exact chosen valuation day and subsequent remaining stock positions
  are not established; no dated financial amounts or invented trade matching.
- All seven: no sourced stock acquisition costs sufficient for stock P&L.
- These additions bring the earlier 72-subject audit from 12 to 19 populated
  personal-holdings profiles. They do not fill the other 53 people's gaps.

## Replay and verification

```sh
npx tsx scripts/people/holdings.ts --file src/server/data/personHoldingsReported.json --apply
npx tsx scripts/people/holdings.ts --file src/server/data/personHoldingsReported.json --base https://www.chronopin.com --apply
```

Production first apply updated exactly seven profiles; Burry was unchanged.
All eight catalog profiles passed API readback and native `/person/[slug]` HTTP
200/content checks. Repeat production dry run reported zero changes. Local API
read the same bundled catalog, so local replay reported zero changes. Before
images and detailed verification are retained in ignored `.scrape` files.
Four existing holdings suites passed: 25 tests covering strict inputs, source
merging, family ranges, UI sections and unknown versus calculated P&L.
