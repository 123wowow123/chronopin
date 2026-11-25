---
type: Reference
title: "Travel shelf expansion — ninth round, 2026-11-22"
description: "Added MEININGER Hotel Barcelona Fira Gran Via to both family and budget shelves, and LEGOLAND Hotel Dubai to family only. Catalog: `scripts/hotels/travel-expansion-2026-11-22-round9.json`. Replay with `node..."
tags: [scraping, travel]
---

# Travel shelf expansion — ninth round, 2026-11-22

Added MEININGER Hotel Barcelona Fira Gran Via to both family and budget shelves, and LEGOLAND Hotel
Dubai to family only. Catalog: `scripts/hotels/travel-expansion-2026-11-22-round9.json`. Replay with
`node scripts/hotels/expandTravelShelves.mjs --catalog scripts/hotels/travel-expansion-2026-11-22-round9.json`;
append `--apply` to save. Native readbacks and assigned-ID manifest are under
`.scrape/prod-batches/travel-expansion-2026-11-22-round9/`.

MEININGER's retrospective Spain expansion release explicitly confirms **June 25, 2026**, superseding
older projected opening schedules. The property has 162 rooms and exclusively private accommodation,
including configurations for up to four. Generic brand copy mentions a guest kitchen; the actual
property equipment list specifies **microwaves, fridge and kettle** in its Heat & Eat area, used in
the card and article. No stove or shared dorm is inferred. The Fira Gran Via location is in
L’Hospitalet de Llobregat, outside the historic centre; transit time and actual room totals matter.
Nearly €4 million reported investment is specifically **FF&E**, saved as a limited-scope factory
metric and described in the article. It is not the complete development cost; pin price/currency
remain null. The former office building conversion has no verified matching construction benchmark.

The opened Tripadvisor UK snapshot has nine reviews and an overall **3.2/5**. Published components
Rooms 4.0 / Service 3.2 / Location 4.4 / Cleanliness 3.4 / Value 3.8 are rounded to half points.
The tiny early sample and service/cleanliness tradeoffs are explicit in the public article; the
operator's much larger TrustYou sample is not mixed into these scores. Cw189's English firsthand
review, titled “Average,” has a dedicated opened review URL and a short exact excerpt. The shown
publication month is September 2026 without a precise day, so publishedDate remains null. No reviews
are translated by this batch, and automatically translated excerpts are not substituted for this quote.

LEGOLAND Hotel Dubai's Merlin announcement on Hospitality Net is dated **January 21, 2022** and states
that overnight guests arrive that day, with **250 themed rooms**. The hotel event is separate from
the park's 2016 opening. The current hotel page lists rooms for five, a dedicated children's sleeping
area within the same room, and two-bedroom family suites for eight. The hotel is suited to a park
visit in Jebel Ali, not a central Dubai sightseeing base. Check the selected package for park tickets,
breakfast, fees and occupancy. Old review prices and pandemic practices are not current promises.
The official operational-updates page was checked and is linked, rather than promising all rides.

The opened LEGOLAND Tripadvisor US snapshot has 995 reviews, with Rooms/Service/Cleanliness 4.6 and
Location/Value 4.5 out of five, rounded to half steps. Snapshot counts are not live totals. Joe Jenkins'
March 23, 2022 National article is a firsthand family stay at the hotel's invitation, explicitly
disclosed in the basis. Its short exact room-design excerpt is retained; historical rates omitted.
No complete hotel budget or appropriate themed-hotel benchmark was verified. The original 2019 DXB
financial-statements PDF timed out and exceeded the web reader's size limit; financing, reserve and
whole-resort amounts are not assigned to this hotel. Engineering scores remain null for both hotels.

MICHELIN city directories were opened, but cover only the first 48 of 62 Barcelona and 48 of 54 Dubai
hotels; raw downloads returned 403. Property-name searches did not establish recognition, and the
opened Forbes city directories contain no property match. Since MICHELIN pagination was not fully
read, acclaim remains null rather than an invented zero. No Keys or Forbes distinctions are claimed.
AAA's geographic program excludes Spain and UAE.

Six distinct official photos were downloaded and visually inspected. Barcelona: family bedroom,
exterior and microwave area. Dubai: exterior, themed room interior and lobby play area. Dubai's
room image shows the themed children's area/entrance rather than a made-up bed configuration.
Images are stored in Azure with public SHA-256 and native attribution checks. No binaries enter Git.

Barcelona's full address is Carrer de la Botànica 41, 08908 L’Hospitalet de Llobregat, Barcelona, Spain;
ArcGIS point-address match scores 95. Dubai is LEGOLAND Hotel, Riverland Street, Dubai Parks and
Resorts, off Sheikh Zayed Road, Jebel Ali, Dubai, UAE. ArcGIS's street and locality fallbacks were
rejected. Nominatim's exact hotel footprint **way 1022722697**, latitude 24.9176845 / longitude
55.0096305, provides the hotel point and Riverland Street. The resort approach via Sheikh Zayed Road
is corroborated by Tripadvisor. No invented house number or placeholder postcode is supplied.
Broad authenticated title-pattern and exact-source identity checks found no duplicate pins on either host.

Barcelona seasonal data uses AEMET **Barcelona Aeropuerto 0076, 1981–2010**, with the TM daytime-high
and R precipitation columns, not mean temperature. Dubai reuses the already researched WMO/NCM Dubai
climatology **1974–1991**, explicitly identified as older regional context for the Jebel Ali district;
Downtown-specific outing advice was replaced with park guidance. Rain bands are below 75 mm / below
150 mm / at least 150 mm. Weather recommendations do not imply cheaper room rates.

No code deployment or translation run was performed. Translations remain with the separate agent.

| Property | Production pin | Local pin |
| --- | --- | --- |
| MEININGER Hotel Barcelona Fira Gran Via | 21322 | 21154 |
| LEGOLAND Hotel Dubai | 21323 | 21155 |

Native title/source/date/address/coordinates/author/reference/media-credit fields, hotel rubrics and
factory milestones passed readback on both hosts. All four native pages returned HTTP 200. Local
`/travel` renders both additions without an application error and shows **Family 28 / Budget 24**.
All 10 existing travel tests and `git diff --check` passed. No data writes remain pending.
Production category display awaits an explicitly requested code deployment.
