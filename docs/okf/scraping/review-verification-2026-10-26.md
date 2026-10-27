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

## Continuation verified on October 26

- Added 32 scored reviews: 13 reviews closing all nine prior critic-row gaps;
  three each for Toy Story (#6152), The Life of a Showgirl (#4713), the original
  HoloLens Developer Edition (#6511), and Black Doves season one (#15311);
  one Aygo X road test (#20054), two X-Bow GT-XR tests (#19979), a municipal
  food-guide recommendation for Cor Pasta Bar (#17272), and three Boeing
  737-800 flight reports (#19888). Saved references and source wikis on both
  environments. CAR/AUTO ZEITUNG shared ownership is identified; AUTO BILD
  adds a distinct publisher. Airline cabin verdicts identify operator,
  configuration and review period, rather than describing the 1997 prototype.
- Verified 16 more publication days through rendered publisher bylines,
  replacing the A05 English paraphrase with its original Chinese driving
  extract. Tasting days, related-article dates and Updated labels were not
  treated as original publication dates.
- Removed two ineligible EV citations through native APIs in both environments:
  the 2024 AWD LS6 test on the September 2026 Max RWD pin (#14111), and a static
  Formula S preview on the production entry-trim pin (#14200). Preserved axes,
  authors and other reviews. The LS6 now re-enters the below-three queue;
  the Formula S has zero qualifying reviews. Two Dash-8 pilot extracts were
  corrected without inventing publication dates.
- Refreshed the research queue with source-specific findings and the saved
  research basis for each remaining rubric gap. The eleven deliberately
  undated cases cover the Pan Am retrospective (four pins), Dakar NOLA,
  Absolut Tabasco’s tasting-day label, the Japanese chocolate tasting,
  GranCabrio Folgore, Cor Pasta Bar and the two Dash-8 pilot accounts.
- Validation for this continuation: TypeScript, scoped ESLint, 15 focused
  review-tool/publication tests, 22 documentation checks, and all 78 car-catalog
  dry validations passed. Toy Story’s native page rendered the saved quote and
  sentiment graph in Chromium locally and in production.
  Every content save was read back on both environments. No production deploy,
  restart or scheduled-job setting change was performed.

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
- [Nine completed critic gaps](../../../scripts/products/critic-completion-2026-10-26.json)
- [Additional movie, album and hardware critics](../../../scripts/products/broader-critic-research-2026-10-26.json)
- [Television critics](../../../scripts/products/tv-critic-research-2026-10-26.json)
- [Road tests and dining guide](../../../scripts/products/rubric-completion-2026-10-26.json)
- [Boeing 737-800 flight reports](../../../scripts/products/aircraft-review-research-2026-10-26.json)
- [Browser publication corrections](../../../scripts/products/browser-review-corrections-2026-10-26.json)
- [Rendered byline corrections](../../../scripts/products/rendered-review-dates-2026-10-26.json)
- [Dash-8 pilot-source correction](../../../scripts/products/dash8-review-correction-2026-10-26.json)
- [Researched exclusions](../../../scripts/products/review-exclusions-2026-10-26.json)
- [Remaining inventory and specific source URLs](../../../scripts/products/review-queue-2026-10-26.json)

The exclusion catalog is replayed with
`npx tsx scripts/products/replayReviewExclusions.ts --file <catalog>`. It
preflights both environments, refuses changed extracts and hand rows, removes
only the named URL, and verifies all unrelated rubric fields remain unchanged.

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
| PinTaste | 228 | 494 | 0 (minimum one) | 44 |
| PinCarPerf | 128 | 335 | 40 | 17 |
| PinGasCarPerf | 160 | 501 | 12 | 30 |
| PinAircraftPerf | 165 | 548 | 19 | 21 |
| PinLlmPerf | 125 | 440 | 4 | 20 |
| PinVideoPerf | 32 | 111 | 2 | 5 |
| PinHotel | 41 | 123 | 0 | 0 |
| PinDining | 89 | 270 | 10 | 45 |
| PinCriticReview | 90 | 271 | 0 | 1 |

There are **87 rubric rows below three reviews**, down from 95 at the start of
this continuation. All 90 existing critic rows have at least three extracts.
These are raw counts, not certification of source independence or eligibility.
The XUV 7XO has three extracts but only two independent publishers and remains
in the separate independence queue. Of 183 non-MICHELIN undated entries, 43
have verified reasons to retain null dates; **140 date/source checks remain**.
Every dated review with a quote is scored. Category leads still need screening;
awards, concerts and business events must not receive invented product reviews.

The publication pass opened 209 unique URLs for 234 undated entries. Nine
pages refused the plain fetch; many others supplied no original publication
metadata or had quotes that did not match the opened body. CAR magazine
emits `0001-01-01` in multiple review records; that is a placeholder and was
not saved. Several mutable Car and Driver model pages have publication
metadata predating the reviewed model year; those candidates were not saved.
Wikipedia, live leaderboards, retailer listings and MICHELIN directory pages
must not receive invented dates to put them on the graph. For #19564/#19565, a full reading corrected the initial eligibility assessment:
the Modeling Madness page contains Ben Brown’s firsthand Dash-8 pilot
recollections in its History section. Only that real-aircraft passage is
retained, with a verbatim quote and null publication date; kit assessment
is not aircraft-performance evidence.
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
daily-jobs API confirms the news job includes `sentiment`. A temporary bounded
sentiment-only verification job was scheduled and claimed as run **25** on
2026-10-26 at 22:34 UTC. The API driver immediately skipped it because Anthropic
returned HTTP 400: insufficient account credit. No actions or model usage were
recorded, so the research/scoring tools remain unverified within a scheduled
model execution. The temporary job was removed and the four original schedules
remain disabled. Restore API credit before retrying; no deployment, restart or
VM build was performed. See the [sanitized run evidence](../../../scripts/products/review-production-verification-2026-10-26.json).

Validation: TypeScript and scoped ESLint passed. The focused regression suite
passed 15 tests, covering preservation, cross-environment id matching,
preflight refusal, read-back failures and invalid publication dates. The full
suite passed all 2,187 tests (247 files), after adding the required frontmatter
to `scraping/activity-trips-50-per-city-2026-10-26.md` without altering its body.
The Fantastic Four native detail page was also checked in a browser locally
and in production: the saved critic quote and sentiment graph both render.

## Continued research and native API verification

This continuation added **15 reviews** across both environments and saved four
original publication dates. New coverage includes the Ryzen 7 launch (three
independent launch-day tests), three aircraft third reports (Saab 2000, 757-300,
767-400ER), Baleno facelift and XUV 7XO road tests, an exact Turbo S replacement,
three Busan municipal dining-guide extracts, and three reviews of Olivia Dean’s
The Art of Loving. The guide extracts have no original publication day and retain null dates. Aircraft cabin reports are
period-specific; they do not establish prototype cabin specifications.

Replayable opened-source catalogs:

- [Album criticism](../../../scripts/products/music-critic-next-2026-10-26.json)
- [Computing launch criticism](../../../scripts/products/computing-critic-next-2026-10-26.json)
- [Saab and 757 reports; KitKat canonical citation correction](../../../scripts/products/review-backfill-next-2026-10-26.json)
- [767-400ER cabin report](../../../scripts/products/767-review-research-2026-10-26.json)
- [Baleno and Taycan road tests](../../../scripts/products/road-test-backfill-next-2026-10-26.json)
- [XUV petrol automatic test and independence caveat](../../../scripts/products/xuv-review-research-2026-10-26.json)
- [Busan dining guide extracts](../../../scripts/products/busan-guide-reviews-next-2026-10-26.json)
- [Four saved dates and two protected hand-row proposals](../../../scripts/products/review-dates-next-2026-10-26.json)
- [29 additional verified-undated source checks and specific follow-ups](../../../scripts/products/review-source-checks-next-2026-10-26.json)
- [Exact-source exclusions](../../../scripts/products/review-exclusions-next-2026-10-26.json)

Removed a DBX707 citation from the DBX GT rubric, a Turbo-only Taycan test from
Turbo S, and Strawberry and Cream gummy customer extracts from Fruity Pigs and
Mr Whippy Strawberry and Vanilla. An accidentally duplicated mobile KitKat URL
was removed after the canonical citation was verified. The KitKat single-bar
review concerns the same F1 chocolate line, not the collectable tin packaging.
No ratings or dates were fabricated to replace excluded evidence.

The 29 completed source checks distinguish actual customer tasting comments
from merchant copy, guide editorial from anonymous dining-visit claims, and
month-only tasting records from exact publication days. Missing dates remain
null. Akkio Gemini and NYU DeepSeek dates were researched but the save helper
refused their hand-edited rows during preflight; both remain unchanged and in
the queue. Endor Labs has conflicting publication/release chronology, also
retained for research. The remaining FUNDAY sources require exact-product
firsthand verification; regional redirects and unavailable comment widgets
were not treated as tasting evidence.

All successful saves and exclusions were read back from the local and
production native APIs; reference/source-wiki links and original replay catalogs
were synchronized where applicable. The Ryzen and Olivia Dean native pages were opened locally
and in production: saved quotes and sentiment graphs render in both. The
focused review/date and documentation regression run passed **28 tests** in
four files. This continuation made content/catalog/documentation changes; the
full-suite result above describes the earlier implementation validation.
