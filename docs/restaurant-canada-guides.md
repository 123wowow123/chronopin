# Canadian restaurant guides

Checked October 8, 2026. Twelve city guides contain 36 established restaurant
picks, with three per city. Each entry has a restaurant source, a locally saved
image with provenance, a street address, map coordinates and a branch-specific
menu/dining-information and visit profile.

| City | Route | Restaurant picks |
| --- | --- | --- |
| Victoria | /restaurants/victoria | [Marilena](https://www.marilenacafe.com/), [Il Terrazzo](https://www.ilterrazzo.com/), [Wind Cries Mary](https://www.windcriesmary.ca/) |
| Vancouver | /restaurants/vancouver | [Published on Main](https://publishedonmain.com/), [St. Lawrence](https://www.stlawrencerestaurant.com/), [AnnaLena](https://www.annalena.ca/) |
| Calgary | /restaurants/calgary | [River Café](https://www.river-cafe.com/), [Major Tom](https://www.majortombar.ca/), [Model Milk](https://www.modelmilk.ca/) |
| Edmonton | /restaurants/edmonton | [RGE RD](https://www.rgerd.ca/), [Woodwork](https://woodworkyeg.com/), [Sabor](https://sabor.ca/) |
| Saskatoon | /restaurants/saskatoon | [Hearth](https://www.hearth.restaurant/), [Odla](https://www.odla.ca/), [Primal](https://primalpasta.ca/) |
| Winnipeg | /restaurants/winnipeg | [deer + almond](https://www.deerandalmond.com/), [Clementine](https://clementinewinnipeg.com/), [Passero](https://www.passerowinnipeg.com/) |
| Hamilton | /restaurants/hamilton | [Berkeley North](https://www.berkeleynorth.ca/), [Quatrefoil](https://www.quatrefoilrestaurant.com/), [Ancaster Mill](https://ancastermill.ca/) |
| Toronto | /restaurants/toronto | [Alo](https://alorestaurant.com/), [DaiLo](https://dailoto.com/), [Richmond Station](https://richmondstation.ca/) |
| Ottawa | /restaurants/ottawa | [Atelier](https://www.atelierrestaurant.ca/), [Riviera](https://dineriviera.com/), [North & Navy](https://www.northandnavy.com/) |
| Montréal | /restaurants/montreal | [Toqué!](https://www.restaurant-toque.com/), [Mon Lapin](https://vinmonlapin.com/), [Damas](https://www.damas.ca/) |
| Québec City | /restaurants/quebec-city | [Tanière³](https://taniere3.com/), [Laurie Raphaël](https://laurieraphael.com/), [ARVI](https://www.restaurantarvi.ca/) |
| Halifax | /restaurants/halifax | [Bar Kismet](https://barkismet.com/), [Edna](https://www.ednarestaurant.com/), [The Bicycle Thief](https://bicyclethief.ca/) |

These are Chronopin editorial selections. Established restaurants use the guide
verification date; they do not receive the Restaurant Opening tag or appear as
new openings. No discount, external rating, price tier or upcoming opening date
is inferred from inclusion. Canadian menu prices are identified as CAD.

Operator pages are the source for menu links, addresses and available contact
details. North & Navy’s address, phone and hours are corroborated by its
[OpenTable profile](https://www.opentable.ca/north-and-navy). Missing hours and
unverified phone numbers remain empty. Major Tom’s text-only contact line is
not turned into a call button. Passero uses its current Corydon Avenue address;
closed restaurants were excluded.

Map points were checked against published street addresses using OpenStreetMap.
Hearth uses its host building, Remai Modern. Sabor and Ancaster Mill use the
destination coordinates from their own Google Maps links because address
searches returned ambiguous results. Map points inside shared buildings are
approximate. Photo originals, credits and menu source URLs are stored alongside
the catalog records; menu PDFs remain links to the operators’ published files.

The local database was seeded with 36 restaurant pins (6492–6527). Canadian
entries join country navigation only when their database pins are present.
Existing routes provide canonical metadata, sitemap integration, transition
spinners, neighbourhood filters, map controls and kilometre distances.
Saskatoon uses America/Regina to keep Saskatchewan’s year-round clock.

Deploy the catalog and images, then run this command against the production
database to make the guides available in production navigation:

```sh
npm run restaurants:seed -- --regions=victoria,vancouver,calgary,edmonton,saskatoon,winnipeg,hamilton,toronto,ottawa,montreal,quebec-city,halifax
```

The seed is idempotent and preserves existing pins. Production was seeded on
October 8, 2026: the 36 Canadian records are pins 6879–6914. All 12 city guides
return their three picks through the live guide API, and production browser
checks confirmed Toronto and Vancouver cards with loaded photographs and
Canada navigation. Canadian discounted specials are not populated by this seed.

Validation: all 12 local routes return HTTP 200 and display their three picks
and Canada navigation. Desktop/mobile browser checks pass, with no browser
errors or mobile horizontal overflow; Toronto-to-Vancouver navigation and the
restaurant hero/count were also checked. Typecheck and lint pass. Of 35 focused
unit tests, 34 pass; the existing global catalog/menu coverage test fails because
47 older catalog entries already lacked menu profiles before this change. All
36 Canadian profiles pass their dedicated menu-source checks.
