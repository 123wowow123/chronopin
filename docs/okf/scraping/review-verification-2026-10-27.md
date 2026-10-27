---
type: Reference
title: Review verification — October 27, 2026
description: Exact-branch dining reviews, source corrections, native readbacks and remaining review research.
tags: [scraping, reviews, sentiment, verification]
---

# Review verification — October 27, 2026

Continues the [October 26 batches](review-verification-2026-10-26.md). Saved twelve
new dining extracts across six pins through authenticated native APIs locally and
in production, removed two invalid review citations, and preserved all scores,
authors and unrelated fields. Five raw below-three dining gaps are closed; La
Scala now has one original firsthand review and still needs two more.

Round 14 adds three original film reviews and one firsthand Onjium review, and
removes three unattributed restaurant aggregator summaries. Details and validation
are recorded below.

## Current inventory

This live snapshot includes concurrent daily-job additions; those are not
attributed to this dining pass. There are **61 rubric gaps** (EV33, gas8,
aircraft13, dining1, LLM4, video2), **57 unresolved publication/source checks**
and **89 verified-undated entries**. Round 15 examines all 65 baseline rubric gaps
and 71 baseline source checks; it closes four raw coverage gaps and 14 source checks. No publication date was invented.
All dated quoted reviews are scored.
Raw review counts do not certify three professional critic meals or complete
source independence.

| Table | Pins | Reviews | Below minimum | Non-MICHELIN undated |
| --- | ---: | ---: | ---: | ---: |
| PinTaste | 228 | 494 | 0 | 44 |
| PinCarPerf | 128 | 348 | 33 | 14 |
| PinGasCarPerf | 160 | 510 | 8 | 14 |
| PinAircraftPerf | 165 | 563 | 13 | 8 |
| PinLlmPerf | 127 | 446 | 4 | 18 |
| PinVideoPerf | 32 | 111 | 2 | 5 |
| PinHotel | 41 | 123 | 0 | 0 |
| PinDining | 89 | 280 | 1 | 42 |
| PinCriticReview | 113 | 340 | 0 | 1 |

## Saved evidence and limits

[Portable dining catalog](../../../scripts/products/dining-reviews-round13-2026-10-27.json):

- Tokyo Babsang: the Blue Ribbon Survey volume and the municipal 2025 guide both identify 34-6 Namcheonbada-ro. Complete relevant PDF spreads were visually checked. Blue Ribbon’s original colophon gives October 30, 2023; the municipal edition/cutoff does not establish a day, so that date stays null. A neutral ochazuke description receives neutral sentiment, without invented praise. The neighboring guide entries were excluded.
- Anmok: Kookje’s own staff tasting report and an original personal blog match the Namcheon main branch. Reporter 정인덕’s head-meat texture verdict is not the preceding MICHELIN quotation or subsequent Budamyeonok section. Kookje’s explicit online publication is March 6, 2024, not the March 7 print-issue URL. Blogger 적기적기’s September 10, 2026 byline matches original publisher metadata. Busan Station and Seongsu branches were excluded. Three newspaper reporters remain one publication.
- Pili Pili: Cindy Choi’s HAPS local dining report matches the current street address through its cadastral Gwangan-dong 94-3 address. June 28, 2022 is its Korean publication day; June 27 UTC metadata is the same instant. Named Diningcode member raitto’s December 30, 2025 salt/intensity complaint is retained alongside atmosphere praise. It is an original visitor evaluation, not merchant copy, an aggregate score or a reprinted blog snippet.
- Yakitori Onjeong: original Foodtracer blogger 안냠쩝 and Diningcode member 미야옹 describe personally eaten food at 9-7 Dongcheon-ro 108beon-gil. Original August 5, 2023 and March 24, 2024 publication/evaluation dates are explicit. A similarly named Danggam venue was excluded. These are visitor/blog reports alongside MICHELIN, not three professional critic meals.
- Sushi Kanesaka at Hinotsuki: the previously saved iki quotation belongs verbatim to the opened original Tokyo Ginza guide, not the Seoul counter. The actual Seoul guide entry ends in 1244365 and identifies 521 Teheran-ro. Two original regular-dinner visitor accounts add criticism of course composition and unaddressed noise. Revit’s meal month is not a publication date; Diningcode’s July 5 label omits the year. Both remain null. The earlier guest-chef pop-up, broader Kyoto kaiseki room and Tokyo meal were excluded. All four unpublished dining axes remain null; the existing one-star acclaim score is unchanged.
- La Scala: CH_’s original repeat-visitor blog describes the Busan hotel’s post-2022-rebrand restaurant. Original December 6, 2023 publication is distinguished from April 3, 2024 modification. This is one source, not three. Incheon restaurant results, promotional menu announcements, a misclassified Trip.com page and directory copies of inaccessible original comments were not substituted. The unresolved two-source shortage remains in the queue.

[Guarded exclusions](../../../scripts/products/review-exclusions-round13-2026-10-27.json)
remove the wrong-branch Kanesaka quotation and operator marketing from native
reviews after replacements were saved. Historical/operator links remain annotated
context. The [basis correction](../../../scripts/products/review-basis-round13-2026-10-27.json)
explains the exact Seoul counter and preserves every score. Source references,
Source/PinSource links and [wiki annotations](../../../scripts/products/review-wiki-verification-round13-2026-10-27.json)
were saved and read back in both environments. The dining catalog is synchronized.
[Source dispositions](../../../scripts/products/review-source-checks-round13-2026-10-27.json)
and [coverage findings](../../../scripts/products/review-coverage-leads-round13-2026-10-27.json)
retain date, branch and independence limitations.

The replay utility now takes the wiki check day from the research catalog instead
of hardcoding October 26. It continues preserving ready wikis; explicit scope
annotations updated the current verification for newly researched sources.

## Verification and outstanding work

[Validation record](../../../scripts/products/review-validation-round13-2026-10-27.json)
records twelve final native rubric readbacks, twelve page checks, wiki readbacks,
focused tests and catalog/queue checks. Kanesaka correctly has no dated graph;
no publication day was invented merely to create one. A transient production
Tokyo Babsang page failure was rechecked successfully with HTTP 200 and both
saved quotes and its graph. The documentation bundle’s missing frontmatter on
the separate October 27 news report was repaired without changing its body.

The [current queue](../../../scripts/products/review-queue-2026-10-27.json) and
README retain broader critic coverage, the remaining 65 rubric gaps, publication
research and scheduled production verification. No production deployment,
restart or environment change was performed.


## Scheduled production retry #28

The [read-only status](../../../scripts/products/review-production-status-round13-2026-10-27.json)
reported API availability and no active jobs. A temporary sentiment-only schedule
with zero new pins and at most one pin update was installed, claimed with
`trigger: schedule`, then removed. Complete original settings, including all four
disabled schedules, were verified unchanged. No deployment or restart occurred.

The [retry result](../../../scripts/products/review-production-verification-round13-2026-10-27.json)
was skipped with zero recorded actions and no model usage. It reported a missing
key despite the admin endpoint reporting the API driver available. Code inspection
shows `getClient()` also returns null during its process-local thirty-minute
credit pause, while the API driver describes every null as a missing key. Thus
this result does not prove key absence, current credit exhaustion, or a specific
worker mismatch. Scheduled research/scoring execution remains unverified until
the scheduler can obtain an available client and complete the tools. The README
now records this narrower, evidence-based blocker instead of asserting the key
is missing. No credentials or runtime configuration were changed.


## Round 14 — film coverage and restaurant attribution

Saved [three original film reviews](../../../scripts/products/movie-critic-round14-2026-10-27.json)
for *How to Train Your Dragon* (2025), matching the live-action film rather than
the animated original or sequels. Justin Clark’s Slant article is dated June 9;
its exact article heading differs from its SEO title. The short dragon-visuals
praise is explicitly scoped within a broadly critical review. Radheyan
Simonpillai’s Guardian article was originally published June 10, not its later
update. TheWrap’s original June 9 review names Michael Ordoña, rather than the
author incorrectly suggested by an unrelated search result. Sentiment scores
apply to each quoted passage; star ratings were not converted. Slant’s full
primary article was available in the reader while its browser view refused access.

The [Onjium replacement](../../../scripts/products/dining-reviews-round14-2026-10-27.json)
is KenScale’s original lunch report at 49 Hyoja-ro, published October 11, 2026.
Its September meal period and later modification timestamp were excluded as
publication evidence. [Three guarded exclusions](../../../scripts/products/review-exclusions-round14-2026-10-27.json)
remove Wanderlog’s generic review-summary sentences from Onjium, Alla Prima and
Evett. They are unattributed aggregations, not original critic or firsthand
accounts. Each restaurant retains three native reviews; this does not establish
three professional critic meals. Scores and basis remain unchanged. Contextual
references remain, with source-wiki eligibility corrections. Evett’s existing
May 6, 2025 publication date was independently verified in original Article
JSON-LD and `itemprop=datePublished`, rather than inferred from its meal label;
the October modification was excluded.

[Source dispositions](../../../scripts/products/review-source-checks-round14-2026-10-27.json)
close those three checks. Fiotto remains unresolved: current-address directory
pages display older meal reports without proving the meal occurred after its
move from 432 Jwadongsunhwan-ro to the ECKE building at 219 Dalmaji-gil 117beonga-gil.
An old-address closure label was not treated as evidence that the current room
is closed. No uncertain review was added to meet a numerical target.

Verification caught a catalog synchronization defect: numeric pin IDs from a
prior database snapshot could identify another restaurant. The Onjium replay
had added its new extract to the Baek Ill Pyeong Naeng catalog row; that addition
was removed without changing the correct live records. Review replay helpers
now select catalog entries by stable pin URL, or an unambiguous legacy rubric
source URL, and reject ambiguity. The three affected restaurant rows carry
explicit `pinSourceUrl`; the dining importers honor it. A regression test covers
colliding IDs and ambiguous source URLs. Other catalog rows were preserved.

[Validation](../../../scripts/products/review-validation-round14-2026-10-27.json)
records eight native readbacks, six dining score/basis preservation checks,
eight HTTP-200 rendered pin pages with expected quotes and graphs and no removed
summary, source-wiki readbacks, 31 passing focused tests and scoped ESLint.
The [wiki verification](../../../scripts/products/review-wiki-verification-round14-2026-10-27.json)
retains prior wiki content and adds exact attribution/publication notes. The
current queue and README contain only unfinished work: 65 raw rubric gaps,
71 publication/source checks, broader critic coverage and successful scheduled
production verification. Round 14 did not retry the already skipped scheduled
run, deploy, restart or alter production configuration.


## Round 15 — full queue research and broader coverage

The [full research ledger](../../../scripts/products/review-full-queue-research-round15-2026-10-27.json)
records all 65 baseline rubric gaps and all 71 unresolved source/date checks.
Each rubric received English and native-name/exact-variant searches; all 71
original source URLs were retried. Search discoveries are leads, not verified
citations. This pass does **not** complete the overall job: 61 raw rubric gaps,
57 source/date checks and further eligible critic coverage remain.

Saved **25 new verified review extracts** locally and in production:

- Fifteen extracts across five new critic pins: Fontaines D.C.’s *Dopamine Chamber*, Lisa’s *Press Play* EP, *Nobody Wants This* season 3, MSI RTX 5080 Expert and Omega’s Bond/Spectre collection. These expand Music, TV, Computing and Fashion coverage. Hardware testing concerns the exact cooler/card, not proof of its later award. Watch verdicts are editorial assessments, not instrumented accuracy tests.
- Ten new vehicle extracts: three Grand Sport, two Stingray, one current-generation AMG GLE, three Q9 and one petrol-manual Tata Aeris. Q9, Aeris, Grand Sport and Stingray cross the raw three-review threshold. Suspension, tire, engine and market qualifications remain explicit; Stingray’s optional Z51 tests do not establish base-coupe handling.

The [broader catalog](../../../scripts/products/review-broader-coverage-round15-2026-10-27.json),
[vehicle catalog](../../../scripts/products/review-vehicles-round15-2026-10-27.json)
and [additional vehicle catalog](../../../scripts/products/review-additional-vehicles-round15-2026-10-27.json)
contain exact titles, quotes, original publication days and evidence limitations.
Original bylines take precedence over later updates; UTC midnight crossings use
the publisher’s displayed publication day. No missing day was guessed.

Nine ineligible legacy citations were removed: three Wanderlog summaries, a
Nevo showroom overview, Monjaro launch news, an older-generation AMG test, an
unverified Q9 announcement summary and two different-producer Daim comparisons.
Two briefly added Monjaro export-market reviews were also removed from native
reviews after exact-market screening; they remain explicitly
[context only](../../../scripts/products/review-context-only-round15-2026-10-27.json).
Two FUNDAY customer-review URLs were replaced with the original Australian
collection-product pages containing the named comments, distinct from the
site’s AI-generated summary. Nine existing citations received literal-quote,
headline, date or driving-extract corrections. See the
[guarded exclusions](../../../scripts/products/review-exclusions-round15-2026-10-27.json),
[source corrections](../../../scripts/products/review-source-corrections-round15-2026-10-27.json),
[metadata correction](../../../scripts/products/review-metadata-round15-2026-10-27.json),
[taste replacements](../../../scripts/products/review-taste-replacements-round15-2026-10-27.json)
and [final driving extract](../../../scripts/products/review-final-vehicle-corrections-round15-2026-10-27.json).
Hennig-Olsen’s remaining maker description is still not a firsthand tasting;
that research gap remains open despite its existing seven-axis radar.

Three previously null handling axes were filled under the published anchors:
Grand Sport 4, Q9 4 and Aeris 3. The
[guarded rubric corrections](../../../scripts/products/review-rubric-updates-round15-2026-10-27.json)
also correct stale basis text for six other rows while preserving their axes.
LS9 66 Ultra, Avatr pre-production Max+/Ultra and Chinese 70-kWh Zeekr tests do
not validate the scored base, final Elite or European 55.1-kWh configurations.
Those exact-variant research gaps remain open.

Four source checks closed by excluding summaries/showroom material, two through
verified URL replacements, one through an original LS9 publication date and
seven through original-source verification with legitimately null publication
days. The new FUNDAY URLs also remain verified-undated. There are now 89
verified-undated entries; these do not create dated graph points.
[Source dispositions](../../../scripts/products/review-source-checks-round15-2026-10-27.json)
and [coverage findings](../../../scripts/products/review-coverage-leads-round15-2026-10-27.json)
retain specific missing evidence for every remaining baseline item. The active
[queue](../../../scripts/products/review-queue-2026-10-27.json) and README TODO
remove closed work and retain actual shortages.

The La Yeon duplicate catalog identity was consolidated without discarding its
source wikis; Library and Bicena now use stable venue URLs. See
[catalog repairs](../../../scripts/products/review-catalog-repairs-round15-2026-10-27.json).
Source references and 106 source-wiki annotations were saved and read back
across both environments, retaining earlier source content. The
[wiki receipt](../../../scripts/products/review-wiki-verification-round15-2026-10-27.json)
records those checks. Two duplicate FUNDAY catalog rows were consolidated by
matching their reviewed product URLs and all seven axes; Hennig-Olsen received
a stable-URL catalog record. Numeric ids alone were not used to infer identity.

All 54 native rows and 54 rendered detail pages (27 pins in both environments)
passed final checks. Remaining quotes render verbatim after whitespace
normalization; graph visibility matches the presence of dated, scored reviews.
Unrelated native fields were compared against the pre-pass snapshot.

Validation is recorded in the
[round 15 receipt](../../../scripts/products/review-validation-round15-2026-10-27.json).
The 31 focused review/catalog/markup/publication-day tests pass; the new guarded
rubric replay utility passes ESLint. No deployment or schedule change was made.
Scheduled production model/tool verification remains separately unfinished.
