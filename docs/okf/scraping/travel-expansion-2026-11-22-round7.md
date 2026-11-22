# Travel shelf expansion — seventh round, 2026-11-22

Added MEININGER Hotel Amsterdam Amstel to both family and budget shelves and Moxy Tokyo Kinshicho
to the budget shelf. English research catalog:
`scripts/hotels/travel-expansion-2026-11-22-round7.json`.
Replay identity checks with
`node scripts/hotels/expandTravelShelves.mjs --catalog scripts/hotels/travel-expansion-2026-11-22-round7.json`;
append `--apply` to save. Audit snapshots and assigned-ID manifest are under
`.scrape/prod-batches/travel-expansion-2026-11-22-round7/`.

MEININGER's operator release confirms **March 25, 2018** for Amstel, with 186 rooms and 806 beds at
opening. Amsterdam City West is a different property and is not substituted. Private family-room
booking, bed layout, occupancy, shared kitchen and rail travel into the centre are distinguished from
buying a shared dorm bed. No whole-Amstel-Tower price is assigned to its hotel component.

Marriott's May 22, 2018 retrospective press release explicitly states **November 1, 2017** for Moxy
Tokyo Kinshicho's opening. The Japanese date excerpt was verified in raw fetched text. The Pacifica
launch PDF timed out and was not needed as an unverified reference. The Marriott property page was
read through web, although its raw download returned 403. MICHELIN lists the exact 205-room property
and describes relative value/design positioning; Condé Nast Traveler independently describes small
entry-level rooms and value. The card keeps those tradeoffs, transit planning and rate conditions.
Both hotels use rates on request, with no invented current all-in quote. Neither hotel has a verified
hotel-specific development cost or matching benchmark; price/currency and engineering axes stay null.

Trip.com's opened Amstel snapshot contains 40 reviews and publishes Location, Service and Cleanliness
at 8.8/10, each converted to 4.5/5. Its Amenities score is not relabelled as Rooms, and no separate Value
score appears: Rooms and Value remain null. The smaller weighted sample is explicit in the basis.
The operator's separate TrustYou values were read but not mixed into this rubric. A verified guest
excerpt published October 10, 2026 is retained with its actual day. Booking's pages required JavaScript;
unopened Booking components are not used.

Moxy's opened Tripadvisor components are Rooms 4.2, Service 4.2, Location 3.8, Cleanliness 4.6 and Value
3.9 of 5, rounded to half points. Snapshot totals differed across opened versions, so no live-count
claim is made. The independent Condé Nast Traveler review is undated; its exact short excerpt was
verified in fetched page text. Its 100-word source budget is respected.

MICHELIN's current Moxy property selection is verified; editorial acclaim 2 represents a guide listing,
not a claim of two Keys. No Key award is asserted. Forbes Travel Guide's Tokyo directory was checked,
without a verified property distinction. For Amstel, the full opened MICHELIN Amsterdam listing
(38 hotels) and Forbes Amsterdam directory did not list the property; acclaim is 0 for these checked
selections. AAA's country coverage excludes Japan and the Netherlands. Guide references are retained
where they establish Moxy's recognition, rather than substituting hotel star class or guest scores.

Six distinct photos were visually inspected and saved to Azure, with public SHA-256 and native media
credit verification. Amstel uses the operator's family room, guest kitchen and exterior (the first two
are 1200-pixel assets). Moxy uses a bedroom, library and reception/bar, credited to isaac maiselman /
Courtesy Moxy Tokyo Kinshicho via Condé Nast Traveler. Nearby-hotel recommendation images are excluded.
Full addresses are Julianaplein 6, 1097 DN Amsterdam, and 3-4-2 Kotobashi, Sumida-ku, Tokyo 130-0022.
ArcGIS exact-address matches scored 100 and 96.52 respectively; neither uses a city-centre point.
Authenticated title-pattern and source-URL duplicate checks found no existing matching hotel pins on
either host.

Amsterdam climate uses KNMI Schiphol station 240, 1991–2020. The PDF text and rendered first page were
checked; monthly mean daily maxima and precipitation totals were transcribed from the correct
columns. Tokyo uses the already researched JMA station 47662, 1991–2020 normals, with the regional
wording changed from Urayasu park visits to Sumida city exploring. Rain bands use below 75 mm,
below 150 mm and at least 150 mm. Recommended months are editorial weather guidance, independent
of room prices and holiday crowds.

The initial Berlin Upper West candidate's current operator page identifies The Cloud One branding;
it was set aside rather than applying an old Motel One budget description to a changed identity.

Validation and database-assigned IDs follow below. No production code deployment or translation
run was performed; translations remain with the separate translation agent.

| Property | Production pin | Local pin |
| --- | --- | --- |
| MEININGER Hotel Amsterdam Amstel | 21283 | 21115 |
| Moxy Tokyo Kinshicho | 21284 | 21116 |

Native pin/date/address/author/reference/media-credit fields, hotel scores and development milestones
passed readback on both hosts. All four native pages returned HTTP 200. Local `/travel` renders both
additions without an application error and shows **Family 25 / Budget 21**. All 10 existing travel
tests and `git diff --check` passed. No data writes remain pending. Production category display awaits
an explicitly requested deployment.
