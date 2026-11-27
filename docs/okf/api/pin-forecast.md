---
type: API Endpoint
title: Chronopin prediction on market pins
description: Admin PUT/GET/DELETE of Chronopin's own probability call for a Polymarket/Kalshi predicted pin, shown beside the market odds with the site pins it rests on.
resource: "../../../src/app/api/pins/[id]/forecast/route.ts"
tags: [api, admin, pins, markets, predictions]
---
# Chronopin prediction (PinForecast, 0272)

A block under the market odds on a predicted pin (`PinForecast` component): Chronopin's own call, its probability next
to the market's, the reasoning and links to the other pins on the site it rests on. One row per pin; a pin edit never
touches it. Owner request 2026-11-26 (pin 21508, Ornn H100 rental price).

- `PUT /api/pins/:id/forecast` (admin) `{outcome<=200, reasoning<=1200, probability?: 0-100, marketProbability?: 0-100,
  evidence?: [{pinId, note<=200}] (max 6), outcomes?: [{label, probability 0-100}] (max 60)}`; `GET` reads (evidence carries each pin's title); `DELETE` clears.
- Job tools: `forecast_candidates` (open Polymarket/Kalshi predicted pins with no call or one older than 3 days) and
  `save_pin_forecast` (saves locally and to production via `pushModelPerf(..., 'forecast')`, matched by `sourceUrl`).
- Evidence pin ids are local ids; the production push keeps them as given, so check they exist on production (the GET
  drops evidence pins that are deleted or missing).
- The text is stored in English and shown with `lang="en"`; chrome strings are `forecast.*` in every locale. The
  translation agent does not translate the stored call.

- `outcomes` (0273): Chronopin's chance per row of the pin's market, `label` exactly as the odds panel shows it ("Above $3.00").
  `PinOdds` shows them as a column beside the market's percentage, headed Market / Chronopin; a row without one reads "–".
  Draw a ladder's rows from one distribution so they never cross (cumulative "above" chances fall as the strike rises).
