# Travel shelf expansion — twenty-fifth round, 2026-11-23

MEININGER Hotel Frankfurt/Main Airport joins Family and Budget; Great Wolf Lodge Minnesota joins Family.
Catalog: `scripts/hotels/travel-expansion-2026-11-23-round25.json`.
Replay `node scripts/hotels/expandTravelShelves.mjs --catalog scripts/hotels/travel-expansion-2026-11-23-round25.json`;
append `--apply` for writes. Manifest/readbacks: `.scrape/prod-batches/travel-expansion-2026-11-23-round25/`.

Frankfurt's **5 January 2012 opening** is explicitly recorded under that day in the municipal history
institute's [2012 chronology](https://www.stadtgeschichte-ffm.de/de/stadtgeschichte/stadtchronik/2012), corroborated
by Götz A. Primke's invited opening-visit account published the same day. This identifies the Gateway Gardens
airport hotel, separate from the former Messe property. Current [operator portfolio](https://www.meininger-hotels.com/en/portfolio/)
row **168 rooms / 414 beds** is used rather than the old 167 / 412 presentation. No property-specific
construction investment or applicable contemporaneous regional benchmark was verified; project price/currency null.
The opened 2010 Bauwens construction announcement describes this exact project but supplies no cost; wider
Gateway Gardens investment, another Frankfurt hotel and airport-terminal budgets are not assigned to this hotel.

The [current exact hotel](https://www.meininger-hotels.com/en/hotels/frankfurt-main/hotel-frankfurt-airport/)
has private family rooms, a children's corner and lounge. Private whole-room bookings and dorm beds are separate
products. **No guest kitchen**, explicitly confirmed by the [operator help page](https://help-center.meininger-hotels.com/en/support/solutions/articles/79000143727-guest-kitchen-frankfurt-main-airport),
so older opening-era kitchen claims are not repeated. Full address **Bessie-Coleman-Straße 11, 60549 Frankfurt
am Main, Germany**; operator point **50.0559385 / 8.5913113**, corroborated by exact-address PointAddress.
Both selected properties passed broad-title and canonical-source duplicate checks on local and production.
Innsbruck was researched initially but held because an exact opening day was not corroborated; no draft or pin saved.

[Fraport's current notice](https://www.fraport.com/en/newsroom/press-releases/2026/q2/terminal-2-closed-for-refurbishment-starting-today.html)
confirms **Terminal 2 passenger operations closed 9 June 2026**, with its airlines moved to Terminal 3.
Older hotel headlines promising a short walk to Terminal 2 are not presented as current terminal transfers.
The [operator directions](https://help-center.meininger-hotels.com/en/support/solutions/articles/79000143747-getting-to-meininger-hotel-frankfurt-main-airport)
verify Gateway Gardens station access; actual airline terminal, tickets, routes and times require current checks.
The hotel is an airport stopover rather than a central Frankfurt location.

Frankfurt refreshed Tripadvisor UK snapshot: **1,165 reviews**, overall 3.7; Rooms 3.7, Service 3.8, Location 4.2,
Cleanliness 4.3, Value 4.0 rounded to half points. gethicla76's firsthand couple “Simple, clean, and efficient.”
review was published June 2026 without an exact day; date null, site-translated from French. Multiple 2026
accounts report hot rooms and ineffective cooling, including a family with a baby. Accounts disagree on whether
cooling equipment is absent or ineffective, so no unverified universal equipment claim is made. Small rooms and
noise with open windows retained. MICHELIN Frankfurt complete **1–15 of 15** has no match; Forbes Frankfurt
unavailable and AAA excludes Germany. Acclaim null.

Minnesota's pin dates **formal Great Wolf grand opening 12 December 2017**, documented by the firsthand
[media-tour attendee](https://twincitiesfrugalmom.com/2017/12/tour-new-great-wolf-lodge-bloomington/).
This is a renovation/rebrand of the former Water Park of America, not the original resort's first opening.
Earlier guest previews, a July report's prospective December 15 date and an industry's retrospective November
reopening are separate from the verified ceremony. [Current operator history](https://www.greatwolf.com/minnesota/about-us)
confirms the December 2017 brand arrival and older May 2006 Water Park of America origin.

The opening-tour account retrospectively reports a **US$30m renovation**, corroborating the earlier
[Mpls.St.Paul magazine report](https://mspmag.com/travel-and-visitors-guide/great-wolf-lodge-minnesota-nears-opening/).
Saved price USD30m and investment metric mean that reported conversion renovation, separate from acquisition,
original construction, later spending and nightly rates; no audited final-cost breakdown claimed. The operator
currently lists **404 suites / 75,000-square-foot indoor water park**, microwaves in every suite and no fitness
centre at this lodge. Older spa, dining, admission and discount details from the 2017 tour are not treated as
current amenities or prices. Booked occupancy, height rules, wristbands, admission hours, package terms,
parking, dining and paid attractions require checks; no date-specific all-in nightly quote verified.

Full address **1700 American Boulevard East, Bloomington, MN 55425, USA** verified by operator and AAA;
ArcGIS named resort point **44.8607855 / -93.2506764** agrees with exact east-boulevard PointAddress.
The west-American-Boulevard candidate is a different location and rejected. The lodge is in Bloomington near
the Mall of America, not downtown Minneapolis or St. Paul.

Minnesota refreshed Tripadvisor UK snapshot: **1,687 reviews**, overall 3.6; Rooms 3.9, Service 3.8, Location 4.4,
Cleanliness 4.1, Value 3.2 rounded to half points. Teresa E's firsthand family “Fun for the kids but spendy and
some issues” account supplies a short exact excerpt. September 2026 publication without exact day, null. Fun
activities/helpful staff retained alongside concerns about changing space, wet-swimwear storage and food value.
A November guest describes a comfortable room and children enjoying the stay but costly extras, disappointing
food and noise from a water-park-facing balcony room. These remain individual guest reports, not universal
conditions. [AAA exact property](https://www.aaa.com/tripcanvas/hotel/great-wolf-lodge-minnesota-AA136247)
confirms address and 404 units; its component scores are not substituted for guest aggregates. MICHELIN's
`/bloomington` route returned Indiana and was rejected; the Minnesota route and Forbes Minneapolis were
unavailable. Acclaim null rather than checked-absence zero.

Six distinct images visually checked: Frankfurt family room, children's corner and lounge from MEININGER;
Minnesota exterior, guest room and indoor water-play structure from the exact property's Management Photos.
Azure public hashes checked before live references; photographer/operator credits read back. No photo binaries
in Git. Comparative engineering axes remain null.

Climate: **DWD Frankfurt/Main 01420**, 1991–2020 monthly MO_TX daytime highs and MO_RR precipitation, exactly
30 valid observations per calendar month, no missing-value sentinels; station name verified in DWD catalogue.
Minnesota uses **NOAA Minneapolis/St Paul Airport USW00014922**, 1991–2020 metric monthly normals, 12 complete
records. Both are nearby regional guidance rather than onsite forecasts. Precipitation includes snow's liquid
equivalent: low winter totals do not mean snow-free conditions. Rain bands below 75 / below 150 / at least
150 mm. Outdoor suitability is separate from indoor swimming, operating hours and rate seasons. Frankfurt
cooling concerns remain explicit even though summer is weather-suitable for outdoor sightseeing.

English only; translations left to the translation agent. No production code deployment performed.

| Property | Production pin | Local pin |
| --- | --- | --- |
| MEININGER Hotel Frankfurt/Main Airport | 21390 | 21208 |
| Great Wolf Lodge Minnesota | 21391 | 21209 |

Both hosts passed complete native pin, date, address, coordinates, author, references and media-credit
readbacks, hotel rubrics and factory metrics/milestones. Frankfurt's null project cost and Minnesota's
USD30m conversion-renovation cost read back correctly. Each pin has three credited images; public blob
hashes verified before live references. The 2026-11-23 assessment date, catalog checkedAt and Azure date
folders verified. All four native pages returned HTTP 200. Local `/travel` renders both additions with
no application error: **Family 59 / Budget 40**. All 10 existing travel tests and `git diff --check` passed.
No batch operations remain pending. Production category display awaits an explicitly requested code deployment.
