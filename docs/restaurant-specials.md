# Restaurant specials

## Current coverage — October 8, 2026

New York and Los Angeles each have 50 qualifying restaurants; San Diego has 51, including a backup for an expiring promotion. The next-specials view supports up to 50 distinct venues. See the [expansion audit](restaurant-specials-expansion.md) for the 128 additions, published schedules, rating snapshots, and limitations.

## October 7, 2026 research

Added 42 established venues with 44 specials across all 19 US city guides.
San Diego now has 21 qualifying restaurants, so its unfiltered next-specials
view shows the earliest 20 distinct choices after service, including weekends. Neighborhood
filters can narrow that list. San Antonio has the verified Ladino offer; each other US city has at least one qualifying venue. Most cities currently have one; Austin, San Antonio, and Houston have two. The view originally supported up to 20 distinct restaurants per city. The tab is hidden when no active or qualifying future offer exists.
Published menu prices are selected samples, and ratings are snapshots from
OpenTable. The next-specials fallback requires 4.5/5 and at least 100 reviews.
Venues are maintained in the `RestaurantSpecialVenue` database table through the
[specials management API](okf/api/restaurant-specials.md). The JSON catalogs are
initial import fixtures; runtime specials come from the database. Venues do
not depend on a newly seeded opening pin. Ladino retains its existing MICHELIN
source key so an existing guide pin receives the enriched offers without a
duplicate venue.

| Venue | Published specials | Rating evidence |
| --- | --- | --- |
| Fort Oak, San Diego | [Happy hour](https://www.fortoaksd.com/happy-hour), Wednesday–Sunday 4–6 pm; [Oyster Monday](https://www.fortoaksd.com/oyster-monday), Monday 4–6 pm. Both are walk-ins, bar and patio only. | [OpenTable](https://www.opentable.com/r/fort-oak-san-diego): 4.8/5, 701 reviews. The score and count also appear in [OpenTable’s Hillcrest listings](https://www.opentable.com/san-diego/hillcrest-restaurants?lang=en). |
| C Level, San Diego | [Operator website](https://www.clevelsd.com/): weekday happy hour 3:30–5:30 pm, $11 appetizers and cocktails. Holiday service hours require calling the restaurant. | [OpenTable](https://www.opentable.com/r/c-level-san-diego): 4.6/5, 6,805 reviews. |
| Ladino, San Antonio | [Operator happy-hour menu](https://ladinosatx.com/menus/happy-hour-menu): weekdays 5–6:30 pm, upstairs bar; small plates and discounts on house cocktails, wine by the glass, and beer. | [OpenTable](https://www.opentable.com/r/ladino-san-antonio?ot_marketing=true): 4.8/5, 1,684 reviews. |
| Herb & Wood, San Diego | [Operator happy-hour menu](https://www.herbandwood.com/happy-hour): daily 5–6 pm; $20 Happy Meal, $8 burger, $6 roasted oysters, and half-off bottles of bubbles. Bar/counter only, walk-ins. | [OpenTable](https://www.opentable.com/herb-and-wood): 4.7/5, 7,465 reviews; branch address and rating verified in restaurant JSON-LD. |
| Tom Ham’s Lighthouse, San Diego | [Operator happy-hour menu](https://tomhamslighthouse.com/happy-hour-menu/): weekdays 3–6 pm; $1.50 oysters, selected beer at $3/$5, and discounts on food and drinks. Bar, first come, first served. | [OpenTable](https://www.opentable.com/restaurant/profile/7583?lang=en-US): 4.6/5, 7,134 reviews; verified in restaurant JSON-LD. |
| The Prado at Balboa Park, San Diego | [Operator menu](https://www.pradobalboa.com/menu/): Tuesday–Friday 4–6 pm; Wednesday extends until closing (8 pm in the published hours). Selected bites $6–$8, wines $7. Closed Mondays. | [OpenTable](https://www.opentable.com/restaurant/profile/3846/reserve?rid=3846): 4.6/5, 8,473 reviews; branch address and rating verified in restaurant JSON-LD. |
| Coasterra, San Diego | [Operator menu](https://www.coasterra.com/menu/): weekdays 3:30–5:30 pm, with a named happy-hour food and drink menu. Its online menu and linked print view omit prices; the card explicitly says to ask the restaurant. | [OpenTable](https://www.opentable.com/r/coasterra-san-diego-3?page=1): 4.6/5, 8,744 reviews. |

Fort Oak's operator site states Tuesday is closed and distinguishes Monday's
oyster special from Wednesday–Sunday happy hour. OpenTable's hours show an
inconsistent Monday/Tuesday happy hour; the operator's schedule takes precedence.
Ladino's rendered official menu was read directly when the browsing fetch failed.
C Level's linked dynamic menu did not return usable item data, so the card shows
the operator's published appetizer and cocktail price without inventing dishes.
The new Tom Ham's record includes its published 5% surcharge and party service
charge. Prado and Coasterra include their published, removable 5% supplemental
fee. No prices were inferred for Coasterra. Only selected verified items are
transcribed for the other additions.

Existing venues received separate rating snapshots without changing their menu
verification dates: [Maranello](https://www.opentable.com/r/maranello-san-diego?lang=es)
at 4.4/5 from 46 reviews, and
[Telefèric La Jolla](https://www.opentable.com/r/teleferic-barcelona-san-diego)
at 4.3/5 from 228 reviews. They remain visible during active service but do not
qualify for the fallback. The Telefèric booking description lists 3–5 pm while
the operator's [Social Hour page](https://www.telefericbarcelona.com/the-social-hour)
explicitly lists La Jolla at 3–6 pm Monday–Thursday. A direct HTML fetch confirmed
that branch schedule, which takes precedence over the booking description.

Ironside was researched but not added: the currently accessible operator page
does not provide a usable happy-hour menu, and the $1 oyster claim on OpenTable
is in generated FAQ text. This is insufficient to transcribe a newly verified
operator menu price.

## Specials card photos

Each researched specials venue has an optimized WebP photo hosted in Azure Blob Storage from its official website or OpenTable listing, checked October 7, 2026. Cards show the venue’s dining room, patio, exterior, or dining table, with a visible credit. Photo provenance is stored alongside the menu profile.

| Venue | Photo source | Description |
| --- | --- | --- |
| Fort Oak | [Official site](https://www.fortoaksd.com/) · [Original photo](https://images.squarespace-cdn.com/content/v1/61411d106130f534bb526640/4315c1a7-6e9d-4674-ab04-46d1986b8393/best_SDM+-+Fort+Oak+Chef+Counter+%2888%29-Enhanced+copy.jpg) | Dining room and patio at Fort Oak |
| C Level | [Official site](https://www.clevelsd.com/) · [Original photo](https://www.clevelsd.com/wp-content/uploads/2025/01/Main-Slider-1800-1.jpg) | Waterfront dining patio at C Level |
| Ladino | [Official site](https://ladinosatx.com/) · [Original photo](https://static.spacecrafted.com/cd6a5a83acb44dc7987545632987dd96/i/a369343a427b4d60a559108b6ad44591/1/4SoifmQp7LJ6yDtMuFY2x/Ladino%20DR-1.jpg) | Set dining table inside Ladino in San Antonio |
| Herb & Wood | [Official site](https://www.herbandwood.com/) · [Original photo](https://images.squarespace-cdn.com/content/v1/5e82c1733ddff337f1d4f916/1620036153281-CDYUSCI60NZK6LHJV1F6/Print_06+-1.jpg) | Bar and dining room at Herb & Wood |
| Tom Ham’s Lighthouse | [Official site](https://tomhamslighthouse.com/) · [Original photo](https://tomhamslighthouse.com/wp-content/uploads/2026/02/thl-entry-patio-photo.jpg) | Waterfront exterior of Tom Ham’s Lighthouse |
| The Prado at Balboa Park | [Official site](https://www.pradobalboa.com/) · [Original photo](https://www.pradobalboa.com/wp-content/uploads/2023/06/About-Us-square-1.jpg) | Courtyard at The Prado in Balboa Park |
| Coasterra | [Official site](https://www.coasterra.com/) · [Original photo](https://coasterra.wpengine.com/wp-content/uploads/2023/05/Main-Slider-Desktop-min.jpg) | Coasterra’s waterfront restaurant at sunset |
| maranello | [Official site](https://www.maranellosd.com/) · [Original photo](https://irp.cdn-website.com/d296cdb0/dms3rep/multi/opt/IMG_1875-1920w.JPG) | Dining room at Maranello |
| teleferic | [Official site](https://www.telefericbarcelona.com/lajolla) · [Original photo](https://static.wixstatic.com/media/21afb5_14f78c0a2be64d709feddc0fdfa497f6~mv2.webp) | Dining room at Telefèric Barcelona La Jolla |

## Coverage added for the remaining US cities

All sources and photos below were checked October 7, 2026. Times are local to the restaurant. The menu records include selected verified items, conditions, and photo provenance; they are not full-menu transcriptions.

| City and venue | Published schedule and source | Rating snapshot | Restaurant photo |
| --- | --- | --- | --- |
| san-francisco: Prospect | [Bar & lounge happy hour](https://www.prospectsf.com/menus/): Mon, Tue, Wed, Thu, Fri 16:00–18:00 | [OpenTable](https://www.opentable.com/prospect): 4.8/5, 2,702 reviews | [Photo via OpenTable](https://www.opentable.com/prospect): Prospect’s dining room and bar seen through its front windows |
| seattle: Revel | [Fremont Hour](https://www.relayrestaurantgroup.com/restaurants/revel/): Tue, Wed, Thu 17:00–18:00 | [OpenTable](https://www.opentable.com/r/revel-seattle): 4.7/5, 606 reviews | [Photo via Revel](https://www.relayrestaurantgroup.com/restaurants/revel/): Dining tables beneath artwork at Revel |
| san-jose: The Pressroom | [Daily happy hour](https://pressroomsj.com/happyhour): Sun, Mon, Tue, Wed, Thu, Fri, Sat 15:00–17:00 | [OpenTable](https://www.opentable.com/r/pressroom-san-jose): 4.5/5, 425 reviews | [Photo via The Pressroom](https://pressroomsj.com/): Exterior of The Pressroom in downtown San Jose |
| los-angeles: Bacari Silverlake | [Weekday happy hour](https://www.opentable.com/r/bacari-silver-lake-los-angeles): Mon, Tue, Wed, Thu, Fri 17:00–18:00 | [OpenTable](https://www.opentable.com/restaurant/profile/1180669/reserve?rid=1180669): 4.7/5, 5,070 reviews | [Photo via OpenTable](https://www.opentable.com/restaurant/profile/1180669/reserve?rid=1180669): Tree-lined dining patio at Bacari Silverlake |
| phoenix: The Gladly | [Happy-hour food](https://www.thegladly.com/s/032726-GLAD-Happy-Hour-Card-WEB.pdf): Mon, Tue, Wed, Thu, Fri 15:00–18:00; Sat 16:00–18:00; [Happy-hour drinks](https://www.thegladly.com/s/032726-GLAD-Happy-Hour-Card-WEB.pdf): Mon, Tue, Wed, Thu, Fri 11:00–18:00; Sat 16:00–18:00 | [OpenTable](https://www.opentable.com/restaurant/profile/111574): 4.9/5, 2,914 reviews | [Photo via The Gladly](https://www.thegladly.com/): Dining room at The Gladly |
| austin: Uchiko Austin | [Daily happy hour](https://uchiko.uchirestaurants.com/location/sushi-austin/menu/): Sun, Mon, Tue, Wed, Thu, Fri, Sat 16:00–18:00 | [OpenTable](https://www.opentable.com/restaurant/profile/46240/reserve?rid=46240): 4.9/5, 6,021 reviews | [Photo via Uchiko Austin](https://uchiko.uchirestaurants.com/location/sushi-austin/): Bar at Uchiko Austin |
| fort-worth: Toro Toro Fort Worth | [Lobby & bar happy hour](https://www.torotorofortworth.com/happy-hour): Mon, Tue, Wed, Thu 16:00–19:00 | [OpenTable](https://www.opentable.com/r/toro-toro-fort-worth): 4.7/5, 1,359 reviews | [Photo via Toro Toro Fort Worth](https://www.torotorofortworth.com/): Dining room at Toro Toro Fort Worth |
| dallas: Uchi Dallas | [Daily happy hour](https://uchi.uchirestaurants.com/location/sushi-dallas/menu/): Sun, Mon, Tue, Wed, Thu, Fri, Sat 16:00–18:00 | [OpenTable](https://www.opentable.com/uchi-dallas): 4.9/5, 4,189 reviews | [Photo via Uchi Dallas](https://uchi.uchirestaurants.com/location/sushi-dallas/): Private dining room at Uchi Dallas |
| houston: Uchi Houston | [Daily happy hour](https://uchi.uchirestaurants.com/location/omakase-houston/menu/): Sun, Mon, Tue, Wed, Thu, Fri, Sat 16:00–18:00 | [OpenTable](https://www.opentable.com/uchi-houston): 4.8/5, 4,685 reviews | [Photo via Uchi Houston](https://uchi.uchirestaurants.com/location/omakase-houston/): Dining room and open kitchen at Uchi Houston |
| chicago: Beatrix River North | [Weekday happy hour](https://www.beatrixrestaurants.com/happenings/happy-hour/): Mon, Tue, Wed, Thu, Fri 15:00–18:00 | [OpenTable](https://www.opentable.com/beatrix-river-north): 4.6/5, 5,733 reviews | [Photo via Beatrix River North](https://www.beatrixrestaurants.com/beatrix/river-north/): Dining room at Beatrix River North |
| columbus: The Pearl — Short North | [Tavern bar happy hour](https://thepearlrestaurant.com/locations-menus/short-north/menus/happy-hour-menu/): Mon, Tue, Wed, Thu, Fri 16:00–18:00 | [OpenTable](https://www.opentable.com/r/the-pearl-short-north-columbus-2?page=1): 4.8/5, 6,110 reviews | [Photo via The Pearl — Short North](https://thepearlrestaurant.com/locations-menus/short-north/): Tavern bar at The Pearl Short North |
| jacksonville: Restaurant Orsay | [Cocktail-hour food & drinks](https://www.restaurantorsay.com/menus/cocktail-hour?location=restaurant-orsay): Sun, Tue, Wed, Thu, Fri, Sat 16:00–18:00 | [OpenTable](https://www.opentable.com/r/restaurant-orsay-jacksonville?sitelink=04): 4.7/5, 3,135 reviews | [Photo via Orsay official gallery](https://www.restaurantorsay.com/gallery): Exterior of Restaurant Orsay in Jacksonville |
| charlotte: Fleming’s Charlotte | [Social Hour](https://www.flemingssteakhouse.com/Locations/NC/Charlotte): Sun, Mon, Tue, Wed, Thu, Fri, Sat 16:00–18:30 | [OpenTable](https://www.opentable.com/flemings-steakhouse-charlotte): 4.7/5, 2,283 reviews | [Photo via Fleming’s Charlotte](https://www.flemingssteakhouse.com/Locations/NC/Charlotte): Exterior of Fleming’s in Uptown Charlotte |
| miami: Uchi Miami | [Daily happy hour](https://uchi.uchirestaurants.com/location/sushi-miami/menu/): Sun, Mon, Tue, Wed, Thu, Fri, Sat 17:00–18:30 | [OpenTable](https://www.opentable.com/r/uchi-miami/): 4.8/5, 1,816 reviews | [Photo via Uchi Miami](https://uchi.uchirestaurants.com/location/sushi-miami/): Private dining room at Uchi Miami |
| philadelphia: Harp & Crown | [Bar & lounge happy hour](https://harpcrown.com/menu): Mon, Tue, Wed, Thu, Fri, Sat 16:00–19:00 | [OpenTable](https://www.opentable.com/r/harp-and-crown-philadelphia?page=1): 4.5/5, 2,084 reviews | [Photo via Harp & Crown](https://harpcrown.com/): Bar and dining room at Harp & Crown |
| new-york: The Mermaid Inn Chelsea | [Daily seafood happy hour](https://www.themermaidnyc.com/the-mermaid-inn-chelsea-menus/): Sun, Mon, Tue, Wed, Thu, Fri, Sat 16:30–18:00 | [OpenTable](https://www.opentable.com/r/the-mermaid-inn-chelsea-new-york?ot_marketing=true): 4.8/5, 1,223 reviews | [Photo via The Mermaid Inn Chelsea](https://www.themermaidnyc.com/location/the-mermaid-inn-chelsea/): Exterior of The Mermaid Inn Chelsea |
| boston: Black Lamb | [Two Buck Shuck](https://www.blacklambsouthend.com/menus/): Mon 11:00–22:00; Tue, Wed, Thu, Fri 11:00–17:00; Sun, Sat 10:00–17:00 | [OpenTable](https://www.opentable.com/r/black-lamb-boston?ot_marketing=true): 4.7/5, 711 reviews | [Photo via Black Lamb](https://www.blacklambsouthend.com/): Bar and dining room at Black Lamb |

The Gladly’s Saturday windows begin at its 4 pm opening even though its general food happy-hour headline says 3 pm. Toro Toro’s dedicated happy-hour page says Monday–Thursday, while its homepage says Monday–Friday; the dedicated page takes precedence. Restaurant Orsay’s Saturday cocktails start earlier, but its discounted food starts at 4 pm. Uchi Miami uses 5–6:30 pm rather than the Texas branches’ 4–6 pm. Black Lamb’s current oyster price is $2, replacing older $1 references, and Monday lasts until its published 10 pm closing. Fleming’s Christmas closure and Revel’s published year-end closures are excluded. Harp & Crown, Orsay, and Uchi Miami rating snapshots remain attributed to their accessible OpenTable listings; a rating link does not imply current booking availability.

Specials photos are served directly from the production public Azure `thumb/restaurant-images/` path, with content hashes and immutable cache headers. The cards bypass Next.js image optimization, so photo requests do not pass through the web server. `npx tsx scripts/restaurants/uploadSpecialPhotos.ts` uploads new catalog photos, verifies the public download against the original SHA-256, updates the URLs, and removes local copies that no other guide uses. All pin and guide photos must use Azure blob URLs and must not be committed to Git. Use `npx tsx scripts/restaurants/uploadPinPhotos.ts --update-prod` to migrate existing shared guide and pin references before removing their temporary local copies.

## Expansion toward 20 next specials

Added 18 verified restaurants: 15 in the San Diego metro area (including Coronado and La Mesa), plus Fleming’s branches in Austin, San Antonio, and Houston. Existing thresholds remain 4.5/5 and 100 reviews. No city is padded with duplicate specials from the same restaurant. Most other cities are still below 20.

| Venue | Schedule evidence | Rating evidence |
| --- | --- | --- |
| CUCINA urbana | [Daily, 4–6 pm](https://www.urbankitchengroup.com/cucina-urbana-bankers-hill/menu/happy-hour/) | [OpenTable](https://www.opentable.com/r/cucina-urbana-san-diego?ot_marketing=true): 4.7/5, 7,287 reviews |
| Gravity Heights Sorrento Valley | [Daily, 3–6 pm](https://www.gravityheights.com/happy-hour-sorrento-valley) | [OpenTable](https://www.opentable.com/r/gravity-heights-sorrento-valley-san-diego): 4.7/5, 1,368 reviews |
| Gravity Heights Mission Valley | [Daily, 3–6 pm](https://www.gravityheights.com/happy-hour-mission-valley) | [OpenTable](https://www.opentable.com/r/gravity-heights-mission-valley-san-diego): 4.8/5, 489 reviews |
| Puesto at the Headquarters | [Monday–Friday, 3–5 pm](https://www.eatpuesto.com/san-diego/) | [OpenTable](https://www.opentable.com/r/puesto-at-the-headquarters-san-diego?rid=113968): 4.5/5, 3,761 reviews |
| Puesto La Jolla | [Monday–Friday, 3–5 pm](https://www.eatpuesto.com/san-diego/) | [OpenTable](https://www.opentable.com/r/puesto-la-jolla-reservations-san-diego?lang=en): 4.6/5, 2,399 reviews |
| Puesto Mission Valley | [Daily, 3–5 pm](https://www.eatpuesto.com/san-diego/) | [OpenTable](https://www.opentable.com/r/puesto-mission-valley-san-diego): 4.6/5, 2,398 reviews |
| Brigantine Portside Pier | [Sunday–Friday, 2–5 pm](https://www.brigantine.com/locations/portside-pier/) | [OpenTable](https://www.opentable.com/r/brigantine-at-portside-pier-san-diego): 4.6/5, 5,403 reviews |
| Brigantine Point Loma | [Monday, 3 pm–close; Tuesday–Friday & Sunday, 3–6 pm](https://www.brigantine.com/locations/point-loma/) | [OpenTable](https://www.opentable.com/brigantine-point-loma): 4.6/5, 2,040 reviews |
| Brigantine Coronado | [Monday, 3 pm–close; Tuesday–Friday & Sunday, 3–6 pm](https://www.brigantine.com/locations/coronado/) | [OpenTable](https://www.opentable.com/brigantine-coronado): 4.6/5, 3,465 reviews |
| Brigantine La Mesa | [Monday, 3 pm–close; Tuesday–Friday & Sunday, 3–6 pm](https://www.brigantine.com/locations/la-mesa/) | [OpenTable](https://www.opentable.com/brigantine-la-mesa): 4.8/5, 4,490 reviews |
| Queenstown Public House | [Monday–Friday, 3–6 pm; Sunday, 6 pm–close](https://queenstownpublichouse.com/) | [OpenTable](https://www.opentable.com/restaurant/profile/1033627): 4.7/5, 818 reviews |
| Waterbar San Diego | [Monday–Friday, 3–5 pm](https://waterbarsd.com/specials) | [OpenTable](https://www.opentable.com/r/waterbar-san-diego): 4.5/5, 511 reviews |
| Lionfish at Pendry San Diego | [Monday–Thursday, 5–6 pm](https://www.pendry.com/san-diego/dining/lionfish/) | [OpenTable](https://www.opentable.com/r/lionfish-restaurant-at-pendry-san-diego): 4.5/5, 2,015 reviews |
| Duke’s La Jolla | [Monday in the Barefoot Bar, 3 pm–close](https://www.dukeslajolla.com/wp-content/uploads/2026/01/26_TSR_DLJ_Menus_BurgerandBeer_JAN21.pdf) | [OpenTable](https://www.opentable.com/restaurant/profile/185761?lang=en-us): 4.6/5, 7,727 reviews |
| Cloak + Petal | [Monday–Friday, 4–6 pm](https://cloakandpetal.com/happy-hour/) | [OpenTable](https://www.opentable.com/r/cloak-and-petal-san-diego/photos/39): 4.6/5, 1,248 reviews |
| Fleming’s Austin — The Domain | [Daily, 3–6:30 pm](https://www.flemingssteakhouse.com/Locations/TX/Austin-The-Domain) | [OpenTable](https://www.opentable.com/flemings-steakhouse-austin-the-domain?lang=en-US): 4.8/5, 1,865 reviews |
| Fleming’s San Antonio | [Daily, 3–6:30 pm](https://www.flemingssteakhouse.com/locations/tx/san-antonio/) | [OpenTable](https://www.opentable.com/flemings-steakhouse-san-antonio?lang=en-US): 4.5/5, 1,640 reviews |
| Fleming’s Houston — Town & Country | [Daily, 4–6:30 pm](https://www.flemingssteakhouse.com/Locations/TX/Houston-Town-and-Country) | [OpenTable](https://www.opentable.com/flemings-steakhouse-houston-beltway?lang=en-US): 4.5/5, 1,666 reviews |

CUCINA’s current daily 4–6 pm page supersedes an old linked 2019 PDF with a different schedule. Lionfish’s event page says 4–6 pm, but its hotel owner’s dining page and published restaurant opening time support 5–6 pm Monday–Thursday; the narrower verified window is used. Brigantine’s Monday “until close” uses each branch’s oyster-bar/lounge closing time. Duke’s Monday special starts at the published 3 pm Barefoot Bar opening and ends at its published evening closing time. Puesto Mission Valley’s later “8 pm–late” promotion is omitted because its end is unspecified; its daily 3–5 pm menu is included. Fleming’s branches differ: Austin/The Domain and San Antonio start Social Hour at 3 pm, Houston/Town & Country at 4 pm. Their Christmas closure is excluded. California English was not added because its current operator site returns a Website Expired page. Existing San Diego tests check 20 distinct next restaurants across every weekday after service.

The specials tab has a Rating/Distance toggle for both active and upcoming offers. Rating is the default (highest score, then most reviews). Distance asks for browser location on selection, measures straight-line distance locally, and sorts before the current 50-venue limit. Permission denial or a failed lookup keeps rating order. Every venue retains its earliest qualifying upcoming special regardless of sorting.

Coordinates for all 42 supplemental venues and the two existing active-menu venues were checked on 2026-10-07. Each profile’s `location` records its coordinate source and check date. Most use address matches from the [US Census Geocoder](https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.html), whose points are interpolated along street address ranges. Branch operator map coordinates are preferred for Brigantine’s four branches, Waterbar, the three added Fleming’s branches, and Telefèric La Jolla. Distances are labeled approximate; unknown or invalid venue coordinates sort last.
