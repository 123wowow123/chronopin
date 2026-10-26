---
type: Reference
title: Country geometry round three, 2026-10-25
description: Morocco local constituency outlines added in production; remaining gaps.
tags: [scraping]
---

# Country geometry round three — 2026-10-25

**Added 65 local constituency outlines to Morocco's existing 12 regional-list areas in production.** The pin now has 77 explicitly named features. This is partial coverage: 27 of the 92 local constituencies remain missing. Total production coverage is 75 mapped pins and 10,322 default features. All five countries still lack complete reviewed geometry. No deployment, restart or build was required.

## Morocco: whole-unit local constituencies

The annex to [decree 2-11-603 in Bulletin officiel 5992](https://archive.gazettes.africa/archive/ma/2011/ma-bulletin-officiel-dated-2011-11-03-no-5992.pdf) explicitly defines the selected constituencies as whole provinces or prefectures. The downloaded legal annex was checked by PDF page; the replay catalog records the page for every selected unit. These are composition matches, not a rule that administrative boundaries always equal electoral boundaries.

The [PJD's published 2026 roster data](https://candidats.pjd.ma/js/data.js), linked by its [2026 candidates site](https://candidats.pjd.ma/index.html), contains 92 local and 12 regional records. Each selected unit has exactly one matching local record in the correct region. Arabic names were normalized only for orthographic/punctuation differences; Figuig has one explicit reviewed alias, `فجيج - بوعرفة`. Party records corroborate current constituency names; the legal annex supplies their whole-unit composition. No candidate identity, party result or seat allocation was copied into the map.

The [Communes du Maroc downloadable geometry](https://communes.pages.dev/fr/docs/downloads/) supplies 75 province/prefecture outlines. Ten are explicitly excluded because they contain multiple local constituencies: Fès, Taounate, Kénitra, Khémisset, Rabat, Salé, Azilal, Casablanca, Marrakech and Taroudant. Their missing seats total 27: two each except Casablanca's eight and Marrakech's three. The other 65 valid polygons are retained without any coordinate modification.

The 12 regional-list areas remain present. Local and regional tiers overlap intentionally; each feature name identifies its tier. Labels and vintage text explain the missing 27 seats, source geometry's cartographic nature, retained minor overlaps and disputed-territory geography. OSM/ODbL attribution and a link to the downloadable source database remain attached to every feature.

Reproduction:

1. Download the province GeoJSON to `.scrape/boundaries/morocco-provinces-round3.geojson` and the party roster JS to `.scrape/boundaries/morocco-pjd-data-round3.js`. Keep the previously downloaded regional GeoJSON and gazette PDF.
2. Run `scripts/boundaries/prepare-morocco-local.py` with Shapely. It checks the complete 75-unit inventory, exact 65/10 selection, 92/12 roster counts, one-to-one current name/region matches and polygon validity.
3. Preview and import `scripts/boundaries/backfill-morocco-partial-2026-10-25.prod.json` through the standard boundary importer. The master replay manifest now uses this 77-feature entry. The earlier regional-only manifest is historical and would remove the local layer if replayed by itself.

The tracked `research-morocco-local-2026-10-25.json` contains all 65 crosswalks, excluded units, source links and downloaded-file hashes. Raw geometry remains ignored. A separate copy of the previous 12-feature saved shape and its rollback snapshot was retained before this import.

## India: membership evidence, no new geographic validation

[Kaun Civic Data Commons](https://data.kaun.city/india/pc-crosswalk/) publishes a constituency crosswalk derived from delimitation orders. The downloaded JSON's 14 Assam rows contain every assembly number 1–126 exactly once; the five Jammu & Kashmir rows contain every assembly number 1–90 exactly once. These internal membership checks passed. The tracked `research-india-crosswalk-2026-10-25.json` records the 19 rows' membership numbers, source version/hash and limitations.

This does not resolve the geometry gap. The publisher identifies the previously reviewed `shijithpk/2024_maps_supplement` as its parliamentary polygon source. Its comparison uses representative interior points against partly older DataMeet assembly polygons; only 77 Assam and 57 J&K links are spatially tested, and its own output marks Guwahati and Nagaon divergent. Membership consistency is useful evidence, but it does not independently certify every current boundary. The India pin wiki now includes this distinction.

## Other source checks

The GIS-Lab Duma geometry lead refers to the older 2015 law/2016 district plan, so it does not establish the 2026 plan. The originating project page timed out. The Nigeria source leads inspected did not supply a newly verified reusable 360-seat layer; the official electoral/operational crosswalk requirements remain. A fresh Gambia geoportal request timed out. No map was attached to these pins during this round.

The Moroccan official election-documentation page returned HTTP 403. The indexed 2026 consolidated law refers to decree 2-11-603; a Wikisource transcription was readable, but it was not represented as a successful fresh download from the ministry. Whole-unit selection above is grounded in the retained gazette annex and current roster cross-check.

## Verification

The importer read back all 77 saved Moroccan features and source credits. Public-browser validation checked the native pin page's rendered paths, labels and map key; the map screenshot was visually reviewed. Fresh API comparisons cover all 75 saved production maps and 10,322 default features. Wiki edits preserve prior content, authors, event fields and coordinates. Replay inventory, audit status counts, evidence hashes and whitespace checks were also validated. The 11 existing redraw groups and 401 alternate-plan features are unchanged.
