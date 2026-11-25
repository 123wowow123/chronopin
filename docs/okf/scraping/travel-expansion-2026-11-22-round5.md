---
type: Reference
title: "Travel shelf expansion — fifth round, 2026-11-22"
description: "Added Toy Story Hotel Shanghai to the family shelf and citizenM Paris Gare de Lyon to the budget shelf. Data saves are English only on production and local. Runtime shelf membership is application code; no production deployment was..."
tags: [scraping, travel]
---

# Travel shelf expansion — fifth round, 2026-11-22

Added Toy Story Hotel Shanghai to the family shelf and citizenM Paris Gare de Lyon to the budget
shelf. Data saves are English only on production and local. Runtime shelf membership is application
code; no production deployment was requested or performed. Translations remain with the separate
translation agent.

Research/replay catalog: `scripts/hotels/travel-expansion-2026-11-22-round5.json`.
Identity dry run: `node scripts/hotels/expandTravelShelves.mjs --catalog scripts/hotels/travel-expansion-2026-11-22-round5.json`.
Append `--apply` to resume saves. The script merges by source URL, retains previous additions and
uses database-assigned IDs. Audit snapshots and posted manifest are under
`.scrape/prod-batches/travel-expansion-2026-11-22-round5/`.

Disney's D23 property entry explicitly dates Toy Story Hotel's opening to June 16, 2016 and identifies
800 rooms. Current family theming and courtyards are backed by Disney Parks Blog's July 9, 2026
property feature. Mouse Hacking's August 3, 2026 firsthand stay supports the independent excerpt and
transport/room tradeoffs. That review explicitly disputes the idea that this is a value hotel, so
**Toy Story Hotel is not added to the budget shelf**. Its Buzz Lightyear room photos are identified as
one themed category, not a representation of every standard room. Tickets, meals, occupancy and
specific room theme must be checked when booking.

For citizenM, Hospitality Net carries an operator announcement of an August 1, 2017 guest opening,
but that forward-looking release alone does not establish the actual first-guest day. Bonjour Paris,
published Tuesday September 26, reports a grand-opening slumber party the previous Friday. The
pin is explicitly **the September 22, 2017 grand-opening celebration**, with that distinction in its
title, date reasoning, article and milestone. No first-guest date is invented. Bonjour Paris supports
relative design-hotel value positioning and identifies 338 rooms; its 2017 room-price example is not
reused as a current quote. Compact rooms, shared common areas and transit time to major sights are
disclosed. Nightly rates are on request for both properties.

Each pin has three distinct, visually inspected photos in Azure, with public SHA-256 verification
and native authorName/authorUrl credit readbacks. Toy Story shows entrance, a Buzz Lightyear room
and lobby, credited to Mouse Hacking. Paris shows bedroom, bar and the station/hotel setting from
Bonjour Paris's property feature, credited to citizenM / Bonjour Paris. The station setting includes
the source's arrow identifying the hotel tower; it is not represented as the hotel's entrance. Paris
images are 655 pixels wide and were not enlarged. They date from the 2017 feature and may precede
later changes. A bar photo initially selected under a room key was visually identified and relabelled
before any upload or save.

Full street addresses: 360 Shendi West Road, Pudong, Shanghai 201205, and 8 Rue Van Gogh, 75012
Paris. An English Shanghai geocoder query returned a city centroid and was rejected. ArcGIS's
Chinese full-address query matched the exact street number at 100; its address point was used
rather than a different POI placement. Paris uses the exact street-address match at 95.8, supported
by the property review and citizenM's published operator hotel lists. Another building frontage can
appear in current listings; the sourced street address is retained.

Hotel scores use opened Tripadvisor property snapshots, rounded to half points. These are not live
review-count promises, and Toy Story's opened page is explicitly an older 2025 snapshot:

| Property | Snapshot reviews | Rooms | Service | Location | Cleanliness | Value |
| --- | --- | --- | --- | --- | --- | --- |
| Toy Story Hotel | 375 | 4.6 | 4.7 | 4.6 | 4.6 | 4.3 |
| citizenM Paris Gare de Lyon | 3,275 | 4.2 | 4.4 | 4.5 | 4.5 | 4.2 |

Independent excerpts use the opened Mouse Hacking and Bonjour Paris articles, with their actual
publication dates. Saved excerpts and opening/capacity quotes were checked verbatim against the
fetched text. MICHELIN destination listings and property-name searches, and Forbes Travel Guide's
Shanghai/Paris directories, did not establish a current property-specific distinction. Paginated
listings are not proof of no award; acclaim remains unknown. AAA coverage excludes these countries.
No hotel class was converted into an acclaim score.

Development profiles preserve the dated hotel milestone and sourced room count. No verified
property construction investment or matching comparative cost benchmark was established. Whole
Disney resort budgets were not treated as Toy Story Hotel budgets. Cost/currency and unsupported
engineering scores remain null.

Climate guidance is property-region specific:

- Shanghai: WMO / China Meteorological Administration's Shanghai-Hongqiao **1961–1990** monthly
  averages, read from the public city JSON. The older period and regional proxy for Pudong are
  explicit; it is not presented as a current normal or forecast.
- Paris: Météo-France station 75114001, Paris-Montsouris **1991–2020**. PDF text and rendered first
  page were inspected; monthly average daily maximum temperatures and mean precipitation were
  transcribed, not record extremes. Rain bands: below 75 mm low, below 150 moderate, otherwise high.

Recommended months are editorial climate guidance, independent of holiday crowds and room prices.

Validation and database-assigned IDs follow below.

| Property | Production pin | Local pin |
| --- | --- | --- |
| Toy Story Hotel Shanghai | 21273 | 21105 |
| citizenM Paris Gare de Lyon | 21274 | 21106 |

Native pin, date, street address, author, references, media-credit, hotel-score and milestone readbacks
passed on both hosts. All four native pages returned HTTP 200. Local `/travel` renders both additions
without an application error and now shows **Family 22 / Budget 18**. All 10 existing travel tests
passed; `git diff --check` passed. No pending data writes remain. Production category display awaits
an explicitly requested deployment; no translation run was performed.
