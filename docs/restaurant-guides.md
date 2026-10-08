The San Diego, New York, Los Angeles, San Francisco, Chicago, Houston, Phoenix,
San Antonio, Philadelphia, Dallas, Miami, Boston, Seattle, Jacksonville,
Fort Worth, Austin, San Jose, Charlotte, and Columbus guides share the regional restaurant
page and neighborhood, opening status, and map controls. City registrations
also feed the sitemap and each page's canonical metadata.

For future collection and refresh work, follow the
[restaurant scraping strategy](restaurant-scraping.md), including the OpenTable
fallback, location matching, source attribution, and validation workflow.

The regional catalog is in
`src/server/data/regionalRestaurants.json`, with branch-specific menu profiles
in `src/server/data/restaurantMenus.json` and pictures in
`public/restaurant-images/`. Dates, sources, photo credits, and rendering labels
were checked October 6, 2026. A planned day remains estimated until an opening
is confirmed. Where reporting verifies an opening but supplies only a month,
`openingConfirmed` records that evidence without claiming an exact day. It
applies only while the live pin retains the catalog's date. Established
restaurants use a guide verification date, not an
opening date, and do not carry the Restaurant Opening tag.
Spacca Tutto, Shinka, Gibsons Tavern, and Rosso could not be matched reliably
to an exact street address, so their pins have no map coordinates until the
locations can be verified. Other coordinates are street-address matches;
individual suites inside larger buildings may be approximate.

San Francisco, Chicago, Houston, Phoenix, San Antonio, Philadelphia, and Dallas
each contain six opening listings and three MICHELIN
Guide picks. Thirty-seven of their 63 profiles include verified menu links or
sample items. Upcoming or unpublished menus remain explicitly unverified.
The nine additional cities each contain six opening listings and three
Chronopin editorial selections. These selections are not presented as external
awards. Their 81 records include sourced photographs or labeled previews,
street-address map coordinates, and 15 profiles with sample menu items or
rendered operator menu pages. Future openings retain estimated dates until
confirmed; unpublished prices, phone numbers, and schedules remain unverified.

The detail page hides the menu pane when no menu items or rendered menu pages
are available, and omits tabs that only link to an external menu.
Restaurant pins also show a separate visit pane with an official website,
click-to-call phone number, and opening days and hours. Branch-specific records
live in `src/server/data/restaurantDetails.json`, with a check date and operator
source for verified facts. Missing details stay explicitly unverified; another
location's phone or hours are never substituted. Service schedules and overnight
closing times retain their published meaning.
When an operator's site omits contact details or hours, follow its reservation
links to OpenTable before leaving the fields unverified. Confirm the restaurant
name, location/address, and linked official site. Preserve operator facts, fill
the missing fields, and record the booking listing in `additionalSources` with a
field-specific label and a URL without marketing parameters. Do not treat a
placeholder phone number as verified, or substitute another branch's schedule.
Serpent & Stone, Élephante Dallas, Docent, and Californios include OpenTable
provenance for phone numbers or hours obtained this way.
Verified OpenTable listings are also stored as `reservationUrl` and appear in a
Reserve row where product pins show their shopping buttons. An existing pin's
OpenTable reservation handle takes precedence; no booking URL is guessed when
neither source has one.
Operator-linked older PDFs are labeled with their publication dates, and
brand menus require checking the selected location's prices and availability.

Run `npm run restaurants:seed` against the configured database after deploying
the matching assets. The command uses the existing FoodDesk account; another
existing curator can be selected with
`npm run restaurants:seed -- --user-id 123`. It adds missing records in one
transaction and preserves existing or deleted pins. It is safe to rerun.
Restaurant IDs are assigned by the database; top cards resolve their detail
links from source URLs rather than depending on an installation's IDs.

The local database has been seeded. Production still reads its own live pins;
the command must be run there when these changes are deployed. San Diego's
development preview remains available when its opening batch is missing.

Menus labeled as samples contain selected verified items. Links to changing
menus do not imply their prices were transcribed. Missing menus and promotions
remain unverified; offers are never copied from another branch. Menu records
become refresh candidates after 30 days, and offers respect any published
validity dates.

City guides show discounted menus available now in a dedicated restaurant view tab.
An offer requires `discounted: true` and explicit `availability.windows` in
`restaurantMenus.json`: `days` uses Sunday = 0, and `start`/`end` are local
24-hour times with an exclusive end. Use separate windows for different weekday
hours; an end before the start means overnight service. Published validity dates
and `excludedDates` also apply. Holiday-restricted offers require a resolved
branch calendar (currently US/California public holidays for Telefèric La Jolla and Cloak + Petal).
Unpublished hours or prices alone never establish an active discount. Only
confirmed open venues enter the section; source matching keeps offers specific
to their branch. `menuLabel` attaches the discounted menu, and
`excludedMenuItems` removes items with separate, unverified service hours.
The section refreshes every 15 seconds and on tab focus using the city's time
zone, displays conditions and the menu check date, and links to the operator
for redemption. Chronopin does not process restaurant orders.
When no offers are active in the selected neighborhood, the tab shows the next
specials at restaurants rated at least 4.5/5 from 100 reviews. Show each venue’s
earliest special once, up to 20 venues. The Rating/Distance toggle defaults to
highest rating, then most reviews. Distance requests the viewer’s browser
location only when selected, orders approximate straight-line distances nearest
first, and puts unknown coordinates last. Denied or failed location requests
keep rating order with a retry message. Both sorts apply before the 20-venue cap.
Coordinates include their source and check date on the menu profile. Local
calendar calculations preserve service hours through DST changes, validity
dates, and holiday exclusions. The fallback never labels future service as
available now. Verified review scores include their publisher, count, source,
and check date; unrated venues remain eligible for active offers but cannot
enter the highly rated fallback.
Additional established venues live in `restaurantSpecials.json`, allowing
specials to appear without requiring a recent opening pin. Existing source
matches keep their pin links; other venues link to their operator website.
These venues also make their city guide discoverable. All 19 US cities have at least one qualifying venue; San Diego has 21 qualifying venues and displays up to 20 after service in the selected order. The discounts tab is hidden when the city has neither an active offer nor a qualifying future special. This eligibility check runs before neighborhood filtering, so selecting an empty neighborhood does not remove the tab. See
[the specials audit](restaurant-specials.md) for sources and conflicts.

The [October 2026 media audit](restaurant-media-audit.md) backfilled 87 existing
restaurant pins across the catalog and historical listings. All live restaurant pins now have images. Cha Chin uses a labeled photograph
of its future premises under the previous tenant; Pearl Diver uses its opening
team’s official photograph. Replace these previews when new venue imagery is
published.

Price tiers are shared across landing cards, pin detail visit panes, and city opening cards. The October 6 price backfill supplies 73 additional sourced tiers (107 of the 180 city guide restaurants now have tiers); see [restaurant-price-audit.md](restaurant-price-audit.md) for evidence and the remaining unverified locations. Do not assign a default tier to fill a gap.

Coming soon, Just opened, and Top restaurants each have a collection target of
12 distinct live pins per city when verified candidates are available. This
is not a display cap. The nightly `restaurant_regions` signal reports current
tab counts and shortages, including cities without a newly created opening.
Just opened retains its 90-day window and requires a confirmed opening; stale
estimates, expired openings, deleted pins, and uncataloged top picks do not
fill shortages. See [the refresh task](okf/scraping/daily-jobs.md#restaurantregions).
