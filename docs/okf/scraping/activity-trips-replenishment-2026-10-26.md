# Activity trip replenishment — October 26, 2026

Completed the owner’s target of **at least 15 Day trips and 15 2-day trips per city**, counted on the local rendered landing pages at the unchanged default **250 km radius**. These are planning tabs across all seasons; the target is not 15 activities open today or 15 in each type filter. Smaller user-selected radii and searches can legitimately show fewer.

Added **56 new destination pins**, expanding the catalog from **683 to 739**. Seeded and linked all 56 locally under the existing TravelDesk author, and indexed all 56 successfully. Existing pins and authors were preserved. Reviewed and attached **49 new Azure photographs**; seven photo-only gaps remain below. No production deployment, restart, build or production data write occurred.

## Rendered coverage

Counts below come from browser navigation and actual cards, including the normal database/confidence filtering. Every title links to its native pin detail page; no duplicated pin links were found within a tab. Seasonal versions at the same venue share a destination key and count once per tab. Both tabs remain uncapped.

| City | Day trips | 2-day trips |
| --- | ---: | ---: |
| san-francisco | 29 | 15 |
| seattle | 27 | 15 |
| los-angeles | 47 | 22 |
| san-diego | 43 | 19 |
| las-vegas | 19 | 15 |
| phoenix | 22 | 15 |
| denver | 22 | 15 |
| san-antonio | 49 | 26 |
| austin | 66 | 35 |
| dallas | 23 | 15 |
| houston | 36 | 19 |
| minneapolis | 29 | 15 |
| chicago | 28 | 15 |
| nashville | 29 | 17 |
| atlanta | 26 | 16 |
| miami | 22 | 15 |
| washington-dc | 47 | 27 |
| philadelphia | 69 | 36 |
| new-york | 49 | 25 |
| boston | 29 | 18 |

## Research and editorial treatment

Opened **672 unique existing catalog source URLs** and read candidate page text, followed by operator, park and tourism sources for the new destinations and follow-up sources where needed. HTTP 200 alone was insufficient: pages with a generic listing, bot interstitial, missing named event or unrelated content were withheld from new trip classifications. An existing Stockyards source now describes unrelated travel news; it was not used as trip evidence. Flower Piano’s source was for an old edition, so no new trip classification was added. The historical seasonal catalog itself was not broadly rewritten during this task.

Persisted **534 trip research records** in [tripResearch.json](../../../scripts/activities/tripResearch.json), each with an opened HTTPS source, title or explicitly labeled site name, checked date and short verbatim excerpt. Raw captures and downloads stay in ignored .scrape/activity-trip-replenishment. The record is a replay/research catalog; the live application uses the trip classification and planning notes in src/server/data/activities.json. New pins retain their primary source in native references. Supplementary sources used to recover classifications are retained in the research catalog.

One-day and two-day labels are **editorial planning suggestions**, not operator tour durations, ticket entitlements or driving-time promises. Overnight notes describe a second trail, park area or a second published festival day; stays are booked separately. Single-day Seattle Pride Parade and Imperial Beach sandcastle events do not get a two-day label. Julian seasonal variants share a destination key, and the overnight plan is a town getaway rather than an invented two-day festival. Small museums, short mansion tours, isolated winery visits and similar brief stops were generally not promoted as standalone overnight recommendations. Festival suggestions remain conditional on two consecutive published dates and separate admission checks.

The explicit destination key prevents seasonal variants of Lee Canyon, gardens, the same park and other venues from inflating the target. Nearby cross-guide catalog entries are included using the same radius helper as other activities. Entries retain their existing source-backed seasons; new annual planning windows are estimated and do not assert daily opening. Desert planning windows are October–April where used, without claiming closure outside that period. There are no invented event dates or hotel packages.

## New destinations and source checks

Geocoded named destinations with ArcGIS (and initially Photon), then preferred official entrance coordinates and directions links where available. Photon failed partway through and several town searches returned county centroids, so those matches were rejected. Nevada official directions overrode displaced geocoder results, and Illinois visible park-specific coordinates overrode unrelated template fields. Town/region entries use a town planning anchor, not an asserted attraction entrance. Every new destination anchor is inside its assigned city’s default 250 km circle; straight-line distance is not road mileage.

- san-francisco: [Napa Valley towns and outdoor experiences](https://www.visitnapavalley.com/things-to-do/)
- san-francisco: [Sonoma County coast and wine country](https://www.sonomacounty.com/things-to-do/)
- san-francisco: [Monterey coastal walks and attractions](https://www.seemonterey.com/things-to-do/)
- san-francisco: [Santa Cruz beaches, boardwalk and redwoods](https://www.santacruz.org/things-to-do/)
- seattle: [Bainbridge Island ferry and island exploring](https://visitbainbridgeisland.org/)
- seattle: [Port Townsend maritime and arts getaway](https://enjoypt.com/)
- seattle: [Leavenworth village and Cascade recreation](https://leavenworth.org/)
- seattle: [Whidbey and Camano island exploring](https://whidbeycamanoislands.com/)
- las-vegas: [Cathedral Gorge formations and trails](https://parks.nv.gov/parks/cathedral-gorge)
- las-vegas: [Kershaw-Ryan canyon walks and recreation](https://parks.nv.gov/parks/kershaw-ryan)
- las-vegas: [Echo Canyon reservoir and trails](https://parks.nv.gov/parks/echo-canyon)
- las-vegas: [Beaver Dam canyon and nature trails](https://parks.nv.gov/parks/beaver-dam)
- las-vegas: [Snow Canyon sandstone and lava landscapes](https://stateparks.utah.gov/parks/snow-canyon/)
- las-vegas: [Mojave Preserve desert trails and camping](https://www.nps.gov/moja/planyourvisit/index.htm)
- las-vegas: [Big Bend Colorado River recreation](https://parks.nv.gov/parks/big-bend-of-the-colorado)
- chicago: [Devil’s Lake bluffs and lakeshore trails](https://dnr.wisconsin.gov/topic/parks/devilslake)
- chicago: [Kettle Moraine southern forest trails](https://dnr.wisconsin.gov/topic/parks/kms)
- chicago: [Illinois Beach dunes and lakeshore](https://dnr.illinois.gov/parks/park.adelinejaygeo-karisillinoisbeach.html)
- chicago: [Rock Cut lakes and woodland trails](https://dnr.illinois.gov/parks/park.rockcut.html)
- chicago: [Chain O’Lakes boating and park trails](https://dnr.illinois.gov/parks/park.chainolakes.html)
- nashville: [Fall Creek Falls waterfall and woodland trails](https://tnstateparks.com/parks/fall-creek-falls)
- nashville: [Rock Island waterfalls and river scenery](https://tnstateparks.com/parks/rock-island)
- nashville: [Henry Horton river and woodland recreation](https://tnstateparks.com/parks/henry-horton)
- nashville: [Paris Landing lake recreation getaway](https://tnstateparks.com/parks/paris-landing)
- miami: [John Pennekamp reef and mangrove outings](https://pennekamppark.com/)
- miami: [Bahia Honda beaches and island nature](https://visitfloridakeys.com/plan-your-trip/plan-book/itineraries/great-walks/bahia-honda)
- miami: [Jonathan Dickinson river and pinewoods](https://discovermartin.com/directory/jonathan-dickinson-state-park/)
- miami: [Fort Zachary Taylor history and beach](https://fortzacharytaylor.com/park-fort)
- dallas: [Ray Roberts Lake trails and shoreline](https://tpwd.texas.gov/state-parks/ray-roberts-lake)
- dallas: [Lake Tawakoni fishing and woodland trails](https://tpwd.texas.gov/state-parks/lake-tawakoni)
- dallas: [Tyler State Park pinewoods and lake](https://tpwd.texas.gov/state-parks/tyler)
- minneapolis: [Wild River St. Croix trails and recreation](https://www.dnr.state.mn.us/state-parks/virtual-tours/wild-river/dialup.html)
- minneapolis: [William O’Brien riverside and woodland trails](https://www.dnr.state.mn.us/state-parks/virtual-tours/william-obrien/dialup.html)
- minneapolis: [Nerstrand Big Woods forest and waterfall](https://www.dnr.state.mn.us/state-parks/virtual-tours/nerstrand-big-woods/dialup.html)
- denver: [Staunton foothills trails and rock scenery](https://cpw.state.co.us/state-parks/staunton-state-park)
- denver: [Golden Gate Canyon mountain trails](https://cpw.state.co.us/state-parks/golden-gate-canyon-state-park)
- phoenix: [Kartchner Caverns tours and desert trails](https://azstateparks.com/kartchner)
- phoenix: [Picacho Peak desert scenery and trails](https://azstateparks.com/picacho)
- boston: [Pawtuckaway lake and woodland trails](https://www.nhstateparks.org/find-parks-trails/pawtuckaway-state-park)
- boston: [Nickerson Cape Cod kettle ponds and trails](https://www.mass.gov/locations/nickerson-state-park)
- atlanta: [Vogel mountain lake and woodland trails](https://gastateparks.org/Vogel)
- atlanta: [Fort Mountain overlooks and forest trails](https://gastateparks.org/FortMountain)
- san-diego: [Anza-Borrego desert trails and stargazing](https://www.parks.ca.gov/?page_id=638)
- san-diego: [Cuyamaca Rancho mountain trails](https://www.parks.ca.gov/?page_id=667)
- san-diego: [Palomar Mountain forest and meadow trails](https://www.parks.ca.gov/?page_id=637)
- san-francisco: [Point Lobos coastal trails and wildlife](https://www.parks.ca.gov/?page_id=571)
- san-francisco: [Russian River towns and outdoor recreation](https://russianriver.com/business-category/things-to-do/)
- dallas: [Cleburne lake and limestone trails](https://tpwd.texas.gov/state-parks/cleburne)
- dallas: [Purtis Creek fishing and nature trails](https://tpwd.texas.gov/state-parks/purtis-creek)
- dallas: [Cooper Lake park units and shoreline](https://tpwd.texas.gov/state-parks/cooper-lake)
- dallas: [Bonham lake and woodland trails](https://tpwd.texas.gov/state-parks/bonham)
- chicago: [Shabbona Lake fishing and trails](https://dnr.illinois.gov/parks/park.shabbonalake.html)
- chicago: [White Pines Forest trails and cabins](https://dnr.illinois.gov/parks/park.whitepinesforest.html)
- chicago: [New Glarus Woods trails and village exploring](https://dnr.wisconsin.gov/topic/parks/ngwoods)
- chicago: [Milwaukee museums, waterfront and neighborhoods](https://www.visitmilwaukee.org/things-to-do/)
- minneapolis: [Afton State Park bluffs and river trails](https://www.dnr.state.mn.us/state-parks/virtual-tours/afton/dialup.html)

Known access constraints are carried into the new cards and saved pin descriptions: Rock Island gorge access depends on dam releases; Fall Creek Falls has storm-damaged closures; Henry Horton has construction-related access changes; Snow Canyon has a scheduled November 14 road/trail closure; Jonathan Dickinson concession rentals and boat tours are unavailable, so its plan uses land routes. Banning State Park was researched but not added after the October 23 DNR notice of a major November 9 closure; it was replaced by a supported Afton suggestion. No current accommodation availability is asserted.

## Photography

Checked official source-page galleries, linked photographs, park homepages, tourism board galleries and supplemental Google Images results. Downloaded with plain /usr/bin/curl, visually reviewed contact sheets, re-encoded to WebP, uploaded to Azure and downloaded each public blob to verify its SHA-256. Kept original image/page URLs, credits and descriptive captions in src/server/data/activityPhotos.json. The 49 images were attached only where the native pin had no media. Rejected generic boots, maps, logos, unrelated park images and sponsored placements. Some official Minnesota/Nickerson/Cuyamaca images are low resolution; retained their native dimensions without upscaling rather than presenting an off-subject substitute. Photo credits include operator/tourism sources, Dan Depew, Impact Creative, Stevens Pass/Vail Resorts, park friends groups and the Snow Canyon travel article as appropriate.

| Pin | Remaining photo research |
| --- | --- |
| seattle/whidbey-camano-islands-getaway | The tourism homepage and gallery were checked; the selected Coupeville Wharf image did not download with plain curl. A new downloadable island photograph is still needed. |
| nashville/fall-creek-falls-getaway | Official hero and original files returned HTTP 403 from the image host. Google Images also surfaced KOA, Flickr, The Dyrt, Expedia and travel articles; no replacement downloaded and reviewed during this pass. |
| nashville/rock-island-tennessee-getaway | Official hero and original image paths returned HTTP 403. No verified downloadable replacement selected. |
| nashville/henry-horton-getaway | Official hero and original image paths returned HTTP 403. No verified downloadable replacement selected. |
| nashville/paris-landing-getaway | Official hero and original image paths returned HTTP 403. No verified downloadable replacement selected. |
| minneapolis/wild-river-state-park-getaway | Official virtual-tour endpoint supplied no usable embedded photos. Tourism trail page was also checked; a representative downloadable park photo remains needed. |
| chicago/milwaukee-city-getaway | Tourism homepage fetch is blocked; web reader opens it but available top image links are sponsored placements. Rejected those as representative city photos. |

## Deferred existing-catalog candidates

These are additional candidates beyond the achieved target, not missing required cards. They were excluded from new classifications unless another opened source supplied evidence. Existing seasonal records remain available outside these trip recommendations pending factual review.

- washington-dc/capital-pride: Source unreadable or insufficient (403); retain underlying seasonal catalog but do not add trip recommendation.
- atlanta/atlanta-dogwood-festival: Source unreadable or insufficient (202); retain underlying seasonal catalog but do not add trip recommendation.
- atlanta/atlanta-jazz-festival: Source unreadable or insufficient (202); retain underlying seasonal catalog but do not add trip recommendation.
- atlanta/stone-mountain-summer-light-show: Source unreadable or insufficient (403); retain underlying seasonal catalog but do not add trip recommendation.
- atlanta/stone-mountain-christmas: Source unreadable or insufficient (403); retain underlying seasonal catalog but do not add trip recommendation.
- miami/miami-book-fair: Source unreadable or insufficient (403); retain underlying seasonal catalog but do not add trip recommendation.
- houston/rodeohouston: Source unreadable or insufficient (403); retain underlying seasonal catalog but do not add trip recommendation.
- dallas/six-flags-over-texas-fright-fest: Source unreadable or insufficient (406); retain underlying seasonal catalog but do not add trip recommendation.
- dallas/cottonwood-art-festival: Source is generic, stale, unrelated or does not establish the named event; fresh operator evidence required.
- austin/acl-music-festival: Source unreadable or insufficient (403); retain underlying seasonal catalog but do not add trip recommendation.
- austin/rodeo-austin: Source unreadable or insufficient (403); retain underlying seasonal catalog but do not add trip recommendation.
- san-antonio/san-antonio-stock-show-rodeo: Source unreadable or insufficient (403); retain underlying seasonal catalog but do not add trip recommendation.
- minneapolis/minneapolis-arboretum-scarecrows-pumpkins: Source is generic, stale, unrelated or does not establish the named event; fresh operator evidence required.
- denver/denver-national-western-stock-show: Source unreadable or insufficient (403); retain underlying seasonal catalog but do not add trip recommendation.
- denver/denver-cherry-creek-arts-festival: Source unreadable or insufficient (403); retain underlying seasonal catalog but do not add trip recommendation.
- phoenix/phoenix-indian-fair-and-market: Source unreadable or insufficient (403); retain underlying seasonal catalog but do not add trip recommendation.
- las-vegas/las-vegas-lee-canyon-ski: Source unreadable or insufficient (403); retain underlying seasonal catalog but do not add trip recommendation.
- las-vegas/las-vegas-lee-canyon-summer: Source unreadable or insufficient (403); retain underlying seasonal catalog but do not add trip recommendation.
- austin/pedernales-falls-state-park: Source unreadable or insufficient (TypeError: fetch failed); retain underlying seasonal catalog but do not add trip recommendation.
- boston/waterfire-providence: Source unreadable or insufficient (202); retain underlying seasonal catalog but do not add trip recommendation.
- chicago/ravinia-festival-highland-park: Source unreadable or insufficient (406); retain underlying seasonal catalog but do not add trip recommendation.
- chicago/chicago-auto-show-mccormick-place: Source unreadable or insufficient (403); retain underlying seasonal catalog but do not add trip recommendation.
- chicago/summerfest-milwaukee: Source unreadable or insufficient (403); retain underlying seasonal catalog but do not add trip recommendation.
- chicago/volo-auto-museum: Source is generic, stale, unrelated or does not establish the named event; fresh operator evidence required.
- dallas/fort-worth-stock-show-rodeo: Source unreadable or insufficient (200); retain underlying seasonal catalog but do not add trip recommendation.
- dallas/stockyards-championship-rodeo: Source is generic, stale, unrelated or does not establish the named event; fresh operator evidence required.
- denver/garden-of-the-gods-visit: Source unreadable or insufficient (200); retain underlying seasonal catalog but do not add trip recommendation.
- denver/indian-hot-springs-idaho-springs: Source unreadable or insufficient (200); retain underlying seasonal catalog but do not add trip recommendation.
- houston/texas-renaissance-festival: Source unreadable or insufficient (200); retain underlying seasonal catalog but do not add trip recommendation.
- las-vegas/las-vegas-grand-prix-weekend: Source unreadable or insufficient (475); retain underlying seasonal catalog but do not add trip recommendation.
- los-angeles/old-spanish-days-fiesta-santa-barbara: Source unreadable or insufficient (403); retain underlying seasonal catalog but do not add trip recommendation.
- los-angeles/riverside-county-fair-national-date-festival: Source unreadable or insufficient (200); retain underlying seasonal catalog but do not add trip recommendation.
- los-angeles/solvang-julefest: Source unreadable or insufficient (202); retain underlying seasonal catalog but do not add trip recommendation.
- miami/miami-film-festival: Source unreadable or insufficient (200); retain underlying seasonal catalog but do not add trip recommendation.
- minneapolis/minneapolis-minnesota-renaissance-festival: Source unreadable or insufficient (202); retain underlying seasonal catalog but do not add trip recommendation.
- minneapolis/minneapolis-st-paul-winter-carnival: Source unreadable or insufficient (200); retain underlying seasonal catalog but do not add trip recommendation.
- nashville/wilson-county-fair: Source unreadable or insufficient (200); retain underlying seasonal catalog but do not add trip recommendation.
- nashville/arrington-vineyards: Source unreadable or insufficient (202); retain underlying seasonal catalog but do not add trip recommendation.
- new-york/fishkill-farms-pick-your-own: Source unreadable or insufficient (202); retain underlying seasonal catalog but do not add trip recommendation.
- new-york/us-open-tennis: Source unreadable or insufficient (200); retain underlying seasonal catalog but do not add trip recommendation.
- phoenix/phoenix-barrett-jackson-scottsdale: Source is generic, stale, unrelated or does not establish the named event; fresh operator evidence required.
- phoenix/phoenix-arizona-snowbowl-ski-season: Source unreadable or insufficient (403); retain underlying seasonal catalog but do not add trip recommendation.
- san-antonio/wurstfest-new-braunfels: Source unreadable or insufficient (202); retain underlying seasonal catalog but do not add trip recommendation.
- san-diego/lakeside-rodeo: Source unreadable or insufficient (200); retain underlying seasonal catalog but do not add trip recommendation.
- san-francisco/flower-piano: Source is generic, stale, unrelated or does not establish the named event; fresh operator evidence required.
- washington-dc/calvert-cliffs-fossil-beach: Source unreadable or insufficient (200); retain underlying seasonal catalog but do not add trip recommendation.
- washington-dc/sandy-point-state-park: Source unreadable or insufficient (200); retain underlying seasonal catalog but do not add trip recommendation.
- new-york/storm-king-sculpture-walk: Source unreadable or insufficient (403); retain underlying seasonal catalog but do not add trip recommendation.

## Verification

All 40 city/tab combinations show at least 15 cards in a real browser. Checked native title links, duplicate links and mobile overflow. All 56 new pins exist and carry references; 49 have photos. Five representative native detail pages returned HTTP 200 in a cookie-preserving browser. A cookie-less fetch sweep hit the application’s normal cookie gate (HTTP 403); that is not evidence of missing pins, and the gate was left unchanged. Search indexing succeeded for all 56 new pins.

Typecheck, targeted ESLint and **14 activity tests** pass, including the 15-per-tab target at the default radius, destination deduplication, recorded source/plan coverage, exact dated seasons and nearby-city inclusion. No broad production build was run.
