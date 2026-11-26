---
type: API Endpoint
title: Own tickers and high-volume days API
description: A signed-in reader adds tickers to the trades pages, saved to the account; the news job alerts them of high-volume up and down days.
resource: "../../../src/app/api/own-tickers/route.ts"
tags: [api, stocks, trades, notifications]
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-11-25T00:00:00Z }
---

# Own tickers

"Add my ticker" on `/trades` and `/notifications/trades`. Tickers are for signed-in
readers only: signed out there is no ticker and no highlight, and **Add** goes to
the login page and back, then adds what was typed. The list is saved to the account (`OwnTicker`, 0270). At
most 20.

* `GET /api/own-tickers` - `{ symbols }` (signed in)
* `POST /api/own-tickers` `{ "symbols": ["NVDA"] }` - adds, answers the list
* `DELETE /api/own-tickers?symbol=NVDA` - removes, answers the list

# High-volume days

`GET /api/trades/high-volume?symbols=NVDA,T&days=28` (public, at most 40 symbols,
1 to 84 days) answers `{ stocks: [{ symbol, days, trend }], unchecked }`: the
sessions that closed up or down on at least 2x the 50-day average volume
(`src/lib/highVolume.ts`), from Nasdaq's daily history, cached 10 minutes. An open
page re-reads it every 10 minutes and on coming back to the tab.

# Alerts

`POST /api/admin/ticker-alerts` (admin) checks every reader's tickers and sends what
is due: a `ticker` notification and a Web Push, once per reader, stock and session,
for sessions of the last 4 days and not before the ticker was added. Answers
`{ symbols, unchecked, sent }`. The news job calls it (task
[tickerAlerts](../scraping/daily-jobs.md#tickeralerts)); safe to repeat.
