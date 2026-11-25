---
type: Reference
title: "Travel shelf expansion — fourteenth round, 2026-11-22"
description: "MEININGER Hotel Bruxelles Gare du Midi joins Family and Budget; LEGOLAND Castle Hotel California joins Family. Research catalog `scripts/hotels/travel-expansion-2026-11-22-round14.json`; replay with `node..."
tags: [scraping, travel]
---

# Travel shelf expansion — fourteenth round, 2026-11-22

MEININGER Hotel Bruxelles Gare du Midi joins Family and Budget; LEGOLAND Castle Hotel California
joins Family. Research catalog `scripts/hotels/travel-expansion-2026-11-22-round14.json`; replay with
`node scripts/hotels/expandTravelShelves.mjs --catalog scripts/hotels/travel-expansion-2026-11-22-round14.json`
and append `--apply` for writes. Complete native readbacks and resumable ID manifest are under
`.scrape/prod-batches/travel-expansion-2026-11-22-round14/`.

The [original Brussels operator announcement](https://www.meininger-hotels.com/en/press/press-releases/second-hotel-in-brussels/)
is labelled August 2019 and reports 150 rooms / 678 beds. The [later Lyon operator release](https://www.meininger-hotels.com/en/press/press-releases/first-hotel-in-lyon/)
explicitly dates Bruxelles Gare du Midi's opening to **August 6, 2019**, used for the confirmed pin
milestone. September 3, 2019 on Hospitality Net is a syndication date, not the opening day. Earlier
planned 668-bed figures are not reused. No construction budget was verified; price and currency null.

The current [Brussels hotel page](https://www.meininger-hotels.com/en/hotels/brussels/hotel-bruxelles-gare-du-midi/)
verifies private family rooms, guest kitchen and common spaces. Full official address **Rue Bara 101,
1070 Anderlecht, Brussels, Belgium**. The operator map point 50.8356863 / 4.3311413 is corroborated by
ArcGIS exact address and OSM number-101 address. Broad title and exact-source checks find no existing
identity locally or on production. Whole private rooms and individual dorm beds remain distinct.

Brussels operator page TrustYou snapshot: 2,299 verified-stay reviews, overall 4.3/5, Location 4.4/5,
rounded to 4.5. Rooms, Service, Cleanliness and Value sub-scores are unavailable in the opened data,
so remain null; the overall score is never copied across axes. WiFi and Vibe are different axes.
The page's observed public JavaScript describes its read-only guest endpoint, fetched with the
same POST method as the page: `index.php?eID=meininger_reviews&page=0&hotel=BRU-RB&lang=en&target=family`.
This supplies exact dated English family guest accounts, including Sibilla's October 23, 2026
“Always a great stay” and Emese's October 5 “Easily accessible, affordable, pleasant, and clean.”
The native review panel saves Sibilla’s short verbatim excerpt; Emese’s account informs the article. The API deduplicates reviews by URL, so two same-endpoint records are not sent. The operator says TrustYou collects only
verified stays and publishes feedback without positive preselection; these are identified as
operator-collected guest accounts, not independent criticism. Charges, service and housekeeping
tradeoffs remain visible. MICHELIN complete Brussels-and-surroundings list 1–39 of 39 and Forbes
Brussels directory have no MEININGER match. AAA award geography excludes Belgium; acclaim zero
records checked-directory absence.

California's Castle Hotel opening is **April 27, 2018**, in the [operator announcement reproduced by
The Brick Show](https://brickshow.com/legoland-castle-hotel-in-legoland-california-now-officially-open/),
corroborated by the official grand-opening broadcast description. The current [hotel FAQ](https://california-support.legoland.com/hc/en-us/articles/360001609871-How-big-is-the-LEGOLAND-Castle-Hotel)
reports 250 themed rooms. This is the resort's second onsite hotel, separate from the original
California hotel and the Billund and Windsor Castle Hotels. No other hotel's construction cost is
substituted. Full [official address](https://california-support.legoland.com/hc/en-us/articles/360001574891-What-is-the-address-for-the-LEGOLAND-California-Hotel-and-Castle-Hotel):
**1 LEGOLAND Drive, Carlsbad, CA 92008, United States**. Coordinates 33.1253537 / -117.3115315 are the
exact ArcGIS Castle Hotel POI. OSM textual hotel search returned no result; that gap is explicit.

[Current hotel information](https://www.legoland.com/california/places-to-stay/legoland-castle-hotel/)
verifies wizard/knight/princess rooms, separate children's sleeping area, play, entertainment and
pool. Activities, pool times and room layouts require confirmation for the booked dates. The
[room-only product](https://www.legoland.com/california/places-to-stay/vacation-packages/room-only/)
means park admission is not universal. A page promotion with November 1, 2026 booking deadline is
expired on the research date; neither it nor a per-person package price becomes a current room rate.

California Tripadvisor UK snapshot: 1,200 reviews; Rooms 4.3 / Service 4.1 / Location 4.7 /
Cleanliness 4.5 / Value 3.9 rounded to half points. Kim J's firsthand “Nicely Themed Hotel” review
supplies a short walk-to-park excerpt; publication month July 2026 without exact day, date null.
Check-in, noise, dining and extra-charge tradeoffs remain guest feedback. MICHELIN Carlsbad was
blocked by verification; Forbes San Diego directory had no Castle Hotel match; AAA Carlsbad directory
was opened but did not establish a property distinction. Acclaim null, not an inferred award or zero.

Six distinct official photos were downloaded and visually inspected: Brussels family room, kitchen
and lounge; California Castle exterior, princess bunk beds and wizard-room treasure hunt. Store in
Azure, publicly verify hashes before pin creation, and preserve operator source credits. No binaries
enter Git. Construction comparative axes remain null; sourced operating and capacity metrics saved.

Brussels seasons use [IRM Uccle 1991–2020 municipality climate statistics](https://opendata.meteo.be/ftp/climate/climate_statistics/climate_INS21016_9120_fr.pdf),
page 2's exact monthly maximum-average temperature and precipitation table. California uses NOAA
NCEI Carlsbad Palomar Airport **USW00003177**, 1991–2020 monthly normals requested in metric units.
Both are nearby regional guidance, with averaging period and source stated, not hotel forecasts.
Daytime highs are not mean temperatures. Rainfall bands: below 75 / below 150 / at least 150 mm.
Weather suitability does not establish rate seasons; current forecasts and park calendars are separate.

English only. Translations remain with the separate agent. No code deployment performed.

| Property | Production pin | Local pin |
| --- | --- | --- |
| MEININGER Hotel Bruxelles Gare du Midi | 21334 | 21175 |
| LEGOLAND Castle Hotel California | 21335 | 21176 |

Both environments passed native title/source/date/address/coordinates/author/reference/media-credit,
hotel rubric and factory metrics/milestones readbacks. All four native pages returned HTTP 200.
Local `/travel` renders both additions without an application error, showing **Family 37 / Budget 29**.
All 10 existing travel tests and `git diff --check` passed. No data writes remain pending.
Production category membership display awaits an explicitly requested code deployment.
