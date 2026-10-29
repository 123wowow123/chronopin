---
type: Log
title: "Resort/data-center collision repair, 2026-10-28"
description: "Repair of fixed Pin IDs 15801-15803 that a resort seed overwrote on top of data-center pins."
tags: [scraping, news-job]
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-10-29T18:00:00Z }
---
# Resort/data-center collision repair — 2026-10-28

The legacy `scripts/hotels/seedBudgetFriendlyResorts.ts` and generated SQL used
fixed Pin IDs and `ON CONFLICT (id) DO UPDATE`. IDs 15801–15803 already belonged
to data-center projects. The seed overwrote their descriptive fields and map
locations, while retaining the projects' authors, companies, dates, references
and tags. This caused unrelated hotel text to enter company sentiment checks.

The data-center projects had already been recreated as intact pins 15824
(CloudBurst), 15825 (Cloverleaf Project Open Sky), and 15826 (CyrusOne Dugway).
Those pins were checked before and after this repair and left unchanged.
The existing resort URLs and IDs were retained, with their original authors
preserved, and the stale project relationships removed locally and in production.

| Resort pin | Corrected historical date | Evidence and precision |
| --- | --- | --- |
| 15801 Our Jungle House | Around 1985 | [ThailandAddict](https://www.thailandaddict.com/en/review-our-jungle-house-khao-sok-surat-thani) places its origins around 1985. Approximate year only; the [operator history](https://www.khaosokaccommodation.com/why-us) confirms the founder but supplies no year. Stronger archival opening evidence remains desirable. |
| 15802 The Birdhouse El Nido | September 2016 | [Illustrado, July 23, 2018](https://illustradolife.com/filipino-founded-startups-that-are-making-a-difference-hospitality/) explicitly identifies the opening month. The first day is a month placeholder. |
| 15803 Riad Yasmine | 2002 | The [operator's French history](https://www.riad-yasmine.com/fr/qui-sommes-nous/) says “ouverture en 2002”; November 2015 was a management takeover. January 1 is a year placeholder. |

The Birdhouse's [firsthand travel account](https://offbeatappetite.com/stories/experiential-stays-the-el-nido-island-experience)
was updated January 6, 2024 to report permanent closure. The historical pin now
states that; an exact closure day or subsequent reopening was not verified.
Its former operator domain returned 403 in this research.

## Saved changes

- Removed the three incorrect company associations and stale PinSentiment rows;
  verified that the resorts no longer appear in the company sentiment queue.
- Replaced project dates, reasoning, references and categories with hotel-specific
  evidence. All three dates are estimated at their documented precision.
- Removed unsupported USD nightly prices, unverified seeded hotel scores, award
  claims and purported guest review quotations. These must be researched anew
  from opened, property-specific sources before being restored.
- Cleared obsolete translations containing the project date reasoning. English
  is the fallback until fresh translations are supplied.
- Replaced generic stock photos with inspected property photos uploaded to Azure;
  original download URLs, source pages, credits, captions and SHA-256 checks are
  recorded in `scripts/hotels/resortCollisionRepair.json`.
- Rejected stale resort/data-center duplicate suggestions, removed product-line
  misclassification and resolved the collision review marks after readback.
- Updated the affected seed snapshots and retired both unsafe seed entry points.
  The TypeScript command exits with status 1 before loading a database client.
  The SQL contains no data writes, even if a caller continues after its error.

## Validation

Authenticated API readback in both environments verified null company links,
original authors, corrected dates, hotel-only references and Travel categories,
Azure image URLs, no stale company scores, no legacy hotel rubric, and no stale
translations. Data-center pins 15824–15826 retained their complete before/after
content, sources, tags and media. The repaired native Riad Yasmine page was
also checked in Chrome.

The production hotel DELETE endpoint intermittently returned 502 after the
underlying deletion; final state was checked and bounded authenticated table
APIs completed cleanup. No production build, restart or deployment was run.

Audit snapshots and detailed readbacks are in the ignored
`.tmp/resort-collision-repair/` directory. This is a content repair, not a
full database restore. Hotel coordinates were preserved from the existing
hotel records; exact surveyed property positions were not newly established.
