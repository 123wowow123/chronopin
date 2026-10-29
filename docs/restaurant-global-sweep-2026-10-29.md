# Production restaurant guide sweep — October 29, 2026

Swept all 102 supported city guides, all four views and both Specials sections. Every API result page was fetched twice, before and after repairs. The final pass examined 2,372 cards across 510 sections, with zero request failures, duplicate cards, external restaurant-detail links or completely empty guides.

This is a structural and stored-content audit. It is not a fresh verification of every restaurant’s operating status, menu, opening history or every photograph’s subject. Outstanding evidence work is recorded explicitly rather than treated as complete.

## Saved and verified locally and in production

- Created six researched native Top restaurant pins: Ahi (20601), Boulcott Street Bistro (20602), Twenty Seven Steps (20603), Alcalde (20604), Pangea (20605) and Rosetta (20606). Their existing content, menus and credited Azure images were retained. Opening evidence was opened and recorded; approximate dates are marked estimated. Pangea uses its current Arboleda branch’s January 11, 2018 opening, not its earlier location’s founding.
- Linked Daniel’s Fort Lauderdale and Dauphine’s Washington DC Specials profiles to existing canonical pins 6964 and 6958. Verified the exact addresses against opened operator/MICHELIN pages and retained pin authors, opening dates, menus and conditions. Daniel’s narrower Tuesday–Thursday schedule remains because its own operator pages conflict on Monday.
- Restored the missing Specials-card photos for Shabu-Yo Shinjuku West Exit and Sapporo Soen from credited, branch-specific images already saved on their native pins. Downloaded and decoded the public Azure files, visually inspected them, and preserved the existing source/photographer credits. The Tabelog source could not be reopened with the web tool; the existing native-media provenance and public file were retained, rather than inventing a replacement credit.
- Verified the six new pins’ dates/confidence, opening references and saved photo links, plus all affected landing cards. Browser checks verified title and image links on the three restored New Zealand guides and followed Daniel’s Specials card to its canonical native pin.

The Auckland, Wellington, Christchurch, Guadalajara, Monterrey and Mexico City guides had no displayed cards before the six Top pins were added. Each now has its backed Top card.

## Code fixes prepared; not deployed

The shared Specials arranger truncated upcoming restaurants to 100 before pagination. Removed the truncation globally; all eligible restaurants retain their sort order, deduplication and 25-card pagination. San Diego is the only production guide currently exceeding the old cutoff. Production still needs an explicitly authorized deployment for this code correction.

The legacy special-pin seeder used `checkedAt` as a confirmed opening date. It now defaults to discovery and refuses to create missing pins without reviewed opening evidence, directing operators to `repairSpecialPins.ts` and the authenticated management APIs. Its previous fabricated-date write path was removed.

Seventy relevant tests, ESLint and TypeScript checks passed. No deployment, production VM build, restart or resize was performed.

## Outstanding findings

| Finding | Remaining | Required work |
| --- | ---: | --- |
| Enabled profiles without native pins | 988 | Research exact branch history/identity and create or link a sourced native pin. Of these, 977 have a schedulable promotion; 11 are not currently schedulable. |
| Restaurant timelines using research/promotion dates | 144 | Saved reasoning explicitly identifies the date as a check or campaign date. Research the branch opening; retain campaign dates separately. Four other check-date matches were verified as actual openings and excluded. |
| Displayed restaurants missing a card photo | 37 | Obtain a credited, relevant branch image and verify its public Azure copy. Uncredited native images cannot simply be reused. |
| External photo URLs awaiting Azure migration | 680 | All are reachable OpenTable URLs on currently hidden profiles. Preserve source/branch evidence and credits when uploading verified copies to Azure. |

All 2,993 stored image URLs in the initial inventory were reachable. Some OpenTable endpoints returned 404 to HEAD but returned valid images on GET, so HEAD failures were rechecked before classifying them. Every photo on a displayed production card was an available Azure image. The two restored card images also passed full public download/decode checks.

These queues are unresolved work, not a claim that all content defects have been repaired. Missing-pin evidence checks cover production profile/pin records and canonical source/name/address candidates; the queued operator URLs still require branch-opening research. The San Diego queue already includes the deeper source research from its separate repair run.

## Artifacts and repeatable audit

- `restaurant-global-sweep-2026-10-29.json`: per-city/per-view counts, verified repairs, all remaining profile IDs/source URLs, opening-date and photo queues, and browser/check results.
- `restaurant-global-sweep-top-repairs-2026-10-29.json`: reviewed six-pin creation/replay catalog, citations and existing public photo metadata.
- `scripts/restaurants/auditProductionGuides.ts`: read-only, paginated production sweep. Uses existing environment admin credentials; never writes restaurant content or prints tokens. `GUIDE_AUDIT_URL` and `GUIDE_AUDIT_OUTPUT` override the origin and ignored output directory.

```sh
npx tsx scripts/restaurants/auditProductionGuides.ts
```

Raw authenticated snapshots and working research are ignored under `.scrape/restaurant-global-sweep-2026-10-29/`. No image binaries or credentials were added to Git.
