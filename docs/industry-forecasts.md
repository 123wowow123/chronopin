# Industry forecast panels (IndustryForecast, 0216)

One row per metric. A pin shows the panels whose `tags` include any of its
categories or tag names; a search for `tag:AI` (etc.) shows them in the side
panel (`SearchPage.industries`, slugs only). `GET /api/industry-forecasts?slugs=`
returns the lines.

- **live**: FRED handles, read on view (Ramp AI Index: `RAMPAIALL`, `RAMPAITECH`,
  `RAMPAIFINANCE`, `RAMPAIHEALTHCARE`, `RAMPAIRETAIL`, `RAMPAIMANUFACTURING`,
  `RAMPAICONSTRUCTION`, `RAMPAIHOSPITALITY`).
- **snapshot**: Census BTOS national "Yes" shares (questions 7 and 24), no
  keyless feed. Refresh: download `https://www.census.gov/hfp/btos/downloads/National.xlsx`,
  `python3 -I scripts/industry/btos.py National.xlsx`, `npm run industry:forecasts`.
  The file only holds the post-Nov-2025 question wording.
- **projection**: a cited forecast (Goldman Sachs US AI capex, Gartner worldwide
  spending). Only figures from an opened source with a verbatim quote go in.
- Rows live in `scripts/industry/forecasts.json`; `npm run industry:forecasts`
  upserts them. Production: run the same upsert against the prod DB.

- **earlier**: the figures a publisher has since revised, drawn grey and dotted
  under the current projection and named on the panel ("Revised since: ...").
- **Job**: the `industryForecasts` task in the news job (docs/okf/scraping/daily-jobs.md#industryforecasts)
  refreshes BTOS and checks each projection for a newer edition; admin
  `PUT /api/admin/industry-forecasts` carries saves to production.

Gaps: Oxford Economics has no AI-spending forecast found yet; IDC's newer US totals
sit behind a paywall (the row holds its 2024 US 2028 figure); Stanford HAI has no
numeric feed (note only). Pin pages cache for hours, so a changed tag match shows
after the cache turns over.
