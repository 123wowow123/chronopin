# New Zealand and Mexico restaurant guides

Checked October 9, 2026. These use the same country/city landing page and four
content sections as San Diego and Japan. Country navigation is ordered by the
westernmost supported city; city navigation by longitude. Empty tabs are hidden.
Research each section before leaving it empty, and preserve source gaps in notes.

New Zealand cities, west to east: Christchurch, Auckland, Wellington, all on
`Pacific/Auckland`, including daylight saving. Mexico: Guadalajara, Monterrey,
Mexico City, using `America/Mexico_City` or `America/Monterrey` as appropriate.

## Verified content

| City | Established selection | Researched specials |
| --- | --- | --- |
| Christchurch | Twenty Seven Steps | Rambler, daily 16:00–18:00 |
| Auckland | Ahi | Somm Sundowns, Tuesday–Sunday 16:00–18:00 |
| Wellington | Boulcott Street Bistro | Bebemos, weekdays 15:00–17:00 and Tuesday–Saturday 20:00–22:00 |
| Guadalajara | Alcalde | Moshi Moshi The Landmark, Thursday 12:00–22:00 |
| Monterrey | Pangea in metropolitan San Pedro Garza García | Moshi Moshi Galerías Monterrey, Thursday 12:00–22:00 |
| Mexico City | Rosetta | Moshi Moshi Roma, Thursday 12:00–23:00 |

Menu items appear on restaurant pin details and specials cards with NZD or MXN
prices. All six established selections have Azure-hosted operator images with
source metadata. Ahi's photograph shows harvested tomatoes; Boulcott's exterior
photograph is historical (2016). The shared Moshi roll image is an illustrative
brand menu photograph, not a photograph of any of the three branches.

## Menu research and limitations

Always search deeply for named items: branch websites, linked PDFs, menu images,
ordering menus and credible branch-specific sources. Transcribe verified names
without prices as `Price not published`; never borrow another branch's menu or
assume an ordinary dish qualifies for happy hour. Keep validity dates, currencies,
service charges and restrictions. Partial transcriptions use `coverage: sample`.

- [Ahi](https://ahirestaurant.co.nz/menu-ahi/): current linked June 2026 dinner and
  dessert PDFs; includes variable scampi pricing and the per-person tasting menu.
- [Twenty Seven Steps](https://twentysevensteps.co.nz/twentyseven): current seasonal
  food menu, including dishes priced on application. Its Downstairs venue was
  excluded from the restaurant's hours and menu.
- [Boulcott](https://boulcottstreetbistro.co.nz/menu/): September 2026 PDF, including
  lunch-only T-bone and desserts. The Monday half-price label belongs to champagne,
  not the T-bone; no inferred steak discount was added.
- [Alcalde](https://alcalde.com.mx/): operator's linked menu PDFs return 404.
  [Current branch reservations](https://www.opentable.com.mx/r/alcalde-guadalajara)
  publish a ten-course tasting experience at MX$3,150 per person. Individual courses
  remain unpublished. The January 2024 à la carte listing is stale and was excluded.
- [Pangea](https://restaurantepangea.com/menu-restaurante-pangea/): linked Google
  Drive food and dessert PDFs, MXN including 16% VAT. À la carte selection is
  transcribed; separate set-menu pages are not fully reproduced.
- [Rosetta](https://rosetta.com.mx/menu): Spanish menu dated October 8, 2026, with
  32 named dishes and no published prices. Every dish records that price gap.
- [Somm](https://sommcellardoor.co.nz/whats-on/somm-sundowns): July 2026 happy-hour
  image lists cocktails at NZ$15, wine at NZ$10 and guest beer at NZ$8. Although
  promotion prose says daily, published hours omit Monday; service windows follow
  Tuesday–Sunday. No unlisted ordinary wines are assumed to participate.
- [Rambler](https://www.therambler.co.nz/menu): all 16 items in its distinct
  happy-hour section, with prices; only the operating Christchurch branch is used.
- [Bebemos](https://bebemos.co.nz/): homepage promotion plus autumn 2026 food PDF
  for named desserts. Drinks/desserts NZ$10 and tasting board NZ$15. Specific wine
  producers and rotating taps are not invented.
- [Moshi promotion](https://www.moshimoshi.mx/tycs) explicitly names the three
  participating branches and expires December 31, 2026. The operator's shared
  [Kaiten menu](https://www.moshimoshi.mx/copia-de-para-compartir) supplies 17 roll
  names. Thursday prices apply only to four-piece rolls on the belt, with a drink
  purchase per guest. Sake Drinks require age verification and food. Dine-in only,
  no eight-piece ordered rolls, modifications, extra discounts or Club Moshi points.
  Repository source fragments distinguish the branches on the shared terms page;
  they are identifiers, not claimed HTML section anchors. Branch street addresses
  were not verified, so cards retain the operator's mall/branch identity and city.

## Opening research gaps

Coming-soon and just-opened tabs were researched, but no opening pins were added
without a reliable restaurant opening date and branch identity:

- Rambler's Auckland and Wellington sites say coming soon without a date.
- Wellington Pavilion has conflicting timeline reports and chef departure news;
  no current operator-confirmed opening date was established.
- Christchurch hotel-opening reports do not establish a named restaurant opening.
- Auckland Origine's new chapter announcement does not identify an opening day.
- Los Hidalgos Guadalajara coverage describes a September reception; the operator
  menu site lists Monterrey branches. No Monterrey menu was borrowed for Guadalajara.
- Mexico City Le Secret coverage lacks a verified opening day. Expired Mexican
  September-only promotions were excluded.

The verified specials have no fabricated ratings. Keep the Specials tab visible
whenever active or upcoming offers exist, including outside service hours and
without review scores. Upcoming cards show the next local start date and time;
active cards show availability and the end time. Expired offers are excluded.
Populate missing sections with verified entries as evidence becomes available.

## Local setup and validation

```sh
npm run restaurants:seed -- --regions=guadalajara,monterrey,mexico-city,christchurch,auckland,wellington
```

Local import added six restaurant pins (7019–7024) and six supplemental specials
venues. Re-running preserves existing records. Public Azure image bytes and hashes
were verified before switching catalog references; no photo binaries enter Git.

Focused checks cover currencies, closest-city routing, service windows, Mexican
promotion expiry, source coverage and unpublished prices. One pre-existing catalog
coverage test remains blocked by the missing St. JOHN Smithfield menu profile.

TypeScript passes. Browser checks passed for all six city pages and all six pin
menus at 1440px and 390px, with HTTP 200, no browser exceptions or horizontal
overflow. Empty opening links fall back to the populated top-restaurants view.
Focused tests: 79 passed, one pre-existing St. JOHN menu-coverage failure. A seed
dry run confirms zero additional pins, photo attachments or special venues.
