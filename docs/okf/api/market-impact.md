---
type: API Endpoint
title: Pin market-impact weight
description: Admin PUT/GET/DELETE of a pin's 1-10 market-moving weight, reason and affected assets, which lifts it on the timeline and shows the card icon.
resource: "../../../src/app/api/pins/[id]/market-impact/route.ts"
tags: [api, admin, pins, markets]
---
# Market impact weight (PinMarketImpact, 0253)

How far a pin's information can move markets. Admin only; one row per pin; a pin edit never touches it.

- `PUT /api/pins/:id/market-impact` `{weight: 1-10, reason: string<=500, assets?: string<=200}`; `GET` reads; `DELETE` clears.
- Scale: 1-2 negligible, 3-4 sector news, 5-6 notable for a company/commodity, 7-8 major mover (mega-cap earnings,
  central-bank decision, big regulatory ruling), 9-10 market-wide shock. The reason is the mechanism, sourced, never invented.
- Timeline: `marketImpactWeight` in `src/lib/bagSample.ts` multiplies the bag weight from 3 up (3 x1.5, 7 x3.5, 10 x5) and
  orders the lead cards in a day; `PAGE_COLUMNS` carries `marketImpact/Reason/Assets`.
- UI: `MarketImpactBadge` (trending-up icon + score, colour by band, `PillTip` tooltip with score, band and reason) on cards
  and the pin page. Strings: `marketImpact.*` in every locale.
