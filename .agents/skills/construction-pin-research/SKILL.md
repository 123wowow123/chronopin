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

## 2. Status tag: exactly one of `Proposed`, `In Progress`, `Completed`
- Plans/approvals before verified physical work: Proposed.
- Construction, refurbishment, testing or commissioning underway: In Progress.
- Explicitly finished, opened or commercially operating scope: Completed.
- An announcement, loan or approval does not complete construction. A first coil, criticality or grid test does
  not alone prove completion. **Never infer completion from an elapsed target date.**
- Exclude non-construction accidents, closures, sales and monitored storage. For cancelled/halted/unsupported
  status, document it rather than forcing a tag.

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

Docs: `docs/okf/scraping/daily-jobs.md#factoryprofiles`, `docs/okf/api/factory-capability.md`.
