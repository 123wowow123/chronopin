# Restaurant lunch specials — October 8, 2026

Saved **212 lunch offers across all 19 populated city guides** through the authenticated production management API: **177 new restaurant records and 35 additions to existing records**. Existing happy hours, menus, ratings and photos were retained when enriching an existing restaurant. Lunch content is live without a deployment.

The target was up to 50 lunch-special restaurants per city and up to 100 total restaurants with specials. **Miami reaches 50 lunch restaurants. The other 18 cities remain below the lunch target.** The table reports actual saved coverage, not a claim that no other qualifying offers exist.

| City | Lunch restaurants | Total restaurants with specials | Lunch offers added |
| --- | ---: | ---: | ---: |
| [San Francisco](https://www.chronopin.com/restaurants/san-francisco#available-now) | 6 | 35 | 6 |
| [Seattle](https://www.chronopin.com/restaurants/seattle#available-now) | 6 | 56 | 6 |
| [San Jose](https://www.chronopin.com/restaurants/san-jose#available-now) | 15 | 34 | 15 |
| [Los Angeles](https://www.chronopin.com/restaurants/los-angeles#available-now) | 9 | 57 | 9 |
| [San Diego](https://www.chronopin.com/restaurants/san-diego#available-now) | 5 | 56 | 5 |
| [Phoenix](https://www.chronopin.com/restaurants/phoenix#available-now) | 11 | 59 | 11 |
| [San Antonio](https://www.chronopin.com/restaurants/san-antonio#available-now) | 5 | 23 | 5 |
| [Austin](https://www.chronopin.com/restaurants/austin#available-now) | 12 | 58 | 12 |
| [Fort Worth](https://www.chronopin.com/restaurants/fort-worth#available-now) | 7 | 29 | 7 |
| [Dallas](https://www.chronopin.com/restaurants/dallas#available-now) | 14 | 61 | 14 |
| [Houston](https://www.chronopin.com/restaurants/houston#available-now) | 11 | 60 | 11 |
| [Chicago](https://www.chronopin.com/restaurants/chicago#available-now) | 17 | 63 | 17 |
| [Columbus](https://www.chronopin.com/restaurants/columbus#available-now) | 5 | 44 | 5 |
| [Jacksonville](https://www.chronopin.com/restaurants/jacksonville#available-now) | 4 | 21 | 4 |
| [Charlotte](https://www.chronopin.com/restaurants/charlotte#available-now) | 3 | 12 | 3 |
| [Miami](https://www.chronopin.com/restaurants/miami#available-now) | 50 | 93 | 50 |
| [Philadelphia](https://www.chronopin.com/restaurants/philadelphia#available-now) | 10 | 60 | 10 |
| [New York](https://www.chronopin.com/restaurants/new-york#available-now) | 17 | 66 | 17 |
| [Boston](https://www.chronopin.com/restaurants/boston#available-now) | 5 | 24 | 5 |

[Offer-level audit](restaurant-lunch-specials-coverage-2026-10-08.csv) records ratings, review counts, published local hours, expiry dates, conditions, source links, database IDs and whether the restaurant was created or enriched.

Discovery checked 3,077 qualified profiles from lunch and regional restaurant lists, alongside the existing research cache. The cities were taken from the live city navigation; configured European cities without populated guides were outside this pass. New listings require at least a 4.5/5 rating and 100 OpenTable text reviews. Lunch combos, advertised lunch specials, express lunches, buffets and prix fixe lunch menus qualify. Ordinary lunch dishes, expired restaurant-week menus, and offers with unresolved holiday restrictions were excluded.

Schedules come from published offer prose or labeled lunch hours. For named lunch-only experiences, bounded published lunch booking windows supply the schedule when service hours are not separately listed. When a special is published until a specific time, its start follows the restaurant’s published opening time. Each offer uses the city’s local time zone. Mixed lunch/dinner experiences were separated using the explicitly published lunch price and service window. Seasonal offers retain their published expiry and blocked dates.

[P.F. Chang’s published lunch terms](https://www.pfchangs.com/offers/lunch-and-house-specials) confirm weekday service from opening until 3 pm and location-dependent prices. [Fleming’s lunch menu](https://www.flemingssteakhouse.com/menus/lunch) confirms the two-course prix fixe; the individual branch pages confirm its lunch days and hours.

All 212 saved offers passed schema, rating, source and next-occurrence checks after database readback. Public image checks passed for 142 new restaurant-supplied photo URLs; one inaccessible photo was omitted. All 19 live city guides returned HTTP 200 and included their lunch offers in the guide data.

The code raises the upcoming restaurant limit from 50 to 100, with sorting and deduplication tests passing. That display-limit change needs the next application deployment; the database additions do not. Available and upcoming offers continue to use separate sections, so a lunch special remains discoverable outside its active hours.
