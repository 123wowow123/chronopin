---
name: prediction-market-pins
description: >-
  Use this skill when creating or updating Predicted pins from Polymarket and Kalshi in the 06:00/18:00 news
  job, including the monthly Brent and WTI crude oil commodity threads and their post-settlement updates.
---

# Prediction market pins

Docs: `docs/okf/scraping/daily-jobs.md#predictionmarkets`, `### threadPredicted`. Pins go through the real API
and must reach production.

## Event pins (owner instruction 2026-10-15)
- Scrape interesting, high-volume markets across politics, tech/AI, space, macroeconomics, sports championships,
  culture, plus immediate weekly resolutions.
- Tag every pin `Predicted`; set `dateConfidence: 'estimated'`, dated to the **predicted event onset**, never the
  market close or settlement buffer.
- Quote dollar volume and odds **with the observation date**.
- Thread to candidate parents (`parentId`) whenever an earlier event in the series, flight-test programme,
  election cycle or franchise exists. A response series is one linear chain; no branching.
- Check for duplicates with `GET /api/pins/search?q=...` first. Each reference needs a per-item `sourceUrl`.

## Monthly Brent and WTI pins
- One pin per commodity per month: tag `Predicted`, `dateConfidence: 'estimated'`, dated to the month's
  **settlement date**, quoting the modal strike distribution and dollar volume, under `@EnergyDesk` or `@EconDesk`.
- Thread to the prior month's pin in that commodity's chain (`parentId`), same author throughout.
- After realization: write the final settlement value, set `dateConfidence: 'confirmed'`, and add reasoning on
  why the prediction hit or missed against the drivers (OPEC+ quota compliance, Hormuz/geopolitical risk premia,
  commercial and SPR inventories, global refinery demand).

## Checks
Citations `[n]` must be within the reference count; no reference repeats the sourceUrl; scan for eaten `$`
amounts; company stock lines must match the company ticker note exactly. Live odds panels use Kalshi/Polymarket
(`PinSeries`/market odds); see memory notes prediction-market-scraping and kalshi-score-markets.
