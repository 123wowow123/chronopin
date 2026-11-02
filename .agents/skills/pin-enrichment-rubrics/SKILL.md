---
name: pin-enrichment-rubrics
description: >-
  Use this skill when adding or repairing scored rubrics and reviews on Chronopin pins: taste radar for
  food/drink, car performance (EV and gas), restaurant dining, AI language/video model rubrics with spec
  graphs, and product competitors. Gives the required fields, review minimums, save endpoints and sync files.
---

# Pin enrichment rubrics

Common rules for every rubric: only **opened HTTPS sources**, exact article titles, ISO `publishedDate`
(`YYYY-MM-DD`), **verbatim** quotes, never invented figures. Save through the API **locally and on production**
(match prod pins by `sourceUrl`; ids differ), read back, and keep the repo catalog JSON in sync.
If a figure or review is unavailable, record a specific research gap instead of filling it.

| Pin kind | Rubric | Reviews | Endpoint | Catalog to sync |
|---|---|---|---|---|
| Food, snack, beverage (ciders, beers, confectionery, launches) | 7-axis taste: Aroma 香り, Bitterness 苦味, Sweetness 甘味, Astringency 渋味, Umami うま味, Pungent 辛味, Coolness 清涼感; each 0-5 in half steps | at least 1 firsthand tasting (`PinTaste.reviews`: `url`, `title`, `publishedDate`, `quote`) | `PUT /api/pins/:id/taste` | `scripts/products/taste.json` (prod-id keyed; collides with local ids) |
| EV (`PinCarPerf`) | performance radar | at least 3, up to 6, credible road testers (Car and Driver, MotorTrend, Top Gear, Evo, Autocar); quote up to 300 chars on dynamics/steering/acceleration/handling | `PUT /api/pins/:id/car-performance` | car scripts + JSON catalogs |
| Gas car (`PinGasCarPerf`) | performance radar | same as EV | `PUT /api/pins/:id/gas-car-performance` | same |
| Restaurant (`PinDining`) | 5 axes: Food, Service, Ambience, Value, Critic acclaim; 0-5 half steps or null if unpublished | at least 3, up to 6 (Gourmet Traveller, Broadsheet, Time Out, Infatuation, MICHELIN, NYT, Eater); `publishedDate` may be null | `PUT /api/pins/:id/dining` | `scripts/restaurants/diningRubric.json`; back each cited source with references and source wikis |
| AI language/video model release or announcement | six-axis rubric (`PinLlmPerf` / `PinVideoPerf`) plus published spec/benchmark graphs and tables, credited media (see "AI model rubrics, graphs and media") | independent benchmarks and reviews | model rubric admin routes (see `daily-jobs.md#modelrubrics`) | research/replay catalogs |
| Hardware / chip pin (self-driving computers, AI accelerators, SoCs) | no radar: published spec graphs and tables in `PinPerf` | none required; cite the maker or the outlet that opened the datasheet | `PUT /api/pins/:id/performance` (admin or author; `{charts, tables}` replace) | `scripts/hardware/perf.json` (keyed by `sourceUrl`; `npx tsx scripts/hardware/perf.ts` is local only) |
| Any product pin (purchasable good or named product: vehicles, aircraft, snacks and drinks, sneakers, watches, electronics, games, software, AI models) | 2-5 `PinCompetitor` rows, rank 1 = closest rival | each row has opened HTTPS `sourceUrl` (comparison, review, spec) | `PUT /api/pins/:id/competitors` | replay scripts |

## Type-specific rules

- **Hotels**: always check Michelin Keys, Forbes and AAA acclaim in a rubric pass (`PinHotel`).
- **Competitors**: same segment and market at the pin's own time; name product and maker; link `competitorPinId`
  when we have the pin; one-line `summary`. Save locally and on production, matching prod pins by `sourceUrl`
  (ids differ). Not for restaurants, films, events or projects. Never invent a rival; queue the pin with a reason
  when no sourced rival exists. Extraction (`src/server/extract/index.ts`) names rivals when it reads a product
  page and the pin save stores them unsourced; the `productCompetitors` daily task then sources or replaces them.
- **Food and drink**: applies to every consumable (regional snack awards, ciders, beers, confectionery, new
  launches). Never leave one without a native taste radar and review citations, on local and production.
- **Cars**: aim for at least 3 verified independent reviews; up to 6. Keep scripts and JSON catalogs in sync.
- **Restaurants**: also back each cited scoring source with references and source wikis.
- **Radar scores** with no published basis stay null.
- A review's quote must actually describe the thing scored; do not reuse a review across sibling variants.

## AI model rubrics, graphs and media (owner instruction 2026-10-28)
Automatically enrich **every** AI language/video model release or announcement pin with its sourced six-axis
rubric, published specification/benchmark graphs and tables, and relevant credited media.
- Do it at creation/research time **and** repair existing gaps in every 06:00/18:00 news run, including pins
  that already have a rubric and pins whose authors are outside the curator allowlist.
- Open the exact model's launch announcement, docs, independent benchmarks and official galleries. Never
  inherit sibling-model specs; never graph incomparable evaluations together.
- Store images in Azure (see `pin-media-azure`); verify the public blobs and the saved native panels.
- Preserve authors and existing graphs, tables and media. Synchronize research/replay catalogs.
- Record specific unpublished figures, unavailable reviews or inaccessible media as research gaps; never invent
  them to fill a chart. Docs: `docs/okf/scraping/daily-jobs.md#modelrubrics`.

## Verify

Read the pin back on both environments, confirm the native panel renders, then update the catalog file and the
relevant section of `docs/okf/scraping/daily-jobs.md`.

## Chip and hardware generation threads (learned on Tesla AI5, 2026-11-01)
- **Main thread = the chip generations only, oldest first** (Tesla: HW3 Autonomy Day 2019 -> AI4 rollout 2023 -> AI5
  tape-out 2026). Each pin's `parentId` is the previous generation. **Side notes go in a sub-thread**, as a reply to the
  generation pin they belong to, never inline in the main chain: foundry/supply deals (Samsung $16.5B AI6 deal, 2025-07-28,
  is a child of the AI5 pin), fab confirmations, retrofits, rumors, rival comparisons. The pin page Thread pane renders
  the nested tree (Ian, 2026-11-01, after the first version chained the Samsung deal between AI4 and AI5). When
  re-parenting, `update_pin {parentId}` from the top down so two pins never point at each other. Chip desk: `@ChipDesk`.
- **Environment trap:** the MCP `create_pin` (and `save_model_tables`) run against production when `JOBS_PROD_BASE` is set, so the
  new pin id exists on prod only. `save_model_tables` then writes `PinPerf` locally and fails with
  `PinPerf_pinId_fkey`, and `scripts/hardware/perf.ts` reports "no pin for <sourceUrl>". Refresh the admin login
  (`admin-login-refresh`) and `PUT https://www.chronopin.com/api/pins/<prod id>/performance` with the body, then read it back
  with `GET`. Add the entry to `perf.json` so the catalog stays in sync. `save_model_tables` is for language/video models.
- **References:** `confidence` is a whole number 0-100 (0.9 is rejected with 400). `dateConfidence: 'estimated'` when a
  source says only "early 2023".
- **Spec conflicts are normal** (AI4 is 50 TOPS in one table, ~500 in another; AI5 memory 144 vs 192 GB; node 2nm vs 3nm).
  Never chart TOPS across generations (precision and per-chip vs per-computer differ). Chart only maker-stated multiples
  (e.g. AI5 vs AI4 = 8x compute, 9x memory, 40x overall) and put every disputed figure in a table with a "Basis"
  column (claim, report, estimate). Label reporter expectations as such.
- Sources that fail to open (Tom's Hardware returned no body) are cited only for what was read; use the headline claim
  as a headline claim.
- Translations are left to the translation agent (AGENTS.md, 2026-10-30), so `PinPerf` is saved without `i18n`.
- Media: one credited picture is the floor when no video or press image was opened; record the gap (here: no verified
  Autonomy Day / AI5 video) instead of padding.

## Be as complete as the information allows (owner instruction, 2026-11-01, Tesla Semi thread)
When a pin or thread is requested, do every part that published information supports in the same pass; do not
stop at the first pin and list the rest as "not done". Ian asked for this after the first Semi pass skipped
rivals, the award, the service center and a timeline that sources did cover.
- **Sweep the subject for sibling events first** (web search "<subject> news <month>"), then pin each distinct event
  (fire, award, permit, order, launch) and thread them **in date order**, re-parenting top-down with `update_pin`.
  Pin 2828-style chains: factory -> service center -> incident -> award -> next-year deliveries.
- **Every pin gets what its kind needs**: product pins get 3-5 competitors (each opened, with a verbatim-figure source)
  and a `PinPerf` comparison table; every pin gets 1+ critic-review/reaction excerpt (primary source, e.g. the
  award giver's own page, rather than a re-report), 3+ media and a map point; things being built get a status
  tag and a `PinFactory` profile with milestones and (`stage`/`timeline`) metrics; a product's company history
  (unveil, first deliveries, spec release, first production) can go on the factory pin's `milestones`.
- **Rivals**: cover every maker the coverage names (Mercedes, Volvo, MAN, Scania, DAF, Renault...). Search each maker's
  own spec page; if it is blocked (Cloudflare/403) use another trade page that was opened, and label show-truck or
  older-generation specs as such. Name only makers you found a figure for; record the rest as a gap.
- **Primary source over re-report**: for an award, permit or filing, find the giver's / agency's own page (Top Gear's
  award page, the Clark County record cited by the outlet) and cite it first; the outlet is the second reference.
- **Verify before saving**: every quote must be found in the fetched page text (curly apostrophes included).
  Table columns each need a heading (an empty first header is rejected with 400).
- **Source columns become numbered references**: in a `PinPerf` table (every spec/status table goes through it), a
  last column headed "Source"/"Sources" (3+ columns) is not shown as a column. Its cells become superscript `[n]`
  links appended to the previous cell, pointing at the pin's References panel (`#ref-n`). Keep the "Source" column in
  the saved table and write the outlet as the site is known ("Wccftech", "Drive Tesla Canada / Not a Tesla App");
  matching is by site name (up to four words), so the pin must carry that reference. Other cells get `[n]` only
  where they name a reference. A name matching no reference shows no number, so check each one resolves.
- **Production timeline for hardware**: a hardware/chip pin's path from research to commercialization is a `PinPerf`
  table with `display: 'timeline'`: exactly four columns (Date, Milestone, Status, Source), `stages` (2-8 names, e.g.
  Announced, Tape-out, Volume production, First deployment) and `current` (index of the reached stage). Status is
  "Demonstrated" (happened, sourced) or "Planned"/"Expected" (hollow dot); never infer a stage from an elapsed date.
  Source cells give the outlet name and render as `[n]` after the milestone. An `i18n` translation repeats columns,
  rows and the same number of `stages`. Replace the old "production status" table with it.
  The pin's start meter (the bar under the Start date) follows the timeline too: it runs from the pin's start to the
  latest placeable row, with a dot per dated row, instead of a full "started Nd ago" bar. Write dates the parser
  places ("Apr 15, 2026", "Jul 2026", "Q3 2027", "Late 2027", "2027" = year end); "early"/"H2" rows get no dot.
  Needs two or more placeable rows. The bar runs from the **earliest** placeable row (not the pin's own start, which
  for a launch- or approval-dated pin falls after its history) to the latest, so a drug, spacecraft or vehicle pin
  with a timeline shows its whole path. The same table works for any category with a staged path (drugs: Trials /
  Filing / Approval / Launch; spacecraft: Development / Test flights / First orbital / Operational; vehicles:
  Reveal / Testing / Production / Deliveries); those pins keep the generic Start/End labels until a kind is added
  to `src/lib/pinDateKind.ts`. Write outlet names so they match their reference's site name ("Air and Space Forces",
  not "Air & Space Forces"); an ampersand breaks the match. Research traps: WebFetch is 403'd or truncated by Tom's Hardware and Digital Citizen, so read them in Chrome
  (`get_page_text`, never reuse a stale tab; a page that redirects fails the domain check, re-read the tab and retry).
  Add each opened page as a reference (`POST /api/pins/:id/references`) so its Source cell links; use the outlet's
  name ("Tom's Hardware" matches tomshardware.com). A standard or spec with no sourced product dates (JEDEC LPDDR6)
  gets no timeline: record the gap instead of a two-row table. `PUT performance` replaces everything, so re-send the
  pin's existing charts and tables with the new timeline table. Such a pin's Start/End labels read Announced / Commercialization (construction
  pins read Groundbreaking / Completion); the wording per kind lives in `src/lib/pinDateKind.ts` with strings in every
  `messages/*.ts` locale, so a new category's wording is added there.
- **Environment**: a pin posted through `POST /api/admin/pins` (when the helper refuses the desk, e.g. `@MotorDesk`)
  lives on prod; save competitors/performance/critic-reviews/factory there with the admin token, then
  `POST /api/admin/pins/expire`. Mirror to local by `sourceUrl` when the local app has the pin.
- Only state remaining gaps that are real (no published figure, page unreadable), each with its reason.
