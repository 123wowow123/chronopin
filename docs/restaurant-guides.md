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

The [October 2026 media audit](restaurant-media-audit.md) backfilled 87 existing
restaurant pins across the catalog and historical listings. All live restaurant pins now have images. Cha Chin uses a labeled photograph
of its future premises under the previous tenant; Pearl Diver uses its opening
team’s official photograph. Replace these previews when new venue imagery is
published.

Price tiers are shared across landing cards, pin detail visit panes, and city opening cards. The October 6 price backfill supplies 73 additional sourced tiers (107 of the 180 city guide restaurants now have tiers); see [restaurant-price-audit.md](restaurant-price-audit.md) for evidence and the remaining unverified locations. Do not assign a default tier to fill a gap.
