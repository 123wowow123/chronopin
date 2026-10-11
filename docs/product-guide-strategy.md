# Snack and beverage product guides

Owner-confirmed strategy, October 11, 2026. Use this structure for curated
snack and beverage collections, including popular regional and international
products. Examples: [Chinese snacks](https://www.chronopin.com/pin/7656) and
[Chinese beverages](https://www.chronopin.com/pin/7657).

## Guide and thread

Create or retain one guide pin as the overview and thread index. Create a
separate child pin for every product, with `parentId` pointing to the guide.
Link every product pin directly from its product name in the guide’s table.
For a bundle covering different flavors, put each flavor’s link in that row.
Avoid repeating the same product-link list at the bottom. Give distinct flavors their own pins
when their taste profiles differ, as with White Rabbit milk and matcha candy.

Each child needs its own `productName`, product-specific source URL, verified
pack details, photo and credits, references, flavor/texture notes and native
taste radar. Check for existing product pins before creating duplicates;
reuse them where appropriate, preserving their content and attribution.
Use each product's actual source, rather than the same roundup URL for all
children. Distinct flavors sold in one bundle may use their separate product
pages and cite the bundle as a purchase reference.

Date individual products by their launch, including established products.
Research the exact flavor, product line and market introduction: prefer a
verified launch day; otherwise estimate from sourced launch years, months or
bounded historical evidence. Set `dateConfidence: "estimated"` and explain
the evidence, scope and uncertainty. Follow the existing timeline convention
for partial dates: the last day of the sourced month/year is a placement
boundary, not a claimed exact launch day. Cite the dating source in the pin's
references, with the corresponding `startDate` and sufficient confidence to
attribute the date to that evidence rather than an undated purchase listing.

Distinguish product-family launches, flavor launches, rebranding and regional
introductions. Never substitute company founding, recipe origin, certification,
review dates or current pack availability for the product's launch. If a family
launch is the best available estimate, state that the exact variant or retail
pack launch remains unresolved. If thorough research finds no defensible
estimate, use `dateConfidence: "unknown"`, record the sources checked and gap,
and explicitly label any retained research-date placeholder as not a launch.
Parent guides retain their curation/publication dates. This launch-first rule
supersedes the earlier research-date convention for individual product pins.

Use “favorites” or another accurate curation label when a current sales ranking
has not been verified. Record pack size, currency and the price-check date;
a bundle price must not appear as the price of one flavor or individual unit.

## Published ratings on product pins and threads

Try to find published ratings for every individual product/flavor pin. Check
the exact product's retailer customer reviews and relevant independent review
sources. Preserve the source, original score and maximum, review count,
source URL, scope and check date. Never invent a rating or reuse a mixed-flavor
bundle's aggregate for an individual flavor. Clearly identify small samples
and distinguish customer ratings from editorial or measured taste profiles.
If no usable published score can be verified, document the sources checked
and leave the rating absent; do not substitute the taste radar's estimates.

Save scores in native `PinRating` records, using the audited admin database API
for existing pins (or the `ratings` array when creating a pin). A score kept
only in `PinAd`, a prose table or `ProductBlurb` does not populate thread rows.
Update an existing pin/source rating instead of creating duplicates. Preserve
other sources. Keep review count, sample caveats and checked date in pin text
and research evidence because `PinRating` currently stores only source, score,
maximum and URL. Verify the individual pin and the parent thread API and
public page; invalidate the guide page through its normal save API if needed.

Threads already render `RatingSummary` for every pin, using the same compact
badge as TV shows: one source retains its own scale; multiple review sources
can produce the existing normalized average. No product-specific display
gate or deployment is needed when the native records are present.

## Native taste radar on every product pin

Generate each product's taste profile and save it through
`PUT /api/pins/:id/taste`. This populates `PinTaste` and displays the existing
native radar widget. A prose taste description or table alone is insufficient;
a collection-wide average is not a substitute for individual profiles.

Populate the native `reviews` array with verified tasting accounts so the
existing review section appears directly beneath the radar. Include a source
URL, reviewer/title, a short accurate excerpt and publication date when
verified. Customer star aggregates are separate from tasting reviews. Identify
ambassador or promotional posts and label reviews of another pack/formulation
as product-family evidence. Do not present retailer descriptions as independent
reviews or invent quotes/dates. If research finds no usable tasting review,
record that gap rather than silently treating the profile as fully sourced.
Verify the actual review links and excerpts on the public pin after saving.

Provide all seven axes: `aroma`, `bitterness`, `sweetness`, `astringency`,
`umami`, `pungent` and `coolness`. Scores range from 0 to 5 in half steps.
Set `source: "session"`, a sourced `basis` and `sourceUrl`. Read an existing
profile first and preserve any `source: "hand"` profile.

Research the exact flavor and market formulation. Prefer product-specific
firsthand tasting reviews and manufacturer descriptions; clearly identify
editorial estimates and lower-confidence product-family inference. Include
verified tasting reviews when available, without presenting retailer or
manufacturer copy as independent reviews. Include ABV only when published.

Describe saltiness, sourness and texture in the pin text because they are not
separate radar axes. Do not equate sourness with astringency or saltiness with
umami. Coolness means a mint-like sensory effect, not chilled serving temperature
or a traditional health claim. Perceived sweetness is not a sugar-content claim.

## Photos, ads and verification

Check official galleries and linked product-photo pages. Use an inspected
photo of the exact product/flavor, retain source and credits, store pin photos
and thumbnails in Azure Blob Storage, and keep temporary downloads ignored.
Verify the public blob before discarding a local copy.

When ads are requested, add verified eligible Amazon products to the standalone
catalog and attach the relevant listing to the corresponding product pin.
Apply the existing ad-quality checks; a useful guide product can remain a pin
without becoming an ad. Do not substitute unrelated search results or lower
the review threshold merely to fill the collection.

Before reporting completion, verify each child's parent ID, thread membership,
product details, public image, taste API response and the rendered native radar
on its public page. Verify the guide's product links and preserve existing media
and references during edits. Save source evidence and structured profiles in
the research notes; maintain the native taste snapshot in
`scripts/products/taste.json`. Runtime content and taste updates use the APIs
and do not require a deployment.

See [the implementation notes](chinese-products-2026-10-11.md) and
[structured taste evidence](chinese-product-taste-2026-10-11.json).
