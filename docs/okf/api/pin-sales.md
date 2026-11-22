---
type: API Endpoint
title: Pin sales figures
description: Published sales figures (units sold, revenue) for a product pin, shown in a "Sales figures" panel on the pin page.
resource: "../../../src/app/api/pins/[id]/sales/route.ts"
tags: [api, pins, sales]
---

Table `PinSales` ([0267](../../../scripts/db/schema/0267_pin_sales.sql)); many rows per pin, newest `asOf` first.
Not in `PinBaseView`; `Pin#update()` never touches it.

* `GET /api/pins/:id/sales` returns `[{ id, metric, value, currency, asOf, period, scope, sourceUrl, quote }]`, or 204.
* `PUT /api/pins/:id/sales` (author or admin) **replaces** the pin's figures: `{ figures: [{ metric: 'units'|'revenue', value, currency (revenue only, ISO), asOf?: 'YYYY-MM-DD', period?, scope?, sourceUrl (required), quote? }] }`.
* `DELETE /api/pins/:id/sales` clears them. Each write expires the pin page.

Rules: store only a figure the publisher or a reliable report stated, with the page it came from and, where possible, the
quoted sentence; no estimates, no FX conversion, no row when nothing is published (a game's copies sold from the
publisher's results, a console's shipments, a car maker's deliveries). The panel appears only when rows exist.
Panel strings: `pin.sales.*` in every `messages/*.ts`.
