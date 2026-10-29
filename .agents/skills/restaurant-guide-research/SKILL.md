---
name: restaurant-guide-research
description: >-
  Use this skill when adding or replenishing Chronopin restaurant city guides and restaurant pins: the four
  landing tabs, per-tab targets for China and Japan, opening-date rules, menu and special transcription,
  backing pins, photos, and west-to-east navigation order.
---

# Restaurant guide research

Docs: `docs/okf/api/restaurant-content.md`, `restaurant-specials.md`, `restaurant-seed.md`.

## Landing page sections
Every guide (including Japan city guides) supports **Coming soon, Just opened, Top restaurants, Specials**.
- Hide tabs with no eligible content; links to empty tabs fall back to a populated view.
- Specials stays visible whenever verified active or upcoming offers exist, even outside service hours or without
  a published rating. Upcoming offers show the next local start time; active ones show "available now". Expired
  offers don't keep the tab visible.
- Targets (research goals, not display caps or reasons to relax eligibility): **35 distinct restaurants per tab for
  every China city; 30 for every Japan city.** Count each restaurant once per tab. Record shortages, sources
  checked and unresolved gaps in the guide notes.
- Make a thorough effort to populate every section before accepting incomplete coverage: search operator
  announcements, local reporting, branch-specific menus and verified promotions. Add sourced content whenever
  possible.
- Never invent opening dates, discounts, ratings or menu items to make a tab appear.
- Record the sources checked and unresolved coverage gaps in the guide notes.
- Japan and China guides: continue replenishing any section below its target and record each shortage, the
  sources checked and the specific unresolved research gaps.

## Navigation order
Both country and city menus sorted **west to east**: cities by city-centre longitude, countries by their
westernmost supported guide city. Preserve when adding guides.

## Cards and pins
Every card in every tab needs a backing `Pin`. Title and image link to the native `/pin/[id]/[slug]`, never an
external site. Seed or link Pin records for all venues and specials.

## Dates
`utcStartDateTime` is the **exact branch's opening date**, including established restaurants added for Top or
Specials. Never use a research/check date, menu publication date or promotion start. Research dates go in
content `checkedAt`; offer dates in Specials. If only year/month is supported mark the date estimated and explain.
Don't infer a branch date from the brand's founding or the host building. Queue missing opening evidence.

## Menus
Find and display real items, including happy hour and specials, on cards and pin details. Look past the first
link: branch pages, PDFs, menu images, ordering menus. Transcribe dishes/drinks with price, currency, conditions;
if unpriced show "Price not published". Never borrow another branch's menu or assume regular items join a special.
Show chain-shared and branch-local menus both, labelled. Link-only coverage only after a deep search fails,
documenting sources and the gap.

## Photos
Check official galleries, linked photo pages and restaurant sites. Store in Azure (see `pin-media-azure`), credit
photographer/operator, keep captions accurate, distinguish the venue's own photos from collaborations or other
branches, don't infer dish names from unlabelled photos.

## Saving
Ongoing menu, visit-detail and landing-page tile edits go through the database management APIs. Use `/api/admin/restaurant-content` (content) and `/api/admin/restaurant-specials` (offers and menus). Bundled
JSON catalogs are snapshots; content updates don't need a deployment. Preserve source evidence and credits, then
verify the pin and landing page. Dining rubric/reviews: see `pin-enrichment-rubrics`.
