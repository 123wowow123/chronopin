# Travel shelf expansion — eighth round, 2026-11-22

Added MEININGER Hotel Lyon Centre Berthelot to the family and budget shelves and YOTEL Edinburgh to
budget. English research catalog: `scripts/hotels/travel-expansion-2026-11-22-round8.json`.
Replay with `node scripts/hotels/expandTravelShelves.mjs --catalog scripts/hotels/travel-expansion-2026-11-22-round8.json`;
append `--apply` to save. Audit snapshots and database-assigned-ID manifest are under
`.scrape/prod-batches/travel-expansion-2026-11-22-round8/`.

Covivio's November 13, 2019 release specifies **December 1, 2019** for Lyon Centre Berthelot. This is
an owner-announced day, corroborated by the operator's opening account and December 2 contemporary
launch coverage in Le Progrès; the latter does not independently print the precise day. The owner
pre-opening release planned 176 rooms; the operator's launch report gives **169 rooms / 590 beds**,
used here. The same owner PDF describes a **different Paris hotel** costing €47 million: that figure
is not assigned to Lyon. Private family-room occupancy, cot arrangements and shared kitchen access
must be checked for the booked room. Dorm-bed lead rates are not family-room quotes.

YOTEL Edinburgh's opening is **August 5, 2019**, explicitly recorded in the operating company's
accounts: Erskine House Opco Limited, company 11736604, accounts for the year ended December 31,
2025, filed July 6, 2026. The document is scanned: printed page 12 / PDF page 15 was rendered and
visually inspected, with OCR used only to locate the passage. This operator record resolves the
conflicting August 1 press unveiling report. The current official property page lists Premium Queen
16 m² / maximum two guests and Premium Family 22 m² / maximum four, plus a gym and Revolve lounge.
The Times' hosted November 16, 2019 review is retained as a historical firsthand account, with the
hosted stay disclosed in the rubric basis. Its old Komyuniti menu, offers and £60 opening-era price
are omitted. Rates for both hotels remain on request; no live all-in quote or fixed saving is invented.
Neither hotel has a verified hotel-specific construction cost or matching benchmark, so price,
currency and unsupported engineering axes remain null.

Opened Tripadvisor component snapshots, out of five, are rounded to half points:

| Property | Rooms | Service | Location | Cleanliness | Value | Snapshot reviews |
| --- | --- | --- | --- | --- | --- | --- |
| Lyon | 3.8 | 4.1 | 4.0 | 4.1 | 3.9 | 187 |
| Edinburgh | 4.1 | 4.1 | 4.6 | 4.4 | 4.0 | 1,498 |

These counts describe the opened snapshots, not current live totals. Lyon's short Audrina V family
and kitchen excerpt is displayed for October 2025 without an exact day, so publishedDate is null.
The source warns excerpts may be translated automatically. Edinburgh uses the exact nine-word
location/staff sentence from the named Times review, republished on the operator site. Review and
source quote budgets are respected.

MICHELIN Edinburgh's 30-hotel directory was read without a YOTEL match. The Lyon MICHELIN directory
and Forbes destination pages were inaccessible; property searches did not establish awards. Acclaim
is null for both because the check is incomplete; no Keys, Forbes distinction or zero is fabricated.
AAA's geographic hotel program excludes France and the United Kingdom.

Six distinct official photos were downloaded and visually inspected: Lyon family room with cot,
lobby and shared guest kitchen; Edinburgh entrance, Premium Queen bedroom and gym. Property-specific
filenames and official page context were checked; nearby-property recommendation images are excluded.
Images are stored in Azure, with public SHA-256 and native credit verification. Full addresses are
7 Rue Professeur Zimmermann, 69007 Lyon, France, and 68–73 Queen Street, Edinburgh EH2 4NA, Scotland,
United Kingdom. ArcGIS point-address matches scored 100 for both (Edinburgh geocoded at number 68,
the first number in the operator's range). No city-centre points are used. Broad authenticated title
patterns and exact source-URL identity checks found no duplicate hotel pins on either host.

Lyon seasonal data comes from Météo-France Lyon-Bron station 69029001, **1991–2020**; PDF text and the
rendered first page were checked against normal daytime highs and monthly rain. Edinburgh uses the
**first, 1991–2020 Edinburgh Gogarbank table** on the Met Office page, geohash `gcvwd8sjq`. The initially
returned Kirkcaldy page was rejected; its geohash and figures are not saved in the catalog. Rain bands
are below 75 mm / below 150 mm / at least 150 mm. Seasonal recommendations are regional editorial
weather guidance, independent of room prices and event crowds.

No code deployment or translation run was performed. Translations remain with the separate agent.

| Property | Production pin | Local pin |
| --- | --- | --- |
| MEININGER Hotel Lyon Centre Berthelot | 21309 | 21141 |
| YOTEL Edinburgh | 21310 | 21142 |

Native title/source/date/address/coordinates/author/reference/media-credit fields, hotel rubric and
factory milestones passed readback on both hosts. All four native pages returned HTTP 200. Local
`/travel` renders both additions without an application error and shows **Family 26 / Budget 23**.
All 10 existing travel tests and `git diff --check` passed. No data writes remain pending.
Production category display awaits an explicitly requested code deployment.
