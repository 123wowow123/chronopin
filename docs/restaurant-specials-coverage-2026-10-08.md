# Restaurant specials coverage — October 8, 2026

Added 564 restaurant-special venues directly to the production database through the existing authenticated management API. No deployment was required. All 19 live city guides were checked after publishing.

11 city guides now have at least 50 qualifying restaurants. New listings require a published recurring offer schedule, a rating of at least 4.5/5, and at least 100 OpenTable text reviews. Ratings, review counts, addresses, coordinates, offer sources, and restaurant-supplied photo provenance are stored with the database records.

| City | Before | Added | Qualifying restaurants now |
| --- | ---: | ---: | ---: |
| [San Francisco](https://www.chronopin.com/restaurants/san-francisco#available-now) | 1 | 29 | 30 |
| [Seattle](https://www.chronopin.com/restaurants/seattle#available-now) | 1 | 49 | 50 |
| [San Jose](https://www.chronopin.com/restaurants/san-jose#available-now) | 1 | 21 | 22 |
| [Los Angeles](https://www.chronopin.com/restaurants/los-angeles#available-now) | 50 | 0 | 50 |
| [San Diego](https://www.chronopin.com/restaurants/san-diego#available-now) | 51 | 0 | 51 |
| [Phoenix](https://www.chronopin.com/restaurants/phoenix#available-now) | 1 | 49 | 50 |
| [San Antonio](https://www.chronopin.com/restaurants/san-antonio#available-now) | 2 | 17 | 19 |
| [Austin](https://www.chronopin.com/restaurants/austin#available-now) | 2 | 48 | 50 |
| [Fort Worth](https://www.chronopin.com/restaurants/fort-worth#available-now) | 1 | 24 | 25 |
| [Dallas](https://www.chronopin.com/restaurants/dallas#available-now) | 1 | 49 | 50 |
| [Houston](https://www.chronopin.com/restaurants/houston#available-now) | 2 | 48 | 50 |
| [Chicago](https://www.chronopin.com/restaurants/chicago#available-now) | 1 | 49 | 50 |
| [Columbus](https://www.chronopin.com/restaurants/columbus#available-now) | 1 | 39 | 40 |
| [Jacksonville](https://www.chronopin.com/restaurants/jacksonville#available-now) | 1 | 17 | 18 |
| [Charlotte](https://www.chronopin.com/restaurants/charlotte#available-now) | 1 | 8 | 9 |
| [Miami](https://www.chronopin.com/restaurants/miami#available-now) | 1 | 49 | 50 |
| [Philadelphia](https://www.chronopin.com/restaurants/philadelphia#available-now) | 1 | 49 | 50 |
| [New York](https://www.chronopin.com/restaurants/new-york#available-now) | 50 | 0 | 50 |
| [Boston](https://www.chronopin.com/restaurants/boston#available-now) | 1 | 19 | 20 |

## Evidence and limitations

[Listing-level audit](restaurant-specials-coverage-2026-10-08.csv) includes each added restaurant’s rating, review count, local service hours, offer source, conditions, and database ID.

Reviewed 2057 distinct restaurant profiles. Discovery covered public OpenTable happy-hour, lunch, and other regional lists; qualification came from each restaurant’s own published profile or operator website. Candidates are assigned to the nearest guide city and limited to 65 km from its center, so these guides include metropolitan neighborhoods and nearby towns. Distinct branches count as separate restaurants. Shared chain homepages use a branch-specific profile link to preserve the site’s per-restaurant deduplication.

Offer prose and labeled happy-hour service hours take precedence over reservation slots. Broad booking windows alone were excluded. Ambiguous schedules, expired offers, unresolved holiday restrictions found in the source, and unrelated events were not used to fill the target. For example, [Parkside’s FAQ](https://www.parkside-austin.com/faq), [Puesto Santa Clara](https://www.eatpuesto.com/location/santa-clara/), [Café Cruz](https://cafecruz.com/), and [Dos Rios](https://www.dosriosnb.com/) supplied operator-specific hours or conditions.

Cities below 50 remain below target; these are the verified listings found in this research pass, not a claim that no additional qualifying offers exist. Future additions should retain the same rating and published-schedule requirements.

The guide displays active offers and upcoming specials in separate sections. The upcoming section shows each qualifying restaurant’s next inactive offer, capped at 100 in the updated code, while currently active offers appear in the available-now section. San Diego’s existing 51 records were retained. The cap increase needs the next deployment; [the subsequent lunch audit](restaurant-lunch-specials-coverage-2026-10-08.md) records the additional live lunch coverage.

All 564 inserts were read back from the management API and found in their live guide data. Every new record passed the API schema and next-occurrence checks. 541 restaurant-supplied photo URLs passed a public image download check; listings without a usable photo were saved without one.
