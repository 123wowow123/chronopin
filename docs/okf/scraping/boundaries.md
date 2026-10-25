---
type: Reference
title: Wildfire perimeters and election district boundaries
description: Reviewed polygon imports, source dates and plan vintages for pin maps.
resource: ../../../scripts/boundaries/import.ts
tags: [scraping, maps, geojson, wildfire, elections]
---

# Boundary shapes on pin maps

`PinSiteShape` supports `wildfire` (red translucent fill) and `district` (teal translucent fill, dashed border), underneath buildings and other parts. Both have key labels in all 16 languages. No schema migration is needed: the existing table stores a GeoJSON FeatureCollection. Polygon holes and MultiPolygon islands are preserved. Route dots and distance markers still apply only to `route` lines.

Each imported boundary has its own `name`, `source` and HTTPS `sourceUrl` properties. Wildfires also carry the source's `observedAt` (ISO year, month, day or UTC timestamp, preserving published precision); districts carry a `vintage` describing the plan and applicable election. The key displays these beside the corresponding source link. A snapshot is not a live fire feed, evacuation order or election result choropleth.

## Import and replay

```sh
npx tsx scripts/boundaries/import.ts --manifest scripts/boundaries/research-2026-10-25.json --dry
npx tsx scripts/boundaries/import.ts --manifest scripts/boundaries/research-2026-10-25.json --dry --token-file .scrape/admin-local.token
npx tsx scripts/boundaries/import.ts --manifest scripts/boundaries/research-2026-10-25.json --base http://localhost:3000 --token-file .scrape/admin-local.token
```

Supply a valid authenticated admin token; never commit it. A dry run without a token checks geometry and metadata only. With a token it also verifies pin titles. A save always verifies each exact `pinId`/`pinTitle` against that environment before writing anything. For production, make an environment-specific manifest after looking up the pins; local numeric IDs are not portable. New rendering code requires a separately authorized deployment before production imports can be seen.

Manifest entries contain the metadata above, `pinId`, exact `pinTitle`, and exactly one of `file` (local GeoJSON path from repository root) or `url` (HTTPS GeoJSON). Optionally use `match: { "field": "GEOID", "value": "0601" }` to select a feature from a collection, with exact property value/type equality. Always use a reviewed incident ID/year or exact district/plan, never name or proximity alone. Combine all polygons for one pin/kind into one entry. A matching collection must contain only the intended boundary, not all dates of an evolving fire or multiple district plans.

For ArcGIS queries request `outSR=4326&f=geojson`; filter to the desired incident/district and inspect source attributes first. The importer rejects truncated responses (`exceededTransferLimit`), errors/empty results, projected coordinates, points, lines and unclosed/degenerate rings. WGS84 EPSG:4326 and CRS84 declarations are accepted. FIRMS detections are points, not perimeters: do not draw their convex hull as a fire boundary.

Saves use authenticated `/api/admin/db/PinSiteShape?upsert=1`, invalidate the pin cache through the admin write hooks and read back geometry and credit. Only the incoming kind is replaced; other geometry and legacy row-level attribution remain. Before/after copies are saved under ignored `.scrape/boundary-shapes/`. The data-centre importer's cleanup is limited to its own source rows and preserves boundary/route rows. Avoid concurrent shape writers to the same pin: generic admin upserts do not provide compare-and-swap.

## Reviewed source matches — 2026-10-25

The replay catalog is `scripts/boundaries/research-2026-10-25.json`. Local targets:

| Pin | Boundary | Source and evidence |
| --- | --- | --- |
| 3407 — Palisades containment | January 2025 dissolved heat perimeter | [Los Angeles County GIS service, originally sourced from CAL FIRE](https://services.arcgis.com/RmCCgQtiZLDCtblq/arcgis/rest/services/Eaton_and_Palisades_Dissolved_Fire_Perimeters/FeatureServer), layer 0 OBJECTID=1: `name="Palisades Fire (01-2025)"`, `type="Heat Perimeter"`. |
| 3431 — Eaton containment | January 2025 dissolved heat perimeter | Same service, layer 0 OBJECTID=2: `name="Eaton Fire (01-2025)"`, `type="Heat Perimeter"`. |
| 3523 — Paloma Aguirre special-election win | San Diego County Supervisorial District 1, county land boundary | [County of San Diego Supervisor District layer](https://gis-public.sandiegocounty.gov/arcgis/rest/services/Hosted/COSD_Boundaries/FeatureServer/1), `distno=1`. The source says “On January 12, 2022, the IRC approved technical changes to the 2021 Redistricting Plan”. |

Fire-layer service description: “This service provides dissolved fire perimeter boundaries for the Eaton and Palisades areas”. The published feature names establish month precision only; no exact observation/containment timestamp is asserted. These are January heat-perimeter snapshots on the containment pins, not ignition-time outlines, certified final burn scars or evacuation boundaries. The service's CAL FIRE link identifies NIFC/FIRIS as upstream provenance. Pin authors and event dates remain unchanged.

The district source explicitly describes clipping ocean areas and correcting the county exterior while preserving internal district lines. Its display field still names Nora Vargas, so only geometry and district number are used; the officeholder attribute is not imported. The [official District 1 site](https://www.sandiegocounty.gov/content/sdc/bos/district1.html) redirects to Paloma Aguirre's office site.

## Research gaps and traps

- The current [NIFC WFIGS year-to-date perimeter layer](https://services3.arcgis.com/T4QMspbfLg3qTGWY/ArcGIS/rest/services/WFIGS_Interagency_Perimeters_YearToDate/FeatureServer/0) returned a different Palisades incident discovered in July 2026, not the January 2025 Los Angeles fire. A name-only match would be wrong. The all-years historical view returned no Eaton/Palisades records for 2025 in this check. The CAL FIRE current perimeter view also returned no matches for those 2025 incident names/discovery dates. Use the explicit archived county polygons above.
- Source services can change; saved ignored copies support inspection/rollback. Recheck feature IDs, names, year and geometry before replaying future updates.
- Congressional districts require the correct Congress/election plan. [TIGERweb's current release](https://tigerweb.geo.census.gov/tigerwebmain/TIGERweb_main.html) describes 120th Congress boundaries; use the [119th Congress collection](https://www.census.gov/programs-surveys/decennial-census/about/rdo/congressional-districts.119th_Congress.html) for applicable older events. Do not substitute today's district geometry for a historical election.
- Additional election pins (San Francisco District 4 and Holborn/St Pancras) need their own official vintage-matched district polygons before importing; they are not assigned a nearby polygon or a congressional district.
- No automatic pin creation or recurring boundary job is installed. This importer applies reviewed matches to existing pins. No production deployment is part of this work.

## Production backfill — 2026-10-25

After the owner reported deploying the map code and requested the production backfill, all three targets were independently matched through the authenticated admin API by source URL, exact title and event date. Production IDs are also 3407 (Palisades), 3431 (Eaton) and 3523 (San Diego District 1). None had an existing `PinSiteShape` row.

The production replay manifest is `scripts/boundaries/research-2026-10-25.prod.json`. Its authenticated dry run passed; the import saved and read-back verified all three geometries and credits. Pin authors, event dates, titles and event source URLs were verified unchanged. This was a content import through the admin API, with no deployment or VM action.

```sh
npx tsx scripts/boundaries/import.ts --manifest scripts/boundaries/research-2026-10-25.prod.json --base https://www.chronopin.com --token-file .scrape/admin-boundaries-prod.token --dry
npx tsx scripts/boundaries/import.ts --manifest scripts/boundaries/research-2026-10-25.prod.json --base https://www.chronopin.com --token-file .scrape/admin-boundaries-prod.token
```

Public production pages were also checked in a headless browser: all three rendered their expected polygon color, translated key label, boundary name and snapshot date/plan vintage. Screenshots are saved as `.scrape/boundaries/<pinId>-<kind>-prod.png`.

Pre-write production records are retained in ignored `.scrape/boundaries/prod-before-2026-10-25.json`; tokens and screenshots also remain ignored.
