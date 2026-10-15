# Japan restaurant image follow-up — October 14, 2026

Uploaded **22 verified images for 10 production pins** to Azure, attached galleries through the authenticated Medium/PinMedium APIs, and updated the corresponding ordinary guide tiles through the revision-checked restaurant-content API. Existing authors, menus and opening dates were preserved. Public pin and guide API responses verified every saved URL and image credit. No application deployment or VM operation was needed.

Images include venue photographs, official design renderings, a branch-specific opening flyer/menu artwork, and documented construction-site photographs. Captions state those distinctions. Unlabelled dishes have no inferred names or availability. All downloaded images were visually reviewed, converted to WebP, uploaded and publicly downloaded/decoded with matching SHA-256 hashes before live references were saved.

| Pin | Restaurant | Images |
| --- | --- | ---: |
| 15415 | SMAAK Hakata Opens in Hakata Station | 3 |
| 15424 | NODE TABLE — Richmond Hotel Fukuoka Tenjin Opens in Tenjin | 1 |
| 15440 | Sushi Koki — Osaka restaurant guide | 4 |
| 15466 | Ramen Ignoranc Opens in Enmachi | 4 |
| 15480 | Nigushi & Wine Roji Iru Opens in Teramachi / Gokomachi | 1 |
| 15539 | Shabu-Yo — Shinjuku West Exit Opens in Shinjuku | 1 |
| 15580 | Shabu-Yo — Sapporo Soen Opens in Soen | 3 |
| 15568 | Olive no Oka — Sapporo Shinkotoni Opens in Shinkotoni | 1 |
| 15569 | Yogurt World — COCONO SUSUKINO Opens in Susukino | 3 |
| 15571 | Hama Sushi — Sapporo Hiraoka Opens in Hiraoka | 1 |

## Importer prevention

`scripts/restaurants/importGuide.ts` now includes saved ordinary tile and specials-profile photos even when input galleries are empty. It uses preserved API records as the authority, rejects wrong-branch or uncredited images, ignores disabled profiles, deduplicates URLs, and checks Azure downloads/decoding before writing. Explicit photo hashes and dimensions are checked when supplied; saved profile fallbacks have those values measured from their public files. The ignored one-off `publish-supplement.ts` also uses this recovery helper. No production application build is required to run this maintenance importer.

Five regression tests, targeted ESLint and TypeScript passed. A production dry run with empty galleries for MYPLACE and Essex recovered one credited saved photo each and preserved existing content.

## Remaining publication gaps

The remaining 11 pins are forthcoming venues. Further branch-specific research did not establish usable photographs of those venues. They remain eligible pins with explicit photo gaps; no image from another restaurant or branch was substituted.

- **15410 — Shabu-Yo — Aeon Mall Fukuoka Ito:** Upcoming October 31 branch. Operator locator has no branch photos; Tabelog lists no gallery; image search returns other Fukuoka and Fukutsu branches. Mall sources checked, no verified branch-specific image.
- **15425 — BistroARC — Kego:** Upcoming December branch. Employer announcements and parent operator site checked; no actual new-branch room or food photo. Recruitment imagery is generic; logo proposals are not adopted brand assets.
- **15426 — Daimyo Bistro — Atelier Daimyo:** Upcoming December branch. Employer listing explicitly labels recruitment imagery illustrative. No actual Atelier Daimyo restaurant/gallery or verified branch-specific image found.
- **15447 — Yakitori to Soba Hiyori — provisional name:** Upcoming October branch. Operator gallery contains coming-soon placeholders. Hot Pepper imagery and descriptions retain the previous Ryo brand; no current Hiyori room photograph verified.
- **15448 — Robata to Kamameshi Sōshi — provisional name:** Upcoming October branch. Operator publishes a branch logo and coming-soon gallery placeholders. Branch directory has no customer photographs. No actual room or menu photograph found.
- **15449 — Sumiyaki to Kamameshi Satō — provisional name:** Upcoming October branch. Operator publishes branch branding and coming-soon placeholders. No verifiable actual room/food gallery or completed-venue photo found.
- **15510 — Sanrio House Cafe — Nagoya PARCO:** Upcoming October 29 cafe. Both official September 16 and 24 releases, operator brand page and Fashion Press gallery checked. Images show character artwork, merchandise and cosmetics rather than the cafe, food or planned room. No cafe photo/rendering found.
- **15556 — Gong cha — Tokyo Solamachi:** Upcoming October 29 branch. Landlord branch page and opening release checked. Release uses generic Gong cha drinks/logo imagery; no branch storefront or room image verified.
- **15557 — Eggs ’n Things — Tokyo Solamachi:** Upcoming winter branch. Landlord opening release and Eggs n Things official news checked. Generic food promotional images are not a photo of the planned branch. No branch-specific room/rendering found.
- **15570 — Frenchman — COCONO SUSUKINO:** Upcoming December branch. Sapporo List uses a generic stock wine image. Employer opening/recruitment and local reporting checked; no current COCONO branch room image verified. Unrelated Sars property-management website excluded.
- **15597 — Hakodate Shunka — Sapporo:** Upcoming November branch. Official landlord recruitment announcement and Real Economy report checked; their room/building images show the original Hakodate branch. Sapporo site photo remains unpublished; generic sushi and AI-style article images excluded.

The [companion evidence file](restaurant-photo-fill-2026-10-14.json) retains public blob URLs, source image/page URLs, credits, captions, hashes, dimensions, public API verification and checked-source HTTP statuses. Raw pages, contact sheets, original downloads and write journals remain in ignored `.scrape/restaurant-photo-fill-2026-10-14/`.

Browser access was not retried during this API publication: prior browser checks were denied despite the displayed allow setting. Verification here is public API and image-file verification, not a claim of a new browser screenshot.

## Food and alternative-image follow-up

The owner subsequently authorized official food imagery and other best replacements. [The follow-up](restaurant-food-replacements-2026-10-14.md) filled all 11 remaining empty-image pins and replaced two construction lead images with food previews. Six pins use illustrative employer imagery or official branding/opening artwork; their actual venue/food-photo gaps remain documented.
