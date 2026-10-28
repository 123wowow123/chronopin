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
attributed to this review pass. There are **54 rubric gaps** (EV31, gas8,
aircraft12, dining1, video2), **37 unresolved publication/source checks**
and **97 verified-undated entries**. Round 17 adds 21 reviews, closes three raw
coverage gaps and resolves seven baseline source checks. No publication day was invented.
All dated quoted reviews are scored. Raw counts do not certify three professional
critics, independent publishers or validation of every rubric axis. In particular,
GPT-5.4 mini now has three saved accounts but its existing Artificial Analysis
post still needs source/day verification; that follow-up remains open.

| Table | Pins | Reviews | Below minimum | Non-MICHELIN undated |
| --- | ---: | ---: | ---: | ---: |
| PinTaste | 228 | 491 | 0 | 40 |
| PinCarPerf | 128 | 348 | 31 | 12 |
| PinGasCarPerf | 160 | 510 | 8 | 12 |
| PinAircraftPerf | 165 | 564 | 12 | 8 |
| PinLlmPerf | 127 | 453 | 0 | 22 |
| PinVideoPerf | 32 | 111 | 2 | 5 |
| PinHotel | 41 | 123 | 0 | 0 |
| PinDining | 89 | 280 | 1 | 35 |
| PinCriticReview | 119 | 358 | 0 | 0 |

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


## Round 16: original reviews and exact-variant replacements

Added **29 retained reviews across 18 pins**, and corrected two existing gas-car
citations. Changes were saved through authenticated native APIs locally and in
production; stable source URLs established each production identity.

- [Broader critic coverage](../../../scripts/products/review-broader-coverage-round16-2026-10-27.json): nine original reviews of Street Fighter (2026), The Diplomat season four and VisionQuest. Positive, mixed and negative evaluations are retained; licensed Variety republication counts once.
- [Original evidence](../../../scripts/products/review-evidence-round16-2026-10-27.json): exact Berry Rouge and Golden Gaytime stick tastings, three Seoul dining accounts, an entry MG07 owner report, three LS9 52 Ultra accounts and current Granite 4.2 30B measurements. The 66 Ultra test and flagship MG report do not validate the scored entry variants. LS9 now has three distinct firsthand authors across two publishers; professional road-test coverage remains a follow-up.
- [Additional model evaluations](../../../scripts/products/review-additional-model-evidence-round16-2026-10-27.json): Tessl paired coding-agent and SparkThai small API tests for Qwen3.7 Plus; GeoHALUBench, Epoch and Salonen original evaluations for the exact qwen-plus-2025-01-25 snapshot. The complete GeoHALUBench table page was visually checked. Macro accuracy, tokens per question and assisted-task results are not interchangeable with launch reasoning anchors or output speed. Commercial interests and small benchmark limitations are recorded. All manual axes, basis, provenance and existing citations were preserved by the append-only replay helper. Preserved basis text can predate these additions; the source wikis explain current coverage.
- [Dining replacements](../../../scripts/products/review-dining-replacements-round16-2026-10-27.json): original Time Out Tosokchon review and firsthand Chaoran, Fiotto, Moemiljip and Songheonjip meals, matching exact addresses. Fiotto's July 24 publication is separate from its May meal; modification days and travel dates were not used as publication dates.

The [15 guarded exclusions](../../../scripts/products/review-exclusions-round16-2026-10-27.json)
remove aggregator summaries, unverified comments, translated paraphrases and
wrong-product/trim extracts only after replacements were saved. Historical links
remain annotated context. MG07 has one verified exact-entry review and remains
below target. No radar axis was changed. Three
[basis corrections](../../../scripts/products/review-rubric-updates-round16-2026-10-27.json)
clarify vehicle scope and current-versus-launch model measurements.

[Two existing citation repairs](../../../scripts/products/review-source-corrections-round16-2026-10-27.json)
restore DB12 S's original August 17 publication day and correct its headline;
GLC53's original Motor1 title and quote are verified, but its displayed May 26
byline lacks a year. GLC53 retains a null publication date, with the tested coupe
scope documented. No model year was substituted for a publication year.

The [full research ledger](../../../scripts/products/review-full-research-round16-2026-10-27.json)
records discovery searches for every baseline gap and source check. Discovery-only
items remain unresolved; snippets are not evidence of an original review or day.
[Source dispositions](../../../scripts/products/review-source-checks-round16-2026-10-27.json)
and [coverage findings](../../../scripts/products/review-coverage-leads-round16-2026-10-27.json)
retain specific shortages, inaccessible sources and variant limitations. Six new
undated sources and the verified-undated GLC53 bring verified-undated entries to
96; these create no dated graph points. Broader Music, Computing and Fashion
coverage remains research, alongside the 57 raw rubric gaps and 44 source checks.

The [validation receipt](../../../scripts/products/review-validation-round16-2026-10-27.json)
records 40 native readbacks and rendered detail pages across 20 pins in both
environments, unchanged unrelated fields, synchronized replay catalogs, source
references and [92 source-wiki checks](../../../scripts/products/review-wiki-verification-round16-2026-10-27.json).
Two local pages needed a fresh rendered retry; saved reviews and sentiment graphs
were checked before accepting them. The focused tests and replay-helper ESLint
checks pass. README TODO removes resolved counts and retains genuine gaps.
No deployment, restart or schedule change was performed. Scheduled production
model/tool verification remains separately unfinished.


## Round 17: album coverage and original variant evidence

Added **21 retained reviews across 12 pins**, corrected two existing tasting
citations, and removed 12 unverified or inapplicable extracts. Authenticated native
APIs saved the content locally and in production, matching pins by stable source
URLs and preserving authors, scores and unrelated fields.

[Broader album coverage](../../../scripts/products/review-broader-coverage-round17-2026-10-27.json)
adds three independently authored critics each for Phoebe Bridgers’ Lost Weekend,
Ariana Grande’s Petal and Olivia Rodrigo’s You Seem Pretty Sad for a Girl So in Love.
Original Pitchfork, NME and Slant articles were opened; their review bylines are
separate from release days. Mixed and negative Petal criticism is retained.
KERA’s original David Okamoto review replaces an inaccessible AllMusic extract
in the existing Norah Jones panel. Award events were not newly treated as albums.

[Vehicle, aircraft and tasting evidence](../../../scripts/products/review-evidence-round17-2026-10-27.json)
and [additional owner reports](../../../scripts/products/review-more-evidence-round17-2026-10-27.json)
record the exact scopes:

- Avatr 07L: DTDTDT’s final 725-km RWD Elite test drive replaces pre-launch Max+/Ultra and older EREV context. This is one participant account, so coverage remains below target.
- Lynk 07 GT: one original 200-km 2WD Ultra owner replaces the 4WD paraphrase and MRC media-drive repost. Other articles showed static 2WD cars but actually drove 4WD. Another post called the PHEV a pure EV and was excluded.
- MG07: a second exact 650 Comfort owner describes its sport-oriented chassis. The original custom-font rendering was visually checked before transcription. Another entry-tagged post claimed incompatible Momenta highway NOA and was excluded. Two reviews remain below target.
- Li L6: three original 2026 Ultra, 51-kWh, M100/dual-valve-CDC accounts replace 2024 Max and a placeholder video citation. The soft-suspension/roll complaint remains beside praise. Three authors across two publishers are not three professional instrumented tests. Custom-font Chinese was visually verified.
- Saab 340A: Cal and LUCKY LUKE’s original YL-RAL flights add seat-comfort praise and dim-cabin criticism beside EX-YU’s exact-aircraft report. Publication days differ from flight days. Tail identity and explicit A/QC descriptions disambiguate incidental year/B-label errors. Later 27/33-seat layouts do not validate the original Crossair cabin; comfort and all numeric axes remain unchanged. The generic Rex cabin citation was removed.
- BMW 740 xDrive: Stefan Grundhoff’s original German-market 400-PS MHEV drive replaces an unverified generic steering sentence. Existing US launch drives remain scoped context; handling stays null.
- Dairy Queen: Anne Sutton’s named original Ube Oreo comment replaces a TikTok description label. The parent blogger explicitly chose pumpkin and did not taste Ube; October 19 is the comment publication, not the parent post’s October 18.

[GPT-5.4 mini evidence](../../../scripts/products/review-additional-model-evidence-round17-2026-10-27.json)
adds Simon Willison’s original matched SVG experiment, backed by linked raw mini
API transcripts. Its neutral protocol excerpt is not a model-quality score;
nano’s photo-cost example, the full model’s preferred result and AI-written image
alt text are not mini verdicts. All hand-set fields and prior citations remain
unchanged. The existing AA post’s source/day check remains open despite the raw
review count reaching three.

[Literal tasting corrections](../../../scripts/products/review-source-corrections-round17-2026-10-27.json)
restore Parker Schubert’s actual Untappd wording and displayed September 9 UTC
publication day, and replace Marie Lindqvist’s translated Triumf extract with
original Swedish. Marie’s relative “3w” does not supply an absolute day; that
check remains open. The other unverified Triumf comment was removed.
[Guarded exclusions](../../../scripts/products/review-exclusions-round17-2026-10-27.json)
retain contextual source links with eligibility notes rather than counting them
as native firsthand reviews. The original Total Wine product/aggregate page does
not establish the named PCal quotation; two verified High Noon tastings remain.

The existing Edmunds 2027 LS6 Stingray extract is now verified against its full
original test; only an Updated day is supplied, so publication remains null.
Its 3LT/Z51 test does not rescore the base coupe. This verification brings
verified-undated sources to 97.
[Source dispositions](../../../scripts/products/review-source-checks-round17-2026-10-27.json)
close seven baseline checks and retain 37. The
[research ledger](../../../scripts/products/review-full-research-round17-2026-10-27.json)
records 38 rendered original retries plus targeted source/replacement checks,
specific rejected leads and unchanged coverage evidence. Search discovery is not
claimed as an opened original review. La Scala’s mixed-branch collages and hotel
promotions were excluded; two additional original Busan meal accounts are needed.
Fashion leads include real Warning Code and Blue wear tests, but tests of other
colorways/EP constructions were not presented as three exact-colorway critics.
Computing candidate events and infrastructure were not assigned product reviews.

[Six basis clarifications](../../../scripts/products/review-rubric-updates-round17-2026-10-27.json)
preserve every axis. The Chinese and European Lynk replay rows shared a legacy
rubric source URL; matching their full scores, basis and criteria year to the
pre-pass native snapshot established separate stable identities. The
[catalog repair record](../../../scripts/products/review-catalog-repairs-round17-2026-10-27.json)
records this disambiguation; ids alone did not decide the match.

The [validation receipt](../../../scripts/products/review-validation-round17-2026-10-27.json)
records 30 native readbacks and 30 rendered detail pages across 15 pins in both
environments, unchanged unrelated fields, synchronized catalogs and
[72 source-wiki checks](../../../scripts/products/review-wiki-verification-round17-2026-10-27.json).
The 30 focused tests and replay-helper ESLint checks pass. Source wikis retain
prior content and identify consumer/owner evidence and publication limits.
README TODO removes resolved counts and retains the 54 raw rubric gaps, 37
source/date checks, broader coverage and scheduled production verification.
No deployment, restart or schedule change was performed.


## Round 18 — exact extended-range T6 tests and two film backfills

Saved twelve new review excerpts across five pins locally and in production,
then removed five superseded citations after replacement verification. All ten
native readbacks preserve every axis and unrelated rubric field; pin authors,
titles and source identities are unchanged. The current inventory retains
**54 rubric gaps** (EV31, gas8, aircraft12, dining1, video2),
**34 unresolved publication/source checks**, and **98 verified-undated entries**.
Critic coverage is now 121 pins and 364 extracts. This is a bounded continuation;
the broader backfill remains unfinished.

- [Vehicle replacements](../../../scripts/products/review-vehicle-replacements-round18-2026-10-27.json): #20068 now has three original 18.8-kWh/350-PS T6 AWD road tests from Caradisiac, L’argus and Bil og Motorbloggen, including a negative steering extract. The opened Coches.com candidate explicitly drove the older 341-CV/11.6-kWh version despite its current comparison table and was excluded. #20034 replaces a rolling Superb overview with a 1,200-mile UK 204-PS iV Estate drive; the L&K suspension differs from the base SE Technology and its day remains null because only Last-Modified is supplied. #19911 gains original 2020 US petrol SQ8 drives from Road & Track and MotorTrend. Sport-package and wheel differences remain explicit; both publications are Hearst-owned, with separate testers, rather than independent corporate ownership. Existing labelled Australian evidence stays contextual.
- [Guarded exclusions](../../../scripts/products/review-exclusions-round18-2026-10-27.json): removed the generic Superb and Top Gear V60 overviews, Malaysian T8 review, shortened Auto Express URL and mutable evo SQ8 citation only after saving replacements. Auto Express’s correct V60 URL has a visible January 2023 day versus 2020 structured original metadata, so neither was assigned. Existing references are retained for context; exclusion reasons remain in the replay catalog and native bases. The [shortened Auto Express reference was separately corrected](../../../scripts/products/review-reference-repair-round18-2026-10-27.json) to its opened full URL in both environments, with null publication date and an explicit chronology warning; reference identity and attribution are preserved.
- [Film coverage](../../../scripts/products/review-film-coverage-round18-2026-10-27.json): Inside Out 2 (#6192) gets Time Out, Radio Times and AP; Alien: Romulus (#6319) gets Time Out, The Guardian and Sight and Sound/BFI. Exact film/version, original publication days and short verbatim passages were checked. Praise and negative originality criticism remain distinct. Time Out’s prior-day 23:00 UTC timestamps agree with the visible UK publication day under BST; updates and theatrical dates were not substituted. AP was opened through the primary reader and its original news-feed timestamp; plain requests returned 403. Blocked RogerEbert.com and Screen Daily pages were not used.
- [Basis corrections](../../../scripts/products/review-rubric-updates-round18-2026-10-27.json) preserve all axes. [Source dispositions](../../../scripts/products/review-source-checks-round18-2026-10-27.json) close the three former rolling-page checks only after both native saves were verified. The new Superb extract is verified-undated and stays off the dated graph. The original EV catalog and current research queue are synchronized.
- [Research limits](../../../scripts/products/review-research-round18-2026-10-27.json): SQTalk’s exact C-GPCF subtype conflict remains unresolved. Chris Melaisi’s opened real-flight account explicitly concerns -300 OY-MUG, not the launch configuration. Airlines-Inform failed primary-reader decoding. No simulator, sibling model, hotel promotion, branch-mixed review or unattributed aggregation was added to fill a quota.

[Production status](../../../scripts/products/review-production-status-round18-2026-10-27.json)
now reports neither API nor session driver available. No retry was started, no
schedule changed and no deployment or restart occurred. This does not establish
missing credentials versus the process-local credit cooldown; successful
scheduled review-tool verification remains outstanding.

[Validation](../../../scripts/products/review-validation-round18-2026-10-27.json)
records both-environment native readbacks, rendered sentiment tables, source/wiki
checks, nine focused passing tests and current queue counts.


## Round 19 — original social timestamps and exact RWD M7 owner accounts

Completed the interrupted continuation: five new excerpts, four resolved
publication days and three citation exclusions across six pins, saved and
verified through native APIs locally and in production. No rubric axis or pin
author changed. The inventory is now **53 raw rows below their review minimum**
(EV30, gas8, aircraft12, dining1, video2), **28 publication/source checks**,
and 98 verified-undated entries. Zero dated reviews await sentiment scores.
The M7 raw count is met, with professional/publisher diversity still open.

- [Original timestamp evidence](../../../scripts/products/review-timestamps-round19-2026-10-27.json): the logged-in browser exposed original main-post `time[datetime]` attributes for ChimaFanIndiana’s Wanglaoji post (February 16, 2025), fractal324’s Coconut Palm post (March 8, 2026), minutemaiding’s Toblerone Biscoff post (October 17, 2026), and Artificial Analysis’s model evaluation (March 26, 2026 UTC). Authors and exact post passages were checked, rather than comments or inferred relative ages. The X caption displays March 25 at 22:46 in the browser’s Pacific zone; its absolute source timestamp is March 26 at 05:46 UTC. This is a follow-up evaluation nine days after release, not a launch-day publication.
- [New and corrected reviews](../../../scripts/products/review-replacements-round19-2026-10-27.json): three named original Autohome accounts of the 2022 RWD Comfort six-seat Aito M7 replace a later UAE AWD export review. Firm rear suspension and weak transient response criticism are retained alongside light-steering praise. Three authors on one platform do not establish three professional road tests or independently validate ownership/technical figures. A fourth RWD-labelled candidate explicitly describes AWD and was rejected. The independent professional/source-diversity follow-up remains open.
- The Corolla Cross replacement is MotorTrend’s original March 24, 2026 nonhybrid FWD test; its XLE/18-inch tyres differ from the scored base L and do not rescore handling. The Drive’s Base Model headline did not make its actual AWD test applicable. Wanglaoji gains a dated original Japanese import tasting criticizing excessive sweetness; the original text, not note.com’s AI translation, is quoted. Market/formulation differences from the US WALOVI listing stay explicit, and existing taste axes remain editorial estimates.
- [Guarded exclusions](../../../scripts/products/review-exclusions-round19-2026-10-27.json) remove the inaccessible rolling Edmunds citation, unmatched AWD Seres 7 report and unattributed expanded Lemon8 recommendation after verified replacement saves. CostcoBuys’ caption does not establish authorship of that expanded tasting sentence. The Toblerone pin retains its verified, now-dated firsthand consumer account. These two old source checks close by replacement; their original publication days were not discovered.
- [Manual hand-row citation](../../../scripts/products/review-manual-citation-round19-2026-10-27.json) and [readbacks](../../../scripts/products/review-manual-verification-round19-2026-10-27.json): AA’s publication date and passage sentiment were deliberately saved through native admin endpoints, preserving `source: hand`, every axis, basis and unrelated review. Automatic hand-row protection remains unchanged. [Five basis clarifications](../../../scripts/products/review-rubric-updates-round19-2026-10-27.json) preserve all axes on the other pins.
- [Source dispositions](../../../scripts/products/review-source-checks-round19-2026-10-27.json) close six active checks only after both environments were verified. [Eighteen reference/wiki readbacks](../../../scripts/products/review-evidence-verification-round19-2026-10-27.json) preserve reference attribution and prior wiki content while adding original publication evidence and scope. The [catalog repair](../../../scripts/products/review-catalog-repairs-round19-2026-10-27.json) removes one stale id-only Toblerone alias after matching its complete prior reviews, basis and seven axes to the preflight snapshot; the canonical source-identified catalog entry matches the native row. Id alone did not decide identity. Taste/EV catalogs and the current queue are synchronized.

[Validation](../../../scripts/products/review-validation-round19-2026-10-27.json)
records twelve native readbacks, twelve rendered sentiment tables across six pins
in both environments, eighteen reference/wiki checks and nine passing focused
tests. A transient 502 on the final production M7 basis write was followed by
a fresh read showing the old value, then a successful idempotent retry.
Local API and page checks used a temporary isolated HEAD checkout on port 3001
against the same local database because concurrent feature work temporarily
lacked a generated JSON import. No concurrent application edits were changed.

[Production status](../../../scripts/products/review-production-status-round19-2026-10-27.json)
reported the API driver available again on the final read-only check. A temporary
read-only sentiment verification job with zero new pins and zero updates was
installed. [Retry #30](../../../scripts/products/review-production-verification-round19-2026-10-27.json)
was claimed with `trigger: schedule` but skipped before any model calls or
content actions. The scheduler reported a null client while the admin endpoint
reported API availability both before and after. Its missing-key error label
also covers process-local credit cooldown; missing credentials, current billing
health and a particular worker mismatch are not established. The temporary job
was removed and the entire original setting, including all four disabled
schedules, was verified unchanged. No deployment or production restart occurred.
Successful scheduled model/tool verification and the broader backfill remain
unfinished.

## Round 20 — small source-scope correction

Checked two sources. The opened [original InsideEVs Zeekr test](https://insideevs.com/reviews/793428/zeekr-001-ev-review/)
explicitly drove a European 400-V dual-motor AWD Privilege with adaptive air
suspension and 22-inch wheels. Its saved ride quote is genuine, but does not
test #19875's China-launch 100-kWh RWD. The citation was removed from native
reviews locally and in production, while its scope was preserved in a reference
and source wiki in each environment. The visible April 21 date lacks a year;
no full publication day was inferred. Both remaining reviews are labelled later
export RWD context; exact launch-variant coverage remains open.

[Guarded exclusion](../../../scripts/products/review-exclusions-round20-2026-10-27.json),
[basis correction and readbacks](../../../scripts/products/review-native-verification-round20-2026-10-27.json),
and [reference/wiki verification](../../../scripts/products/review-evidence-verification-round20-2026-10-27.json)
preserve axes and unrelated rubric/evidence fields. A source-identified canonical
entry was appended to the EV replay catalog from the fresh native row; no numeric-id
fallback was used. The initial basis replay saved both environments but stopped
at its missing catalog identity; after synchronization, the idempotent replay
completed and verified both environments.

The What Car? T-Roc original remained inaccessible through the HTTPS reader;
its saved passage and publication day remain unverified. No date or score was
assigned. [Research and dispositions](../../../scripts/products/review-source-checks-round20-2026-10-27.json)
close one active check by exclusion, not by discovering its publication year.
The queue now records **54 raw rubric gaps**, **27 source checks**, **98
verified-undated entries**, and **zero dated reviews awaiting sentiment**.
The extra raw gap honestly reflects Zeekr dropping from three citations to two.
[Validation](../../../scripts/products/review-validation-round20-2026-10-27.json)
includes both-environment API readbacks and three passing catalog tests.
Scheduled verification was not retried; its prior unresolved driver/cooldown
failure remains outstanding. No deployment or restart occurred.

## Round 21 — medium batch of original tests and scoped replacements

Saved six new dated excerpts across four pins in both environments and removed
four weaker citations. Eight native readbacks preserve all axes, manual `hand`
provenance where present, unrelated rubric fields, authors, titles, source
identities and event dates. Eight rendered sentiment tables show every incoming
publication day and passage score, with the excluded links absent from those
tables. Twenty reference/source-wiki checks preserve existing attribution and
prior wiki content. Nine focused tests pass.

- Gemini 1.0 (#5000): the opened, version-fixed December 18, 2023 arXiv v1 of *An In-depth Look at Gemini's Language Abilities* replaces the conflicting-date Akkio analysis. Its transparent ten-dataset Gemini Pro comparison supplies a modest negative comparative verdict, rather than testing unreleased Ultra or establishing current model quality. December 24's v2 revision is not substituted for publication. Akkio's original date remains unknown.
- Seedance 1.0 Pro Fast (#19633): Wiro's five published 480p/vertical/five-second outputs and Artlist's demonstrated bride-to-beach transition replace GeeLark's generic test assertion. Artlist's criticism of jerky motion is retained. Original visible March 26 and March 29, 2026 days are used; Wiro's September modification is recorded separately. Both publishers sell model access. Wiro lacks recorded seeds and per-output timing; these examples do not establish reproducible benchmark results or independent non-vendor consensus. Realism remains null and the independence follow-up stays open.
- Sora 2 Pro (#19669): original Japanese Gizmodo Japan (October 9, 2025) and TechnoEdge (October 3, 2025) hands-ons replace Wikipedia's secondary leaderboard relay. Original Japanese passages retain rendering praise and standard-resolution criticism. Both explicitly tested the Pro web product; TechnoEdge predates API launch. Their UI resolutions and 10/15-second web modes do not replace launch API specifications. Speed/realism remain null, and direct API-specific test coverage remains open. The standard-Sora2 Tom's Guide comparison and DataCamp author without access were not added as Pro firsthand evidence.
- Voyah Dreamer (#19873): Tao Yanyan's early seven-seat, entirely electric family drive, hosted by 42HOW and posted February 3, 2023, replaces the updated Huawei/global-spec EVW first-look. The publisher's literal English wording is quoted. Battery/range trim is unspecified: this does not prove the scored 605-km trim. The retained two later-model reviews remain labelled context; three raw citations do not close exact-launch-trim coverage. A hybrid drive and a track test not isolating the BEV were rejected.

The original reader displayed the full Artlist and 42HOW articles; plain HTTPS
returned 403 and a redirected 404 respectively. These access differences are
recorded without declaring either source permanently dead. Original days and
source scope are detailed in the [research record](../../../scripts/products/review-research-round21-2026-10-27.json).

The [guarded maintenance catalog](../../../scripts/products/review-maintenance-round21-2026-10-27.json)
records complete expected reviews/bases, replacements, exclusions and deliberate
hand-row maintenance. The source-identified EV replay entry and current queue
are synchronized; historical research/backup snapshots remain history.
[Source dispositions](../../../scripts/products/review-source-checks-round21-2026-10-27.json)
close four active citations by replacement/exclusion, not by discovering their
old publication days. The inventory is now **54 raw rubric gaps**, **23 source
checks**, **98 verified-undated entries**, and **zero dated reviews awaiting
sentiment**. Scoped independence/variant/API follow-ups remain explicit.
[Validation](../../../scripts/products/review-validation-round21-2026-10-27.json)
records the native, rendered and evidence readbacks. Scheduled verification was
not retried; its previous unresolved driver/cooldown failure remains outstanding.
No deployment or restart occurred.

## Round 22 — small exact-engine T-Roc replacement

Replaced #15221's unverified rolling What Car? citation with Ivan Cvetković's
original Autonet comparison, published September 17, 2026 at 08:30 CEST.
The tested base Trend is explicitly the 85-kW/116-PS 1.5 eTSI DSG on
225/60 R16 tyres; the compared R-Line has 150 PS and 20-inch wheels. The
literal Croatian passage praises the Trend's comfort without loss of control.
Visible publication and original structured metadata agree; no translation or
modification day was substituted. Croatian test prices do not replace the
German launch price. Every axis, including handling null, is preserved.

The [maintenance catalog](../../../scripts/products/review-maintenance-round22-2026-10-27.json)
guards complete review arrays and bases, resolves each environment by source
URL, and preserves the author, pin dates and unrelated rubric fields. Initial
local title extraction selected an empty decorative h1: the API normalized it
to null and the readback guard stopped before production was written. The exact
nonempty article h1 was corrected, the complete intermediate array was guarded,
and both final native saves passed verification.

The opened AUTO BILD 116-PS Style test was not added: its visible June 21 date
matches modification metadata while original metadata says June 12. That
chronology remains unresolved. The What Car? original remains inaccessible;
its old sentence/day were not certified. The active citation closes by verified
replacement, not by recovering its original date. Three retained reviews still
need exact-trim screening; one newly verified Trend test does not establish
three independent matching tests. [Research evidence](../../../scripts/products/review-research-round22-2026-10-27.json)
records the scope and source checks.

[Validation](../../../scripts/products/review-validation-round22-2026-10-27.json)
records two native readbacks, two rendered sentiment tables, four reference/wiki
readbacks and nine passing focused tests. Both rendered pages contain the exact
new title, original publication day, quote and sentiment; the excluded source
is absent from the sentiment tables. The current source-identified maintenance
catalog and queue are synchronized. Remaining: **54 raw rubric gaps**, **22
source checks**, **98 verified-undated entries**, **zero dated reviews awaiting
sentiment**. Scheduled verification was not retried; the previous driver/cooldown
failure remains unresolved. No deployment or restart occurred.

## Round 23 — small Avvatar source-quality correction

Removed #5629's unverified translated COREFITLAB promotional extract from native
taste reviews locally and in production. Repeated original-reader checks,
including this round's throttled retry, did not independently verify the saved
passage. The old native title already disclosed company association; this round
does not establish sponsorship payments or contract terms. No date, translation
or tasting score was invented. The existing September 28, 2026 Varun dutt dubey
consumer tasting remains, including its self-purchase claim and affiliate
code disclosure. It is not a blind sensory-panel result. All seven editorial
taste scores and pin authors/dates remain unchanged. The stale basis saying no
firsthand review had been found was corrected to describe the retained evidence.

The [guarded maintenance catalog](../../../scripts/products/review-maintenance-round23-2026-10-27.json)
and source-identified taste catalog are synchronized. A [legacy alias repair](../../../scripts/products/review-catalog-repair-round23-2026-10-27.json)
removes a uniquely matched source-less duplicate using its complete
URL/title/quote/day arrays, original basis and seven axes; the alias lacks only
the later sentiment field. Numeric id alone did not establish identity.
Existing source/wiki context and reference attribution are preserved with an
explicit exclusion note; the unverified translated sentence is not newly
certified as source evidence.

The XC40 #15251 check remains open. Research found a pre-facelift August B3
drive and a September stationary studio preview of the facelift. Neither is a
road test of the scored 2027 facelift B3; older petrol or EX40 electric tests
were not borrowed. [Research](../../../scripts/products/review-research-round23-2026-10-27.json)
and [dispositions](../../../scripts/products/review-source-checks-round23-2026-10-27.json)
record the source limitations. The Avvatar active citation closes by exclusion,
not discovery of its old publication day.

[Validation](../../../scripts/products/review-validation-round23-2026-10-27.json)
records two native readbacks, two rendered sentiment tables, two reference/wiki
checks and nine passing focused tests. Remaining: **54 raw rubric gaps**, **21
source checks**, **98 verified-undated entries**, **zero dated reviews awaiting
sentiment**. No new excerpt was added. Scheduled verification was not retried;
the prior driver/cooldown failure remains unresolved. No deployment or restart
occurred.
