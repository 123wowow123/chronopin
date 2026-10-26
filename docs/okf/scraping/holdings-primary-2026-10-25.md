---
type: Reference
title: Primary-source holdings review, 2026-10-25
description: Primary sources for stock holdings and P&L.
tags: [scraping]
---

# Primary-source holdings review — 2026-10-25 Pacific

Owner request: use a better source for stock holdings and P&L wherever one is
available. Research timestamps in the catalog use UTC (2026-10-26 during the
Pacific evening). This research upgrades the existing 70-person strategy
baseline; it does not assert current personal holdings where only firm or
historical disclosures exist. No production deployment was performed.

The source registry, refresh/replay commands, extraction rules, native fields
and limits are documented in [the holdings API notes](../api/person-holdings.md).
All source URLs and response hashes are retained in the primary catalog. SEC
CIK identities were verified from their submissions metadata; the original
filing covers and information tables were opened. Berkshire annual-report
printed pages 15–16 (PDF pages 19–20) were rendered and visually verified.
House source PDFs were opened and layout extraction checked, including visual
ownership/value-column checks on Pelosi and Wasserman Schultz. Scanned
Khanna coverage remains pending; no OCR output was accepted without review.

| Person | Primary snapshots | Reported positions displayed | Latest holdings date |
| --- | ---: | ---: | --- |
| Warren Buffett | 2 | 38 | 2026-06-30 |
| Jim Simons | 1 | 100 | 2026-06-30 |
| Michael Burry | 1 | 4 | 2025-09-30 |
| Ken Griffin | 1 | 100 | 2026-06-30 |
| Steven A. Cohen | 1 | 100 | 2026-06-30 |
| Ray Dalio | 1 | 100 | 2026-06-30 |
| Bill Ackman | 1 | 14 | 2026-06-30 |
| David Tepper | 1 | 25 | 2026-06-30 |
| Joseph Edelman | 1 | 100 | 2026-06-30 |
| Peter Thiel | 1 | 8 | 2026-06-30 |
| Julian Baker | 1 | 83 | 2026-06-30 |
| Felix Baker | 1 | 83 | 2026-06-30 |
| Leopold Aschenbrenner | 1 | 23 | 2026-06-30 |
| Garth Friesen | 1 | 44 | 2026-06-30 |
| Nancy Pelosi | 1 | 22 | 2025-12-31 |
| Dan Crenshaw | 1 | 6 | 2024-12-31 |
| Debbie Wasserman Schultz | 1 | 13 | 2025-12-31 |
| Dan Goldman | 1 | 16 | 2025-12-31 |
| Gilbert Cisneros | 1 | 476 | 2025-12-31 |
| David Rouzer | 1 | 7 | 2025-12-31 |
| Tim Moore | 1 | 26 | 2025-12-31 |

The nine Berkshire cost-based results are cumulative unrealized differences
between the company's published historical cost and 2025-12-31 fair value,
using its reported USD-million figures. They exclude dividends, financing,
hedging and realized gains. They are not Buffett's personal gains, 2025 annual
returns or current 2026 P&L. No old cost basis is carried forward to newer 13F
quantities and values without evidence that establishes a matching position.

Large manager tables display their 100 largest reported share positions and
state the full reported share-position count. The original filing remains
linked. Options and principal-amount instruments are explicitly excluded from
share counts and market-value weights. These sources improve issuer coverage,
quantity and valuation evidence; they do not supply most acquisition costs.

The seven readable House reports preserve reportable owner codes and value
ranges, excluding None/zero year-end assets even where they earned income.
Reportable trust interests are not asserted to be sole direct ownership.
Crenshaw's older 2024 snapshot is marked as historical. New annual reports and
transaction disclosures are not combined into an invented complete portfolio.

Remaining gap: [Ro Khanna's 2025 annual report](https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2025/9116272.pdf)
is a 353-page scanned document. It needs OCR and manual asset-table verification.
The public source is preserved in the research audit; its holdings were not
inferred from an unrelated source or a transaction-value range.
