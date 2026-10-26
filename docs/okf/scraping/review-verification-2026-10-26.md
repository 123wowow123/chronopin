---
type: Reference
title: Review sentiment and critic verification — October 26, 2026
description: Verified review maintenance on both environments, daily-job research tools, and the remaining review research inventory.
tags: [scraping, reviews, sentiment]
---

# Review sentiment and critic verification — October 26, 2026

This is a completed maintenance batch within a larger unfinished backfill.
The README TODO retains the remaining work. Content updates used existing
authenticated APIs. After the owner reported deployment, production was
verified running image/commit `771c23ace8a618530bb9bcffe66913447bf49046` on
2026-10-26. No deployment or restart was initiated by this verification.

## Saved and verified locally and in production

- Corrected 29 publication dates across 27 pins. Each saved quote was matched
  against the opened HTTPS publisher body, with an explicit publication date
  in publisher metadata. Newly dated extracts also received sentiment scores.
- Added 12 scored critic reviews across four exact products/works: The
  Fantastic Four: First Steps (#6148), Lily Allen's West End Girl (#7389),
  Microsoft HoloLens 2 (#6516), and Alo Runner (#3710). Each now has three
  reviews. HoloLens hands-on demos are identified as such; the later extended
  review retains its 2021 publication date. Alo wear tests support comfort
  and fit, without claiming marathon suitability. The Alo catalog documents
  shared publishing ownership and the disclosed supplied sample.
- Added one road test to Fiat 500 Hybrid (#15253), taking it from two reviews
  to three, and three Australian mild-hybrid road tests to Renault Symbioz
  (#15256), taking it from two to five. The Australian 1.3-litre Techno Mild
  Hybrid was distinguished from full-hybrid and European manual variants.
- Read back native review endpoints after saving in both environments.
  Original authors, rubric axes, existing source bases and other reviews were
  preserved. Production pin ids were resolved by unique source URL.
- Added references and source wikis for the 16 new reviews in both
  environments. Existing ready wikis were preserved. Source/PinSource links
  were registered where reference saves had not yet registered them.

## Research evidence and replay

The catalogs retain opened URLs, publication evidence and short verbatim
quotes. They can be replayed with
`npx tsx scripts/products/replayResearchedReviews.ts --file <catalog>`;
use `--references` for new review citations/wikis. They resolve pins by source
URL, merge into current data, refuse hand rows, and verify the saved result.

- [Publication corrections](../../../scripts/products/review-research-2026-10-26.json)
- [Film and album reviews](../../../scripts/products/critic-research-2026-10-26.json)
- [Hardware and footwear reviews](../../../scripts/products/product-critic-research-2026-10-26.json)
- [Gas-car road tests](../../../scripts/products/gas-review-research-2026-10-26.json)
- [Remaining inventory and specific source URLs](../../../scripts/products/review-queue-2026-10-26.json)

The original taste, car and dining catalogs were synchronized. Two historical
taste profiles and seven historical car profiles absent from their original
catalogs were added with their saved axes, bases and full current review lists.
The source-URL catalogs above additionally retain portable replay coverage.

## Remaining coverage

Live local inventory after this batch; these counts do not establish source
independence or eligibility. A launch announcement, model-kit review, directory
or shop is not a firsthand review of the pinned product.

| Table | Pins | Reviews | Below minimum | Non-MICHELIN undated |
| --- | ---: | ---: | ---: | ---: |
| PinTaste | 228 | 496 | 0 (minimum one) | 47 |
| PinCarPerf | 128 | 337 | 39 | 21 |
| PinGasCarPerf | 160 | 497 | 16 | 40 |
| PinAircraftPerf | 165 | 542 | 23 | 29 |
| PinLlmPerf | 125 | 440 | 4 | 20 |
| PinVideoPerf | 32 | 111 | 2 | 5 |
| PinHotel | 41 | 123 | 0 | 0 |
| PinDining | 89 | 266 | 14 | 41 |
| PinCriticReview | 84 | 240 | 9 | 2 |

There are **98 rubric rows below three reviews**, plus nine existing critic
rows below three. All 205 non-MICHELIN undated entries retain null dates
pending further evidence; not every entry is eligible for a graph date.
Every dated review with a quote is scored. Category-level leads still require
screening: the audit also returns awards, concerts, financial results,
layoffs, data centers and other events that must not receive invented product
reviews.

The publication pass opened 209 unique URLs for 234 undated entries. Nine
pages refused the plain fetch; many others supplied no original publication
metadata or had quotes that did not match the opened body. CAR magazine
emits `0001-01-01` in multiple review records; that is a placeholder and was
not saved. Several mutable Car and Driver model pages have publication
metadata predating the reviewed model year; those candidates were not saved.
Wikipedia, live leaderboards, retailer listings and MICHELIN directory pages
must not receive invented dates to put them on the graph. For #19565, the
existing Modeling Madness URL is a model-kit review and needs replacement
with a review of the actual Dash 8, rather than being counted as coverage.
For Voyah Dream #19873, the opened ElectricVehicleWeb piece is a static
cabin/practicality first-look and labels its date Last Updated. Its null
publication date was restored on both environments after the final eligibility
check, keeping it off the performance graph; a driving test is still needed.

## Daily-job implementation and validation

`review_research_gaps` now supplies missing-review and publication-date leads,
with the scoring rubric and per-run skip ids. `save_researched_reviews`
merges researched, scored reviews through native APIs on both environments,
preserves hand rows and verifies saves. The sentiment task's instructions now
research before its final pending-score pass. This implementation is tested
locally and deployed in commit `771c23ac`. The authenticated production
daily-jobs API confirms the news job includes `sentiment`, but all scheduled
jobs are currently disabled. A scheduled production execution remains
outstanding; job settings were left unchanged.

Validation: TypeScript and scoped ESLint passed. The focused regression suite
passed 15 tests, covering preservation, cross-environment id matching,
preflight refusal, read-back failures and invalid publication dates. The full
suite passed all 2,187 tests (247 files), after adding the required frontmatter
to `scraping/activity-trips-50-per-city-2026-10-26.md` without altering its body.
The Fantastic Four native detail page was also checked in a browser locally
and in production: the saved critic quote and sentiment graph both render.
