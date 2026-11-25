---
type: Reference
title: "Travel shelf expansion — nineteenth round, 2026-11-22"
description: "MEININGER Hotel Marseille Centre La Joliette joins Family and Budget. Great Wolf Lodge Maryland joins Family. Replay catalog: `scripts/hotels/travel-expansion-2026-11-22-round19.json`, using `node scripts/hotels/expandTravelShelves.mjs..."
tags: [scraping, travel]
---

# Travel shelf expansion — nineteenth round, 2026-11-22

MEININGER Hotel Marseille Centre La Joliette joins Family and Budget. Great Wolf Lodge Maryland
joins Family. Replay catalog: `scripts/hotels/travel-expansion-2026-11-22-round19.json`, using
`node scripts/hotels/expandTravelShelves.mjs --catalog scripts/hotels/travel-expansion-2026-11-22-round19.json`
and append `--apply` for writes. Manifests and complete native readbacks:
`.scrape/prod-batches/travel-expansion-2026-11-22-round19/`.

Marseille opened **19 January 2022**. The [operator announcement](https://www.meininger-hotels.com/en/press/press-releases/fourth-hotel-in-france-marseille/)
gives that day, and [TourMag's 21 February retrospective](https://en.tourmag.com/Marseille-le-nouveau-Meininger-hotel-ouvre-a-la-Joliette_a112475.html)
explicitly confirms the completed opening and **194 rooms / 572 beds**. COFFIM's
[23 December 2021 delivery release](https://www.galivel.com/fr/1-0-4800/communiques-de-presse/coffim-livre-un-hotel-sur-mesure-de-572-lits-pour-meininger-hotels)
reports the same capacity. Building delivery is distinct from the guest opening; the earlier proposal's
574 beds is not used. No property-specific construction investment verified, so price/currency null.

The [current Marseille operator page](https://www.meininger-hotels.com/en/hotels/marseille/hotel-marseille-centre-la-joliette/)
verifies private family rooms, guest kitchen, laundry and courtyard pétanque. Whole private rooms and
dorm beds are distinct products. Full address **25/27 Rue de Forbin, 13002 Marseille, France**; operator
point **43.30575120 / 5.37107980** agrees with ArcGIS exact number27 address. Walking/metro routes,
city tax, breakfast, parking, luggage storage and cancellation terms remain explicit booking checks.

Marseille refreshed Tripadvisor UK snapshot: **102 reviews**, overall 4.2/5; Rooms 4.3, Service 4.2,
Location 4.2, Cleanliness 4.3, Value 4.2, rounded to half points. marine j's firsthand family “Great stay”
review supplies a brief site-provided English translation from French. August 2026 publication has no
exact day, so date null. Limited fridge space, youth-group noise, paid luggage storage and refund concerns
remain guest accounts. MICHELIN complete Marseille list 1–36 of36 has no MEININGER match; Forbes Marseille
unavailable; AAA excludes France. Acclaim null names the specific gap.

Maryland's pin explicitly dates the **formal grand opening / ribbon-cutting on 29 June 2023**, verified
by the [Maryland Marketing Partnership's 6 July release](https://www.prweb.com/releases/maryland-celebrates-the-opening-of-the-newest-largest-great-wolf-lodge-in-north-america-818573107.html).
Earlier June preview stays are distinct and are not assigned the ceremony date. The operator's
[opening release](https://www.hotel-online.com/index.php/news/the-700-suite-great-wolf-lodge-maryland-opens-in-perryville-maryland)
reports investment **more than US$250m**. Numeric project price USD250m is explicitly the published
lower bound; exact total unpublished, covering the resort rather than a nightly price. Its 30 June release
header and relative ceremony wording do not override the state partnership's explicit 29 June date.
Economic impact figures in the partnership release are not construction investment and are not substituted.

The [current operator profile](https://www.greatwolf.com/maryland/about-us) lists **700 suites** and a
**126,000-square-foot indoor water park**; the opening release instead reported128,000 square feet.
Sources and periods remain distinct. Exact suite layout, beds and occupancy vary. Overnight water-park
access and daily family activities are included; paid attractions, dining, parking and packages need a
complete stay-cost comparison. No expired promotional or opening-era nightly rate is saved.

Maryland full address **1240 Chesapeake Overlook Parkway, Perryville, MD21903, USA**. ArcGIS named
resort point **39.5952845 / -76.0723965** matches the published property identity, not city centre.
Broad-title and canonical-source duplicate checks passed on local and production for both properties.

Maryland refreshed Tripadvisor UK snapshot: **815 reviews**, overall3.9/5; Rooms4.1, Service4.0,
Location4.4, Cleanliness4.1, Value3.6, rounded to half points. Lara R's firsthand “A Fun Family Getaway,
but Plan for the Crowds!” review displayed7 November with November2026 stay context, saved as2026-11-07.
A short hallway excerpt is used. Crowd/seating, suite-space, hallway, housekeeping and extra-cost concerns
remain guest feedback. MICHELIN, Forbes and AAA Perryville directories unavailable; exact-property awards
not established, acclaim null. An auto-club discount does not establish AAA Diamond recognition.

Six distinct photos visually checked: Marseille family room, kitchen and exterior from MEININGER;
Maryland frontage, aerial pool view and pool terrace from the exact Perryville Tripadvisor property
gallery. The Maryland operator page contains generic Connecticut-labelled attraction images, excluded.
Photos credited and uploaded to Azure with public hash preflight before pin creation; no binaries in Git.

Marseille weather uses **Météo-France Marignane13054001 1991–2020** normals, PDF page1 rendered and
visually checked. Maryland uses **NOAA Wilmington New Castle County Airport USW00013781 1991–2020**
monthly normals returned in metric units, a regional station roughly40km northeast of Perryville.
Normal daily highs and monthly rainfall are distinct from monthly means, records, forecasts or onsite
conditions. Marseille heat, mistral and autumn rain, and northern Chesapeake humidity, storms and winter
cold remain explicit. Rain bands below75 / below150 / at least150mm; weather suitability does not establish
rates or attraction calendars. Indoor swimming does not guarantee outdoor-pool availability.

Unsupported comparative engineering scores remain null. English only; translations left to the separate
agent. No production code deployment performed.

| Property | Production pin | Local pin |
| --- | --- | --- |
| MEININGER Hotel Marseille Centre La Joliette | 21355 | 21185 |
| Great Wolf Lodge Maryland | 21356 | 21186 |

Both hosts passed complete native pin, date, full address, coordinates, author, reference and credited-media
readbacks, plus hotel rubrics and factory metrics/milestones. Maryland's USD250m published investment
lower bound and Marseille's null cost read back correctly. Each native pin contains three images.
All four native pages returned HTTP200. Local `/travel` renders both additions without application
errors: **Family47 / Budget34**. All10 existing travel tests and `git diff --check` passed.
No data writes remain pending. Production category display awaits an explicitly requested deploy.
