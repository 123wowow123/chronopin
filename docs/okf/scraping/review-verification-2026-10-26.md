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
| PinTaste | 228 | 493 | 0 (minimum one) | 43 |
| PinCarPerf | 128 | 340 | 37 | 17 |
| PinGasCarPerf | 160 | 502 | 12 | 28 |
| PinAircraftPerf | 165 | 559 | 14 | 9 |
| PinLlmPerf | 125 | 440 | 4 | 18 |
| PinVideoPerf | 32 | 111 | 2 | 5 |
| PinHotel | 41 | 123 | 0 | 0 |
| PinDining | 89 | 271 | 9 | 45 |
| PinCriticReview | 92 | 277 | 0 | 1 |

There are **78 rubric rows below three reviews**, down from 95 at the start of
this continuation. All 92 existing critic rows have at least three extracts.
These are raw counts, not certification of source independence or eligibility.
The XUV 7XO now has three independent publishers: Autocar India, CarTrade
and Team-BHP. The last is an edited firsthand owner highway impression, not
an instrumented professional road test; its AX7 L trim shares the scored AX3
petrol-automatic powertrain, and the excerpt concerns engine refinement only. Of 166 non-MICHELIN undated entries, 61
have verified reasons to retain null dates; **105 date/source checks remain**.
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
refused their hand-edited rows during preflight; both were initially unchanged. The later manual pass below saved the NYU
correction and corrected Akkio’s quote while retaining its conflicted null date. Endor Labs has conflicting publication/release chronology, also
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


## Further gap fill: 17 reviews across 11 pins

Saved and read back **17 additional dated reviews**, their reference links and
source wikis locally and in production. No rubric axes, authors or hand rows
were replaced. Nine more rows reached the raw three-review threshold: CRJ700,
767-300, A340-500, CRJ1000, MA60, Tank 300 Hi4-T, Nissan N7, Zeekr X and
3rd Generation Samgyetang Master. The shortfall fell from 87 to **78**.
At the end of that pass, **140 date/source checks** remained; new citations all had verified original
publication days, and no unresolved source was relabelled complete.

- [Aircraft reports and variant/cabin limits](../../../scripts/products/aircraft-gap-fill-2026-10-26.json): ten reviews across six pins. CRJ700 now has three firsthand publishers in addition to the supplemental Mighty Travels article; A340-500 has three firsthand publishers plus supplemental development history. The 767 report is Asiana’s non-ER -300, avoiding LAN/United ER substitutions. MA60 criticism stays in the original French. Flight-Report publication days were distinguished from flight dates. The exact Saab 340A report adds useful evidence, but its row remains below target; the existing Rex 340B report is sibling context, so two more independent exact-A reports are still needed.
- [EV road tests and market limits](../../../scripts/products/ev-gap-fill-2026-10-26.json): five reviews across three pins. Tank PHEV is the 300 kW/750 Nm, 37.1 kWh, nine-speed hybrid, not the plugless HEV. Nissan explicitly matches 625 Max/73 kWh/200 kW; its source’s horsepower typo is excluded. Three Zeekr tests concern Singapore Standard RWD 66 kWh/200 kW; they do not establish launch-China ME software or suspension calibration, and China rubric axes remain unchanged.
- [XUV edited owner report](../../../scripts/products/xuv-owner-review-2026-10-26.json): an exact petrol-automatic owner impression adds a third publisher. Autocar’s two extracts still count as one publisher. More extended professional petrol-AT testing remains useful.
- [Seoul dining review](../../../scripts/products/dining-gap-fill-2026-10-26.json): Oliverham’s photographed pine-nut samgyetang meal at 56-3 Banpo-daero 28-gil, published August 27, 2026. It is a personal food critic blog; one overall 5/5 verdict was not converted into unpublished axis ratings.
- [Coverage-basis amendments](../../../scripts/products/review-basis-gap-fill-2026-10-26.json): updated stale review-count statements through native APIs. Each amendment preflighted both environments, refused hand rows or changed bases, and read back all unrelated fields unchanged. Nissan’s basis now correctly says 625 km for 625 Max, replacing its prior 635 km text; its range score is unchanged.

The car and dining catalogs are synchronized. Browser checks of the CRJ700 and
Zeekr X native detail pages confirmed the new quotes and sentiment graphs in
both environments. Creatrip’s Busan page returned 403 and the municipal Anmok
article timed out on this pass; neither was added from search snippets.
The documentation regression check passed 22 tests; catalog records, quote
lengths, report links and queue totals also validated. Scheduled model
verification remains blocked by the API-credit condition recorded above; no
deployment was performed.


## Broader coverage and date/source continuation

Added **six independent critic reviews** across Superman (2025) and Rosalía’s
LUX, with three publishers per work. Saved **12 original publication dates**:
eight A350 pin citations, two MD-80-family citations, one CRJ900 citation and
one Vals evaluation report. All successful changes were verified through native
APIs in both environments, preserving authors, rubric axes and other reviews.
The queue fell from **140 to 114 unresolved date/source checks**: 12 dates saved,
13 sources verified as undated, and one wrong-product citation removed.
The 78 rubric rows below three reviews remain a separate coverage task.

- [Superman criticism](../../../scripts/products/movie-critic-round4-2026-10-26.json): William Bibbiani, Richard Brody and Michael Balderston. The New Yorker web byline is July 10, 2025, not the July 21 print issue/URL. Praise and negative assessments are both retained.
- [LUX criticism](../../../scripts/products/music-critic-round4-2026-10-26.json): Gio Santiago, Rhian Daly and Kelefa Sanneh. The New Yorker original November 7, 2025 web date is distinct from November 17 print publication. NME was opened in a rendered browser after a plain-fetch refusal.
- [Aircraft publication dates](../../../scripts/products/review-dates-round4-2026-10-26.json): Cathay’s Phil Heard byline is November 5, 2019 and explicitly covers both -900 and -1000. This is an operator-published pilot interview, not independent Lufthansa/Qatar cabin testing. Airline Pilot Central is a September 16, 2019 editorial MD-80-family pilot-reception feature, not a firsthand Swissair MD-81 test. Runway Girl’s original CRJ900 article is May 28, 2025. Extracts were shortened to contiguous verbatim passages.
- [Primary model source corrections](../../../scripts/products/model-source-corrections-round4-2026-10-26.json): the Kimi K3.1 Pro excerpt now comes from Vals’ explicitly dated October 24, 2026 evaluation update, distinct from the October 23 model release. **Initially saved: Vals only.** The automatic MathArena save was refused by hand-row preflight; the later manual pass below applied the citation-only correction.
- [Verified-undated dispositions and specific remaining problems](../../../scripts/products/review-source-checks-round4-2026-10-26.json): ten Artificial Analysis and two Epoch profiles are primary evaluator pages with matching extracts, but model releases and moving rankings are not article dates. A thirteenth verified-undated entry is the bourbon tasting described below. No check date was assigned as publication.
- [Bourbon quotation correction](../../../scripts/products/taste-source-corrections-round4-2026-10-26.json): Richard Thomas’ Elmer T. Lee 40th Anniversary tasting now uses one contiguous exact excerpt, replacing stitched sentences. Neither the rendered byline nor metadata exposes an original publication day; the URL month and site masthead were not used. Null date and all taste axes are preserved.
- [Wrong-flavour exclusion](../../../scripts/products/review-exclusions-round4-2026-10-26.json): H.Bar’s Lemon8 post is FUNDAY Strawberry & Cream from The Can’t Decide Box, not Mr Whippy Strawberry & Vanilla. Its Edited date was not treated as publication. Removed that citation from #5633 in both environments; two exact-product citations remain.
- [Unapplied video proposals](../../../scripts/products/video-source-corrections-round4-2026-10-26.json): the live AA table now shows Seedance 2.5 at 1156, Veo 3.1 at 961 and Veo 3.1 Lite at 951. **All three automatic saves were refused by hand-row preflight** in that pass. The later manual pass below applied the citation-only corrections while preserving hand status and all axes; these historical refusals remain recorded.
- [Fashion coverage research](../../../scripts/products/critic-coverage-leads-round4-2026-10-26.json): Caitlin 1 candidates distinguish Warning Code, Hot Punch, Caitlin Blue and Philippine EP versus US-standard outsoles. The pre-release retailer analysis explicitly disclaims wear testing. Unmatched colourway/version reviews were not added to fill a quota.

The two Reddit tasting posts were opened and their authors/quotes verified, but
only relative ages were exposed; original timestamps remain unresolved. The
Henry Tenby DC-8 article gives an October 2013 magazine issue, not a day, and
covers -62/-72 combis rather than the scored -32. GeeLark’s structured original
date is November 18, 2025, distinct from its visible October 2026 update, but its
unattributed test claims still need source-eligibility review. These remain in
the queue with specific reasons.

The original taste catalog is synchronized. Browsers confirmed the Superman,
LUX and A350 native quotes and sentiment graphs locally and in production.
Scheduled model verification remains blocked by API credit; no deployment was
performed during this continuation.


## Manual citation maintenance and firsthand replacements — October 26

The owner’s “do remainder” continued the requested research maintenance.
Six researched citations on hand-edited rows were deliberately corrected through
the native admin APIs in both environments, preserving `source: hand`, every
rubric axis, the existing basis and every unrelated field. The automatic research
helper still refuses hand rows. All twelve saved targets were read back and
compared against their preflight snapshots.

- [Manual citation corrections](../../../scripts/products/manual-review-corrections-2026-10-26.json): NYU’s DeepSeek V4 article now has its verified April 24, 2026 date and exact quote. It is an AI-assisted, staff-reviewed university summary of reported benchmarks, not a new independent benchmark run. MathArena’s Qwen Apex cell and the Seedance 2.5, Veo 3.1 and Veo 3.1 Lite leaderboard cells now use exact current excerpts. Those four evaluator pages have no original publication day and retain null dates.
- Akkio’s Gemini 1.0 Pro quote was corrected, but its date remains unresolved: the visible January 3, 2024 publication label conflicts with JSON-LD December 22, 2023 publication and December 26 modification metadata. Both saved rows retain null. The earlier replay proposal was corrected to prevent assigning the conflicting date.
- [MD-90 firsthand reports](../../../scripts/products/md90-review-research-2026-10-26.json): added Aaron Giddings’ March 3, 2017 AirlineReporter economy report and James’ January 22, 2020 Kinda Boring Travels first-class report. Extracts refer to the MD-90 legs, excluding their 737, CRJ900 and other aircraft sections. With AeroXplorer, the pin has three firsthand publishers. Operator, cabin and period differences remain explicit.
- [Exclusions](../../../scripts/products/review-exclusions-round5-2026-10-26.json): removed Delta Museum’s executive marketing statement from the review list, keeping it as a history/specification reference. Removed the undated Civic model overview after saving its dated underlying road test. No other reviews or axes changed.
- [MD-90 basis amendment](../../../scripts/products/review-basis-round5-2026-10-26.json): corrected stale coverage statements. Comfort and efficiency remain null; different operator cabins do not establish a universal launch-era comfort score or per-seat fuel burn. Both APIs verified every unrelated field unchanged.
- [Exact Civic replacement](../../../scripts/products/civic-review-replacement-2026-10-26.json): Rich Ceppos’ October 12, 2021 Car and Driver test matches the US Sport Touring hatchback, 180-hp 1.5T and six-speed manual. The replacement remains one publisher, rather than counting the overview and test separately.
- [GLC43 date and quote](../../../scripts/products/review-dates-round5-2026-10-26.json): Chasing Cars’ original July 10, 2024 publication agrees across article metadata and JSON-LD. The quote is a contiguous driving extract. Its Australian test shares the X254 four-cylinder powertrain; no US calibration or rubric-axis change is claimed.
- [Five verified-undated dispositions and unresolved chronology](../../../scripts/products/review-source-checks-round5-2026-10-26.json): the four corrected evaluator pages and AeroXplorer MD-90 report retain null dates. AeroXplorer’s June 28, 2022 timestamp is modification only. Auto123’s Silverado August 15, 2018 label is explicitly Updated, so its original publication day remains unresolved.

This pass closed nine date/source checks: two publication corrections, two
undated citation removals/replacements and five verified-undated dispositions.
The current queue is **105 unresolved checks** plus **61 verified-undated
entries**. The **78 raw rubric gaps** and broader critic coverage still require
research. The scheduled production model verification still requires restored
Anthropic API credit; no deployment, restart or schedule change was performed.

Native API readbacks verified all content saves in both environments; references,
source wikis and Source/PinSource links were checked. Chromium rendered the
corrected NYU and Seedance pages and the MD-90 and Civic pages locally and in
production, with their saved quotes and sentiment graph sections visible.
