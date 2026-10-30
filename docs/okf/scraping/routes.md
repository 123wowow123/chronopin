---
type: Reference
title: Course, pipeline and power-line shapes on pin maps
description: How circuit routes, pipelines, power lines and power-plant outlines are drawn on pin maps (PinSiteShape), where each comes from, the traps found, and the GeoJSON export and earthquake importer added alongside.
resource: ../../../scripts/routes/osmLine.ts
tags: [scraping, maps, geojson, openstreetmap, routes, power]
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-10-24T16:00:00Z }
---

# Course and circuit lines on pin maps (PinSiteShape kind 'route')

- F1 circuits: scripts/routes/raceCircuits.ts, from bacinger/f1-circuits (OpenStreetMap), 30 pins, 2026-10-22.
- OSM route relations: scripts/routes/osmRoute.ts. Only London's marathon (relation 2086183) is mapped among the 12 marathon cities searched; pins 5026, 5028.
- Other courses: scripts/routes/courseLine.ts from a [lon, lat] JSON file. The pin credits the race's own course page; the Strava segment is listed only as a pin reference (Ian, 2026-10-22: Strava is a reference, not the map credit).
  - Chicago (pins 5027, 6217): line taken from the Strava segment 20453824 (42.19 km, 460 points after simplification), checked against the course page. The organiser's own map is a print PDF (26-BACM-COURSE-MAP-PRINT.pdf) with no coordinates.
- Organiser maps checked 2026-10-22: NYRR (text directions only), Berlin (course URL 404), Chicago (PDF). Strava has full-distance segments for few races; Berlin and Paris have per-mile segments only.
- Overpass (overpass-api.de) is often at capacity; retry.

## Power-plant outlines (PinSiteShape kinds 'site' + 'power', source 'OpenStreetMap')

- scripts/power/plantShapes.ts (2026-10-23): for Solar, Nuclear and Hydropower pins without a shape, asks Overpass for power=plant (relation/way) and power=generator areas within 1 km tagged solar/nuclear/hydro. A plant is kept only if it contains or lies within 1 km of the pin and at least 60% of its distinctive name words (not "solar", "plant", "station", "LLC"...) appear in the pin title, with no unmatched single-letter or numeric designator (Sizewell B is not C). The loose "one shared word" rule gave wrong matches (SR Paris for SR Puryear, Downtown Dubuque Solar Garden for a 100 MWac plant) and was dropped.
- Yield: 22 of ~780 candidates (about 3%). Most candidates are announced projects not yet mapped. Clinton (5959) and Itaipu (6111) matched under the loose rule but not the strict one; unchecked why.
- Every match is also kept as .scrape/plant-shapes/<pinId>.json (git-ignored); `plantShapes.ts --restore` reloads them. Rows disappeared locally once (cause unknown, other sessions edit the table); siteShapes.ts now deletes only non-OpenStreetMap rows.
- Prod: scripts/power/plantShapesProd.ts finds each pin by the local sourceUrl and upserts via /api/admin/db/PinSiteShape; 21 sent 2026-10-23 (Gibson Solar 16597 has no sourceUrl, skipped). Check local and prod titles agree first.
- Overpass was down or timing out for part of 2026-10-23 (main server hung, overpass.kumi.systems and mail.ru mirror dead). The smaller plant-only query ran 690 pins in minutes with no errors once it recovered.
- Per-pin source wikis were not changed: an outline is a map layer, not a fact the wiki states.

## Pipelines and power lines (PinSiteShape kinds 'pipeline', 'powerline')

- Kinds added 2026-10-23 (siteShape.ts, PinMap.tsx, pin.siteKey.* in all 16 locales): drawn as plain lines, without the start/finish dots and km markers a 'route' gets. 'powerline' first got data 2026-10-24 (below).
- scripts/routes/osmLine.ts takes OSM way/relation ids by hand (`--kind pipeline --relation N --way a,b --pins ...`), simplifies the geometry (Douglas-Peucker, --tol 0.0005) and adds the line to the pin's existing shape. Copies are kept in .scrape/line-shapes/ (git-ignored).
- Found by exact name (`["name"="..."]`, fast); regex name searches over the planet time out on the public Overpass server.
- On local and prod 2026-10-23: Colonial Pipeline (252 ways, Houston to NJ, 126 KB) pin 2472; Nord Stream 2 (relation 16489915) pin 2637; Saudi East-West/Petroline oil ways 54729631, 1044430260, 799372434 on pins 5538 and 2999 (2999 is an Aramco earnings pin whose title names the pipeline). The gas-tagged parallel way 1495004023 was left out.
- Not mapped in OSM under those names: Greenlink West (4947; "Greenlink" matches a Scottish bus route and an Irish trail), Plains Line 901, the Sable/Santa Ynez/Las Flores lines. Most Sable pins sit at courthouses, so a pipeline there would mislead.
- Push to prod: `plantShapesProd.ts --dir .scrape/line-shapes`.
- Power lines, 2026-10-24: Micron Clay (pin 18232, local + prod) draws the five named 345 kV circuits that meet at National Grid's Clay substation: Pannell - Clay (ways 20110539, 107706688), Clay - Edic (107706693, 158779954), Volney - Clay 345kV (169147803), Clay - Nine Mile Point 1 (169147808), Clay - Independence (169147812, 173874053, 173874055, 173874060). The pin's eight new underground 345 kV laterals are proposed, not built, and are not in OSM, so they are not drawn; the line is the existing grid feeding the campus. Names were looked up with exact `["name"="..."]` clauses (a regex `name~` over a bbox ran for minutes and got nothing).
- Greenlink West (4947) still has no OSM line to draw.

## GeoJSON beyond site shapes (2026-10-24)

- `GET /api/pins.geojson` (src/app/api/pins.geojson/route.ts): the located pins as GeoJSON points ([lon, lat], properties title/url/address/categories/start/end/megawatts), with the same q/from/to/created_within/f/show filters as /api/pins/map and open CORS. Not localized.
- `npm run earthquakes` (scripts/events/earthquakes.ts): USGS "significant" GeoJSON feed -> one confirmed 'Disaster' pin per quake of M5.5+ (--min-mag, --feed), sourced to its USGS event page, posted through POST /api/pins as a curator. Posted as @QuakeDesk (437, local and prod) 2026-10-24, 16 pins; each carries three USGS ShakeMaps (intensity, pga, pgv) as media, added on create or with `--media` for pins made without. Also a news-job task (daily-jobs.md#earthquakes).
- Wildfire perimeters and election district boundaries: implemented as `wildfire` and `district` polygon kinds, with map-key labels in all 16 languages. See [boundary imports](boundaries.md) for reviewed matches, dates, sources and API replay. FIRMS hotspot points are not perimeter polygons.

## Storm tracks and Boston (2026-10-29)

- Boston Marathon: OSM relation 11680552 (42.195 km, 264 ways -> one 2,135-point line) drawn on pins 3142, 3147, 3155 (local and prod, same ids). A second name search by city bounding box (Overpass `relation["route"]["name"~"marathon",i](bbox)`) over 22 pin cities (NYC, Berlin, Tokyo, Paris, Amsterdam, Valencia, Sydney, Hong Kong, LA, Chicago, Taipei, Philadelphia, DC, Houston) found nothing else, so Boston is the second mapped course after London. Overpass returned 502 often; the tools need retries.
- Tropical cyclones: `scripts/events/storms.ts` (NASA EONET `severeStorms`, JTWC/NHC positions every six hours). A storm that peaked at 64+ knots becomes one confirmed 'Disaster' pin at its first position, sourced to its EONET event record, with the track as a `flightPath` (drawn on the pin map). Posted through `POST /api/admin/db/Pin` as @QuakeDesk; floods (GDACS stubs) and wildfires (hundreds of small ones) are skipped as thin. Prod pins 20613-20628 on 2026-10-29 (16 storms, last 45 days), translated into all 15 locales with the prod-translations sync. No pictures yet, and an active storm keeps the track it had that day (no update mode).
- Storm imagery (same day): `scripts/events/stormImagery.ts` adds three NASA Worldview VIIRS true-colour snapshots per storm pin (first day, peak-wind day, last day; a 20-degree box centred on the storm's position that day, public-domain NASA imagery), found on prod by sourceUrl and sent with PUT /api/pins/:id (whole pin plus media; the app stores thumbs in Azure Blob). All 16 pins 20613-20628 done; translations stayed current. Satellite swaths leave black orbit gaps and a storm can sit off-centre because the box uses the 6-hourly position against a daily mosaic.

## GDACS floods and the map's hazard layer (2026-10-29)

- `scripts/events/gdacs.ts`: orange/red flood alerts from GDACS (geteventlist, eventlist=FL) become one pin per event (newest episode) as @QuakeDesk, sourced to the event's GDACS report page, with GDACS's "Poly_Affected" polygon stored as a `flood` outline (PinSiteShape kind 'flood', blue, key label `pin.siteKey.flood` in all 16 locales; simplified to a 15,000-point budget). Left out on purpose: droughts (multi-country stubs), volcano alerts (a modelled 30 km circle, not an impact; no other facts), cyclones and quakes (already pinned from EONET and USGS). The pins say the polygon shows where water was detected or forecast, not damage.
- Map hazard layer: with the map filtered to the Disaster tag (`/map?q=tag:Disaster`), PinsMap fetches `GET /api/pins/hazards?from&to` (src/server/services/hazardShapes.ts: Disaster pins' PinFlightPath tracks plus flood and wildfire outlines, capped at 80 each, simplified to 3,000 points, cached 5 minutes) and draws them under the markers. Tracks that cross the antimeridian are unwrapped so they do not draw a line across the map.
