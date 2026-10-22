# Course and circuit lines on pin maps (PinSiteShape kind 'route')

- F1 circuits: scripts/routes/raceCircuits.ts, from bacinger/f1-circuits (OpenStreetMap), 30 pins, 2026-10-22.
- OSM route relations: scripts/routes/osmRoute.ts. Only London's marathon (relation 2086183) is mapped among the 12 marathon cities searched; pins 5026, 5028.
- Other courses: scripts/routes/courseLine.ts from a [lon, lat] JSON file. The pin credits the race's own course page; the Strava segment is listed only as a pin reference (Ian, 2026-10-22: Strava is a reference, not the map credit).
  - Chicago (pins 5027, 6217): line taken from the Strava segment 20453824 (42.19 km, 460 points after simplification), checked against the course page. The organiser's own map is a print PDF (26-BACM-COURSE-MAP-PRINT.pdf) with no coordinates.
- Organiser maps checked 2026-10-22: NYRR (text directions only), Berlin (course URL 404), Chicago (PDF). Strava has full-distance segments for few races; Berlin and Paris have per-mile segments only.
- Overpass (overpass-api.de) is often at capacity; retry.
