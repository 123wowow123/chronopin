# Activities expansion — October 26, 2026

Added one researched outing to each of the 20 US guides: 663 → 683 catalog entries. Seeded locally through the existing activities seeder, preserving existing authors and media. All 683 catalog source identities have live backing pins; the 20 additions have reviewed, publicly verified Azure photos. One previously missing catalog pin (Stockyards Championship Rodeo) was also seeded. No production deployment or production content update was performed.

City pages now search all catalog coordinates within 250 km (155 mi), with 50/100/150/250/400 km choices, rather than restricting results to the assigned city slug. Distances are straight-line from city center, not driving distances or travel times. Metadata uses the same default radius. All-cities keeps the complete catalog. Search covers activity, venue, neighborhood, city, description and category; readers can sort by name or distance. Empty category selections fall back to all types when switching seasons or changing the radius.

Exact dated cycles no longer show as active before opening or after closing merely because their month matches. A subsequent annual cycle can still use the estimated month window. Seasonal availability does not assert daily opening: cards advise checking organizer schedules. Longer trips (Zion, Organ Pipe, Lincoln Birthplace) explicitly explain their extended-day-trip scope.

## Sources and location checks

Official HTTPS pages below were opened and read on 2026-10-26. General attractions use estimated annual planning windows, not invented festival dates. Joshua Tree’s page identifies October–May as its busy season. Organ Pipe’s cool-season window is a planning estimate; winter ranger programs are explicitly seasonal. Saint Croix paddling and Storm King’s spring–fall planning windows are estimated, not promised opening dates. Longwood Autumn’s Colors is confirmed October 2–November 15, 2026 from the [official September 30 blog](https://longwoodgardens.org/blog/2026-09-30/spooky-season-lovers-guide-gardens) and homepage. Storm King’s homepage gives November 30 as the last day of its 2026 season; its precise next reopening remains unverified.

Locations were checked using OpenStreetMap via Photon, selecting the named visitor center or park. Texas entrance coordinates and addresses override park centroids using the official TPWD pages. Lincoln’s multi-unit geocoder centroid was rejected; the birthplace unit uses coordinates from the official NPS page location widget. Broad park centroids are approximate for Torrey Pines, Cloudland Canyon, Matthiessen, Longwood and Storm King; they are not claims about a particular trailhead. No driving times were inferred.

| Guide | New outing and opened source |
| --- | --- |
| san-francisco | [Point Reyes coastal walks](https://www.nps.gov/pore/planyourvisit/index.htm) |
| seattle | [Klondike Gold Rush museum visit](https://www.nps.gov/klse/planyourvisit/index.htm) |
| los-angeles | [Joshua Tree desert walks and stargazing](https://www.nps.gov/jotr/planyourvisit/index.htm) |
| san-diego | [Torrey Pines reserve trails](https://www.parks.ca.gov/?page_id=657) |
| las-vegas | [Zion Canyon trails and shuttle outing](https://www.nps.gov/zion/planyourvisit/index.htm) |
| phoenix | [Organ Pipe desert drive and nature walks](https://www.nps.gov/orpi/planyourvisit/index.htm) |
| denver | [Rocky Mountain wildlife and trail outing](https://www.nps.gov/romo/planyourvisit/index.htm) |
| san-antonio | [Government Canyon hiking and dinosaur tracks](https://tpwd.texas.gov/state-parks/government-canyon) |
| austin | [Bastrop Lost Pines walks](https://tpwd.texas.gov/state-parks/bastrop) |
| dallas | [Lake Mineral Wells trails and lakeside outing](https://tpwd.texas.gov/state-parks/lake-mineral-wells) |
| houston | [Big Thicket hiking and nature programs](https://www.nps.gov/bith/planyourvisit/index.htm) |
| minneapolis | [Saint Croix Riverway paddling and trails](https://www.nps.gov/sacn/planyourvisit/index.htm) |
| chicago | [Matthiessen canyon trails](https://dnr.illinois.gov/parks/park.matthiessen.html) |
| nashville | [Lincoln Birthplace exhibits and trails](https://www.nps.gov/abli/planyourvisit/index.htm) |
| atlanta | [Cloudland Canyon views and trails](https://gastateparks.org/CloudlandCanyon) |
| miami | [Big Cypress boardwalks and scenic drives](https://www.nps.gov/bicy/planyourvisit/index.htm) |
| washington-dc | [Shenandoah mountain trails and viewpoints](https://www.nps.gov/shen/planyourvisit/index.htm) |
| philadelphia | [Longwood autumn gardens and conservatories](https://longwoodgardens.org/) |
| new-york | [Storm King outdoor sculpture walk](https://stormking.org/plan-your-visit/) |
| boston | [Salem Maritime waterfront and exhibits](https://www.nps.gov/sama/planyourvisit/index.htm) |

## Photos

Checked official source-page galleries, embedded photographs, NPS park homepages and linked photo-gallery pages. For Cloudland Canyon, also opened the linked [official SmugMug gallery](https://gastateparks.smugmug.com/Cloudland-Canyon-State-Park); used the park page’s own canyon photograph. Matthiessen’s DNR page supplied maps rather than a suitable photograph; used the [Illinois tourism board’s park page](https://www.enjoyillinois.com/things-to-do/outdoor-recreation/state-parks-and-national-forests/matthiessen-state-park/). Storm King’s visit page had no usable image, so checked its homepage and selected the identified Sol LeWitt sculpture. Reviewed a contact sheet of all chosen photos, rejected logos/maps, and kept images and temporary downloads outside Git. Torrey Pines downloaded successfully with /usr/bin/curl; the Anaconda curl CA bundle failed certificate verification. Every public Azure upload was downloaded and hash-verified by the importer.

Photo URLs, page credits and original image URLs are in src/server/data/activityPhotos.json. Longwood credits Carol DeGuiseppi; Storm King credits the operator and identifies Sol LeWitt’s work (the image filename includes Jenkins, but no photographer byline was verified). NPS/operator credits retained for other official imagery. No photo gaps remain for the 20 additions. Older catalog items were not comprehensively re-researched during this change.

## Verification

Typecheck and targeted ESLint pass. Ten activity tests cover city ordering, cross-city inclusion, smaller radii, seasonal windows and precise dated cycles. Browser checks verify search, cross-city results, radius narrowing, reset, sorting, native pin links and no mobile horizontal overflow. All 20 city routes checked for successful responses and populated in-season card lists. The local seeder reports 683 linked catalog entries after insertion and attaches all 20 new photos without replacing existing media.

## Day trips and 2-day trips tabs

Added both sections across all 20 guides and the all-cities page. Catalog `tripDays` explicitly records editorial suggestions (`[1]`, `[2]` or `[1,2]`) for 31 existing destinations. These are suggested ways to plan a visit, not operator-published tour durations, event lengths, driving-time estimates or accommodation packages. Overnight arrangements are separate. Distance alone never makes an activity a day trip or two-day destination; the existing city-radius filter still applies. Tabs show planning ideas across seasons with each card’s existing season badge and dates. Search, category filters, nearest/name sorting, counts and native pin links work in both tabs. Empty sections hide with the same populated-section fallback used for seasons.

The previously opened official sources above inform the new park destinations. Additional operator/park visit pages opened October 26 when selecting existing destinations: [San Juan Island](https://www.nps.gov/sajh/planyourvisit/index.htm), [LEGOLAND tickets and passes](https://www.legoland.com/california/tickets-passes/), [Garner](https://tpwd.texas.gov/state-parks/garner), [Indiana Dunes](https://www.nps.gov/indu/planyourvisit/index.htm), [Mammoth Cave](https://www.nps.gov/maca/planyourvisit/index.htm), [Camelback Resort](https://www.camelbackresort.com/), [Minnewaska](https://parks.ny.gov/visit/state-parks/minnewaska-state-park-preserve), and [Cape Cod](https://www.nps.gov/caco/planyourvisit/index.htm). No claim that either length is required, that overnight accommodation is on site, or that a destination’s facilities run year-round. Desert journeys to Joshua Tree, Zion and Organ Pipe are offered as two-day suggestions rather than full-day-return suggestions.

Both tabs have at least one eligible backed destination in every guide at the default 250 km radius, verified in browser across all 20 cities. Tests validate explicit membership, catalog values and both trip lengths in each city’s default radius. No new database rows or photos are needed for this follow-up: these are existing backed catalog destinations. Trip classification is landing-page catalog metadata, so the change requires the usual application release to reach production; no deployment was requested or performed.
