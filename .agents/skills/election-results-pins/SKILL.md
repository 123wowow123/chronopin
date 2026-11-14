---
name: election-results-pins
description: >-
  Use when pinning US election results (mayor, county, ballot measure, House district): one results pin per
  race, threaded, each with a vote-share bar chart and a district/city boundary outline on its map. Source
  is the NBC News per-race results pages (AP data).
---

# Election results pins

First built 2026-11-13: Nov 3, 2026 mayors, prod pins 21048 (Los Angeles, root) -> 21049 (D.C.) -> 21050
(Oakland + Measure EE). Curator `@PoliticsDesk`. Each pin has three parts; a results pin without the chart and
the outline is unfinished (owner, 2026-11-13: "should have geojson and graph").

## 1. Read the race page

Pattern: `https://www.nbcnews.com/politics/2026-elections/<place>-mayor-results` (also `<state>-us-house-district-N-results`,
`<state>-ballot-measures`...). `curl -sL -A "Mozilla/5.0"`, strip `<script>/<style>`, read the text. Take
projected winner, each candidate's percentage and votes, total votes, "% expected votes in" and "Est. remaining",
and the "Last update" stamp. The scraped text mangles party and name labels (the winner's name repeats on every row),
so read candidate/percentage pairs in order and confirm against a screenshot or a second source (local TV, e.g. KTVU).
Never copy a search-snippet number: open the page. Non-election-day races (Newark's mayor was May 12) are a different pin date.

## 2. The pin (`create_pin`, `@PoliticsDesk`)

- **`create_pin` writes to PRODUCTION**, not local. Read the pin back from `https://www.chronopin.com/api/admin/db/Pin?id=N`.
- `utcStartDateTime` = election day `00:00:00.000Z`, `allDay: true`, `dateConfidence: confirmed`.
- Full street address of city hall / county building with coordinates (Pin locations rule).
- `references[].confidence` is a whole number 0-100 (0.95 is a 400).
- `longFormSummary`: `<ul>` of cited points, `<cite data-ref="URL"></cite>`; state the "% in" caveat (counts move before certification).
- Several races = **one linear thread**: `parentId` of each pin is the previous pin, never the root for all (fix with `update_pin`).
- Translations are left to the translation agent.

## 3. Graph: `PUT /api/pins/:id/performance`

Body `{charts:[{title, unit:"% of votes", higherIsBetter:true, note, sourceUrl, bars:[{label, value, highlight}]}]}`.
Each bar carries `party` (`D` blue, `R` red, `I` grey, `G` green, `L` gold; owner 2026-11-13: bar colour = party). Use the party NBC prints; for a nonpartisan race (LA, Oakland) set NO party: neutral bars (winner accent, others grey), and say so in the note (owner 2026-11-13). A server older than the `PerfBar.party` build silently drops the field, so deploy first (`scripts/boundaries/electionPartyBars-2026-11-13.sh` re-saves the three Nov 3 charts). Winner bar `highlight: true`, 2 to MAX bars (top 3 is enough), put raw votes and "% in" in `note`. Needs admin/author token
(`.scrape/admin.token` for prod; refresh with `admin-login-refresh`). Never print tokens.

Pins tagged `Election` render this chart in the left column under the text (page.tsx `electionPerf`); every other pin keeps
it in the right column. So always tag election pins `Election`.

## 4. Map outline: `scripts/boundaries/import.ts`

Kind `district`, a manifest entry per pin: `{pinId, pinTitle (exact), kind:"district", name, vintage, source, sourceUrl, file}`.
Boundary source: OSM Nominatim (`format=geojson&polygon_geojson=1&limit=1`, generic User-Agent, no owner email, 2 s pause
between calls), credit "OpenStreetMap contributors (ODbL)" with `https://www.openstreetmap.org/copyright`. Check the
returned `type` is `administrative`/`city` and the geometry is a Polygon. Better when available: official ward / council-district /
county GeoJSON for the race (D.C. wards, county layers), as in `scripts/boundaries/fetch-*.mjs`.
Run: `npx tsx scripts/boundaries/import.ts --manifest M.json --base https://www.chronopin.com --token-file .scrape/admin.token`
(`--dry` first). Save files and manifest under `.scrape/boundaries/`. It prints `Verified <id>` on readback.

## Traps

- Prod answers slowly: the import and the first PUT timed out once; re-run, then confirm with
  `GET /api/pins/:id/site-shape` (200 vs 204) and `/performance`.
- The import checks the pin id AND exact title in that environment: local DB will not have prod pin ids.
- `find_pins` before creating; a 409 returns the existing id, update it instead.
- Thin-pin flags (short text, one source) come back on create; add a second sourced outlet when one exists rather than padding.

## Election side panel and landing page (2026-11-14)

A search for the word `election` (optionally with a year, `election 2026`) opens a side panel (`src/components/election/ElectionPanel.tsx`)
with Senate and House control, linking to `/election/<year>` (landing page: control bars, every Senate race, House battlegrounds, House
seats by state, sources) and to the year's hub pin. Figures live in `src/server/data/elections.json`; refresh them with
`curl -sL -A "Mozilla/5.0"` of NBC's `/politics/2026-elections/senate-results` and `house-results`, then
`python3 -I scripts/election/parseNbc.py senate.html house.html 2026` (party and winner come from the table's HTML classes, not the flattened text).
Add a new year by running the parser with that year and setting its `pins` (hub pin id, Senate results pin) in the JSON.
The file ships with the build: a refresh reaches production only with a deploy.
