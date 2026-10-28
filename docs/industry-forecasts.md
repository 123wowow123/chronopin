# Industry forecast panels (IndustryForecast, 0216)

One row per metric. A pin shows a panel only when its categories or tag names
match the panel's primary `industry` (case-insensitive). Related forecast `tags`
alone do not qualify: Finance does not select a Crypto panel, for example.
AI forecasts, including sector-specific adoption charts, also require `AI` or
`AI Models` on the pin; `AI Models` counts as the AI industry. Searches retain
broader matching against forecast `tags` (`SearchPage.industries`, slugs only).
`GET /api/industry-forecasts?slugs=` returns the lines.

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

The initial expansion brought the catalog to 31 panels matching 39 fixed categories (plus sector tags).
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

No relevant numerical outlook was verified in the initial pass for Tabletop, Anime,
Manga, Comics, Art, Award, Sports, Science, Astronomy, Disaster, Geopolitics,
Defense, Elections, Religion, Fashion, Futurism, Crypto, Law, Crime or Justice.
These were retained as research gaps rather than receiving an unrelated fallback panel.
Sources checked were the publisher pages retained in the catalog, with current
edition searches for IMF, WSTS, IEA, WTO, Gartner, Newzoo, PwC, WEF, WMO, FAO,
UNESCO and IATA. The UN population pages returned an error/403 and were not used.
The [follow-up gap research](okf/scraping/forecast-category-gaps-2026-10-25.md)
adds 16 panels and closes 19 of those category gaps. Including the three Ramp
token panels added separately, the catalog now contains 50 panels matching 58
of 59 fixed categories. Award remains unsupported by a verified numerical
forecast. Art uses a cited dealer-survey outlook rather than a numerical market
projection. Conditional scenarios, upper estimates and dated election-model
snapshots are labeled explicitly; this is contextual coverage, not a forecast
of the entire market for every matching category.

## Graphs and new panels, October 27, 2026

Rows may carry `history` (up to 3 lines, 30 points each, stored as the row's
snapshot and drawn solid before the dashed projection). 18 existing panels gained
sourced actuals (IFR, IMF, WSTS, WTO, Ember, IEA GEVO, FAO, IATA, UN, Pew, DefiLlama
for stablecoins, plus one-point Grand View/Newzoo/WEF base years). 23 panels were added
with 6-10 actuals and 2-11 projected points each: World Bank Commodity Markets
Outlook (Brent, gas, gold, silver, copper, aluminium, nickel, cocoa, coffee, urea, rice),
IATA Global Outlook, UN WPP 2024 and OECD-FAO 2026-2035. Gartner, PwC and IDC
history stayed unfound (403 or definition drift). Still no verified panel for
Electronics, Software, Telecom, TV, Music, Literature, Housing, Banking, Insurance.
Not yet on production (`npm run industry:forecasts:prod`).

Second round, October 27, 2026: 16 more panels cover Software, Electronics and Telecom
(Gartner IT spending), Property (Fannie Mae, CBO house prices), Finance (CBO and Fed
rates, Swiss Re premium growth, tagged Insurance), TV (Netflix revenue guidance, BLS) and
Music/Literature (BLS employment). Source limit per row is now 14. Left out: Swiss Re life
and non-life (values matched by chart position), Goldman recorded music (IFPI history
joined to a secondary-reported projection). Still unfound: Ericsson subscriptions, OBR,
Allianz, McKinsey banking, PwC history (one 2025 point only).
