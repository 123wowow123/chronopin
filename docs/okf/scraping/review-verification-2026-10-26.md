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
| PinCarPerf | 128 | 350 | 33 | 16 |
| PinGasCarPerf | 160 | 502 | 12 | 14 |
| PinAircraftPerf | 165 | 563 | 13 | 8 |
| PinLlmPerf | 125 | 440 | 4 | 18 |
| PinVideoPerf | 32 | 111 | 2 | 5 |
| PinHotel | 41 | 123 | 0 | 0 |
| PinDining | 89 | 275 | 6 | 46 |
| PinCriticReview | 107 | 322 | 0 | 1 |

There are **70 rubric rows below three reviews**, down from 95 at the start of
this continuation. All 107 existing critic rows have at least three extracts.
These are raw counts, not certification of source independence or eligibility.
The XUV 7XO now has three independent publishers: Autocar India, CarTrade
and Team-BHP. The last is an edited firsthand owner highway impression, not
an instrumented professional road test; its AX7 L trim shares the scored AX3
petrol-automatic powertrain, and the excerpt concerns engine refinement only. Of 151 non-MICHELIN undated entries, 77
have verified reasons to retain null dates; **74 date/source checks remain**.
Current scheduled verification: retry #26 is blocked by the missing production
`ANTHROPIC_API_KEY`; the older credit failure is historical. See the tenth
continuation below.

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


## Further exact-variant and source verification — October 26

This continuation saved and read back all changes locally and in production,
resolving two more raw rubric shortfalls and eighteen publication/source checks.
The remaining inventory is **76 rubric rows below three reviews** and **87
unresolved publication/source checks**, alongside **70 verified-undated entries**.
These counts still do not certify that every stored extract is an independent
firsthand test. Aggregator summaries, vendor claims and variant conflicts stay
explicitly queued for replacement or attribution research.

- [Dash 8-100 firsthand reports](../../../scripts/products/dash8-firsthand-round6-2026-10-26.json): added Paliparan’s April 3, 2021 Olympic Air report and Lia_K’s June 9, 2024 CemAir report to #19564 and #19565. The latter date is publication, distinct from the March 25 flight. NorOntair now has three firsthand publishers including Ben Brown’s Henson pilot recollections; the prototype pin also has three firsthand publishers, with its two Flight-Report contributors counting as one publisher. Later operator cabins do not establish prototype or delivery-era comfort.
- [Dash 8 coverage bases](../../../scripts/products/review-basis-round6-2026-10-26.json): corrected stale one-pilot coverage statements in both environments; technical scores, comfort null and unrelated fields remain unchanged.
- [Alo Trail wear impressions](../../../scripts/products/alo-trail-critic-round6-2026-10-26.json): three scored citations from Olivia Halevy, Tim Kohut and Nikki Chwatt. These support short-term walking, city/office and gym wear, not a long-distance trail-running verdict. Tom’s Guide and Who What Wear share Future ownership, while Men’s Health is Hearst; three authors do not imply three independent owners. Exact rendered article titles and original April 2026 publication days were verified, with affiliate disclosures and test limits recorded.
- [Six Honda underlying tests](../../../scripts/products/honda-test-replacements-round6-2026-10-26.json): replaced evolving undated overviews for Civic sedan, Civic Type R, CR-V, HR-V, Odyssey and Pilot. Tested trim/drivetrain differences are recorded explicitly. Shared-powertrain quotes do not claim that AWD/Elite/Touring test measurements apply to scored FWD/base trims. Type R and HR-V original publication dates come from original metadata; the later visible updates are recorded separately, and the saved quotations are qualitative impressions.
- [Kia tests and Macan date](../../../scripts/products/review-dates-extra-round6-2026-10-26.json): dated original exact X-Line SX Seltos and X-Line SX-Prestige Telluride road tests replace their overview citations. The electric Macan assessment has a verified May 11, 2026 byline matching original metadata and covers the scored Turbo. These are one publisher per vehicle, not extra independent votes for overview and test URLs.
- [Crosstrek exact-market replacement](../../../scripts/products/crosstrek-review-replacement-round6-2026-10-26.json): the UK 134-bhp e-Boxer hybrid assessment was replaced with Elana Scherr’s US Premium 152-hp non-hybrid 2.0/CVT/AWD report. Its original March 13, 2023 article date is distinguished from the August 15 instrumented-results update. Three exact-powertrain road-test publishers remain after the exclusion.
- [Crosstrek acceleration correction](../../../scripts/products/review-axis-correction-round6-2026-10-26.json): the independently measured 9.5-second 0–60 result fills its previously null acceleration axis at **1**, following the frozen 2026 anchor. The basis identifies the tested Premium and results-update date. Every other score, review and unrelated native field was preserved and read back in both environments. This deliberate score correction is separate from the review-only replay helper.
- [Busan guide addition](../../../scripts/products/busan-guide-round6-2026-10-26.json): Niurou Mian Guan Zi now has MICHELIN, Eat Busan and Dynamic Busan guide sources. Stars and Stripes reproduces the latter and is counted once with its original publisher, not as another source. The branch address matches 25-4 Suyeong-ro 388beon-gil. The newspaper edition supplies only July without an original day/year, so the date stays null; atmosphere commentary is not presented as an invented diner or subscore.
- [Nine overview/variant exclusions](../../../scripts/products/review-exclusions-round6-2026-10-26.json): removed each old citation only after its replacement was saved and verified. Remaining reviews and unrelated scores were checked after every removal.
- [Verified-undated cases](../../../scripts/products/review-source-checks-round6-2026-10-26.json): seven CAR extracts match the rendered original bodies exactly. Each source exposes an Updated label and a year-0001 datePublished placeholder; none received an invented original date. Swan Oyster Depot’s Chronicle capsule identifies the 2017 guide edition but no publication day. These eight existing undated entries close source checks while staying off the time-series graph; the new Dynamic Busan citation is likewise deliberately undated.
- [All 92 remaining URLs opened in a browser](../../../scripts/products/review-browser-audit-round6-2026-10-26.json): captured HTTP/load outcomes, exact quote matches and unverified metadata candidates. Later successful saves override the intermediate findings. A returned date never automatically became a publication date. AirlineReporter’s CRJ200 visible October 16, 2015 byline conflicts with an April 24, 2014 time attribute; the conflict stays queued. Several Wanderlog extracts are summaries of other reviewers, Verdent repeats maker figures, and distributor/award copy is not a firsthand taste review. Their eligibility questions remain explicit.
- [Screened coverage leads](../../../scripts/products/review-coverage-leads-round6-2026-10-26.json): Anmok’s Busan Station branch was excluded from Namcheon research, the opened current operator address conflicts with the older pin/MICHELIN address, and the identified NYT feature could not be opened. Shorts 360 subtype applicability and exact Hali 1 Opal sources also remain genuine research gaps; no simulator, other-branch or unverifiable quote was used to satisfy a count.

The README removes the two closed rubric gaps and eighteen closed source checks.
The original car and dining replay catalogs were synchronized by the API replay
workflow; the portable catalogs retain the gas-car corrections. Production model
verification remains outstanding after scheduled run #25’s insufficient-credit
failure. No deployment, restart or production schedule change was performed.


[Validation evidence](../../../scripts/products/review-validation-round6-2026-10-26.json):
26 native rubric readbacks verified unchanged unrelated fields against snapshots;
the one deliberate Crosstrek acceleration change was separately verified.
Sixteen sampled native pages rendered the saved excerpts locally and in production.
The entirely undated Niurou guide correctly has no time-series graph, while the
sampled dated-review pins show their graph sections. All 22 documentation tests,
catalog constraints and queue-count checks passed. Application code was not
changed by this content-maintenance pass.


## Original hardware and exact-model owner evidence — October 26

This continuation closes three EV raw-count gaps and restores the CRJ100 to the
research queue after removing three CRJ200 sibling citations. The net inventory
is **74 rubric gaps** (EV34, gas12, aircraft14, dining8, LLM4, video2), **83
unresolved date/source checks** and **71 verified-undated citations**. Counts
remain distinct from certification of three independent professional road tests.

- [Original HoloLens prototype](../../../scripts/products/hololens-prototype-critic-round7-2026-10-26.json): three original January 2015 firsthand demo reports from WIRED, Ars Technica and Engadget. Praise for visuals and criticism of uncomfortable prototype hardware are preserved. These concern controlled prototype demonstrations, not the 2016 Developer Edition, HoloLens 2, retail reliability or battery endurance. WIRED and Ars share ownership; the Wired UK republication of Ars was excluded. The publisher-local January 21 dates are distinguished from next-day UTC metadata.
- [Exact original L6 Pro owner](../../../scripts/products/l6-owner-round7-2026-10-26.json): Autohome’s certified 2024 Pro owner reports after 1,905 km, first published July 7, 2024. The short Chinese quotation concerns brake response without an invented braking distance. It complements the existing CarNewsChina shared-chassis Max test and Kolesa import account; owner evidence is explicitly labelled and does not establish Max ADAS capability on Pro.
- [Original L8 Pro accounts](../../../scripts/products/l8-owner-round7-2026-10-26.json): Xchuxing’s December 1, 2022 prospective-owner drive, Autohome’s February 1, 2023 certified-owner report after 1,110 km, and Drom’s October 2, 2023 curated translation of a foreign owner’s three test drives. Drom does not disclose the original reviewer’s name or Chinese URL; that attribution limit stays explicit, and no independently verified identity is claimed. The report’s distinct comparative details were checked against the other accounts. Three published accounts do not mean three instrumented editorial tests.
- [Panda Mini owners](../../../scripts/products/panda-owner-round7-2026-10-26.json): two certified owners of the exact 2023 200-km Endurance Bear, first published March 24, 2023 and August 11, 2025. The latter publication date does not make it a 2025 facelift. These complement the existing two invited Beijing drives; four reports span three publishers because both owners use Autohome. No later CATL 210-km variant findings were substituted.
- [Review source repairs](../../../scripts/products/review-source-repairs-round7-2026-10-26.json): Stephen Dobie’s March 21, 2019 review contains an explicit RWD Carrera S grip assessment, replacing a base non-S Carrera test. Sean Carson’s January 31, 2020 third-generation 1.0 MPi i10 review replaces the unavailable Vanarama citation; The AA’s exact base-engine comment was verified in the full body, with null date retained. Both preserve the existing rubric scores.
- AirlineReporter’s CRJ200 article date was resolved from its visible October 16, 2015 byline and the publisher’s public WordPress post record, which agreed on the original date and content despite an incorrect HTML time attribute. The citation was briefly dated, then removed from the CRJ100 review list on exact-variant audit. The retired proposal is retained outside replay entries, so future replay cannot reintroduce the sibling review.
- [Exact CRJ100 replacements](../../../scripts/products/crj100-source-replacement-round7-2026-10-26.json): Brit Air F-GRJR’s scratched window and Belavia’s ageing but comfortable cabin are supported by original passenger reports. Publication days (October 3, 2022 and September 24, 2016) are distinguished from flight days. Two authors on Flight-Report count as one publisher. Generic scoring criteria, commenters and other-leg aircraft were excluded. The row remains below three and comfort remains null.
- [Targeted exclusions](../../../scripts/products/review-exclusions-round7-2026-10-26.json): replaced the base Carrera and unavailable i10 source only after saving replacements; removed all three CRJ200 citations from the CRJ100 review array, preserving references as family/history context. All other fields were verified after each exclusion.
- [Coverage bases](../../../scripts/products/review-basis-round7-2026-10-26.json): replaced stale no-review/two-review statements, identified owner and translation limits, and removed the obsolete CRJ200-based cabin argument. Every axis, author and unrelated field remained unchanged in both environments. The original EV catalog was synchronized.
- [Full-document browser pass](../../../scripts/products/review-browser-audit-round7-2026-10-26.json): revisited all 87 intermediate unresolved URLs using full document bodies instead of article selectors that sometimes returned only related advertisements. Exact strings appeared on 31 pages; this is an audit aid, not proof of eligible independent testing. Current source dispositions and successful replacements supersede intermediate metadata candidates.
- [Source dispositions](../../../scripts/products/review-source-checks-round7-2026-10-26.json): the i10 AA extract is verified-undated. Top Gear’s V60 visible April 8 versus metadata April 9, 2025 remains conflicted; Endor’s April publication preceding the model’s September launch remains unresolved; Henry Tenby’s October 2013 issue lacks a day and concerns later DC-8 variants. No inferred dates were saved.
- [Specific remaining research leads](../../../scripts/products/review-coverage-leads-round7-2026-10-26.json): Denza N9 search results distinguish the 2025 launch SUV, D9 MPV and later flash-charge revisions. Additional Saab 340A reports discussed service rather than aircraft comfort; the positive Flyprat comfort passage describes the Fokker 50 leg. C-GPCF’s Shorts 360 subtype labels conflict. None was used to fill a count with mismatched evidence.

All changes used existing authenticated native APIs in both environments, with
references/source wikis checked and existing ready wikis preserved. No deployment,
restart or schedule change was performed. Scheduled model verification remains
outstanding after the previously recorded insufficient-credit failure.


[Validation](../../../scripts/products/review-validation-round7-2026-10-26.json):
twelve native rubric readbacks verified unchanged scores and unrelated fields;
ten sampled pin pages rendered saved quotations and graph sections locally and
in production. All 22 documentation tests, catalog constraints and queue-total
checks passed. This pass changed content/research catalogs and documentation,
with no application-code changes.


## Eighth continuation: films, an album and one original publication date

Added twelve reviews across four previously uncovered pins, saved through native
APIs locally and in production. Critic coverage now totals 98 pins and 295
extracts. Broader coverage remains open; these additions do not resolve the 74
rubric gaps. The outstanding publication/source queue decreased from 83 to 82.

- [Film reviews](../../../scripts/products/movie-critic-round8-2026-10-26.json): three independent original publications each for Elio, the 2025 live-action Lilo & Stitch, and Thunderbolts*. The Guardian, TheWrap and Slant provide differing assessments. Exact article titles, original publication days and short verbatim excerpts were verified. The excerpts concern the pinned films, rather than trailers, the 2002 animated film or franchise news. Sentiment estimates describe the cited passages; a positive performance excerpt does not imply a uniformly positive whole-film review. Slant was readable through the primary-source web reader while its browser security page blocked rendering. RogerEbert.com candidates returned HTTP 403 and were excluded.
- [Album reviews](../../../scripts/products/music-critic-round8-2026-10-26.json): Pitchfork, NME and The Guardian original reviews of Harry Styles’ Kiss All the Time. Disco, Occasionally. Original March 4 and March 9, 2026 article dates are distinguished from the March 6 album release, concert coverage and the Aperture single. All three full original articles were verified in a rendered browser, including NME despite a plain-fetch refusal.
- [Silverado citation repair](../../../scripts/products/review-source-repairs-round8-2026-10-26.json): Denis Duquet’s Auto123 first drive has an explicit August 15, 2018 byline and matching machine-readable time. The body identifies both 5.3L and 6.2L V8 crew cabs; the retained cabin/ride assessment applies to both. Original title restored, quotation shortened verbatim and publication date saved in both environments. Scores and unrelated rubric fields were verified unchanged. This is a manufacturer-hosted first drive, not a long-term independent ownership test.
- [Source checks](../../../scripts/products/review-source-checks-round8-2026-10-26.json): verified the two Reddit tasting excerpts in their original authors’ posts, rather than comments or merchant text. The source reader supplies only relative ages and direct browser access was blocked. Both exact publication days remain unresolved and null; their dates were not inferred from those relative ages.
- [Fashion coverage research](../../../scripts/products/review-coverage-leads-round8-2026-10-26.json): Basketpack explicitly identifies the tested Hali 1 Opal and its original January 5, 2026 publication. WearTesters and Basket USA original article dates were verified, but their tested colourway still needs confirmation. Heartbeat Bash does not identify a tested colourway and its opening timeline conflicts with the launch year. These candidates were recorded for further checks rather than counted as three verified Opal reviews or attached to the separate Pace colourway.

References, Source/PinSource links and source-wiki results were verified by the
replay tool for all saved citations. Existing ready source wikis were preserved.
The [research queue](../../../scripts/products/review-queue-2026-10-26.json)
retains all unfinished work: 74 rubric gaps, 82 publication/source checks and 71
verified-undated entries, plus broader category coverage and scheduled production
verification. The earlier insufficient-Anthropic-credit blocker remains recorded;
no deployment, restart or schedule change was performed.

[Validation](../../../scripts/products/review-validation-round8-2026-10-26.json):
all ten affected pin-page checks rendered saved quotations and sentiment graphs
locally and in production. Both Silverado native readbacks preserved scores and
unrelated fields. Nine rendered primary-source title/quote matches and three
Slant primary-source reader checks support the twelve additions; the Silverado
original date was separately verified. All 22 documentation tests, catalog
constraints and queue-count checks passed. Changes for this pass are limited to
content/research catalogs and documentation.


## Ninth continuation: Computing, films and original QQ Ice Cream reports

Added twelve reviews: nine critic extracts across three previously uncovered
works/products, plus three reports for the original QQ Ice Cream. All were saved
and verified through authenticated native APIs locally and in production.
Critic coverage now totals 101 pins and 304 extracts. The raw below-three count
is 73 (EV33, gas12, aircraft14, dining8, LLM4, video2), with 81 unresolved
publication/source checks and 71 verified-undated entries. Exact-variant and
independence limitations remain separate from those raw counts.

- [Production HoloLens 2](../../../scripts/products/hololens2-critic-round9-2026-10-26.json): Jamie Feltham / UploadVR, Sherri L. Smith / Tom’s Guide and Jim Salter / Ars Technica are three distinct original publications. Comfort praise and tracking caveats are preserved. The November 2019 assessments are short guided demonstrations; UploadVR’s April 2021 review reports longer use. Their dates stay separate from shipping, later edits and related stories. These do not establish industrial field reliability, current support, original-HoloLens performance or IVAS results.
- [Zootopia 2 and Infinity Castle](../../../scripts/products/movie-critic-round9-2026-10-26.json): three original publications per film, preserving differing assessments. Zootopia 2 is also titled Zootropolis 2 in the UK; reviews concern the 2025 sequel rather than the 2016 original. Infinity Castle reviews concern the first Akaza Returns film, not Mugen Train, compilation films or the complete trilogy. The Gleaner’s visible September 18, 2025 byline agrees with its original datePublished despite a September 20 URL path; December modification time was excluded. Screen International was fully readable in the browser despite a plain-fetch 405. No aggregator paraphrases were used as original critic quotations.
- [QQ Ice Cream](../../../scripts/products/qq-ice-cream-reviews-round9-2026-10-26.json): two original China 2022 170-km Sundae owner accounts, on Autohome and Yiche, plus 车评社Auto’s January 6, 2022 Wuhu launch drive. Owners offer contrasting views of smooth acceleration and stability when turning. The launch drive’s high-speed caveat is family context because its battery trim is unspecified; it is not a measured 170-km range test. The owner accounts are not instrumented professional tests. Yiche uses a custom font whose copied text contains private-use characters; the short quotation was transcribed from the visually inspected rendered page. All scores and unrelated fields were preserved, and the original car-performance catalog’s basis was synchronized. A further professional exact-170-km test remains a follow-up.
- [Citation repairs](../../../scripts/products/review-source-repairs-round9-2026-10-26.json): Andy Hayler’s review selector explicitly labels La Yeon’s article “11th Apr 2017 review”. That review-day label was initially saved as publication; this was too confident and is superseded by the tenth continuation, which restores null and reopens the publication check. Arán’s shortened ingredient sentence was not verbatim; it was replaced with the opened guide’s short exact verdict. The guide describes the bakery generally, not a firsthand tasting of the award-winning loaf, so its source-eligibility research remains open and its update date was not substituted for publication.
- [Source-wiki annotations](../../../scripts/products/review-wiki-verification-round9-2026-10-26.json): four readbacks verify the corrected review-day and bakery-scope notes in both environments. Existing wiki content was preserved, with the obsolete missing-date statement corrected where present.
- [Remaining source checks](../../../scripts/products/review-source-checks-round9-2026-10-26.json): retained specific unresolved reasons for the two Funday customer citations, Arán’s loaf tasting, Hennig-Olsen’s exact strawberry tub and the Anzac Drumstick flavour. A missing customer widget, a 404, manufacturer copy and sibling products do not establish the saved firsthand citation. These checks were not marked completed merely because a source was revisited.
- [Coverage follow-ups](../../../scripts/products/review-coverage-leads-round9-2026-10-26.json): the newly opened InsideEVs Zeekr 007 test identifies AWD with electromagnetic dampers, so it was excluded from exact base-RWD evidence. QQ Ice Cream’s unavailable 42HOW page, unreadable Dongchedi listing and later Jetour export test were recorded without substituting them for original China findings. Hali 1 Opal still needs another independently verified exact-colourway primary test; a secondary review aggregator and blue operator photos do not establish that the writer tested Opal.

The [queue](../../../scripts/products/review-queue-2026-10-26.json) retains broader
coverage, all remaining low-count rows and source checks, and explicit QQ Ice
Cream/Opal coverage follow-ups. Scheduled production-tool verification remains
outstanding after the previously recorded Anthropic credit failure. No deploy,
restart or schedule change was performed.

[Validation](../../../scripts/products/review-validation-round9-2026-10-26.json):
all twelve affected page checks rendered saved quotations and sentiment graphs
locally and in production. Six native rubric readbacks preserved all scores and
unrelated fields. Thirteen source-text quote matches plus one visual custom-font
transcription support the twelve additions and two citation repairs. Four
source-wiki annotation readbacks passed. All 22 documentation tests, catalog
constraints, queue counts and whitespace checks passed. This pass changed only
content/research catalogs and documentation.


## Tenth continuation: exact variants, source corrections and scheduled retry

Added nine reviews, then removed five superseded generic/sibling extracts.
All content changes were saved and read back through native APIs locally and
in production. Broader critic coverage now totals 102 pins and 307 extracts.
The raw below-three count remains 73. Three old source checks were resolved by
replacement, while one overly confident date was corrected and reopened:
**79 publication/source checks remain**, with 72 verified-undated entries.

- [Windows Mixed Reality](../../../scripts/products/wmr-critic-round10-2026-10-26.json): three distinct original publications assess first-generation Microsoft tracking through Acer AH101 hardware. Road to VR praises inside-out head tracking; UploadVR and PCWorld document limitations. These are not three headset brands. PCWorld tested after the April 2018 Windows/SteamVR release, and its later article date remains explicit rather than being backdated to the October 2017 launch. No Acer-specific fit/display findings were transferred to Samsung Odyssey or other brands, and immersive VR was distinguished from see-through HoloLens AR.
- [Original QQ Ice Cream professional test](../../../scripts/products/qq-exact-test-round10-2026-10-26.json): recovered the Autohome original linked from the model section, opened the publisher’s full-article expansion and verified 周尤’s December 16, 2021 byline. It explicitly tests the 13.9-kWh, 170-km Sundae; the quote concerns sport-mode pedal response. The professional exact-variant follow-up is resolved. Four accounts now span three publishing platforms, with the Autohome editor and owner still counted as one platform. The previous replay had intentionally preserved the native old basis even though the JSON basis was updated; that stale explanation is now separately corrected and verified in both environments.
- [Polestar 4 Single Motor replacements](../../../scripts/products/polestar-rwd-reviews-round10-2026-10-26.json): the ADAC German test identifies 200-kW RWD, Driven Car Guide tests the NZ standard-20-inch/passive-damper car, and Autoweek explicitly describes an acceleration impression shared by both single and dual motor test cars. The AWD-only active-damper handling paragraph was excluded from the new Autoweek extract. NZ and later US market/software differences are explicit and do not validate Europe-launch acceleration, range or connectors. The ADAC page’s original first-look metadata does not date its current road-test passage; its native date stays null, with a verified source-wiki explanation.
- [Exact K4 and Palisade sources](../../../scripts/products/review-source-repairs-round10-2026-10-26.json): replaced the mutable K4 sedan/range overview with the original GT-Line Turbo hatch test, and the generic Palisade page with the original test’s explicit XRT Pro off-road assessment. C/D’s Palisade article originally appeared August 5, 2025 and received instrumented results on October 8; the original article day is retained without claiming later results were available at launch. Other launch-family accounts remain labelled as such.
- [Five targeted exclusions](../../../scripts/products/review-exclusions-round10-2026-10-26.json): removed the two generic C/D excerpts and all three old Polestar AWD/unspecified-variant extracts only after verifying replacement saves. The old sources remain references for context. All axes, authors and unrelated fields were preserved.
- [Native basis corrections](../../../scripts/products/review-basis-round10-2026-10-26.json): separately updated QQ Ice Cream, Polestar 4, K4 and Palisade explanations, with fresh-row concurrency guards and eight native readbacks. The ordinary replay deliberately preserves an existing basis. Both original EV catalog bases were synchronized; no score was changed.
- [Publication correction](../../../scripts/products/review-date-clears-round10-2026-10-26.json): the prior assignment of April 11, 2017 to La Yeon was too confident. A label identifying a dated review does not separately prove publication. Both native dates are now null, the service quote is retained, the research check is reopened and the earlier replay catalog is corrected. Because the ordinary merge intentionally preserves existing dates when incoming evidence has null, the explicit guarded [date-clear replay](../../../scripts/products/replayReviewDateClears.ts) handles this correction. It verifies both environments before writing, rejects a changed citation and preserves every unrelated field. An idempotent replay and a deliberately stale-quote rejection were checked.
- [Source checks](../../../scripts/products/review-source-checks-round10-2026-10-26.json) and [coverage dispositions](../../../scripts/products/review-coverage-leads-round10-2026-10-26.json) preserve the original evidence and limits. [Four source-wiki readbacks](../../../scripts/products/review-wiki-verification-round10-2026-10-26.json) verify ADAC’s test-date scope and the corrected La Yeon date interpretation while preserving existing content. Hali 1 Opal and broader category coverage remain open.

[Scheduled retry #26](../../../scripts/products/review-production-verification-round10-2026-10-26.json)
was claimed by the production scheduler but skipped because no
`ANTHROPIC_API_KEY` is configured in that runtime. It made zero model calls or
content actions. This is the current blocker; the earlier insufficient-credit
response from #25 does not establish current billing state while the key is
missing. The temporary schedule was removed and the complete original settings
were verified unchanged, including all four disabled original schedules. No
production deployment, restart or environment change was performed.

[Validation](../../../scripts/products/review-validation-round10-2026-10-26.json):
ten native rubric readbacks verified unchanged scores and unrelated fields,
with the four intended basis updates also checked explicitly. Both native date
clears and all four source-wiki annotations were read back. Twelve page checks
passed: quotations and expected graphs rendered in both environments, while
La Yeon correctly has no dated graph after its only assigned day was cleared.
All 28 focused documentation/review-date/research tests, the guarded replay’s
idempotent run and stale-citation rejection, catalog constraints, queue totals
and whitespace checks passed. No application/runtime code was changed; the new
script is an operator replay utility for explicit researched date corrections.


## Eleventh continuation: Silo seasons, exact CRJ100 and original guide PDFs

Saved nine new reviews and repaired two existing guide extracts through native
APIs locally and in production. Removed two inaccessible directory excerpts
after saving verified replacements. Critic coverage now totals 104 pins and
313 extracts. The current queue retains **72 rubric gaps** (EV33, gas12,
aircraft13, dining8, LLM4, video2), **75 publication/source checks**, and 74
verified-undated entries. This remains an unfinished broader backfill.

- [Silo seasons one and two](../../../scripts/products/silo-critic-round11-2026-10-26.json): three original reviews per exact season. The Guardian, Empire and Slant cover the first season; The Guardian, NME and Digital Trends cover the second. Exact titles, short verbatim passages and original publication days were checked. Empire explicitly saw all ten first-season episodes; Digital Trends saw only nine second-season episodes and does not establish a finale verdict. Criticism is retained alongside praise, with passage sentiment distinguished from the whole review. Advance-review dates were not changed to premiere dates. Empire was readable in the browser despite a plain-reader 402; Slant was verified through the primary reader, not its browser security page.
- [CRJ100](../../../scripts/products/crj100-reviews-round11-2026-10-26.json): sumitsan’s original SQTalk post #8 describes Comair DL6462, N959CA, seat 9A, on an April 2011 flight. The operator’s original historical fleet PDF was downloaded and visually checked on PDF page 15 / printed page 29, corroborating MSN 7116 and CF34-3A1. The cramped-seat quote belongs to that CRJ leg, not the preceding Boeing 767. Publication follows the visible publisher-local March 2, 2012 label; offsetless metadata is not converted to UTC or substituted for the visible calendar day. Three authors now span two platforms, not three publishers. Comfort remains null; all technical axes are unchanged. The [guarded basis update](../../../scripts/products/review-basis-round11-2026-10-26.json) and [fleet citation readbacks](../../../scripts/products/review-fleet-verification-round11-2026-10-26.json) retain the exact evidence.
- [Original dining PDFs](../../../scripts/products/dining-pdf-repairs-round11-2026-10-26.json): Mugunghwa’s exact guide passage appears in the Blue Ribbon Survey volume on PDF page 17 / printed page 31. Its colophon explicitly gives first publication October 30, 2023, now saved with sentiment. The exact 100.1.pyeongnaeng entry appears in the municipal 2025 guide on PDF page 89 / printed page 176. Its verdict was shortened verbatim; the edition year and December 2024 content cutoff do not establish a publication day, so null is retained. Both guides were downloaded and their complete relevant pages visually inspected; browser PDF-viewer text was insufficient. Historical menus, prices and operating hours were not applied as current content.
- [Mori and Le DORER replacements](../../../scripts/products/busan-guide-reviews-round11-2026-10-26.json): verified independent guide verdicts replace two directory excerpts whose original text could not be checked after publisher refusal. Mori’s exact Pale de Cz restaurant appears in the dated 2023 Blue Ribbon guide; Le DORER’s Marine City entry is in the undated 2025 municipal guide. The latter’s date stays null. [Guarded exclusions](../../../scripts/products/review-exclusions-round11-2026-10-26.json) preserve other reviews, axes and the old links as context; an inaccessible listing is not declared fabricated. Palate remains open because the 2023 and 2025 guides show different locations, requiring branch/period matching before attribution.
- [Source checks](../../../scripts/products/review-source-checks-round11-2026-10-26.json) close four prior checks and record the new verified-undated guide source. AllMusic remains blocked and unverified; no album-release or Grammy date was substituted. [Coverage research](../../../scripts/products/review-coverage-leads-round11-2026-10-26.json) records excluded CRJ candidates: TravelUpdate names CRJ200 C-GKEJ despite its CRJ100 headline; OY-RJH has conflicting historical fleet labels; the Aviation24 original was inaccessible. No unsupported conversion history, sibling variant or search-snippet quotation was saved.

[Validation](../../../scripts/products/review-validation-round11-2026-10-26.json)
records native readbacks, unchanged rubric fields, rendered pin-page quotes and
graphs in both environments, focused tests and queue/catalog checks. Research
and replay catalogs are synchronized, including the dining catalog. Source
references, Source/PinSource links and scope annotations were saved through the
existing APIs. Completed CRJ100 coverage is removed from the open gap queue;
broader coverage and unresolved research remain in the README TODO.

Scheduled production verification remains blocked by the missing runtime
`ANTHROPIC_API_KEY` established by run #26. This pass made no deployment,
restart, environment or schedule changes, and does not claim the scheduled
review tools have been exercised successfully.


## Twelfth continuation: original album reviews and exact-location dining evidence

Saved fourteen new review extracts across six pins through authenticated native
APIs locally and in production: nine album critics and five dining sources.
Removed two Palate citations after saving current-location replacements. The
current inventory is **70 rubric gaps** (EV33, gas12, aircraft13, dining6, LLM4,
video2), **74 unresolved publication/source checks**, and 77 verified-undated
entries. Broader coverage and the remaining research stay in TODO.

- [Three album review sets](../../../scripts/products/music-critic-round12-2026-10-26.json): Geese’s Getting Killed, Bruno Mars’s The Romantic and Don Toliver’s OCTANE now each have three original critic reviews. Pitchfork, NME and The Guardian provide the first two sets; Pitchfork, Exclaim! and Clash provide OCTANE. Exact titles, authors, short verbatim passages and original publication dates were verified in full rendered articles. Praise and criticism are retained with passage-specific sentiment, without converting ratings. NME’s September 23 Geese review stays distinct from the September 26 release. Guardian’s Bruno original timestamp is February 27 UTC/UK; an Australian February 28 display represents that same instant. Clash’s January 30 review explicitly credits Robin Murray despite its generic ClashMusic header; its separate album announcement was excluded. Pitchfork’s unreliable rendered numerical score was not used. AP was inaccessible and was not substituted with a syndicated review.
- [Palate](../../../scripts/products/dining-reviews-round12-2026-10-26.json): the saved Pin address, opened operator About page and 2025 municipal guide match the current Haeundae/Dalmaji restaurant. Jenny Na’s original MINGCHU visit/profile explicitly places its move from Yongho-dong in late November 2024; no precise opening/move day was inferred or saved. Her daylight/sea-view observation describes the current dining room, not a scored meal assessment or chef self-quotation. The exact municipal guide verdict remains undated because its edition year and December 2024 compilation cutoff do not establish a publication day. [Guarded exclusions](../../../scripts/products/review-exclusions-round12-2026-10-26.json) remove the inaccessible directory extract and former Nam-gu award-news extract from native reviews, retaining historical references. The [basis correction](../../../scripts/products/review-basis-round12-2026-10-26.json) removes unverified directory-only award claims while preserving all axes. Final native review lists and explanation were checked after the removals; an intermediate overwritten explanation was corrected before completion.
- Shunsai Kubo Hwamyeong: the original municipal guide’s PDF page 67 / printed page 133 matches 17 Yangdal-ro 4beon-gil. Added that independent guide entry and 아콩이맛집여행’s original Diningcode visitor evaluation dated September 14, 2023. The exact short Korean dashi verdict comes from the named member evaluation, not an aggregate score or syndicated Naver snippet. Primary reader verified the original; browser received 403. The pin now has MICHELIN, municipal guide and a named visitor account across three platforms, not three professional critic meals. Changwon, sponsored candidates and a second city-owned publication were not counted as independent additional publishers.
- Jeongjitgan Sinpyeong: the original 2024 municipal guide, downloaded from an HTTPS education-site mirror, supplies a third independent source. PDF page 81 / printed page 161 matches 1F, 6 Bibong-ro and praises customizable meat, temperature and spice. The adjacent Yeongjin entry and Busan Station franchise were excluded. Full relevant spread and publisher colophon were visually checked. The December 2023 compilation cutoff does not establish a publication day; date remains null. Historical menus/prices/hours were not applied as current content.

[Source dispositions](../../../scripts/products/review-source-checks-round12-2026-10-26.json)
close the prior Palate source check and record three newly verified-undated
guide entries. [Coverage findings](../../../scripts/products/review-coverage-leads-round12-2026-10-26.json)
retain location and independence limits. Completed Shunsai and Jeongjitgan raw
review-count gaps have been removed from the open queue; the dining catalog,
portable replay data, source references and source wikis are synchronized.

[Validation](../../../scripts/products/review-validation-round12-2026-10-26.json):
all twelve pin-page checks rendered the fourteen saved extracts and expected
graphs across both environments. Six final dining readbacks checked full review
lists against the synchronized catalog, unchanged scores/unrelated fields and
Palate’s corrected basis. Ten scope-annotation readbacks preserved existing wiki
content. Focused review/documentation checks, catalog constraints and queue
counts passed. The local development server was restarted after it was found
stopped; no production deployment, restart, environment or schedule change was
performed. Scheduled production verification remains blocked by the missing
runtime key established in run #26.
