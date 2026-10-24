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
