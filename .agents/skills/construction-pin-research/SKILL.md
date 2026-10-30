---
name: construction-pin-research
description: >-
  Use this skill when researching or repairing pins about things being built or opened: pipelines, power
  plants, dams, bridges, tunnels, railways, terminals, towers, stadiums, data centres, factories and fabs.
  Covers construction price, status tag, power generation fields and the PinFactory buildout profile.
---

# Construction and energy project pins

Evidence rule for everything below: opened HTTPS source, verbatim quote, preserve existing tags and authors,
never invent a figure. Apply through the authenticated admin APIs in **both environments** and keep the
research/replay catalogs synchronized. A construction pin runs groundbreaking to completion (a period, not a point).

## 1. Cost (`price`, `priceCurrency`)
- Use the currency the source states; **no FX conversion**.
- Match the figure to the pin's own event (a phase takes the phase cost) and use the most recent estimate.
- Collapses, demolitions, rescues, approvals with no budget, and anything with no published cost stay **null**.
- Record the source in references or wiki. The extraction prompt `src/server/extract/systemPrompt.ts` carries the same rule.

## 2. Status tag: exactly one of `Proposed`, `In Progress`, `Completed`, `Withdrawn`
- Plans/approvals before verified physical work: Proposed.
- Construction, refurbishment, testing or commissioning underway: In Progress.
- Explicitly finished, opened or commercially operating scope: Completed.
- An announcement, loan or approval does not complete construction. A first coil, criticality or grid test does
  not alone prove completion. **Never infer completion from an elapsed target date.**
- Owner instruction (2026-10-30): a verified withdrawn project or interconnection request carries `Withdrawn` and a sourced withdrawal milestone on its project timeline. If the withdrawal date is unpublished, show the dated source observation explicitly; never invent the withdrawal day. A withdrawn queue request does not establish cancellation of every project at the site.
- Exclude non-construction accidents, closures, sales and monitored storage. For cancelled/halted/unsupported
  status, document it rather than forcing a tag.
- EIA-860M is preliminary: check the pin's existing operator/regulator references for commissioning evidence
  before replacing a Completed tag or treating a planned-inventory row as the current physical stage. An
  explicit owner in-service report takes precedence over a conflicting preliminary inventory entry; retain
  the conflict in the research record and use the owner evidence in the profile.

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
  first and the rest after it. Round-trip the whole pin (GET, change `media`, PUT) locally first and diff the
  readback, then on prod.
- Timeline: `PinFactory.milestones` (section 4) with verbatim quotes; leave out dates you could not read yourself.
  Always include the **estimated completion** milestone (`basis: "planned"`, published precision such as
  `Early 2028`, source quoting the developer's or trade press's stated delivery target). Only when no delivery
  target is published, say so as a research gap; never infer one.
- Pin content: besides a 3-4 sentence `description`, write a `longFormSummary` (HTML, `<h3>` sections, each bullet
  ending in `<cite data-ref="URL"></cite>` for an opened source): the site and what stood there before, what is
  being built (units, floors, area, affordable share, preserved features), approval and opposition, construction
  and timeline (start, estimated completion), and cost (or the statement that none is published and what the
  only published figure, such as land price, is). Every claim comes from a page you read; add each cited URL
  (and the rendering's source page) to `references`.
- Ongoing: the 06:00/18:00 news job's `review_research_gaps` `construction` list refreshes excerpts and sentiment as a
  project nears completion or local news appears (`docs/okf/scraping/daily-jobs.md#sentiment`).
