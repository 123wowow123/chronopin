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
  upserts them. Production: `npm run industry:forecasts:prod` saves through
  the authenticated admin API.

- **earlier**: the figures a publisher has since revised, drawn grey and dotted
  under the current projection and named on the panel ("Revised since: ...").
- **Job**: the `industryForecasts` task in the news job (docs/okf/scraping/daily-jobs.md#industryforecasts)
  refreshes BTOS and checks each projection for a newer edition; admin
  `PUT /api/admin/industry-forecasts` carries saves to production.

Gaps: Oxford Economics has no AI-spending forecast found yet; IDC's newer US totals
sit behind a paywall (the row holds its 2024 US 2028 figure); Stanford HAI has no
numeric feed (note only). Admin forecast saves expire the forecast-match cache
on pin pages and category searches, including categories gaining their first panel.

## Category expansion, October 25, 2026

The catalog contains 31 panels matching 39 fixed categories (plus sector tags).
Fifteen new panels cover the IMF global growth outlook, WSTS semiconductors,
IEA electricity mix and electric car sales, Newzoo video games, WTO goods trade,
Gartner security and IT spending, PwC entertainment and media, WEF space,
IEA copper demand growth, WMO five-year warming probability, OECD–FAO cereals,
UNESCO teacher needs and IATA passenger traffic. Each new row retains an opened
HTTPS source, a short verbatim quote and notes explaining its scope and units.

Aggregate outlooks identify the whole market rather than implying a separate
forecast for each matching category. WSTS's Q2-adjusted calculations are explicitly
distinguished from a revised forecast. UNESCO's figure is a recruitment requirement,
not predicted hiring; the WMO probability covers the entire five-year window.
Unknown publication days remain null. Single published endpoints show their
values without inventing intermediate years. Existing editions, live series and
BTOS snapshots are preserved.

The public API now accepts up to 100 slugs so a multi-category search can load
all matching panels beyond the former 12-panel cutoff. Pin pages retain their
three-panel preview with Show more.

No relevant numerical outlook was verified in this pass for Tabletop, Anime,
Manga, Comics, Art, Award, Sports, Science, Astronomy, Disaster, Geopolitics,
Defense, Elections, Religion, Fashion, Futurism, Crypto, Law, Crime or Justice.
These remain research gaps rather than receiving an unrelated fallback panel.
Sources checked were the publisher pages retained in the catalog, with current
edition searches for IMF, WSTS, IEA, WTO, Gartner, Newzoo, PwC, WEF, WMO, FAO,
UNESCO and IATA. The UN population pages returned an error/403 and were not used.
Future work should seek specific forecasts for the unmatched sectors rather
than treating a broad media or GDP total as their own forecast.
