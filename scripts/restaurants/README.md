# Restaurant guides

City routes, navigation, nearest-city selection and sitemap entries share
`src/lib/restaurants.ts`. Catalog entries live in
`src/server/data/regionalRestaurants.json`; their public thumbnails live in
Azure Blob Storage. Pin image files must not be committed to Git.

Keep country and city navigation menus in west-to-east order. Cities follow
city-center longitude; countries follow their westernmost supported guide city.
Preserve this ordering when adding guides; do not sort the menus alphabetically.

Every city landing page supports the four San Diego sections: Coming soon,
Just opened, Top restaurants, and Specials. Keep Specials visible when active or
upcoming offers exist, including outside service hours and without review scores.
Upcoming cards show the next local start time; expired offers are excluded.
Hide tabs with no eligible content and fall back to a populated view
for links to empty tabs. Research every section thoroughly using operator
announcements, local reporting and branch-specific promotions before accepting
incomplete coverage. Add verified records where possible; never invent dates,
discounts, ratings or dishes to fill a tab. Document sources checked and remaining
coverage gaps. This applies to Japan and all future regional guides.

The European collection covers London, Paris, Amsterdam, Berlin, Madrid,
Barcelona, Lisbon, Rome, Copenhagen and Vienna, with three established editorial
picks per city and sourced opening announcements. Every entry includes its
venue/report URL, image provenance, verification date and neighborhood.
Additional guides cover Dublin and Stockholm, each with an announced October
2026 opening and two established editorial picks. Onóra's opening is a month
estimate; Bouillon's announced date is October 23. Preview images are labeled,
including Söderhallarna's food hall rather than Bouillon's own dining room.
An estimated month-end date is a sorting placeholder, never an exact opening
claim. Established picks use the verification date, not an invented opening date.
Opening photos from a sibling venue, illustrations and renderings are labeled.
Unverified map coordinates are left empty rather than using the city center.

The guide resolves cards to database pins by source URL. Upload and verify the matching
Azure blobs before seeding a production database. To seed just these cities:

```sh
npm run restaurants:seed -- --regions=london,paris,amsterdam,berlin,madrid,barcelona,lisbon,rome,copenhagen,vienna
```

To add the Dublin and Stockholm batches:

```sh
npm run restaurants:seed -- --regions=dublin,stockholm
```

The seed is idempotent and preserves existing pins. It uses FoodDesk by default;
pass `--user-id=<existing curator id>` to choose another owner. With no
`--regions`, it processes the full regional catalog.

The Canadian collection contains three established restaurant picks per city
across Victoria, Vancouver, Calgary, Edmonton, Saskatoon, Winnipeg, Hamilton,
Toronto, Ottawa, Montréal, Québec City and Halifax. Menu links and contact
details were checked October 8, 2026. See [Canadian guide coverage](../../docs/restaurant-canada-guides.md).
After uploading the images to Azure and deploying the matching catalog, populate production with:

```sh
npm run restaurants:seed -- --regions=victoria,vancouver,calgary,edmonton,saskatoon,winnipeg,hamilton,toronto,ottawa,montreal,quebec-city,halifax
```

After pulling production pins into a local database, restore any missing
restaurant thumbnails to Azurite with `npm run thumbs:pull -- --restaurants`.
This copies original and small thumbnails, skips public image paths and full
URLs, and preserves images already stored locally.

To migrate temporary restaurant images to Azure, run
`npx tsx scripts/restaurants/uploadPinPhotos.ts --update-prod`. It verifies public
blob downloads against SHA-256, updates catalog and production media references,
expires affected pin caches, checks public pins, and removes the local image files.
The production migration uses the existing Azure CLI login and `.scrape/admin.token`.
Temporary files under `public/restaurant-images/` are ignored by Git.

The Australian collection covers Perth (Wildflower), Adelaide (Press* Food & Wine,
Africola), Melbourne (Attica, Flower Drum), Sydney (Bennelong, Saint Peter) and
Brisbane (OTTO, Montrachet, Bistro Suzette), checked October 9, 2026 against each
operator's own site. Quay, Gerard's Bistro and Orana are closed and were excluded.
Africola has no photo (its site publishes none). Bennelong, OTTO, Montrachet and
Press* have approximate map points because no street number resolves. Seed with:

```sh
npm run restaurants:seed -- --regions=perth,adelaide,melbourne,sydney,brisbane
```

Every restaurant entry must list its menu items on the pin detail, not just link to
the menu. Read the published menu (page or PDF) and transcribe the dishes with their
prices into `src/server/data/restaurantMenus.json` (`coverage: "published"`), with
hours and phone in `restaurantDetails.json`. Leave `coverage: "link"` only when the
menu is genuinely unpublished, and say so in the note. Never invent a dish or price.

Apply this to specials cards as well as pin details. Search deeply before leaving
an item list empty: follow the branch's operator menu and happy-hour pages, PDF
links, menu images and online ordering menus, then check credible branch-specific
sources. If verified item names are available without prices, transcribe the
items with `priceLabel: "Price not published"`. Preserve currency, service charges,
offer conditions and source URLs. Do not substitute another branch's menu or
assume a regular-menu dish is part of happy hour. When no items can be verified,
record the sources checked and the specific gap in the menu note; an unvisited
published-menu link is not sufficient research.

The Japanese collection covers Tokyo, Kyoto and Osaka with one established
pick per city, six opening/reopening records and three researched specials,
checked October 9, 2026. Hide tabs without eligible content, but research each
section thoroughly and record unresolved gaps. Menus display Japanese yen, and
all three guides use `Asia/Tokyo`. See
[Japan guide coverage](../../docs/restaurant-japan-guides.md). Seed with:

```sh
npm run restaurants:seed -- --regions=tokyo,kyoto,osaka
```

The New Zealand and Mexico collections cover Christchurch, Auckland, Wellington,
Guadalajara, Monterrey and Mexico City, with six established selections and six
verified specials venues. Prices display NZD and MXN. They share the four-section
landing page, hide empty tabs, and preserve the west-to-east navigation order.
See [coverage, menu research and remaining gaps](../../docs/restaurant-new-zealand-mexico-guides.md).

```sh
npm run restaurants:seed -- --regions=guadalajara,monterrey,mexico-city,christchurch,auckland,wellington
```
