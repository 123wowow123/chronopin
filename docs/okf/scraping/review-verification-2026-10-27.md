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

## Current inventory

This live snapshot includes concurrent daily-job additions; those are not
attributed to this dining pass. There are **65 rubric gaps** (EV33, gas12,
aircraft13, dining1, LLM4, video2), **74 unresolved publication/source checks**
and **80 verified-undated entries**. One prior operator-source check was closed;
a concurrent new Reddit tasting citation adds one unresolved publication check,
so the overall unresolved count stays 74. All dated quoted reviews are scored.
Raw review counts do not certify three professional critic meals or complete
source independence.

| Table | Pins | Reviews | Below minimum | Non-MICHELIN undated |
| --- | ---: | ---: | ---: | ---: |
| PinTaste | 228 | 496 | 0 | 44 |
| PinCarPerf | 128 | 350 | 33 | 16 |
| PinGasCarPerf | 160 | 502 | 12 | 14 |
| PinAircraftPerf | 165 | 563 | 13 | 8 |
| PinLlmPerf | 127 | 446 | 4 | 18 |
| PinVideoPerf | 32 | 111 | 2 | 5 |
| PinHotel | 41 | 123 | 0 | 0 |
| PinDining | 89 | 285 | 1 | 48 |
| PinCriticReview | 107 | 322 | 0 | 1 |

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
