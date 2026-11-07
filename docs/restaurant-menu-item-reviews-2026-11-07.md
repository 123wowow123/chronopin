# San Diego menu-item reviews — November 7, 2026

Implemented a shared review icon on restaurant landing menu rows and native pin menu rows.
The dialog separates sourced external reviews from reader stars/comments. Reader reviews are
scoped to a backing pin and the exact trimmed dish name; whole-restaurant aggregates exclude them.
Authentication and verified-email requirements match the existing pin review system.

## Research and saves

The reviewed batch is `scripts/restaurants/menuItemReviews.json`; each association retains the
opened article, outlet, exact title, short verbatim excerpt, publication date when established,
and evidence check date. It includes positive and critical observations. No numeric external
dish rating was inferred. Catalog replay performs revision checks, preserves full profiles,
and compares full readbacks, with before/after records in `.scrape/menu-item-reviews/`.

Saved and verified locally and on production: 25 review associations covering 23 menu entries on 11 restaurants, across
12 stored profiles (six ordinary profiles and six specials profiles, including a matching
ordinary/specials duplicate). These are an initial researched batch, not complete coverage of
San Diego's 280 specials venues. Missing external reviews are explicitly shown as not yet added;
reader review icons remain available for every item that has a backing pin.

Restaurants: Addison, Lucien, Soichi, Ciccia Osteria, LOLA 55, Sovereign, Fort Oak, Herb & Wood,
Coasterra, Saint James French Diner, and The Whaling Bar. Sources are linked in the catalog.
Coasterra's guacamole review is historical (2016), labelled with its publication date. No menu
prices, opening dates, dish photographs or menu verification dates were changed. The lindsayEats.
URL and visible date differ; its publication date remains null instead of inferring a full date.

## Specific gaps and limits

- LOLA 55: MICHELIN mentions churros, but the current stored menu has no matching item. No churro
  entry was invented. The fish taco has a critical firsthand review rather than a venue-wide score.
- Lionfish: search found diner comments about Bang Bang Shrimp, but the clean OpenTable branch
  page did not expose that review text on opening. No review or score was attached from a search
  snippet or a restaurant response. The published menu alone is not an independent review.
- Fort Oak: the opened Axios review supports wings, longaniza and shrimp cocktail. The author
  explicitly says the burger and bean dip are for a future visit; those were not treated as tasted.
- Soichi: a la carte tuna, toro and miso sea bass are supported. The general omakase description
  does not establish separate reviews for all three currently priced omakase options or bottle sizes.
- Remaining venues/items need further dish-specific research, including branch and variant checks.
  An unresearched item is not evidence that no review exists.

Some sources block direct Python requests. MICHELIN, Axios, Ranch & Coast and San Diego Magazine
were opened with web browsing; excerpts were verified against their readable article text.

## Validation and release

Targeted API, model, restaurant validation and menu tests passed (37 tests). TypeScript and
ESLint passed. Local browser verification covers the landing menu, native pin menu, external
links, no-review state, keyboard dismissal/focus restoration, and mobile layout.
Migration 0247 was applied to the local database only. Production content is saved, but the
review feature and its schema migration require the normal owner-requested production deployment.
Live local API create/read/update/delete checks passed, with original review state restored.
No production deployment or pin translations were performed.

The follow-up styling uses a small borderless star: muted outline for no reviews, filled accent
and total count for external and/or reader reviews. The tooltip distinguishes no reviews from
reviews still being checked. Reader counts are batched by restaurant rather than fetched once
per menu item, and the icon updates after the reader saves or removes a review.

Menu photos now share the review viewer: the star, thumbnail, and Food photos strip open the
same dialog, placing the credited image at the top, above the selected dish's reviews. Previous/next changes
the dish photo and reviews together; switching dishes remounts the reader form to prevent stale
ratings/comments from being carried over.


## Swipeable dish galleries

The popup now reuses the native pin `PinMediaFrame` with optional per-slide captions. Each
menu item supports its existing `image` cover plus an `images` gallery (maximum ten entries),
with deduplication. Photo gestures/dots/arrows change photos within that dish; separate dish
navigation still changes the selected dish and its reviews together. Each slide shows its own
caption, credit and source link. Keyboard arrows inside the photo carousel do not also switch dishes.

Por Favor El Cajon (148 E Main Street): visually verified two additional Carnitas Taco photos
by Jack M. on the exact branch's Yelp gallery, uploaded to Azure and verified public bytes, then
appended to specials profile 1130 locally and in production. Full profile readbacks matched;
existing cover, prices, review content and menu check date were preserved. The dish now has
three photos. New photos are labelled March 2015; the old promotional price in one source
caption was not copied to current menu prices. The reviewed metadata is kept in
`scripts/restaurants/menuItemPhotos.json`; snapshots/uploads are in `.scrape/menu-item-photo-gallery/`.

Rejected two other carnitas images whose own captions say the diner assembled tacos from a
carnitas plate. The operator gallery mixes historical La Mesa and El Cajon material and did not
establish another exact happy-hour carnitas taco photograph; no generic taco or other-branch
photo was substituted. The browser's image-3 selected state verified a drag through the gallery,
with the heading and reader-review section still on Carnitas Taco. Targeted tests passed (30),
TypeScript/ESLint passed. New content is saved on production; the carousel UI requires deployment.
Translations are left to the translation agent.


The menu star now shows the average reader rating on the 1–5 scale (e.g. `4.5/5`), not the
number of reviews. The batch API supplies both `average` and `count` for each dish; saving or
removing a review refreshes both. Counts remain in the accessible label/tooltip. External prose
without a published numeric rating is labelled “Unrated”, never converted into an invented score.
Empty landing tile stars remain hidden; the item text still opens the shared panel.

## Reader photos with review submission

The dish review form now includes Add photos, optional multi-file selection, previews and
removal before submission. Limit: five attachments per review, 15 MB per file. Existing
attachments can be removed while editing; saving updates the rating/comment and attachments
in one transaction. Reader photos display with their review using the pin swipe gallery and
remain separate from sourced photos. Deleting a review soft-deletes its attachments.

The review PUT supports multipart repeated `photos` files plus `stars`, `comment`, and
`removePhotoIds` JSON, while retaining JSON-only review saves. Migration 0248 adds
`PinPhoto.reviewId`. The existing photo service rotates/resizes/re-encodes images for Azure;
verified-email and daily upload limits apply. Unsupported files/oversize files are rejected,
attachment removal checks review ownership, and failed saves clean up new blobs.

Local migration applied. Tests cover multipart parsing, photo ownership/limits, rollback and
blob cleanup. A real local API round-trip uploaded two generated test images, verified readable
blobs and full review readbacks, updated attachments, and deleted the review with its photos.
The temporary rows and blobs were cleaned up. No production migration or deployment was run.
