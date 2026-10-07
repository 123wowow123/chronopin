# Restaurant scraping strategy

Use this workflow when adding restaurants or refreshing their details. The
current implementation uses curated JSON records; there is no automatic
restaurant crawler or scheduled refresh job yet. See
[restaurant-guides.md](restaurant-guides.md) for the current rendering and seed
behavior.

## Discovery and location matching

1. Find openings through local reporting, then locate the operator's official
   website. Use MICHELIN's individual restaurant listings for guide selections;
   preserve the exact recognition rather than assuming every listing has stars.
   Label Chronopin editorial selections separately when no external recognition
   has been verified. Check an opening roundup against current operator evidence;
   an already operating restaurant may be an outdated inclusion.
2. Identify the specific location by restaurant name, street address, city, and
   the operator's location page. A chain homepage, shared menu, or booking page
   for another branch is insufficient evidence for local contact details.
3. Keep the existing pin's `sourceUrl` stable. Details and menus match that URL
   using `restaurantSourceKey`, which preserves paths, query strings, and
   fragments. Different restaurants in one roundup need distinct anchors.
4. Check redirects. A former restaurant domain that now leads to unrelated
   content must not become its website link.

## Follow links before marking information missing

Start with the official location page, then follow its Contact, Visit, Hours,
Menu, and Reservations links. Read visible text and restaurant JSON-LD
(`telephone`, `address`, `openingHoursSpecification`, and menu links). Treat
structured data as evidence to compare with the visible page, not as an
automatic override: it can describe another branch or an expired schedule.

If the operator omits a phone number, hours, menu, or restaurant price range, follow its booking link
to OpenTable. Verify the listing's name, address, city, and linked official
website before using its Additional information or Menu sections. When there
is no operator booking link, search for a listing and apply the same matching
checks. Do not infer a listing URL from a restaurant's name.

For example, [Serpent & Stone's website](https://serpentandstonesd.com/) links
to its [OpenTable listing](https://www.opentable.com/r/a-serpent-and-stone-san-diego).
That listing supplied the missing phone number and corroborated the hours.
Record the booking URL as `reservationUrl` so the pin also gets its OpenTable
button in the shopping-button position.

Use booking sites to fill gaps. Keep verified operator information when a
secondary listing disagrees, record the discrepancy, and investigate before
replacing it. Reject placeholder numbers, unrelated footer contacts, marketing
contacts, and another location's details. OpenTable's AI-generated FAQs and
customer reviews are not evidence for phone numbers, schedules, or prices.

## Extract and record the facts

| Information | Repository destination | Recording rule |
| --- | --- | --- |
| Identity, opening, address, recognition, photos | `src/server/data/regionalRestaurants.json` | Preserve reporting URLs, date reasoning, photo credits, and branch identity. San Diego's established picks currently use `topRestaurants.json`. |
| Website, phone, hours, booking link | `src/server/data/restaurantDetails.json` | Match `pinSourceUrl`; store `checkedAt`, `detailsSourceUrl`, and field-specific `additionalSources` for fallback evidence. |
| Restaurant cost category (`$`–`$$$$`) | `src/server/data/restaurantPrices.json`, plus `priceRange` in the regional/top catalog | Record the pin source key, matched location, tier, evidence URL, evidence text, and price verification date. Leave the range empty when unverified. |
| Menus, items, prices, specials | `src/server/data/restaurantMenus.json` | Use the same `pinSourceUrl`, dated sources, and the actual location's menu. |
| Restaurant photos and rendered menu pages | `public/restaurant-images/{city}/`, with rendered menus under `menus/{restaurant}/` | Keep source URLs and credits; identify renderings, brand photos, and older documents. |

Remove marketing parameters such as `utm_*`, `fbclid`, and `shareReferrer`
from outgoing booking links while retaining parameters required to identify
the restaurant or complete a booking. Do not indiscriminately strip parameters
from pin identity URLs.

Keep dining hours separate from phone availability, happy hour, and kitchen
closing times. Preserve split services, closed days, ticketed seating times,
and overnight closures such as 5 PM–midnight or 11 AM–2 AM. Apply dated schedules
only during their validity period. All displayed hours are local to the venue.

For openings, distinguish an announced target from evidence the restaurant
actually opened. Month-only evidence stays estimated even if `openingConfirmed`
is true. A passed target does not become a confirmed opening automatically.
Established restaurant verification dates are not opening dates.

Match roundup photographs to the individual restaurant card or caption. A shared
article hero is not evidence that the pictured food or room belongs to every
listed venue. Label brand previews and renderings, and leave photos empty when
the restaurant cannot be identified reliably.
For every restaurant with no usable image in either its live pin or catalog,
checking the source page and linked opening report is a required collection and
refresh step. Inspect the restaurant's own section, inline figures and captions,
lazy-loaded `src`/`data-src`/`srcset` images, and restaurant-specific social embeds.
Valencia Bakery's section in the Columbus Navigator roundup, for example,
contains a pastry photograph credited via Facebook; collect that figure rather
than skipping the venue because its official website is missing.
Follow the public post or
embed to the actual photograph; ignore profile avatars, related-post thumbnails,
and loading placeholders. Honey Boy Pizzeria's opening report, for example,
embeds a pizza photo from its own Instagram account. Save a local image asset
so temporary social-media CDN links are not required to display it, retain the
stable post/page URL in `imageSourceUrl`, and credit the original photographer
or restaurant in `imageCredit`. Update the catalog and the existing pin's media
association while preserving its other media; rerunning the insert-only seed
does not add a missing picture to an existing pin.
Before finishing a restaurant batch, audit all records missing media, including
existing pins. Record which pages were checked and why each remaining gap could
not be filled. Do not treat a failed social embed or an absent operator photo as
the end of the search when the opening report has a usable image. After adding
media, invalidate the pin and timeline caches and verify the actual pin page,
landing-page card, and city guide display the saved image.

For menus, read linked HTML, PDFs, or images. Use browser rendering or OCR
when needed, then verify dish names, prices, and service labels against the
document. Do not invent prices or reuse another branch's specials. Mark selected
items as a sample, label older menus, and retain any offer validity dates.
Keep menus empty when no items or rendered pages are available; the menu pane
and link-only tabs are hidden. The separate visit pane labels missing details
as unverified.

## Write useful summaries without repetition

Read the full restaurant-specific source section before writing the pin, not
just its headline or opening date. Collect additional verified context such as
the owners, previous restaurants, concept, notable dishes, drinks, and premises.
Paraphrase that context into a concise `detailSummary` in the regional catalog,
with a citation to the reporting. Keep the short `description` as the card's
one-line introduction; the detail summary must add information rather than
repeat it. Valencia Bakery's source, for example, supplies the Muñoz family's
Cilantro Latin Fusion background and the bakery's food and drink selection.

Show each fact once in the appropriate place: dates in the opening/date controls,
address in the location display, hours and dollar tiers in "Plan your visit,"
menu items in the menu pane, and verification dates with their source records.
Do not append those facts again as boilerplate paragraphs. Keep geocoding methods
and other collection notes in internal catalog metadata rather than the public
narrative. Source-reported hours remain usable when an official website is
missing: put them in the visit record with a labeled reporting source, as with
Valencia's daily 7 AM–7 PM schedule.

Before completing a batch, compare the rendered introduction, narrative, menu,
and visit pane for duplicate information. Review existing generated summaries
as well as new records, preserve useful unique reporting and citations, and
update existing pins explicitly because the insert-only seed skips them.

## Collect restaurant price ranges

Collect the cost category when checking each restaurant, including openings.
Look for an explicit `$`, `$$`, `$$$`, or `$$$$` tier on the matched operator
page or MICHELIN restaurant listing. If missing, follow the operator's
reservation link to the verified OpenTable listing and inspect its published
pricing information in its restaurant overview, Additional information, and
location-specific structured data. OpenTable is an accepted fallback for price
ranges as well as phone numbers and hours. Reuse the verified booking page when
collecting those fields rather than fetching it separately for each fact.
Compare the restaurant name, address, and city before
accepting a tier; do not borrow a chain's or another branch's price range.
Retain the OpenTable URL as `priceRangeSourceUrl` and a labeled price-range
entry in `additionalSources` when it supplies the tier. Keep the published
numeric band in the verification notes when no supported dollar tier is available.
If those sources lack an explicit dollar tier, check a directly published
restaurant review such as The Infatuation's location page. Copy its explicit
tier, retain `priceRangeSourceUrl` in the catalog, and add a labeled price-range
source to the detail record's `additionalSources`. For example, the Veritas
Columbus review explicitly publishes `$$$$`.

Store only one through four dollar signs in `priceRange`. For OpenTable's US
restaurant overview bands, this application normalizes `$30 and under` to `$$`,
`$31 to $50` to `$$$`, and `$50 and over` to `$$$$`. This is our display
convention for its published bands, not an independently published dollar tier.
Retain the original numeric band and this normalization in the evidence.
Its lowest band does not distinguish `$` from `$$`; never use it to assign `$`.
Do not infer a tier from individual menu items, a tasting-menu price, reviews,
cuisine, or awards. Copy explicit tiers from other publishers without applying
OpenTable's thresholds to them. Check conflicts against the matched operator's
location-specific data and record the choice; leave unresolved conflicts empty.

Read the actual structured `priceRange` or active price indicator. Some review
pages render four dollar icons regardless of cost, with inactive gray icons;
counting every icon assigns an incorrect `$$$$`. For example, The Infatuation's
`data-price` and Restaurant JSON-LD distinguish the active tier. Do not copy
global chain schema without a matching branch address, or a historical tier
from a closed location into a reopening's future prices.

The server's `restaurantPriceRange()` helper resolves catalog and price-registry tiers by the
pin's stable source URL, and pin serialization exposes `restaurantPriceRange`
to landing-page cards and the detail page's "Plan your visit" Price range row.
Opening guide cards use the same helper; established guide cards use the catalog's
`priceRange`. Keep the registry, catalog, and detail source links synchronized.
Price checks have their own `checkedAt` and must not refresh contact or hours
verification dates. Audit missing tiers across all city guides and retain the
unverified list in `docs/restaurant-price-audit.md`. This cost category is separate from numeric menu prices
and the pin's product `price` field; never put dollar signs into those fields.
Catalog changes require deploying the application, without rewriting existing
pins through the insert-only seed command.

## Fetching and refresh behavior

Fetch HTML first with timeouts and modest concurrency, reusing each page for
all fields. Use a browser when the relevant content requires JavaScript or a
menu tab interaction. On errors or rate limiting, retry with backoff or use
another verified source. A blocked request is not evidence that a restaurant
has no menu or phone. Keep unresolved fields missing rather than fabricating
data.

Review menus after 30 days using the existing
`restaurantMenuRescrapeCandidates(today)` helper. As a future refresh policy,
review contact details, hours, and price tiers on the same cadence, and announced openings
more frequently near their target dates. There is currently no automatic
expiry or refresh mechanism for `restaurantDetails.json`. Preserve last verified
facts during temporary source failures, record conflicts, and update
`checkedAt` only after checking the record's facts. Replace hardcoded batch
check dates in any reused seed summaries with the new batch's verification date.

## Validate and publish the update

- Check source URL uniqueness and branch matching across catalog, menu, and
  detail records. Verify phone links, overnight hours, menu prices, image
  assets, and address-level coordinates. Leave coordinates absent when only a
  street or neighborhood can be matched.
- Run `npm run typecheck`, relevant ESLint checks, and the restaurant details,
  menus, guides, services, and map tests affected by the change.
- Inspect actual detail pages and guides on desktop and mobile. Check the visit
  pane, empty-menu behavior, booking button destination, menu tabs, filters,
  images, and map results. Verify the same dollar tier on guide cards,
  landing-page pin cards, and pin detail pages; unverified tiers stay hidden.
- Use `npm run restaurants:seed` for **new regional pins** in the intended
  database. It inserts missing source URLs and skips existing or deleted pins;
  it does not refresh existing pins' descriptions, photos, dates, or references.
  Review updates to existing pins separately. JSON contact/menu updates require
  deploying the matching application changes; asset updates require the files
  too. Local seeding does not update production.

## Backfill images on existing restaurant pins

Audit every live restaurant-tagged pin, not only the current city page. Follow
the original report to the operator and its branch-specific reservation listing.
Inspect CSS background images, embedded gallery metadata, `srcset`, and the
normal public browser page when the initial HTML has no photo. Match the venue
or named section before selecting an asset; roundup heroes and related-story
images often belong to a different restaurant.

Save reviewed assets locally and preserve the source page, original asset URL,
photographer credit, qualification label, and license in
`scripts/restaurants/mediaBackfill.json`. Explicitly label restaurant logos,
brand illustrations, chef portraits, renderings, earlier-location photographs,
and future premises. Never silently pass them off as a completed new location.
Keep unverified media missing and record the attempted sources for follow-up.
Recheck operator closure notices while reviewing images.

Run `npx tsx scripts/restaurants/backfillMedia.ts` against the intended database
to attach these images to existing pins. It preserves existing unrelated media,
uses source URLs to match pins, records dimensions and attribution, and is
idempotent. It does not perform the image sourcing or update production
automatically. The normal restaurant seed skips existing pins, so catalog edits
alone will not attach missing media to them. Invalidate the changed pin caches
and the timeline cache from the running Next app after database changes. Verify
actual image decoding on every city guide plus pin detail and landing cards.
The current audit and unresolved cases are in [restaurant-media-audit.md](restaurant-media-audit.md).

For announced venues with no published food or completed-room photo, inspect
the operator’s public opening posts. An identified opening-team portrait can
be used with an explicit label. A photo of the exact future premises can be
used only after matching the street address across the announcement and photo
source; name the previous tenant and photo year in the visible label. These
qualified previews remain candidates for replacement when venue photography
is available. Do not use another branch’s interior or the prior tenant’s menu
as if they belong to the new restaurant.

For long menus, preserve the publisher’s section headings. Text items use `category` for section tabs; rendered document pages can include `label` (for example, “Brunch & lunch” or “Drinks”). Put food sections before a cover or welcome page and retain the full original document link. The menu UI shows one section or document page at a time rather than stacking every page.
