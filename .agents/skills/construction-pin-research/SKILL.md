---
name: construction-pin-research
description: >-
  Use this skill when researching or repairing pins about things being built or opened: pipelines, power
  plants, dams, bridges, tunnels, railways, terminals, towers, stadiums, data centres, factories and fabs.
  Covers construction price, status tag, power generation fields, the PinFactory buildout profile and sourced GeoJSON.
---

# Construction and energy project pins

Evidence rule for everything below: opened HTTPS source, verbatim quote, preserve existing tags and authors,
never invent a figure. Apply through the authenticated admin APIs in **both environments** and keep the
research/replay catalogs synchronized. A construction pin runs groundbreaking to completion (a period, not a point). The pin page words them that way
(`src/lib/pinDateKind.ts`: Groundbreaking / Completion in the date ranges and the countdown end label, in all 16
locales), so `utcStartDateTime` must be the groundbreaking date and `utcEndDateTime` the completion date.

## 1. Cost (`price`, `priceCurrency`)
- Use the currency the source states; **no FX conversion**.
- Match the figure to the pin's own event (a phase takes the phase cost) and use the most recent estimate.
- Collapses, demolitions, rescues and approvals with no budget stay **null**.
- **Estimated price (owner instruction, 2026-10-30):** a build with no published cost still gets an estimate, the
  way Google's "price estimate" answers do. Take a published benchmark for the building type and region (per unit,
  per sq ft or per MW; trade-press or cost-consultant page you opened, not a guess), multiply by the project's own
  sourced quantity (units, floor area, capacity), and save the midpoint as `price`/`priceCurrency`. Always label it:
  - a `PinFactory` `investment` metric whose label **begins with "Estimated"** ("Estimated construction cost"); the
    pin page then shows "Cost estimate" instead of "Cost" (`hasEstimatedCost`, `pin.costEstimate`), stating the range, the formula, that it is
    an estimate and not a published budget, and what it excludes (land, soft costs, financing), with the benchmark's
    verbatim quote as its source;
  - an "Estimated cost" section in `longFormSummary` citing the benchmark, plus the benchmark page in `references`.
  Put the working in the metric's structured `breakdown` (lines of `kind` sourced / assumption / result, each with
  label, value, note, and a source for sourced lines); the pin page renders it as "How this estimate was built".
  An input with no published figure (e.g. average unit size) is an `assumption` line, never dressed as sourced.
  Show the **breakdown of its parts** in both places, never a bare total: the quantity and where it came from, the
  per-unit benchmark (low, high, midpoint), the low and high totals, the figure used for the price, and what is
  excluded, each as its own cited line in the summary and spelled out in the metric value.
  A published budget always replaces the estimate. Land prices and permit figures are not construction cost. Use a
  local-market row when the source has one. A national row for the exact building type may stand in when there is
  no regional row, but the metric and summary must say it is national and may understate the cost (Brucker: mass
  timber, 2026-10-30). Millennium Mission Valley (pin 20653, owner request 2026-10-30) has units but no published area:
  area is an assumption line, and the 2016 San Diego $/SF quotes bracket the range (`scripts/construction/estimate-mission-valley-2026-10-30.mjs`). If no benchmark covers the type, or the project has no sourced quantity or design (NAVWAR), leave `price` null and say why.
- Batch estimates (2026-10-31, `scripts/construction/housing-estimates-2026-10-31.mjs`): research agents read pages through
  a summarizing fetcher, so their quotes are not verbatim. Before saving, curl each cited page, strip tags and check the
  quote (split on "...") appears; hold any entry that fails, plus phases/towers/rehabs/proposals the benchmark row does
  not fit. A benchmark row's quote is the row label + range + first note sentence as the page prints it.
- Non-housing batch (2026-10-31, `scripts/construction/other-estimates-2026-10-31.mjs`): agents verify each quote with
  `.tmp/check_quote.py` (raw page, not a summarizing fetch) before writing it. Published budget first, in its own currency (no
  FX). Hold figures that cover a larger scope than the pin (whole airport vs first runway, whole ensemble vs one tower),
  constant-currency or floor figures, and unresolved source conflicts. Few non-housing buildings have a citable per-unit
  benchmark, so most stayed null rather than forced.
- Record the source in references or wiki. The extraction prompt `src/server/extract/systemPrompt.ts` carries the same rule.

## 2. Status tag: exactly one of `Proposed`, `In Progress`, `Completed`, `Withdrawn`
- Plans/approvals before verified physical work: Proposed.
- Construction, refurbishment, testing or commissioning underway: In Progress.
- Explicitly finished, opened or commercially operating scope: Completed.
- An announcement, loan or approval does not complete construction. A first coil, criticality or grid test does
  not alone prove completion. **Never infer completion from an elapsed target date.**
- Owner instruction (2026-10-30): a verified withdrawn project or interconnection request carries `Withdrawn` and a sourced withdrawal milestone on its project timeline. If the withdrawal date is unpublished, show the dated source observation explicitly; never invent the withdrawal day. A withdrawn queue request does not establish cancellation of every project at the site.
- How the status and dates show (2026-10-31): the map popup labels the date `Groundbreak:` (`Withdrawn:` for a
  Withdrawn pin, whose own start is the withdrawal day, so set it to that day). The pin page's progress bar runs from
  the pin's start to its completion (`utcEndDateTime`), so give every construction pin a sourced completion; a slipped
  start (`originalStartDate`) shows as a coloured segment before the build. Profile `milestones` strictly between the
  two become hoverable dots on the bar: a bare year is read as its last day (a "2027" forecast is the completion, so it
  gets no dot) and a month or quarter as its first day, so keep milestone dates at the source's precision and label a
  real intermediate stage (commissioning, first production) rather than repeating the completion. No original
  completion date is stored, so a slipped completion cannot be drawn yet.
- **The pin page's progress bar must carry the new timeline too (owner instruction, 2026-11-02).** The bar
  (`CountdownMeter`) draws a build only when the pin has a status tag (`Proposed`/`In Progress`/`Completed`/`Withdrawn`)
  **and** `utcEndDateTime` is later than the pin's start; otherwise it is a plain countdown, and a pin whose start has
  passed shows a full bar reading "Started today" (Fleetwood 18703: its only date was the proposed completion,
  2026-11-01, so the bar was full). So whenever you save a timeline, set the bar's three inputs in the same pass:
  1. `utcStartDateTime` = the **sourced construction start** (groundbreaking, notice to proceed, "construction began
     {month}"), not the completion date and not a queue-entry date; keep its precision.
  2. `utcEndDateTime` = the sourced **completion** (proposed in-service, COD, opening), at the source's precision.
     A bare year is read as its last day; do not invent a month.
  3. Exactly one status tag, from what the sources document (an EIA detailed status code "(V) Under construction,
     more than 50 percent complete" supports `In Progress`; a queue entry or announcement without construction
     is `Proposed`; online is `Completed`, with end = the operation date).
  The profile's `milestones` strictly between start and end become the dots on the bar, so give real intermediate
  stages (approval, agreement executed, equipment, energization) at source precision; a milestone equal to the start
  or end draws no dot. A slipped start goes in `originalStartDate`.
  **No sourced construction start?** Do not move the start to the completion date to fill the bar and do not tag it
  (the page would label the completion "Groundbreaking"). Leave the pin untagged with its completion as the start,
  and queue the gap with `mark_revisit` ("construction start not published"). The EIA-860M row and interconnection.fyi
  pages carry only the proposed operating month, never a construction start (checked on Fleetwood), so a bar for an
  EIA-only pin needs a developer, utility, county or news source for the start.
  Verify on the live page after saving (the bar's right label reads "Completion {date}" and the dots hover with the
  milestone labels), and expire the cache (section above).
- Untagged factory pins (owner decision, 2026-11-01): a pin dated at its announcement or planned production start gets
  **no** status tag until a groundbreaking/construction-start date is sourced, because a tag makes the page label its
  start "Groundbreaking". Do not tag and keep the announcement date, and do not move the start to a target year. Queue
  the evidence gap with `mark_revisit` instead (done for Westinghouse Hopkins 18957, Purina Mantova 3089, MG Galicia
  14220). Denied permits (Wildcat Ridge 18967) stay untagged.
- Exclude non-construction accidents, closures, sales and monitored storage. For cancelled/halted/unsupported
  status, document it rather than forcing a tag.
- EIA-860M is preliminary: check the pin's existing operator/regulator references for commissioning evidence
  before replacing a Completed tag or treating a planned-inventory row as the current physical stage. An
  explicit owner in-service report takes precedence over a conflicting preliminary inventory entry; retain
  the conflict in the research record and use the owner evidence in the profile.

## Expire the cache after every update
After any pin update (dates, price, status tag, profile, media, timeline), expire its cached page on each host you
wrote: `POST /api/admin/pins/expire {"ids":[<id>]}` (admin; local and production), then confirm the page shows the
change. The pin API already expires on a normal save; direct SQL, `/api/admin/db` and side-table writes do not, and the
page keeps the old reading for hours. Docs: `docs/okf/api/pin-expire.md`.

## 3. Power plants: `PinPower` (`kind: 'generation'`)
- Save via `PUT /api/pins/:id/power`, verify locally and in production.
- Match capacity to the unit, phase and period. Distinguish net/gross electrical MW from thermal MW, and annual
  MWh/GWh. Include published annual output.
- State whether capacity is historical, operating or proposed, especially on accident, shutdown, storage and
  restart pins. A retired unit's rating must not imply current generation.

## 4. Buildout profile: `PinFactory`
- Applies to factories/fabs (`Manufacturing`/`Factory` tags) and, since 2026-10-29, **any priced construction pin
  with a status tag** where sourced data allows.
- Sourced metric cards (investment, jobs, floor area, capacity, timeline, products) plus a dated project timeline.
- Save via `PUT /api/pins/:id/factory` (tool `save_factory_profile`), locally and on prod. The `factoryProfiles`
  daily task finds gaps automatically.
- A pin covering several plants is **split**: one pin per plant, threaded under the parent (`parentId`), dated to
  that plant's own milestone, each with its own profile.
- Radar scores stay null unless a peer cohort or named capability is published.

## 5. Large profile rounds: identity and source precision
- Research a raw gap candidate before counting it as a missing eligible project. Skip repeated milestones when
  the same physical scope already has a project profile; record the profiled pin and the specific overlap.
- EIA generator rows must match plant identity, state/county, technology and the pin’s exact component/phase.
  Keep separate unit operation months separate. For non-adjacent worksheet rows, quote each literal row
  separately rather than joining them into a supposed continuous quotation. A generator inventory rating is
  preliminary nameplate capacity, not a utility commitment, annual output or an independent construction budget.
- An Epoch AI campus’s modeled IT power, compute equivalents and inferred operational dates are research
  estimates. Do not treat modelled compute-plus-building capital costs as construction prices. Keep its dated
  physical observations separate from inferred operation and distinguish completed buildings from ongoing
  campus expansion. Duplicate campus aliases do not create new project counts.
- For housing, match the named site/phase and city/address to the operator or a unique HUD LIHTC `HUD_ID`.
  Phase numerals matter; do not merge similarly named phases or add their units without source evidence.
  HUD `YR_PIS` is the tax-credit project’s placed-in-service year, not necessarily original building construction
  or a new rehabilitation opening. Values such as `8888`/`9999` are unknown, never dates. Preserve year precision,
  and do not infer vacancy, present eligibility or an exact ceremony day from a placed-in-service record.

Docs: `docs/okf/scraping/daily-jobs.md#factoryprofiles`, `docs/okf/api/factory-capability.md`.

## 6. Reaction excerpts, media and timeline (every development pin)
Owner instruction (2026-10-30): every development/construction pin gets a project timeline, 3+ media, **top
reaction excerpts** and a full `longFormSummary`. Excerpts are **not** posted to the comment panel (that is for readers); they are stored like
reviews, as critic reviews: `PUT /api/pins/:id/critic-reviews` (local and prod), 3-5 entries
`{url, title, publishedDate, quote (<= 300 chars), sentiment -1..1}`, one distinct URL each, `source: "session"`.
- Each is a real, attributed public reaction (city or agency spokesperson, owner, neighbors, opponents' appeal,
  local columnists) quoted verbatim from a page you opened. Cover support, opposition and official process where
  the coverage has them. Give every excerpt its real `publishedDate` (page JSON-LD `datePublished` or
  `article:published_time`) and a `sentiment`: the pin's "Sentiment over time" graph and its overall (aggregate)
  tone badge plot only dated, scored reviews. Sentiment is an editorial estimate of the quote's tone toward the project; say so in `basis`.
- Label paraphrased reactions as reported, name AI-assisted outlets in the title, and never invent a quote or
  commenter; if none exists, record a research gap.
- Media: 3+ pictures from the coverage (outlet og:image or article photos); skip off-subject stock photos.
  **The main image is the project's official rendering** from the developer or a project directory (e.g. BuildSD
  `buildsd.org/projects/<slug>`, the developer's site, the city or CEQA file, the architect). View it first to
  confirm it shows this project, and credit the source. Site and "before" photos follow it.
- The main image is the pin's lowest media id (the readback order is by id, not by the order you send). To make a
  later-found rendering the main image, PUT media with only the rendering, then PUT again with the rendering
  first and the rest after it. Reinserted media can lose attribution during thumbnail processing: retain the
  original URL-to-credit mapping, restore `authorName`/`authorUrl` as needed and verify every readback credit.
  Round-trip the whole pin (GET, change `media`, PUT) locally first and diff the
  readback, then on prod.
- Timeline: `PinFactory.milestones` (section 4) with verbatim quotes; leave out dates you could not read yourself.
  Owner instruction (2026-11-02): add the timeline **while researching** each construction pin, in the same pass as the
  facts, never as a later round. Research the dated stages as you read the sources (announcement, queue entry,
  interconnection agreement executed, approvals, groundbreaking, online date) and save the profile right after the
  pin is corrected. Show conflicting dates side by side, each with its own source. See section 9 for queue-derived pins.
  Always include the **estimated completion** milestone (`basis: "planned"`, published precision such as
  `Early 2028`, source quoting the developer's or trade press's stated delivery target). Only when no delivery
  target is published, say so as a research gap; never infer one.
- Pin content: besides a 3-4 sentence `description`, write a `longFormSummary` (HTML, `<h3>` sections, each bullet
  ending in `<cite data-ref="URL"></cite>` for an opened source): the site and what stood there before, what is
  being built (units, floors, area, affordable share, preserved features), approval and opposition, construction
  and timeline (start, estimated completion), and cost (or the statement that none is published and what the
  only published figure, such as land price, is). Every claim comes from a page you read; add each cited URL
  (and the rendering's source page) to `references`.
- **No "Rendering"/"Images"/"Photos" section in `longFormSummary`.** The rendering's credit lives on the media row and
  its source page in `references`; a section saying "the lead image is X's rendering" only repeats that, and its trailing
  `<cite>` outside the `<p>` renders as a stray `[n]` on its own line (pin 20640, removed 2026-10-31). Keep every `<cite>`
  inside the `<li>`/`<p>` it supports.
- **Tags (every development pin):** exactly one status tag (section 2) plus `Under Construction` while building, the
  place (neighbourhood/city), and topic tags that fit. Housing pins also carry **`Housing`** alongside `Affordable
  Housing` etc., and tags for who it serves (`Veterans`, `Supportive Housing`, `Homelessness`). Keep existing tags.
  Add through `POST /api/admin/db/PinTag` (`[{pinId, name, kind: 'topic', source: 'user'}]`) in both environments,
  skipping names the pin already has. Worked example: pin 7019 Rose Creek Village
  (`scripts/construction/rose-creek-village-2026-10-30.mjs`, owner request 2026-10-30/31). Its sources also showed
  conflicting completion years (developer Fall 2026, County 2027): keep the developer's target as the pin date, add
  both as planned milestones and say so in `dateConfidenceReasoning`. Fetch SDHC pages without a browser User-Agent.
- **Batch timelines (2026-10-30, 27 housing pins with a status tag but no profile):** lanes of 3 pins draft
  `.tmp/housing-timeline/<id>.json` (brief: `.tmp/housing-timeline/BRIEF.md`, quote checker `check_quote.py`), then
  `scripts/construction/housing-timelines-2026-10-30.mjs` re-verifies every quote and saves refs, summary sections,
  status tag (a source-backed change, e.g. Proposed -> In Progress/Completed/Withdrawn), published price (replacing an
  earlier "Estimated" metric), profile with milestones and reaction excerpts, on prod and local. Year-only or
  retrieval-day `publishedDate`s are saved as null. Image candidates in the drafts (`mediaCandidates`) are not uploaded yet.
- **Conflicting facts: use the government reference (owner instruction, 2026-10-30).** When sources disagree on a
  unit count, cost, date or status, the pin states the figure from the government / housing-agency page (city,
  county, state HFA, HUD, housing authority), makes that page the quote source for the metric, and names the
  conflicting figure and its source in the summary and the research gaps. Read the whole government page first: a
  release can contradict itself (Sophie Maxwell, pin 3180: the city release says 105 units in its text but 112 in the
  Mayor's quoted remarks, so the pin uses 105 and notes the 112). If the government page is itself split, say so
  rather than picking the larger number.
- Ongoing: the 06:00/18:00 news job's `review_research_gaps` `construction` list refreshes excerpts and sentiment as a
  project nears completion or local news appears (`docs/okf/scraping/daily-jobs.md#sentiment`).
- **Map (every development pin):** a pin needs `latitude`/`longitude` or it shows no map; an `address` alone is not
  geocoded on create. Geocode the street address (ArcGIS `findAddressCandidates`, score 100, or Photon), sanity-check
  the point against the neighborhood, and save it with the pin: include both fields in the create body, or
  whole-pin PUT them on (GET, set `latitude`/`longitude`, PUT, diff the readback), locally and on prod. If the
  coverage gives no street address, use the named site's published coordinates and say so in the summary; never
  use a city centroid.


## 7. GeoJSON when available
Owner instruction (2026-10-30): research and add available project GeoJSON alongside the map point.
- Prefer operator/regulator GIS, municipal parcels or planning layers, then reviewed OpenStreetMap, Epoch AI or
  Data Center Tracker geometry. Open the source, match the exact site and phase, and retain its URL, attribution
  and observation/vintage. A nearby polygon or similarly named project is not a match.
- Store a WGS84 `FeatureCollection` with `[longitude, latitude]` coordinates in `PinSiteShape`, using supported
  `properties.kind` values (`site`, `building`, `substation`, `power`, etc.; `src/lib/siteShape.ts`). Use the
  authenticated `/api/admin/db/PinSiteShape?upsert=1` API in both environments; `/api/pins/:id/site-shape` is GET-only.
  Merge existing features and preserve their source metadata; do not overwrite hand-reviewed boundaries.
- Verify valid closed polygon rings, finite coordinate ranges, plausible extent and the project's component
  scope. A programme/campus outline is not an individual building boundary; label shared context explicitly.
  Do not fabricate rectangles, circles or parcel outlines from a point, acreage, screenshot or unreferenced plan.
- Read back the stored row and public `/api/pins/:id/site-shape` in both environments; check alignment with the
  point/map. Keep sourced geometry and replay metadata with the research catalog. If no reliable geometry is
  published or a service is inaccessible, record that specific gap and retain the verified point.
- Government PDF portfolios may expose only a cover page to text extraction. Inspect embedded files
  (`pdfdetach -list`, then extract the relevant application) before concluding site coordinates are unpublished.
  Distinguish a published general facility point from surveyed building footprints.
See `docs/okf/scraping/routes.md` and `scripts/power/siteShapes.ts` for existing importers and shape kinds.

## 8. AI cluster / supercomputer pins from a press reveal (2026-11-01, Tesla Cortex 20697/20698)
A "show me the supercluster" request is a construction pin, not a news item: it needs the status tag, a dated project
timeline, 3+ media, reaction excerpts and a map point (sections 2, 4 and 6), and each successive cluster is its own pin
threaded under the first (`parentId`; Cortex 2 = 20698 under 20697). The first draft of 20697 skipped all of that and
had to be repaired, so do it in one pass.
- **Source choice:** a vendor/accessory-shop blog is not a source (the handed basenor URL was only an example; Ian asked
  for a better one). Date the pin to the event the best independent or primary source reports, and put Tesla's own deck
  (`assets-ir.tesla.com`) first for a later stage.
- **Workflow:** `create_pin` posts to **production**. Write the draft to `.tmp/dc-timeline/<id>.json`, then run
  `scripts/construction/data-center-timelines-2026-10-31.mjs --base https://www.chronopin.com --only <ids> --drop-unverified`
  (dry run first, then `--apply`). It re-checks every quote, sets status tag, factory profile, milestones and reaction
  excerpts. The default base is local and skips with "identity mismatch" for prod-only pins.
- **Reaction excerpts** for a corporate cluster come from trade press and analyst notes; name the outlet in the title and
  mark fan sites (Tesla Oracle) as such. Score tone honestly (a "less than 3% built" note is slightly negative).
- **Quote checks:** use `python3 -I .tmp/check_quote.py <url> "<quote>"` with a function, not an unquoted variable (zsh
  does not word-split). A PDF table row that wraps across lines fails; quote the press page that restates it instead.
  Cloudflare-fronted pages (DatacenterDynamics) cannot be read, so do not cite them.
- **Cost:** Tesla publishes none per cluster. Leave `price` null and say why; company-wide capex or hardware spend is a
  larger scope, not the pin's price. No GeoJSON was sought for Cortex; record that as a gap.
- **Specs a data-center pin must carry (gap found 2026-11-01, Cortex 2 pin 20698; Ian asked for MW and water):**
  - **MW:** one `capacity` metric plus `capacityPoints` (`kind: "it"`, 2+ dated points so the "Capacity over time" graph
    draws) from the operator's own deck. Tesla lists MW of compute per cluster in its quarterly update
    (`assets-ir.tesla.com/tesla-contents/IR/TSLA-Q<n>-2026-Update.pdf`, "Supporting Infrastructure": Cortex 1 >90 MW then
    >105 MW, Cortex 2 >115 MW then >120 MW). Compute MW is not the grid connection; a 2024 plan (130 MW to 500 MW) is a
    plan, and a social-post permit reading (200 MW) is not a source. Q1 2026 gave H100-equivalents, not MW, so do not mix.
  - **Cooling and water:** a "Cooling and water" section in `longFormSummary` even when the answer is "no figure
    published". Cite the cooling design, any operator water statement, and whole-site utility data (KUT: Giga Texas 556M
    gallons in 2025) labelled as site-wide. There is no water metric key (`FACTORY_METRIC_KEYS` in `src/lib/pinFactory.ts`);
    adding one is a code change (model, page, every `messages/*.ts` locale).
  - **Status:** use the operator's own status word. Tesla's "Production" means Completed here, even while it keeps ramping;
    drop the stale `Under Construction` tag (`DELETE /api/admin/db/PinTag?id=`) and re-run the script with an updated draft.
  - **Quote checks on investor decks:** SEC pages reject the script's plain curl, so quote the operator's PDF instead. The
    script reads PDFs with `pdftotext -layout`, where a table row interleaves with the neighbouring column: quote only
    the row (`Cortex 2 >120 MW Production`) and split a wrapped sentence with `...`.
- **Rule for this skill:** whenever a request exposes something a pin of this kind should have carried (a spec, a field, a
  source type, a script trap), add it here in the same session, as the bullets above do. Ian asked for this on 2026-11-01.

## 9. Queue-derived energy pins (generation, storage, solar; 2026-11-02, EnergyDesk batch 18416-18895)
A 20-pin audit of the 470-pin @EnergyDesk batch (Cleanview/EIA/queue entries) found 3 supported, 7 real but wrong and
10 with no matching project. Do not repeat it.
- **Prove the project exists first.** Match name, size, county and technology to the EIA-860M row, the ISO/RTO queue
  entry (ERCOT, MISO, PJM, CAISO, SPP), a regulator filing, the developer's release or news. A queue substation label
  ("Reid EHV", "Nelson-Indian River") is not a project name; find the real one (Reid EHV was Sebree Solar). No match:
  record a research gap with `mark_revisit`, do not post.
- **Check hybrids and phases.** One address can be solar plus battery (Fleetwood: 2 MW + 2 MW), and one queue
  entry can hold several phases or a stale size (Farmview 75 MW study vs 68 MW queue). Say which.
- **Check operating status before writing a future date.** A plant already online (Essex, Sebree Solar I) is Completed
  with its real operation date, never an "estimated" future one.
- **References must be pages about the project.** A bare agency or utility homepage, or a shared spreadsheet, is not a
  reference; if kept at all it carries confidence 30 or lower. Never rate a generic page 95.
- **No invented specifics.** Acreage, chemistry, MWh, utility, docket numbers, tax-abatement or "interconnection agreement"
  language need an opened source. Name the utility only if a source does; a balancing authority is not the interconnecting
  utility. Aggregators (interconnection.fyi, Infrasure, Cleanview, Gridinfo) are labelled as such and rated below
  official sources (queue PDF, regulator, developer release). Cleanview profile URLs in earlier pins were often dead; use
  the URL you opened.
- **Date confidence is capped by the score:** `estimated` scores at most 65, `delayed` 55, `unknown` 40 (migration 0238),
  so those pins fall under the timeline's 70 bar unless they are Predicted pins. Use `confirmed`/`scheduled` only with a
  source for the date. A proposed queue date is `estimated`.
- **Addresses and coordinates.** A county-level source gets a county address and its centroid (Nominatim, one request per
  second, descriptive User-Agent without the owner's email); a street address needs a source. `update_pin` has a per-run
  write limit (250); the rest go through `PUT /api/pins/:id` with the admin token, sending the whole pin
  (`?lightweight=1` for confidence-only changes).
- **Duplicates.** `update_pin` answers 409 when the sourceUrl is already on another pin by the same author (Royal Slope:
  18412 vs 16315). Merge verified facts into the older pin and remove the duplicate (`DELETE /api/pins/:id`).
- **Saving the timeline profile (2026-11-02).** `save_factory_profile` checks a pin's references against the **local**
  database, while `get_pin` and `update_pin` read and write production, so a pin corrected on production is rejected with
  "Add these pages to the pin's references first". Save to production directly:
  `PUT /api/pins/:id/factory` with the admin token and the profile plus `source: "session"`, `rubricYear: 2026`,
  `assessmentDate` (today). Rules the validator enforces: `basis` is only `planned` or `demonstrated`; an `announced`
  profile carries no `demonstrated` metric; milestone dates are ISO (`2025-09`, `2027`; "Fall 2023" and "Early 2026" are
  rejected, and a bare year reads as its last day, so skip a vague season rather than force it); labels are at most 100
  characters; a metric key appears once; at least three distinct metric keys; all six axes present (null, `unknown`).
- **Check every quote against the raw page yourself.** A fetch tool returns a model-written summary: its "quotes" were
  wrong on two Infrasure pages. Strip tags, collapse whitespace and test `quote in page` (`pdftotext` for PDFs) before
  saving, as `scratchpad/factory.py` did. Sites that refuse a plain fetch (Clearway, Nucor, Urban Milwaukee) cannot be
  verified this way; leave their quotes out. Do not send browser-like headers to get past a block; the auto-mode
  classifier refuses it. The user's Chrome (`@browser`) is the sanctioned way to read such a page.
- **Existing profiles.** The `factoryProfiles` daily job may already have saved a profile (Parkwood 18596, from the EIA
  workbook); check `GET /api/pins/:id/factory` (204 = none) and keep a better-sourced one.
- **EIA status code.** The interconnection.fyi page for an EIA row carries `detailedStatusCode` ("(V) Under construction,
  more than 50 percent complete"); it is the official stage even when the page header says "Planned".

## 10. Clearing a generated batch: delete the unusable, merge the duplicates (owner instruction, 2026-11-02)
Applies to a batch of pins generated from tracker listings (the EnergyDesk Cleanview/EIA/queue batch, ids 18400-18900).
- **Delete a pin that has no usable reference.** After at least three distinct searches, if no real project matches the
  pin's name, size and place (a queue substation label, a withdrawn queue entry, a name only an aggregator lists, a
  project that exists in another state or county), the pin has nothing true to say: delete it. It is a soft delete,
  `DELETE /api/pins/:id` with the admin token; confirm the public page then answers 404. Check first that it has no
  watchers (`favoriteCount`), likes or comments, and that the author is the batch author. Keep and rewrite instead when
  the audit found a plausible real match with a news or official source (Narragansett 18518: a 208 MW battery proposed
  for North Kingstown, ecoRI).
- **Merge duplicates, then delete the extra.** Two pins for one project (Reid EHV 18476 and Sebree Solar I 18675 were
  the same 250 MW plant): keep the pin with the better-sourced profile or the older id, copy any verified fact the
  other has that it lacks (`update_pin` or `PUT /api/pins/:id`, whole pin), then delete the other. `update_pin` answers
  409 "already posted a pin with this source URL" when two pins share a source, which is the sign to merge (Royal Slope
  18412 into 16315). Phases are not duplicates (Highland Solar North and South are separate 74.9 MW pins); compare
  size, county, developer and the project-specific reference pages, not just the title.
- **Process for a wave:** read-only audit agents write `{id, verdict, patch}` JSON (one lane of 10 pins each; brief in
  `scratchpad/audit/BRIEF.md`); a script re-checks every quote against the raw page (drops the unverifiable), applies the
  SUPPORTED/PARTLY patches and timeline profiles to production, then deletes the UNSUPPORTED and merges duplicates.
  Report counts per verdict and list every deleted id. Never delete a pin the audit marked SUPPORTED or PARTLY.
- **Verdict mix to expect:** the first 100 pins gave 15 supported, 57 partly right and 28 with no match. Partly right
  usually means a real EIA or queue row with an invented name, address, developer or date, so fix it from the row.
