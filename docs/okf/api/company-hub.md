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

## Go-live decisions (2026-11-06)

* **No redirect** from a hub pin's `/pin/ID/slug` to the landing page: the pin page already renders the same product tree, and hub pins are short single-source pins that the thin-pin rule keeps out of the index, so the company page is the indexed one.
* **Sitemap:** `src/app/sitemap.ts` lists every `/company/<name>` with at least `MIN_INDEXED_PINS` pins, so hub companies are covered.
* **llms.txt** links the `/companies` index; no per-company entries.
* **Translations** stay with the translation agent.
* **Threads:** a product lists pins, each standing for its whole same-author thread; extra pins on a page are usually the unlisted rest of a series chain. Fix only genuinely foreign threads (unlist the pin, or re-parent it as admin with a backup).

## Hubs built (prod hub pin ids, 2026-11-06)

Tesla 20747, Apple 20732, Microsoft 20733, Google 20734, Nike 20735, Salesforce 20736, Boeing Commercial Airplanes 20737, Oracle 20738, Qualcomm 20739, Meta 20740, NVIDIA 20741, Intel 20742, Amazon 20743, Broadcom 20744, Airbus 20745, BYD Company 20746, Square Enix 20748, Walt Disney Animation Studios 20749, Pixar 20750, Marvel Studios 20751, Walt Disney Pictures 20752, OpenAI 20763, Anthropic 20764, TSMC 20765, Xiaomi 20766, Sony 20767, Lululemon 20768, Nintendo 20786. Nintendo had only 10 pins (IGN reviews), so 14 console, handheld and franchise-debut pins were added first (20770-20784, prod only). Not built: Netflix (series premieres, not products).
