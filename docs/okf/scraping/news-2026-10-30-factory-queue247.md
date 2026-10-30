---
type: Log
title: "Original factory priced queue — October 30, 2026 batch closeout"
description: "Repaired 179 of the original 247 candidates in both environments, added 111 sourced profiles, and added Withdrawn as a stored site tag. 68 candidates remain unresolved."
tags: [scraping, factory-profiles, construction, withdrawn]
generated: { by: process:factory-profile-research, at: 2026-10-30T18:00:00Z }
---

# Original 247-candidate queue batch closeout

The exact original queue was frozen before writes. **179 distinct original entries were repaired in production and locally.** The raw priced gap scan fell from **247 to 68 in both environments**. This is a batch closeout, not a claim that every original candidate now has a verified project profile.

- **111 new sourced buildout profiles**, all with at least three distinct metric categories and a project timeline. These include five withdrawn interconnection requests with sourced disposition timelines. The replay catalog contains **977 profiles**.
- **67 unsupported component entries corrected**: unverified exact budgets, power allocations, floor areas and opening-day claims removed from public prose and structured cost/power fields. These entries remain without profiles because their independent building/phase identities and metrics were not verified. Their retained legacy timeline positions are explicitly unverified; no new opening dates were invented.
- **One held project corrected**: Jay’s Androscoggin mill data-center proposal, following Sentinel’s withdrawal. The event is dated to the reported June 11, 2026 hold update, with future plans undetermined.
- **68 original candidates remain unresolved**, individually recorded with the missing evidence or scope problem in the review ledger. They include repeated milestones, corporate transactions, multi-site programmes, identity collisions and real projects requiring further source work. No unrelated construction pins were substituted into this batch.

## Withdrawn is a site tag

Owner instruction on October 30: `Withdrawn` is a stored site tag alongside `Proposed`, `In Progress` and `Completed`. The shared reserved-site-tag registry, search/cloud exclusions, all 16 UI locale labels, extraction guidance and construction research skill were updated. Existing topic-row storage requires no migration. Normal pin edits preserve the tag.

Verified withdrawn MISO requests **17101 (J2519), 17132 (J2379), 17162 (J2966), 17301 (J2472), and 17357 (J3049)** carry `Withdrawn` in production and locally. Each has a visible sourced project-timeline milestone: “Withdrawal recorded in MISO queue (date checked; withdrawal day unpublished)”, dated October 30, 2026. The source publishes no actual withdrawal day, so the timeline explicitly dates the observation. Profiles use the existing `offline` disposition supported by the live API; no construction progress is inferred. Withdrawal of one request does not imply every project at that site was cancelled.

The live content changes and tag rows are saved. The revised site-wide tag placement and localized site-filter label are code changes awaiting a separately requested production deployment. **No deployment, build, restart or resize was performed.**

## Research and factual repairs

Fresh MISO, ERCOT, SPP, NYISO, CAISO and EIA September 2026 primary records were opened and matched by identifier, geography, technology and component capacity. Separate generator rows retain separate quotations. Proposed commercial-operation dates remain forecasts, and processing labels such as `Done` are not treated as evidence of operation. CAISO request 2146 retains separate Water Rock solar/storage components and a shared 500 MW export ceiling; the native two-decimal power field stores 516.76 MW while the profile retains the source’s 516.7638 MW precision.

Owner and regulator evidence corrected campus-level scope, component allocations and developers. Examples include Naugatuck Avenue (Jupiter Power’s selected 200 MW proposal), Cedar Island (Sherman County, Oregon), McGrau Ford’s two 265 MW operating generators, Muskie’s phased campus and pending utility agreement, and QTS York’s nine-building US$8 billion campus. All-null capability axes state specific benchmark or evidence gaps.

Original authors, media and parent links were preserved. Existing reference URLs were retained; new primary evidence was attached through native whole-pin round trips. Shared queue/workbook URLs are references; the primary source field is left null where the native per-author source uniqueness rule prevents using the same dataset URL for many distinct requests. Unsupported original URL claims are not adopted as profile evidence.

## Verification and replay artifacts

Changed English fields were synchronized across **all 15 non-English locales**: **2,685 current, complete translation rows per environment**. Source hashes and whole-translation shapes are checked against final native pin reads; tracking attribution remains in SourceWiki only. Exact native readback verification covers each final profile, milestone, patch, cost/power correction, tag, author, media and parent link in both environments.

- `scripts/factories/capability.json`: 111 added profiles and timelines.
- `scripts/factories/resolutions-2026-10-30-queue247-*.json`: researched repair/replay records for the six sub-batches; the withdrawn sub-batch supplements five earlier energy repairs.
- `scripts/factories/queue247-review-2026-10-30.json`: all 247 original candidates with final outcome or a specific remaining evidence/scope gap.
- Gitignored `.tmp/factory-queue247-2026-10-30/`: original bilateral snapshots, opened source artifacts, exact evidence checks, native write/readback results, translation verification and before/after gap scans.

Focused verification: **71 tests passed** across tag behavior, timeline rendering, profile schema, profile evidence and OKF lint. `npx tsc --noEmit` passed. All final native readbacks and translation checks passed before closeout. Public server-rendered pages for all five withdrawn requests in both environments (10 pages) returned HTTP 200 and displayed Withdrawn, the project timeline and the unpublished-date explanation.
