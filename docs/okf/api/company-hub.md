---
type: API Endpoint
title: Company hub, product pages and milestones
description: Admin PUT/GET of a company's hub pin and product tree, with each product's overview, infobox facts and milestone pins.
resource: "../../../src/app/api/admin/company-hub/route.ts"
tags: [api, admin, company, hub]
---
# Company hub pins and product trees

A company's **hub pin** is a living landing page. It is a normal Pin, but the timeline queries
(`notCompanyHub` in `src/server/model/pins.ts`) leave it out. Its pin page shows `CompanyTree`
(products > sub-products > dated pins) instead of the Thread pane. `/company/<slug>` links to it.

Tables (0243): `CompanyHub` (one pin per company), `CompanyProduct` (tree, `parentId`, `rank`),
`CompanyProductPin` (pins a product lists; each pin stands for its whole same-author thread, so list
pins of other authors' chains explicitly).

`GET /api/admin/company-hub?company=Tesla` reads it. `PUT` (admin) replaces the hub and the whole tree:

    { "company": "Tesla", "hubPinId": 20728,
      "products": [{ "name": "Vehicles", "summary": "...", "pinIds": [], "children": [{ "name": "Cybertruck", "pinIds": [206, 4746] }] }] }

The hub pin must already exist (create it through the normal pin API, company set) and belong to that company.
Local Tesla seed: hub pin 20728 (@MotorDesk). Not on prod; translations are left to the translations agent.

## Product pages

Each product has a page at `/company/<company>/<product-slug>` (breadcrumb, article, infobox, sub-product tree, then
Upcoming/Recent pin cards for everything under it). Migration 0244 adds `overview` (paragraphs separated by a blank
line; `[pin:ID]` cites a Chronopin pin, shown as a numbered source) and `facts` (infobox rows
`{label, value, pinId?}`) to each product in the PUT body. Write them only from what the product's own pins and their
sources say. Local Tesla: only "Robotaxi and Cybercab" has an overview so far.

## Milestones (0245)

`milestones: [{ pinId, label }]` on a product flags its major events (a listed pin; it is added to `pinIds` if missing).
The picture walls on the hub and product pages show only milestone pins, oldest first, each with its label and month
(falling back to every pin when a page has fewer than two), the product cards use a milestone picture as their cover,
and the product timeline draws milestone dots large. Choose launches, unveilings and firsts, from the product's own pins.

## Earnings by segment

A hub company's landing page shows an "Earnings by segment" pane: the latest quarter's revenue split by reporting segment (with the change on the same quarter a year earlier) and a stacked column per quarter. Figures live in `CompanySegmentRevenue` (0246), US dollars in billions as the results pin states them, never estimated; every row names the results pin it came from.

`GET /api/admin/company-segments?company=Tesla` reads the rows. `PUT` (admin) replaces them:

```json
{ "company": "Tesla", "rows": [{ "period": "Q2 2026", "periodEnd": "2026-06-30", "segment": "Automotive", "amountBillions": 20.5, "pinId": 4767 }] }
```

`pinId` is required and must be one of the company's pins. A quarter whose pin does not give every segment is left out rather than filled in.
