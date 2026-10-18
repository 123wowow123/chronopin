# Restaurant price audit

Checked October 6, 2026.

Added 73 sourced price records: 70 regional restaurants and three San Diego openings. The city catalogs previously supplied 34 tiers; 107 restaurant source keys now resolve to a tier. Opening cards now display the same price lookup used by landing cards and pin details.

Sources were checked against the restaurant name and street address. OpenTable numeric bands are normalized using the application convention documented in [restaurant-scraping.md](restaurant-scraping.md); the original bands remain in the registry evidence. Élephante Dallas and Bar Volpe use matched operator structured tiers where booking listings differ. No tier is inferred from an individual menu item or a tasting-menu amount.

The remaining 64 regional records have no verified current location-specific tier from the checked operator, booking, or review pages. Several are future openings or reopenings. Kampar and Musume have historical booking listings at their reopening addresses; those old prices are not assigned to future service. Brix Barbecue only had a stale closed directory listing with ambiguous price icons. Historical worldwide opening pins outside these city catalogs remain outside this backfill.

## Added tiers

| Restaurant | Tier | Evidence |
| --- | --- | --- |
| 148 Noble Street | $$ | [Price range: The Infatuation](https://www.theinfatuation.com/new-york/reviews/148-noble-street) |
| One Bryant Park | $$$ | [Price range: The Infatuation](https://www.theinfatuation.com/new-york/reviews/one-bryant-park) |
| Iara | $$ | [Price range: The Infatuation](https://www.theinfatuation.com/new-york/reviews/iara) |
| Pari | $$ | [Price range: The Infatuation](https://www.theinfatuation.com/new-york/reviews/pari) |
| Marée | $$ | [Price range: The Infatuation](https://www.theinfatuation.com/los-angeles/reviews/maree) |
| Gable | $$$ | [Price range: operator](https://gable.la/) |
| Spacca Tutto | $$ | [Price range: The Infatuation](https://www.theinfatuation.com/los-angeles/reviews/spacca-tutto) |
| Kozo Los Angeles | $ | [Price range: The Infatuation](https://www.theinfatuation.com/los-angeles/guides/la-fall-restaurant-openings-2026) |
| Little Luck | $$ | [Price range: The Infatuation](https://www.theinfatuation.com/los-angeles/reviews/little-luck) |
| Handroll Hawker | $ | [Price range: The Infatuation](https://www.theinfatuation.com/san-francisco/reviews/handroll-hawker) |
| Florecita | $ | [Price range: The Infatuation](https://www.theinfatuation.com/san-francisco/reviews/florecita) |
| Sergeant Ma | $$$ | [Price range: The Infatuation](https://www.theinfatuation.com/san-francisco/reviews/sergeant-ma) |
| 15 Romolo | $$ | [Price range: The Infatuation](https://www.theinfatuation.com/san-francisco/reviews/15-romolo) |
| Black Briar | $$ | [Price range: The Infatuation](https://www.theinfatuation.com/chicago/reviews/black-briar) |
| Victory & Vice | $$ | [Price range: The Infatuation](https://www.theinfatuation.com/chicago/reviews/victory-and-vice) |
| Mack Allen’s | $$$ | [Price range: The Infatuation](https://www.theinfatuation.com/houston/reviews/mack-allens) |
| The Bixby | $ | [Price range: The Infatuation](https://www.theinfatuation.com/houston/reviews/the-bixby) |
| Grandioso | $$ | [Price range: operator](https://grandiosophoenix.com/) |
| Teo Teo | $ | [Price range: The Infatuation](https://www.theinfatuation.com/miami/reviews/teo-teo) |
| Anako | $ | [Price range: The Infatuation](https://www.theinfatuation.com/miami/reviews/anako-miami) |
| Flaky | $ | [Price range: The Infatuation](https://www.theinfatuation.com/miami/guides/miami-fall-restaurant-openings-2026) |
| Kush — Wynwood | $$ | [Price range: The Infatuation](https://www.theinfatuation.com/miami/reviews/kush) |
| Royale Pizza Napoletana | $ | [Price range: The Infatuation](https://www.theinfatuation.com/miami/guides/miami-fall-restaurant-openings-2026) |
| Genghis Cohen — Miami | $ | [Price range: The Infatuation](https://www.theinfatuation.com/miami/reviews/genghis-cohen-miami) |
| Hawksmoor — Boston | $$$$ | [Price range: operator](https://thehawksmoor.com/us/locations/boston/) |
| Rubys | $ | [Price range: The Infatuation](https://www.theinfatuation.com/seattle/reviews/rubys-pike-place) |
| Taz + Kohta | $$$ | [Price range: The Infatuation](https://www.theinfatuation.com/seattle/reviews/taz-kohta) |
| Sweetgreen — Jacksonville | $$ | [Price range: operator](https://www.sweetgreen.com/locations/st-johns-town-center) |
| Escuela | $$$ | [Price range: The Infatuation](https://www.theinfatuation.com/austin/reviews/escuela) |
| Ben & Lynn’s | $ | [Price range: The Infatuation](https://www.theinfatuation.com/austin/reviews/ben-and-lynns) |
| Panciuto | $$ | [Price range: The Infatuation](https://www.theinfatuation.com/austin/reviews/panciuto) |
| Nishi | $$ | [Price range: The Infatuation](https://www.theinfatuation.com/austin/reviews/nishi) |
| Ignite | $$ | [Price range: operator](https://www.eatatignite.com/) |
| Boia De | $$ | [Price range: operator](https://www.boiaderestaurant.com/) |
| Ariete | $$$ | [Price range: The Infatuation](https://www.theinfatuation.com/miami/reviews/ariete) |
| COTE — Miami | $$$$ | [Price range: The Infatuation](https://www.theinfatuation.com/miami/reviews/cote-miami) |
| Asta | $$$$ | [Price range: The Infatuation](https://www.theinfatuation.com/boston/reviews/asta) |
| Bar Volpe | $$ | [Price range: operator](https://www.barvolpe.com/) |
| Canlis | $$$$ | [Price range: The Infatuation](https://www.theinfatuation.com/seattle/reviews/canlis) |
| The Walrus and the Carpenter | $$ | [Price range: The Infatuation](https://www.theinfatuation.com/seattle/reviews/the-walrus-and-the-carpenter) |
| Uchi — Austin | $$$$ | [Price range: The Infatuation](https://www.theinfatuation.com/austin/reviews/uchi) |
| ADEGA | $$$$ | [Price range: The Infatuation](https://www.theinfatuation.com/san-jose/reviews/adega) |
| Petiscos | $$ | [Price range: The Infatuation](https://www.theinfatuation.com/san-jose/reviews/petiscos) |
| Counter- | $$$$ | [Price range: The Infatuation](https://www.theinfatuation.com/charlotte/reviews/counter) |
| Haberdish | $ | [Price range: The Infatuation](https://www.theinfatuation.com/charlotte/reviews/haberdish) |
| Agni | $$$$ | [Price range: The Infatuation](https://www.theinfatuation.com/columbus/reviews/agni) |
| Chapman’s Eat Market | $$ | [Price range: The Infatuation](https://www.theinfatuation.com/columbus/reviews/chapmans-eat-market) |
| KYU Los Angeles | $$ | [Price range: The Infatuation](https://www.theinfatuation.com/los-angeles/guides/la-fall-restaurant-openings-2026) |
| Zane’s Pizza & Ice Cream | $$ | [Price range: operator](https://zanespizzaicecream.com/) |
| LUNA Mexican Kitchen — The Alameda | $$ | [Price range: operator](https://www.lunamexicankitchen.com/hours-and-locations/) |
| Élephante | $$ | [Price range: operator](https://www.elephanterestaurants.com/location/dallas/) |
| Docent Steak & Lounge | $$$$ | [Price range: OpenTable](https://www.opentable.com/r/docent-dallas) |
| Asado Life — Jacksonville | $$$ | [Price range: OpenTable](https://www.opentable.com/r/asado-life-ii-jacksonville) |
| Raíces | $$$$ | [Price range: OpenTable](https://www.opentable.com/r/raices-charlotte) |
| Guard and Grace — Charlotte | $$$ | [Price range: OpenTable](https://www.opentable.com/restaurant/profile/1549540) |
| Sixty Vines — La Cantera | $$ | [Price range: OpenTable](https://www.opentable.com/r/sixty-vines-la-cantera-san-antonio) |
| Rue Saint-Marc | $$$$ | [Price range: OpenTable](https://www.opentable.com/r/rue-saint-marc-reservations-jacksonville) |
| Restaurant Orsay | $$ | [Price range: OpenTable](https://www.opentable.com/r/restaurant-orsay-jacksonville) |
| Bluebonnet & Thyme | $$$ | [Price range: OpenTable](https://www.opentable.com/r/bluebonnet-and-thyme-reservations-dallas) |
| Zenita | $$$ | [Price range: OpenTable](https://www.opentable.com/r/zenita-reservations-san-antonio) |
| Amar | $$$$ | [Price range: OpenTable](https://www.opentable.com/restaurant/profile/1519672) |
| Carolyn’s Modern Vietnamese | $$$ | [Price range: OpenTable](https://www.opentable.com/restaurant/profile/1494604) |
| 311 Omakase | $$$$ | [Price range: MICHELIN Guide](https://guide.michelin.com/en/massachusetts/boston_2914838/restaurant/311-omakase) |
| Goldee’s Barbecue | $$ | [Price range: MICHELIN Guide](https://guide.michelin.com/us/en/texas/fort-worth_2954653/restaurant/goldee-s) |
| Panther City BBQ | $$ | [Price range: MICHELIN Guide](https://guide.michelin.com/us/en/texas/fort-worth_2954653/restaurant/panther-city-bbq) |
| Barley Swine | $$$$ | [Price range: MICHELIN Guide](https://guide.michelin.com/us/en/texas/austin_2958315/restaurant/barley-swine) |
| InterStellar BBQ | $$ | [Price range: MICHELIN Guide](https://guide.michelin.com/us/en/texas/austin_2958315/restaurant/interstellar-bbq) |
| Rada | $$$ | [Price range: MICHELIN Guide](https://guide.michelin.com/us/en/north-carolina/charlotte_2987283/restaurant/rada-1241833) |
| Congaree and Penn | $$$$ | [Price range: Visit Jacksonville](https://www.visitjacksonville.com/directory/congaree-and-penn-restaurant/) |
| Altura | $$$$ | [Price range: Restaurant Guru](https://restaurantguru.com/Altura-Seattle) |
| Serpent & Stone | $$$ | [Price range: OpenTable](https://www.opentable.com/r/a-serpent-and-stone-san-diego) |

| Maranello | $$$ | [Price range: OpenTable](https://www.opentable.com/r/maranello-san-diego) |
| Telefèric Barcelona | $$ | [Price range: OpenTable](https://www.opentable.com/r/teleferic-barcelona-san-diego) |

## Still unverified

| City | Restaurant | Location source |
| --- | --- | --- |
| new-york | Kine Musubi | [Source](https://www.kinemusubi.com/) |
| new-york | Anderson Cafe & Restaurant | [Source](https://ny.eater.com/news/413569/nyc-new-restaurant-openings-september-2026) |
| san-francisco | Olive Juice | [Source](https://www.eatolivejuice.com/) |
| san-francisco | Shinka | [Source](https://jayhotelsf.com/eat-drink/shinka/) |
| chicago | Gunny’s Pub | [Source](https://gunnyspub.com/) |
| chicago | Molino Los Hermanos | [Source](https://chicago.eater.com/restaurant-news/169239/anticipated-new-chicago-restaurants-opening-fall-2026) |
| chicago | Cha Chin | [Source](https://chicago.eater.com/restaurant-news/169239/anticipated-new-chicago-restaurants-opening-fall-2026) |
| chicago | Gibsons Tavern | [Source](https://chicago.eater.com/restaurant-news/169239/anticipated-new-chicago-restaurants-opening-fall-2026) |
| houston | Trill Burgers — Westheimer | [Source](https://www.trill-burgers.com/#westheimer) |
| houston | Tapestry | [Source](https://www.houstonpress.com/restaurants/openings-and-closings-the-branch-is-open-trill-4-arrives/) |
| houston | Little Bird | [Source](https://www.houstonchronicle.com/food-restaurants/article/little-bird-heights-opening-22416342.php/) |
| houston | Bar Bludorn — The Woodlands | [Source](https://www.barbludorn.com/#the-woodlands) |
| phoenix | EggBred | [Source](https://eggbred.com/#phoenix) |
| phoenix | SoLuna Eats | [Source](https://solunaeatsaz.com/) |
| phoenix | Pho Sedona | [Source](https://phosedonaaz.com/) |
| phoenix | Salta | [Source](https://www.whatsopening.com/az/phoenix/downtown-phoenix) |
| san-antonio | Rosso | [Source](https://www.visitsanantonio.com/media/media-kit/whats-new-in-san-antonio/) |
| san-antonio | Barberry | [Source](https://www.visitsanantonio.com/media/media-kit/whats-new-in-san-antonio/) |
| san-antonio | Los Tios — Alamo Heights | [Source](https://www.lostiosrestaurant.com/#alamo-heights) |
| philadelphia | Aogami | [Source](https://aogamiphilly.com/) |
| philadelphia | Panco | [Source](https://pancophilly.com/) |
| philadelphia | Ayat — Center City | [Source](https://www.ayatnyc.com/#philadelphia) |
| philadelphia | Field Day | [Source](https://www.fielddayphilly.com/) |
| philadelphia | Kampar | [Source](https://www.kamparphilly.com/) |
| dallas | Marlowe | [Source](https://marlowelounge.com/) |
| dallas | River Sing | [Source](https://www.papercitymag.com/restaurants/dallas-restaurant-openings-this-fall/) |
| dallas | Casa Pio | [Source](https://www.casapio.rest/) |
| boston | Celine | [Source](https://www.celineboston.com/) |
| boston | Harry Hare’s | [Source](https://boston.eater.com/restaurant-news/124663/boston-restaurants-fall-2026-openings-preview) |
| boston | Jazz Urbane Cafe | [Source](https://www.jazzurbanecafe.com/) |
| boston | Session House | [Source](https://boston.eater.com/restaurant-news/124663/boston-restaurants-fall-2026-openings-preview) |
| boston | Ebisuya Market | [Source](https://www.ebisuyamarket.com/) |
| seattle | GoodMart | [Source](https://www.theinfatuation.com/seattle/reviews/goodmart) |
| seattle | Janta | [Source](https://www.theinfatuation.com/seattle/guides/seattle-fall-restaurant-openings-2026) |
| seattle | Pearl Diver | [Source](https://www.theinfatuation.com/seattle/guides/seattle-fall-restaurant-openings-2026) |
| seattle | Cairo | [Source](https://www.theinfatuation.com/seattle/guides/seattle-fall-restaurant-openings-2026) |
| jacksonville | Habit Burger & Grill — River City | [Source](https://www.jaxdailyrecord.com/news/2026/sep/18/habit-burger-opening-sept-21-in-river-city-marketplace/) |
| jacksonville | Boathouse Avondale | [Source](https://www.jaxdailyrecord.com/news/2026/sep/25/boathouse-avondale-set-to-open-around-thanksgiving/) |
| jacksonville | Dalmoros Fresh Italian — Jacksonville | [Source](https://www.news4jax.com/news/local/2026/08/26/new-italian-restaurant-announced-in-five-points-theater-building/) |
| jacksonville | Happy Medium Books Café | [Source](https://www.whatsopening.com/fl/jacksonville/restaurants) |
| fort-worth | J. Rae’s Bakery — Fort Worth | [Source](https://fortworthfounded.com/fort-worths-newest-restaurants-and-bars-now-open-and-opening-soon-september-2026/) |
| fort-worth | Mariscos Cortez | [Source](https://mariscoscortez.com/) |
| fort-worth | Ave Modern Mediterranean | [Source](https://www.avefortworth.com/) |
| fort-worth | Flora House | [Source](https://fortworthfounded.com/fort-worths-newest-restaurants-and-bars-now-open-and-opening-soon-september-2026/) |
| fort-worth | Beverly’s Downtown | [Source](https://fortworthfounded.com/fort-worths-newest-restaurants-and-bars-now-open-and-opening-soon-september-2026/) |
| fort-worth | Musume — Fort Worth | [Source](https://www.musumedallas.com/fort-worth-tx) |
| austin | Chista | [Source](https://www.theinfatuation.com/austin/guides/austin-fall-restaurant-openings-2026) |
| austin | Shola | [Source](https://www.theinfatuation.com/austin/guides/austin-fall-restaurant-openings-2026) |
| san-jose | BitterBuck | [Source](https://www.instagram.com/bitterbucksj/) |
| san-jose | Grande Pizzeria | [Source](https://www.bizjournals.com/sanjose/news/2026/08/06/grande-pizzeria-san-jose-reopening.html) |
| san-jose | Tejer | [Source](https://www.whatsopening.com/ca/san-jose/restaurants) |
| san-jose | Tai Er Sichuan Cuisine — Valley Fair | [Source](https://www.whatsopening.com/ca/san-jose/restaurants) |
| san-jose | Tang Bar — San Jose | [Source](https://www.whatsopening.com/ca/san-jose/restaurants) |
| charlotte | Sweet July Cafe — Charlotte | [Source](https://theminagroup.com/restaurants/sweet-july-cafe-charlotte/) |
| charlotte | FARE — Charlotte | [Source](https://traceyknowscharlotte.com/blog/new-restaurants-charlotte-fall-2026/) |
| charlotte | Bourbon Steak — Charlotte | [Source](https://traceyknowscharlotte.com/blog/new-restaurants-charlotte-fall-2026/) |
| charlotte | Roe & Olivia’s | [Source](https://www.axios.com/local/charlotte/2026/08/19/roe-olivias-restaurant-lower-south-end-charlotte) |
| columbus | K Vida | [Source](https://www.kvidabar.com/) |
| columbus | Black Pony Pizza | [Source](https://www.blackponypizza.com/) |
| columbus | Honey Boy Pizzeria | [Source](https://www.instagram.com/honeyboypizzeria/) |
| columbus | Valencia Bakery | [Source](https://www.columbusnavigator.com/new-restaurants-columbus/) |
| columbus | Braseros Bar & Grill | [Source](https://braserosbarandgrill.com/) |
| columbus | Park Service Coffee at Metsi’s | [Source](https://www.metsisitalian.com/park-service-coffee-breakfast) |
| fort-worth | Brix Barbecue | [Source](https://brixbarbecue.com/) |

The remaining nine San Diego openings also have no verified tier: El Punto, Icaria, Serafino Fine Market, Pear Plum, Santo Poco, Concrete Cowboy, Moniker General, Zuma, and Chef Fei. Across all 180 current city guide records, 107 have sourced tiers and 73 remain unverified.
