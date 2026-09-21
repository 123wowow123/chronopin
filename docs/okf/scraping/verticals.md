---
type: Reference
title: Vertical recipes
description: Per-vertical recipes for the scrapes run so far - AAA games, movies, TV series, anime, YouTube channels, prediction markets, AI models, prize announcements, drug readouts, sport fixtures, concert tours, product roundups and infrastructure - with the curator account and the traps met.
resource: ../../../src/server/scrape/index.ts
tags: [scraping, verticals, curators]
generated: { by: claude-code/claude-opus-5, at: 2026-09-19T20:00:00Z }
---

Each recipe is a repeatable pattern. Update it when a run teaches something ([Learnings](learnings.md)).

| Vertical | Curator | Category | Source pool | Notes |
| --- | --- | --- | --- | --- |
| AAA games | @GameDesk | `Gaming & Entertainment` | gameranx `/updates/`, IGN `/news` | Studio HQ location; trailer embed by grepping raw HTML; article `published_time` anchors a rumour pin |
| Movies | @FilmDesk | `Movies` | IMDb titles found by search, Wikipedia | IMDb is blocked, see [Sources](sources.md); studio HQ geocoded; budget and gross go in the summary, not `price` |
| Anime | @AnimeDesk | `Anime`, `Anime Movie` | MyAnimeList top lists (10 tabs x top 100) | Unaired titles are "<Title> Announced" pins on the announcement day; year-only is Jan 1 `estimated`; threaded by prequels; trailer and ratings by `media:screen` |
| YouTube channels | per channel (@OverengineeredEN, @TheB1M) | topic's own | `yt-dlp --flat-playlist -J <channel>` for the full list | The video is rarely the event; anchor to a real sourced milestone |
| Prediction markets | @OddsDesk | topic's own | Kalshi and Polymarket events | Market URL is `sourceUrl` so live odds show; reference `startDate` stays null; quote the market's dollar volume beside its odds |
| AI models | @TechDesk | `AI Models` | Vendor release notes and forum announcements | Auto-threaded by model line; stocks for the maker and suppliers |
| Product roundups | per vertical | product category | A roundup article | One pin per product with its **own** source URL, not the shared article |
| Sneaker releases | @SneakerDesk | `Fashion & Apparel` (plus the product's own) | X posts from sneaker accounts, Sole Retriever, Nice Kicks, House of Heat | One pin per colorway, all-day on its drop date, each with its own colorway page as `sourceUrl` (the tweet can only be one pin's source); Nike HQ Beaverton; conflicting dates go `estimated` with both quoted |
| Prize announcements | @ScienceDesk | `Science & Research`, `Arts & Literature` | nobelprize.org | Each prize's own announcement live stream is the `sourceUrl`, so six prizes on one schedule page still get six distinct sources |
| TV series | @FilmDesk | `TV Series` | TVmaze `/schedule/full`, Wikipedia | One call for every future episode; only a season's episode 1, above a popularity weight. A game's "season" is not TV |
| Drug readouts | @HealthDesk | `Health & Medicine` | ClinicalTrials.gov API v2 | Phase 3 primary completion dates, always `estimated`; the sponsor's ticker rides along |
| Sport fixtures | @SportDesk | `Sports` | Wikipedia tournament articles, governing bodies | The fixture, not the betting market (@OddsDesk owns those); placed at the venue |
| Solar eclipses | @ScienceDesk | `Space & Astronomy` | NASA eclipse catalogue | Central eclipses only; placed at the point of greatest eclipse, dated in UT not TD |
| Concert tours | @MusicDesk | `Music & Audio` | Ticketmaster artist pages, promoter announcements | One pin per show at its venue, timed from the artist page's `schema.org` offers; company is the promoter, not the artist |
| Robotics | @TechDesk | `Robotics` | The maker's own newsroom, exchange and press-release wires, Wikipedia for a multi-organiser event | The event is a milestone (a production ramp, a factory opening, a listing, a withdrawal), not the robot; place it at the plant, hall or exchange, never the parent's HQ; a multi-organiser event takes `company: null` |
| Trending searches | none - discovery only | n/a | Google Trends daily RSS | Shortlists subjects; posts nothing ([Nightly jobs](nightly-jobs.md#google-trends)) |
| Infrastructure and architecture | @BuildDesk | `Infrastructure & Transportation`, `Architecture & Real Estate`, `Energy`, `Space & Astronomy` | The owner's or authority's own project page, Wikipedia, trade press | Company is the owner or authority; a delayed opening carries `originalStartDate` and `delayReasoning` |
| Religious observances | @FaithDesk | `Religion & Belief` | The organising body (a dicastery, a ministry, a municipal corporation) and the observance's own article | Pin the gathering, not the day - the day belongs in `DateTime` markers; a moon-sighted date is `estimated`, never `scheduled` |
| Labour and employment | @EconDesk | `Labour & Employment` | Union announcements, the labour ministry, trade press | Contract expiry dates are public years ahead and often chosen for effect (the UAW's lands on May Day eve); statutory wage steps are `scheduled` |
| Mining and materials | @BuildDesk | `Mining & Materials` (plus `Energy`) | The operator's own project page and the financing agency | Placed at the mine, not the head office; guidance is usually a half-year or a year, so `estimated` is the norm |
| Trade shows and annual festivals | per vertical (@FilmDesk, @MusicDesk, @GameDesk, @BuildDesk) | the show's own | The organiser's own site, whose homepage carries the current edition's dates | Dates published 1-3 years ahead; grep the raw HTML for the year before trusting the page, and place the pin at the venue |
| Budget calendars | @EconDesk | `Macroeconomics`, `Policy & Legal` | The statute or the convention, read through a readable mirror | Precise but few per country per year; a convention (India's 1 February) is `estimated`, a statutory deadline is `scheduled` |
| Climate summits | @ClimateDesk | `Climate & Environment`, `Geopolitics` | unfccc.int per-COP page, the session's Wikipedia article | Placed at the host venue or city; a COP with no published days yet is `estimated` at the last day of its announced month |
| Central-bank decisions | @EconDesk | `Macroeconomics` | The bank's own published calendar for the date, the per-meeting prediction market for the URL and odds | The meeting, not the market question (@OddsDesk owns those); timed to the decision, one distinct picture per meeting |
| Big-science milestones | @ScienceDesk | `Science & Research` (plus `Space & Astronomy` or `Energy`) | The facility's own timeline document, often a PDF | Placed at the instrument, not the operator's head office; a year-only milestone is `estimated` at that year's last day |
| National elections | @PoliticsDesk | `Elections`, `Geopolitics` | Wikipedia `List of elections in <year>`, then each election's own article and its electoral commission | One pin per national election, placed at the legislature it elects; the vote, not the market on it (@OddsDesk owns those); a month-only date is `estimated` at that month's last day |
| State visits and summits | @PoliticsDesk | `Geopolitics` | The two governments' own announcements - the host's briefing statement and the visitor's foreign ministry - then the wire copy for colour | One pin per dated *item* of the visit (the arrival, the ceremony, the signing), not one per visit; company is the host (`The White House`), placed where that item happens, and the rest of the itinerary goes in the summary |
| Bilateral relationship history | @PoliticsDesk | `Geopolitics` (plus `Policy & Legal`, `Macroeconomics`, `Defense & Military`, `Computing & Semiconductors`) | The two governments' own archives - `history.state.gov` Milestones and FRUS, the American Presidency Project, the Federal Register, USTR, the WTO, a member's own press release | The backbone of a relationship, threaded oldest first as one linear chain; each pin takes the archive that published the document it is about, and a later pin about the same relationship is re-parented into the chain by `PUT` |
| Aerospace | @BuildDesk | `Aerospace` (plus `Defense & Military`) | Wikipedia aircraft-type articles, manufacturer newsrooms, NASA, trade press | The pin is the flight, the certification or the delivery, placed at the airfield it happened at; `media:videos` matches none of them, so the video is a hand pick from a newsreel or the maker's own channel |
| Natural disasters | @ScienceDesk | `Natural Disasters` (plus `Marine`, `Weather`) | USGS FDSN event catalogue, Smithsonian Global Volcanism Program, the event's own Wikipedia article | The earthquake or eruption itself, placed at its **epicentre or the volcano**, timed in UTC from the catalogue; the local date often differs from the UTC one and the reasoning has to say so |
| Weather disasters | @ClimateDesk | `Weather` (plus `Natural Disasters`, `Climate & Environment`) | NHC Tropical Cyclone Reports, national met agencies, WMO, the event's own Wikipedia article | One pin per **landfall or failure**, not per storm's whole life; placed where it came ashore or where the dam broke; a heat wave or flood season is a period, `estimated` at month bounds |
| Weather seasons and climate reports | @ClimateDesk | `Weather`, `Climate & Environment` | The agency that *defines* the season (NHC, BOM) and the body that schedules the report (IPCC) | A season is a **period in force**, not a day: official bounds, `scheduled`, exclusive 00:00Z end. These are the only reliably forward-dated pins this vertical has |
| Restaurants | @FoodDesk | `Food & Beverage` | The restaurant's own Wikipedia article, the MICHELIN Guide, local restaurant press, the group's own site | The pin is the **opening** (or the closing, or a menu reset), placed at the restaurant, geocoded through Nominatim and reverse-geocoded for its address label; a MICHELIN star count is a `PinRating`, a Guide selection without a star is a tag |

# Restaurants

@FoodDesk, category `Food & Beverage`. The pin is a dated moment in a
restaurant's life - it opened, it closed, it tore up its menu - not the
restaurant itself. Pins 2455 and 2458-2467 seeded the vertical: two Chubby Group
openings in San Diego and eight world-famous rooms across Denmark, Spain, Peru,
Thailand and the United States.

1. **A restaurant's own site almost never dates anything.** Chubby Group's
   locations directory lists about 60 sites across 9 pages with nothing but a
   `(Coming Soon)` marker, so the group site is a reference for *which brand
   belongs to whom* and the local press is where the date comes from. Of ~60
   Chubby Group locations only two had datable coverage.
2. **A report that the place has already opened is dated to the report.** Where
   the press says a restaurant "has welcomed" a new arrival and names no opening
   day, anchor the pin to the article's own publication date and say so in
   `dateConfidenceReasoning`. `estimated`, not `confirmed` - the day is genuinely
   unknown.
3. **Check whether it opened late.** A pre-opening article is a schedule, not an
   event: Eater put Menya Ultra's Mira Mesa shop at "by mid-2018" and it
   grand-opened on 26 October, so the pin is `delayed` with
   `originalStartDate` at the end of the promised window. A soft opening and a
   grand opening are different days; take the grand opening and put the soft
   dates in the summary.
4. **Four of twelve famous restaurants had no opening date on Wikipedia at all** -
   Central, Osteria Francescana, Disfrutar and Sukiyabashi Jiro. They were
   dropped rather than dated from memory, the same rule national elections use.
   Where only a month or year is stated the pin is `estimated` at its last day,
   which is why this vertical lands a lot of pins on 31 December.
5. **Geocode, then reverse-geocode.** Nominatim resolves a restaurant's address
   to the premises themselves often enough to be the first choice, and
   reverse-geocoding the coordinate back gives an address label that is actually
   verified. Do not type a street address: three of six written from memory in
   this batch were wrong ([Sources](sources.md)).
6. **Reviews are MICHELIN stars, and nothing else is reachable.** A star count is
   a real score, so it goes in `PinRating` as
   `{source: 'MICHELIN Guide', score: <stars>, scoreMax: 3, url: <guide page>}`.
   A Guide selection with no star is **not** a score - Menya Ultra is in the 2026
   Guide at `$$` and "Worth Queueing For" with no stars, and scoring that 0/3
   would be a lie - so it is cited as a reference with the inspectors' verdict
   quoted in the reasoning. A World's 50 Best placing is a rank, not a score, and
   belongs in a tag. Yelp and Tripadvisor are both hard-403 with no keyless route.
7. **Adding a rating to a pin that already exists needs a script.** `PinRating`
   is deliberately untouched by `Pin#update` (schema 0017) and no route adds one
   on its own, so a rating that arrives after the pin does is written with
   `new PinRating({...}, pin).save()` against the model. The POST body's
   `ratings` array is the route to use when the pin and the rating land together.
8. **Company is the group, or the restaurant itself.** Chubby Group for its
   brands, Daniel Humm Hospitality where the source names the operator,
   otherwise the restaurant's own name - which then gets a company panel, and a
   favicon logo from its own site since none of these has a Wikipedia-derived one.
9. **No videos.** `media:videos` refuses restaurants for the same structural
   reason it refuses disasters - a restaurant publishes no trailer and the search
   finds no company channel match - and the hand pick found nothing either: what
   ranks is documentaries, chef interviews and wire pieces about the *aftermath*
   of a closing rather than the event. All ten are saved without one.

# Weather and natural disasters

Two verticals that share a shape: the pin is a **moment of physical damage**, it
almost always lies in the past, and its authority is a government science agency
rather than a company. Pins 2429-2454 seeded both categories in one pass -
fourteen geological events as @ScienceDesk and twelve weather events and seasons
as @ClimateDesk. Before it the corpus held **no** earthquake, eruption,
hurricane or wildfire at all: a keyword sweep for every hazard word matched seven
pins, and all seven were flood *defences*, an anime or a fighter jet.

1. **The catalogue gives the instant, the article gives the story.** The USGS
   FDSN API answers an authoritative event id, magnitude, epoch-millisecond
   origin time, epicentre and depth for any historic earthquake; the event's
   Wikipedia article carries the narrative, the toll and the consequences. Use
   the first for every number in the date fields and the second as `sourceUrl`,
   because the USGS's own human event page renders empty ([Sources](sources.md)).
2. **A disaster has no company.** `company` is null for an earthquake, an
   eruption, a cyclone or a flood - nobody did it. It is only set on the forward
   pins, where the organisation *is* the event's author: the National Hurricane
   Center for a season it defines, the Bureau of Meteorology, the IPCC for a
   report.
3. **The UTC day is often not the day the event is known by.** Tangshan struck at
   03:42 local on 28 July 1976, which is 19:42 UTC on the **27th**; Haiyan made
   landfall at 20:40 UTC on 7 November 2013, which is the 8th in the
   Philippines; the Galveston hurricane came ashore around 8 p.m. on 8 September
   1900, which is 02:00 UTC on the 9th. Store the UTC instant and spend a
   sentence of `dateConfidenceReasoning` on the discrepancy - otherwise the pin
   looks a day wrong to anyone who knows the event.
4. **A season, a flood and a heat wave are periods; a quake is an instant.** An
   official cyclone season takes its agency's own bounds with an exclusive 00:00Z
   end (1 June to 30 November 2027 ends `2027-12-01T00:00:00Z`) and is
   `scheduled`, because the agency fixes it rather than forecasting it. A flood
   or heat wave the source bounds only by month is `estimated` across those
   months. An earthquake or a landfall is a timed single instant with a null end.
5. **Say when the sources disagree, rather than picking quietly.** Vesuvius is
   the extreme case: medieval manuscripts and a 2022 re-reading of Pliny support
   24 August 79, while autumnal fruit remains, a wind study and a charcoal
   inscription point to October or November, and a separate 2022 study concludes
   "between October 24th and November 1st". The pin takes the traditional date,
   marks it `estimated` and lays out both cases. The Bhola cyclone has a smaller
   version of the same problem - its own article's lead says 12 November 1970
   while its track narrative implies the 11th - and the reasoning names the
   conflict instead of resolving it.
6. **The map is the reward.** Placing each pin at its epicentre, volcano or
   landfall point spreads a single batch across Chile, Peru, Cameroon, Libya,
   Bangladesh, Indonesia, the Philippines, Turkey, Haiti and Iceland - the
   regions the corpus is thinnest in. A continent-wide event (a European heat wave, an Australian fire season) has
   no single place; put it at the worst-hit city or, failing that, the region,
   and say in the address label that that is what it is.
7. **`media:videos` cannot serve this vertical, and that is structural.** Its two
   gates are that a video announces itself (trailer, teaser, reveal) or comes
   from the company's own channel. A disaster has neither, so the search
   correctly rejected all 26 pins - the videos that rank for "Krakatoa" or
   "Hurricane Katrina" are documentaries and explainers, which the `COMMENTARY`
   filter is right to refuse. Hand-pick instead, as with
   [Aerospace](#aerospace): a Data API search per pin, taking only the agency's
   own channel (USGS, NOAA, NWS, IPCC) or a major outlet's **day-of** report,
   found 9 for 26. Add it with `new Medium({type: 3, ...}, pin).saveWithThumb()`
   rather than a `PUT`. Keep the edition rule - a 2016 season outlook is the
   wrong moment for a 2027 season, and a standing explainer is not that season -
   and leave a pin without a video rather than pad it.
8. **Pictures are abundant and rate-limited.** Almost every event has a
   public-domain lead image - a federal photograph, a satellite image, a period
   engraving - and `npm run media:top-up` found three for most pins. Wikimedia
   answers 429 part-way through a run of 26; re-run the pins it skipped with
   `--delay 25` rather than assuming they have nothing.

# Bilateral relationship history

A relationship between two countries is a vertical of its own, and its backbone
is one thread. Pins 2414-2426, 2404 and 2428 run from Nixon's flight to Beijing
in February 1972 to the state arrival ceremony for Xi Jinping on 24 September
2026 as a single oldest-first chain, each pin answering the one before it, so
the thread view reads as the story of the relationship rather than fourteen
unrelated dates. Before this pass the corpus held 42 China pins and almost none
of them were *about* the relationship: bridges, stations, skyscrapers and anime,
plus one Taiwan invasion market.

1. **Pick the turning points, not the anniversaries.** The set that carries the
   story is the opening (Nixon's visit, the Shanghai Communiqué), the legal
   settlement (normalisation, Deng's welcome, the Taiwan Relations Act), the
   economic bargain (PNTR, WTO accession), its unwinding (the first Section 301
   tariffs, Phase One, the chip export controls) and the crises (Pelosi in
   Taipei, the balloon), ending at whatever is happening now.
2. **Each pin takes the archive that published its own document**, which also
   solves the shared-source problem a themed batch otherwise has: the Office of
   the Historian for 1972 and 1979, FRUS for the communiqué itself, the American
   Presidency Project for an arrival ceremony's remarks, the Statutes at Large
   for an act, the WTO's member page for an accession date, USTR for a tariff
   action, the Federal Register for a rule, the member's own press release for a
   congressional visit. Fourteen pins, fourteen distinct source URLs, no
   roundups.
3. **Place it where it happened**, which spreads the pins properly: the Great
   Hall of the People, the Jinjiang Hotel in Shanghai, the US embassy in
   Beijing, the South Lawn, the Winder Building, the Hoover Building, the Centre
   William Rappard in Geneva, Songshan Airport, the Atlantic off Myrtle Beach,
   Filoli. Company is the organisation whose event it is - the host ministry for
   a visit abroad, `The White House` for a signing or a summit it hosted,
   `United States Congress` for an act, the agency for a rule.
4. **A law is a period, an enactment is a day, a rule is open-ended.** The
   Taiwan Relations Act and the October 2022 export controls carry a start and a
   null end because neither has a sunset; PNTR, Phase One and the accession are
   single days because the pin is the moment. Nixon's visit is the one range,
   21-28 February 1972, because the source treats the visit as one event.
5. **Quote the document, and say when the received date differs from it.** FRUS
   dates the Shanghai Communiqué 27 February 1972 while it is popularly dated
   the 28th; pin 2415 takes the dateline and says so in the reasoning. That case
   will recur for every communiqué and signing statement in this vertical.
6. **Threading an existing pin in is a whole-pin `PUT`.** The route builds a new
   pin from the body, so round-trip the `GET`, add `parentId`, flatten `tags` to
   names and cast `media[].type` back to a number. Media are diffed by
   `originalUrl` so nothing is re-fetched; **references are replaced wholesale**,
   so they must be in the body or they are deleted.
7. **Media.** The archives are rich for anything before 2024 - the Nixon-Zhou
   handshake, Deng and Carter on the South Lawn, the Phase One signing, the F-22
   and the balloon recovery are all public-domain federal photographs. For an
   event that has not happened, take the venue in the same role: a State Arrival
   Ceremony on the South Lawn under the same president.

# National elections

The vote itself, not the betting market on it - the same split as sport
fixtures (@SportDesk) against their odds (@OddsDesk).

1. **Start from `List of elections in <year>`**, not `<year> national
   electoral calendar`: the calendar page's month sections are empty stubs,
   while the list is populated and footnotes each date to the electoral
   commission's own announcement. Pull it as wikitext
   (`action=parse&prop=wikitext`) and read `election_date` out of each
   election's own infobox.
2. **Drop anything without its own article.** An election with no Wikipedia
   page has no verifiable date to take, and the roundup line alone is not a
   source. Four of eighteen candidates went this way.
3. **Date and confidence.** A firm day is `scheduled` and the reasoning quotes
   the article's own sentence ("General elections are scheduled to be held in
   Kenya on 10 August 2027"). A month alone is `estimated` at that month's last
   day; a stated window ("the first half of June") is `estimated` at the end of
   the window; "by August 2027" is `estimated` at 31 August. All-day, UTC.
4. **Place it at the legislature or seat of government** the vote decides -
   Abuja's National Assembly Complex, the Eduskunta, San Lazaro, the Palacio
   del Congreso. Coordinates come from Wikidata `P625` or the building
   article's `coordinates` prop; a country centroid is not a place.
5. **Company is the electoral commission** that runs it (INEC, IEBC, INE,
   Camara Nacional Electoral). Disambiguate colliding names by country -
   `Tribunal Supremo Electoral (El Salvador)` and
   `Tribunal Supremo Electoral (Guatemala)` are two bodies, and an exact-name
   match would merge them.
6. **Media.** `prop=pageimages` on a legislature article returns a seal or a
   seat-composition SVG, and Commons free-text search drifts to the wrong
   country for any generic building name. Scope with `incategory:"..."`, filter
   the file title for the city, then pick by pixel size; fall back to the
   building article's lead image on the **local-language** Wikipedia, or to the
   square in front of it. For the video, the national broadcaster or a major
   outlet covering *this* election - an explainer about the previous election
   is the wrong work and is worse than none.
7. **References** are the commission's own calendar where it publishes one
   (`inecnigeria.org/elections/calendar`, `vaalit.fi`, `fsmned.fm`), else the
   statute setting the date, else national press. Verify every URL live before
   saving: a URL reconstructed from a truncated capture 404s about one time in
   six.

# State visits and summits

A state visit is several events, not one. The arrival, the formal welcome
ceremony, the bilateral meeting, the state dinner and the departure happen on
different days in different places, and the pin is whichever of them the source
is about - the rest belongs in its `longFormSummary`. Pin 2404 is the tarmac
greeting at Joint Base Andrews, not the three-day visit.

1. **Start from the two governments, not the wire.** The host publishes the
   schedule (`whitehouse.gov/briefings-statements/<yyyy>/<mm>/<slug>/` reads with
   a plain browser UA and gives the day-by-day programme, the honour cordon, the
   flyover and the departure) and the visitor's foreign ministry publishes the
   dates and the invitation (`fmprc.gov.cn/eng/xw/zyxw/...` for China, plain
   `curl`). Between them the pin is fully sourced; the news copy adds the guest
   list and the agenda.
2. **The hour usually comes from the press, not the schedule.** Neither
   government page gives a time of arrival. Take it from the outlet that reports
   it, quote the wording in `dateConfidenceReasoning`, and convert to UTC
   (4pm EDT is 20:00Z). The day is `scheduled` on the official programme even
   when the hour is only "expected around".
3. **Place it where that item happens** - the air base for an arrival, the South
   Lawn or State Floor for a ceremony, the East Room for a dinner. Coordinates
   from Wikidata `P625`.
4. **Company is the host organisation**, `The White House` for a visit to
   Washington - reuse the existing row by exact name rather than creating
   "White House".
5. **Media.** Commons has nothing of a visit that has not happened, so take the
   venue in the same role (a previous arrival ceremony at the same base) over a
   generic shot of it, plus a portrait of the visiting leader. For the video,
   search a major outlet's name with the topic and
   `order=date&publishedAfter=<a week ago>`: an unfiltered search returns footage
   of the leader's *previous* visit, which is the wrong event. Verify the channel
   through the Data API before using it.
6. **References**: the foreign ministry, the host's briefing statement, the wire
   copy (AP through ABC News when Reuters is blocked), the outlet with the
   arrival time, and the visit's own Wikipedia article - whose title **must carry
   the year**, since the year-less title redirects to an earlier visit.

# Climate summits

The UNFCCC gives each session its own page (`unfccc.int/cop31`, `unfccc.int/cop32`),
which is the `sourceUrl` even before the agenda exists. Take the days from that
page's own wording; where only the month is announced the pin is `estimated` at
its last day, because UNFCCC normally fixes the exact dates 12 to 18 months out.
Place the pin at the host venue when it is named (the Antalya Expo Center) and
at the host city otherwise. Company is the UNFCCC. **Do not trust the Wikipedia
infobox `date` field** on these articles - both the COP31 and COP32 pages carry
a stale `November 2025` - read the lead sentence instead.

# Central-bank decisions

1. **The bank's calendar sets the date, the market supplies the URL.** The
   Federal Reserve publishes all of a year's FOMC dates on **one page** with no
   per-meeting link until the meeting has happened, so eight pins off that page
   alone would share a `sourceUrl` and be rejected. Kalshi's `KXFEDDECISION`
   series carries one event per meeting whose strike time matches the Fed's
   published date, so each pin gets its own URL plus live odds; the Fed calendar
   rides along as a 95-confidence reference and is what the reasoning quotes.
2. **Verify each market link with the code, not a fetch** - `kalshi.com` 429s to
   `curl`. Run `parseMarketUrl` then `oddsFor` in a `tsx` script.
3. **Quote the volume and flag a thin book.** The 2027 FOMC markets run from
   $23.5k down to $1.4k; six of eight are under $10,000 and each pin says so.
4. **Timed, not all-day**: the decision lands at a known time (18:00Z in summer,
   19:00Z in winter for a 2pm ET announcement), so `scheduled` with the time.
   Quote the Fed's own caveat that "Each meeting date is tentative until
   confirmed at the meeting immediately preceding it".
5. **One distinct picture per meeting.** The dedupe hash drops a repeated
   photograph, so a run of meetings needs a run of different pictures.
6. **No video.** There is no footage of a meeting that has not happened, and a
   previous meeting's press conference is the wrong event.

# Big-science milestones

The facility's **own timeline document** is the source, and it is often a PDF
the pipeline reads (`pdftotext`): SKAO publishes one per telescope
(`Sciops_timeline_low_ppt.pdf`, `Sciops_timeline_mid_ppt.pdf`), Rubin publishes
RTN-011, ESO an announcement, ITER a baseline. These milestones are almost
always **year-only or window-only**, so `estimated` at the end of the stated
period is the norm and the reasoning quotes the wording - Rubin's own plan says
the boundaries follow "survey performance and scientific readiness rather than a
fixed calendar date", which is the clearest statement of why.

Place the pin **at the instrument**: Murchison for SKA-Low, the Karoo for
SKA-Mid, Cerro Pachon for Rubin, Cerro Armazones for the ELT, Saint-Paul-lez-Durance
for ITER - which is also how this vertical pulls the map away from its
Japan/North America concentration. Videos come from the project's own verified
channel, which every one of these has.

# Trade shows and annual festivals

The richest seam for a thin forward month: organisers fix dates one to three
years ahead and publish them on their own sites.

1. **The organiser's homepage is usually the current edition's page.**
   `gamescom.global/en` and `edfringe.com` carry "23-29 August 2027" and
   "06 - 30 August 2027" in their plain HTML, which makes them a legitimate
   `sourceUrl` - unlike a news site's front page, which is the blocked-equivalent
   case in [Sources](sources.md).
2. **Grep the raw HTML for the year before trusting it.** A site that renders its
   dates in JavaScript shows nothing to a plain fetch
   (`computextaipei.com.tw`), and a guessed alternative domain may not resolve at
   all (`computex.biz`). If the year is not in the markup, either use the
   headless scrape or drop the candidate - do not date it from a search summary.
3. **Where the organiser has no dated page, a trade outlet's announcement is the
   source** (Screen for Cannes' 2027 dates, Popverse for Comic-Con's badge
   schedule), with the organiser's own site as a reference.
4. **Span the whole run.** A festival is an all-day pin from its first day to an
   exclusive midnight after its last; start at the preview or pre-opening day
   when the organiser names one (Comic-Con's Preview Night, the Biennale's
   pre-opening).
5. **Place it at the venue** and make the company the organiser (Koelnmesse, the
   EBU, La Biennale di Venezia, San Diego Comic Convention), not the city.
6. **Video: only the organiser's evergreen material.** Last year's edition is the
   wrong work however official the channel - Cannes' 2026 teaser, gamescom's ONL
   2026 and SDCC 2026 walkarounds were all rejected. The exception is footage
   that explains *this* edition, such as the Eurovision performance that won a
   country its hosting.

# Budget calendars

Few per country per year, but exact and never in doubt. A **statutory** date is
`scheduled` (the US President's budget request is due the first Monday in
February under the Budget Enforcement Act of 1990; the federal fiscal year
begins 1 October). A **convention** is `estimated` - India has presented its
Union Budget on 1 February every year since 2017, but the Lok Sabha Speaker
confirms the date each session, so a future year follows the pattern rather than
an announcement, and the reasoning says so. Note the gap between the rule and
the practice where one exists: no US president has met the February deadline
since 2015, which is the kind of fact the pin exists to carry.

`congress.gov` 403s to every fetcher, so cite CRS reports through
`everycrsreport.com` and confirm the mirror carries the sentence you are relying
on before using it.

# Product launches

**Thin as a forward-calendar filler, and worth knowing before planning a batch
around it.** The 2027 games calendar carries about 54 dated titles, but they
cluster January to April and then stop - one dated release after April in the
whole year. Publishers and consumer-electronics vendors do not date the second
half of a year more than about nine months out, so a pass aimed at H2 will come
back nearly empty. Take the dated releases that do exist (they are well sourced:
Wikipedia's per-year list gives date, platforms and developer, and each title has
its own article), place them at the **developer's** HQ from Wikidata `P159` -
which overrules a roundup's implied city - and use the official trailer's still
as the picture, since box art is a non-free local upload.

# Religious observances

The one vertical that renews itself forever, and the one whose calendar lands
hardest on the corpus's thin spots: Hajj 2027 falls in mid-May and the Nashik
Kumbh's first royal bath on 2 August 2027.

1. **Pin the gathering, not the day.** Eid, Easter and Passover are *days* and
   belong in the `DateTime` markers (see below). A pin needs a place and a
   happening: the Hajj at Masjid al-Haram, World Youth Day in Seoul, a Shahi
   Snan at Ramkund. A day with no place is a marker, not a pin.
2. **A moon-sighted date is `estimated`, never `scheduled`**, however precisely
   the tables give it. Saudi Arabia's Supreme Court fixes Hajj and Eid only
   after the sighting at the start of Dhu al-Hijjah, and the reasoning says so.
   The same goes for a Hindu lunisolar bathing date set by the akharas.
3. **Company is the organising body**: a Vatican dicastery, a ministry of Hajj
   and Umrah, a municipal corporation running a Kumbh. Not the faith.
4. **Markers are separate and generated.** `scripts/backup/religiousDays.json`
   holds 223 observance markers over 2024-2040, built from `date-holidays`'
   Hijri, Hebrew and Easter-linked calculations, each taken from the country
   whose calendar defines it and renamed into English. Mawlid and Vesak are
   deliberately absent - the library returns them two or three times a Gregorian
   year, and only sporadically, respectively. Hindu festivals are absent too:
   India's set carries no Diwali or Holi, so they need another source.
5. **Video: the observance is recurring, so an evergreen explainer from a major
   broadcaster is the right work**, unlike a one-off event where last year's
   edition would be wrong. A piece about *this* edition is better still where it
   exists (Rome Reports on WYD 2027, News18 Marathi on the 2027 Kumbh).

# US fiscal calendar and government shutdowns

The budget calendar is statutory, so the forward dates are free; the shutdowns
themselves are the story the calendar keeps producing. Pins 2388-2389 and
2398-2403, @EconDesk.

1. **Three kinds of pin, and they date differently.** A *deadline* (a
   continuing resolution expiring, the President's budget request falling due)
   is a single `allDay` pin at `scheduled` confidence, reasoned from the
   statute. A *lapse* is a range: `utcStartDateTime` on the first day without
   funding, `utcEndDateTime` at the exclusive 00:00Z after the signing,
   `confirmed`. A *law or period in force* (an enacted act, a stopgap, a fiscal
   year) is **also a range** - owner's rule, 2026-09-21: it carries the window
   it covers, not only the day it was signed. Keep the start on the pin's own
   event (the signing) and take the end from the operative clause: H.R. 6500
   section 106(3) ends on 11 December 2026, so pin 2401 runs to
   `2026-12-12T00:00:00Z`; fiscal 2027 runs 1 October 2026 to 30 September
   2027; the IIJA (pin 661) was in force from its signing until its FY2022-
   FY2026 authorisations expired on 30 September 2026.
2. **Sources, in order.** `whitehouse.gov/briefings-statements/.../congressional-bill-h-r-NNNN-signed-into-law/`
   for the day a bill became law (and its Related list for the neighbouring
   ones); `crfb.org/blogs/appropriations-watch-fy-<year>` for where the twelve
   bills stand and what the current deadline is; `everycrsreport.com` for the
   process itself, because congress.gov 403s; GovTrack for a bill's status.
   thehill.com is blocked - see [Sources](sources.md).
3. **Place by whose event it is.** Congress's deadline sits at the Capitol, a
   signing at the White House, a fiscal-year rollover at the Treasury, an
   agency's own shutdown at that agency's headquarters (DHS at St. Elizabeths,
   38.8547 / -77.0000). Company follows the same rule.
4. **Thread the saga oldest first.** Shutdowns, the stopgap that ends them and
   the next deadline are one linear story, so each pin answers the one before
   it - not the schedule order used for launches.
5. **Tag the consequence, not the vocabulary.** `Government Shutdown`,
   `Shutdown Deadline`, `DHS Shutdown`, `Obamacare Subsidies`, `Federal
   Workers` beside `Appropriations` and `Federal Budget`. Categories are
   `Macroeconomics` and `Policy & Legal`, plus `Labour & Employment` when
   federal workers go unpaid.
6. **A shutdown market belongs on the deadline pin as a reference**, not as a
   second pin on the same date: `pinMarketRefs` reads references as well as
   `sourceUrl`, so the odds panel and `marketVolume` come for free. Check the
   market has prices first - Kalshi's shutdown ladders are listed but untraded,
   while Polymarket's were live.
7. **Pictures.** Commons has photographed lapses well: closed museum entrances,
   shuttered parks, airport signage, an agency's own shutdown notice. Use those
   for a lapse and a plain landmark shot (Capitol, Treasury, White House) for a
   deadline - never another event's dated photo.

# AAA games (and other server-rendered news)

1. List candidates with `grep -o` on the raw listing HTML (both sites render server-side).
2. Fetch each article with `curl -A "<browser UA>"`, never WebFetch (drops iframes, cannot reach IGN).
3. Check for an embedded trailer: `grep -o '<iframe[^>]*youtube[^>]*>'`. IGN uses a native player the pipeline does not ingest.
4. Pull title, description, release wording, developer and studio HQ from the text; use `article:published_time` when there is no fixed release date.
5. Insert through `POST /api/pins` as the curator, then the image through the medium code, then `backup:data`.

# Movies

`WebSearch "<title> imdb"` for the real title URL as `sourceUrl`, Wikipedia (`<Film>_(2026_film)`) by plain curl for facts and the `og:image` poster, the primary studio's actual lot or office as location (Universal City, Burbank lots, Culver City, Santa Monica, Melrose Ave), category `Movies`, no `price`.

Roundup of upcoming films (Geek Vibes Nation style): one pin per film with its Wikipedia page as `sourceUrl` and the roundup as a reference, then the franchise's earlier mainline films as pins in release order, each responding to the previous. Skip premiere dates, use the US wide release ([Learnings](learnings.md)).

# Anime (MyAnimeList)

Parallel agents of about 10 titles each, each posting through the real `POST /api/pins` with a token signed from the session secret (`{id: <curator id>}`, HS256; Node 24). Concurrent agents reuse company rows by exact name. MAL pages are formulaic: the wiki is the page's own fields (info block, statistics, synopsis, background, related entries, themes), so summaries state only what the MAL page states.

# Episodic works (TV series, anime)

A pin about a series, a season or a cour carries how many episodes that run has (`episodeCount`) and what the number counts (`episodeStatus`: `complete`, `ongoing`, `planned`). Take it from the page when the page says it - the article knows which season the pin is about - and let the scrape fall back to AniList, MyAnimeList and Wikidata. A film pin never gets one. `npm run media:screen -- --apply --skip-trailer all` backfills existing pins and leaves any count already there alone.

# YouTube channels

`yt-dlp -J <video url>` per id gives the upload date, description, tags and categories. Some creators forbid third-party embeds (The B1M) even when `playableInEmbed` is true: flag it. `company` is whatever institution the story centres on (a ministry, a binational authority, an operator); its logo lookup often whiffs, so set `websiteUrl` and the favicon by hand. Give each parallel agent a **unique scratch file name**: two agents that defaulted to the same name in a shared prompt overwrote and even ran each other's inserts.

# Concert tours

A tour is **one pin per show**, each at its venue, not one pin for the tour.

1. The announcement (Ticketmaster's `discover.` subdomain, or the promoter's
   own post) gives the city list, the on-sale windows and the press shot.
2. The **artist** page - `ticketmaster.com.au/<artist>-tickets/artist/<id>` -
   carries a `schema.org` `Offer` per show in its raw HTML with that show's
   own event URL, venue and **local start time**. Grep for it; the per-event
   pages themselves return nothing to `curl` or to the scraper.
3. That per-event URL is the pin's `sourceUrl` even though it will not open,
   and the venue's Wikipedia page gives the coordinates and a photo.
4. Convert the local start time with the venue's own zone - a February tour
   crosses `Australia/Perth` (no DST), `Australia/Brisbane` (no DST) and
   `Australia/Sydney` (AEDT), so three shows on consecutive days are +8, +10
   and +11.
5. `dateConfidence` is `scheduled`: announced, with tickets not yet sold.
6. The press shot rides on one pin only - the difference hash drops it from
   the rest - so the others take their venue's photo plus one official video
   from the artist's Vevo channel.
7. `company` is the promoter or ticketer, not the artist: a person is not an
   organisation, and the promoter is what carries a ticker (Live Nation, LYV).

# Prediction markets

**Volume, not only price.** Every market pin records what the market has traded,
in dollars, and quotes it beside the odds - a 30% on a $15M book and a 30% on
$900 are not the same claim. Polymarket gives dollars (`volume`); Kalshi gives
contracts (`volume_fp`), which are money only as contracts x `last_price_dollars`,
an estimate at today's price; Polymarket US gives none. Only the single-event
read returns them (the events list has them null). Say the figure per market when
the pin cites more than one, and flag a market under about $10,000 as thin rather
than leaving the reader to find out. The app stores the total itself
(`Pin.marketVolume`, schema 0053) on save, keeps it up while anyone watches the
pin, and refreshes it with `npm run markets:volume -- --apply`; it drives the pin
page's "traded" pill and the timeline's weighting, so a busy market's pin holds
its place on a crowded day.

Dates: a scheduled event uses its official time (`scheduled`, timed); a "by when" market uses the day its daily market prices highest (`estimated`, all day) and the reasoning quotes the odds. A companion market goes in as a reference and gets its own odds box (at most 4 markets). Search podcasts by hand for a supporting quote, then append references and PUT the whole pin.

Second pass (2026-09-20, pins 1948-1952): Nobel Peace Prize, Oscars Best Picture, 2028 presidential election, Venezuela's leader and the US-Iran ceasefire ladder. Pick markets whose event has a real date (an announcement, a ceremony, an election day) over open-ended "by 2040" ones. Kalshi's `/events/{ticker}` is keyless and lists odds; Polymarket sports and "Team A" placeholder markets (EPL, Champions League 2027) have no real prices yet, so skip them. @OddsDesk's password was reset by Ian and is in the memory notes. Images are Wikimedia Commons (venue, building or satellite view), attached by PUT with `media: [{type: 1, originalUrl}]`, spaced 6 s apart.

**Finding the near-term events.** The unfiltered open-events list skews to 2030+ novelty markets, so start from the catalogue instead: `GET /series?category=Sports` (3,827 series) and `?category=Entertainment` (2,487), grep the titles for the award or trophy, then `GET /events?series_ticker=<T>&status=open` for the live season and `GET /events/{event}?with_nested_markets=true` for the ladder. Polymarket's equivalent is `GET /events?tag_slug=<sports|movies|music|awards|pop-culture>&closed=false&order=volume24hr`; note there is no `entertainment` tag (it returns nothing), and a Polymarket event's `endDate` is usually the real event date, which makes it a good cross-check on Kalshi.

**A price is not a probability.** The single most repeated error in the corpus: a Kalshi or Polymarket row shows a *Chance* percentage, a *Yes* price in cents and a *No* price in cents, and they are three different numbers. Six pins (1951, 1959, 1969, 1971, 1973, 1983) took a Yes or No price as the outcome's chance - pin 1971 gives Paxton 41%, which is his Buy No price against a 42% chance; pin 1959 quotes 12-13% for a player whose row is a Yes price, and names another player who **has no row at all**. Read the Chance column, and where the page's own header, strike list and order ticket disagree by a point or two (they routinely do), quote the one you used and say which it was. On a logged-out capture the order ticket reads "0% chance / $0" - that is an empty form, not an odds figure.

**Reading Kalshi prices.** With `with_nested_markets=true` the price fields are strings named `*_dollars` (`last_price_dollars`, `no_bid_dollars`, `no_ask_dollars`), not `last_price`/`yes_bid`, so a naive read silently gets `undefined` and every outcome looks like 50%. Sort by `last_price_dollars` and ignore `status: "finalized"` rows - an eliminated team keeps a stale 1 c price and no bid/ask. `expected_expiration_time` is a settlement buffer, not the event date (NBA 2027 expires 31 July), so date the pin from the league or organiser, never from the market.

**The web URL is `kalshi.com/markets/{series}/{event-title-slug}/{event-ticker}`**, all lowercase; only the third segment is read (`parseMarketUrl` takes `parts[3]`), so the middle slug is cosmetic and slugifying the event's own `title` is enough. kalshi.com answers 429 to curl, so verify a link by running `parseMarketUrl` + `oddsFor` in a `tsx` script against the real code rather than fetching the page.

**Politics, elections and geopolitics** (2026-09-20, pins 1967-1979): Russia's Duma vote, Brazil's first round, the Knesset election, the California governor's race, the Texas Senate seat, China-Taiwan, a Russia-Ukraine ceasefire, the next UN Secretary-General, the next House Speaker, France 2027 and the Canadian, German and Indian national elections.

- **Find them on Polymarket, not Kalshi.** Page `GET /events?closed=false&order=volume&ascending=false&tag_slug=<t>` over `politics`, `geopolitics`, `elections`, `world-elections`, `global-elections` and `world`, then keep the ones whose `endDate` is inside the next year and sort by volume. Kalshi's `status=open` list is mostly "during Trump's term" ladders, and some Politics series with the right title (`KXSENATE`, `KXHOUSE`) have **no events at all** - the 2026 chamber markets are Polymarket's.
- **Take the date from the market's rules text**, which usually names it outright ("scheduled to take place in Brazil on October 4, 2026"). That earns `scheduled`. `endDate` is not the event: Polymarket's Israel PM market ends December 31 for an October 27 election. When the rules only say "around April 2027", the pin is `estimated` and the reasoning derives the day from law rather than borrowing precision.
- **A Kalshi event ticker carries its own date** (`KXCANELECTION-29OCT15`) which its contracts can outlive by a year - use the ticker date, cross-checked against the country's election law, and treat the close time as a settlement buffer.
- **Ladders are cumulative**, so the last rung is always the dearest. Quote two rungs ("15% by December 31, 5% by October 31") so the headline number does not read as a forecast for that one day. A single yes/no "by when" market has no likeliest day: date the pin to its deadline and say the market gives it 4%.
- Elections get the `Elections` category (added 2026-09-20) alongside `Geopolitics`; a conflict or diplomacy market gets `Geopolitics` alone. Place the pin at the legislature, capitol or presidential palace the vote decides.
- Images: `prop=pageimages` on a legislature article returns a logo or a seat-composition SVG, so fall back to Commons `action=query&list=search&srnamespace=6` for "<building> <city>" and pick by pixel size.
- Podcasts: Apple's catalogue search finds same-week episodes for a major race, but transcripts are usually missing, so cite the episode's own title, show and description at 65-75. One of them corrected a pin - Monocle's "Russians go to the polls across three days" turned a one-day pin into September 18-20.

**Economy, crypto, AI and space** (2026-09-20, pins 1980-1993): the December FOMC decision, the September CPI print, the year-end unemployment rate, a 2027 recession, Bitcoin's closing price and its return to $100k, Ethereum's 2026 high, the Anthropic and OpenAI IPO announcements, the next Gemini Pro model, the top AI model of 2026, SpaceX's launch count, two Starships docking and NASA's next crewed Moon landing.

- **Kalshi's catalogue for these is `GET /series?category=`** with `Economics`, `Crypto`, `Science and Technology`, `Companies`, `Financials`, `World` and `Climate and Weather`. Plain `Technology` and `Science` return `{"series": null}`, so grep the `Science and Technology` list for both the space and the AI tickers. Then one `GET /events/{EVENT}?with_nested_markets=true` per candidate.
- **Scan in two passes, because the events list has no prices.** `GET /events?series_ticker=…&status=open&with_nested_markets=true` returns every nested market with `last_price`, `yes_bid` and `volume` `null`; the `*_dollars` prices and `volume_fp` only come back from the single-event read. Use the series list for tickers and titles, then read each event for the ladder.
- **Difference a cumulative ladder to find the date.** Anthropic's IPO ladder rises 9% -> 50% across November, so November carries 41 points and the pin is `estimated` on its last day; Bitcoin's $100k ladder gives October 9, November 13, December 3. Say two rungs in the reasoning, and say what the market gives the whole question (26% for $100k before 2027) so the date does not read as a prediction.
- **Ignore rungs that quote out of order and name the problem in the summary.** OpenAI's IPO ladder runs April 70%, May 49%, June 61%; `KXMOON` has before-2028 below before-2027; `KXU3EOY` has above-4.5% below above-5.0%. Date from the monotone, liquid part.
- A settlement instant *is* a date: a year-end price, a year's high, a launch tally or a year-end ranking are `scheduled` on the market's own terms (all-day on December 31, or timed when the market names an instant such as 12:00 a.m. ET on January 1). A macro release is `scheduled` on the agency's published calendar - BLS CPI and Employment Situation at 8:30 a.m. ET, the FOMC statement at 2:00 p.m. ET - which Kalshi's close time sits minutes before.
- Macro pins get the `Macroeconomics` category (added 2026-09-20), crypto `Cryptocurrency`, an IPO `Corporate & Finance`, a model release `AI Models`, a launch or mission `Space & Astronomy`. Place them at the institution that produces the number: the Eccles Building, the BLS's Postal Square Building, the NBER in Cambridge, the company's HQ, the pad.
- **Quote spot from a keyless exchange**, `api.coinbase.com/v2/prices/BTC-USD/spot` or Kraken's public ticker, so a crypto pin says where the market is and not only what the ladder pays.
- Give a company pin its `stocks` by hand (Anthropic -> GOOGL, AMZN related; OpenAI -> MSFT, ORCL related and NVDA supplier; Google -> GOOGL as the company). A later `PUT` that leaves `stocks` out keeps them, because the ticker write is add-only.
- **A pin another desk already created cannot take the market links.** Starship Flight 14 was already pin 1945 from `npm run spacex:launches`, so no second pin was made - but `PUT /api/pins/:id` is author-or-admin only, so @OddsDesk could not add the Kalshi and Polymarket links to it as references either. Hand that merge to the owning curator or an admin.
- Images: Commons `generator=search` with `gsrnamespace=6` returns nothing, so take Wikipedia's REST summary `originalimage` and space the calls (it 429s after about five). An article whose lead is an SVG can be unusable - `upload.wikimedia.org` refuses every thumb width of `Bitcoin.svg` with a 400 - so pick an article with a photograph instead.

Sports and entertainment pass (2026-09-20, pins 1953-1966): World Series, Super Bowl LXI, NBA Finals, Stanley Cup, Champions League final, Ballon d'Or, Heisman, F1 constructors, The Game Awards, the Grammys, the Super Bowl halftime headliner, 2026's highest-grossing film, Spotify Wrapped and the next James Bond. Place a title race at the league's headquarters when the venue is not known yet (best-record host, undecided finalists) and at the stadium, circuit or theatre when it is. A market with one yes/no contract per name (Kalshi's halftime headliner) does not sum to 100 - say so in the summary rather than presenting the prices as shares.

# Robotics

@TechDesk, category `Robotics`, ten pins on 2026-09-20 (2324-2333). The vertical
had three pins before this run, so almost anything major is new.

**The pin is the milestone, not the robot.** A humanoid gets announced once and
then reported on for two years, so a pin about "Figure 03" would have no date.
What has a date is the *step*: a production line reaching a rate (Figure's one
robot an hour), a factory opening (1X in Hayward), a unit count falling (AgiBot's
10,000th), a listing (Unitree on the STAR Market), a reference design being
published (NVIDIA's Isaac GR00T), a games meeting, and a programme being
**withdrawn** - Amazon's Blue Jay is one of the few robotics pins that records a
failure, and the timeline is better for it.

**Where it goes on the map.** The plant, the hall or the exchange the event
happened in, never the parent's headquarters: Figure at BotQ on North First
Street rather than "San Jose, CA", Unitree at the Shanghai Stock Exchange rather
than its Hangzhou office, Boston Dynamics at the Las Vegas Convention Center
because the reveal was at CES. Wikipedia's `prop=coordinates` gives the exchange
and the Metaplant directly; a plant with no article needs the street address from
a leasing or property report and coordinates for it.

**Sources are unusually good.** Every maker in this vertical publishes a dated
newsroom post with Open Graph images, and the app's own scraper reads all of
them - figure.ai, bostondynamics.com, agibot.com, 1x.tech, investor.nvidia.com,
globenewswire, aboutamazon.com and scmp.com all came back with full text plus
media. Trust the page's own date over a search summary: the search said NVIDIA's
GR00T announcement was 31 May at GTC Taipei, the release itself says June 01.

**An update note is an event.** Amazon's October 2025 Blue Jay announcement
carries "Update February 25, 2026: Amazon is no longer utilizing Blue Jay in
operations" in the body. That line is the pin, dated to the update rather than
to the article, `confirmed` on the company's own wording.

**A multi-organiser event has no company.** The World Humanoid Robot Games are
run by China Media Group, the Beijing municipal government, the World Robot
Cooperation Organization and the Asia-Pacific RoboCup council together, so
`company` is null rather than one of the four; RoboCup's own events page
corroborates dates and venue.

**Stocks:** only where a US ticker is actually in the story - NVDA as the
company on the GR00T pin, AMZN on Blue Jay, GOOGL as *related* on the Atlas pin
because DeepMind's models are going into the robot. Hyundai, Unitree, Figure,
1X, AgiBot and ugo are not US-listed, so those pins carry none.

**Traps met:** Contentful serves `?fm=webp` variants that the thumbnailer
rejects with "Mime type image/webp does not support decoding", and because create
is not transactional the pin was written without its media - strip the query and
`PUT` the whole pin back rather than re-posting into a duplicate `sourceUrl`. The
scraper's Wikipedia image fallback is worse than nothing on a page it cannot
illustrate: the Unitree IPO page came back with a photo of a OnePlus One and the
Hyundai release with a Waymo car, so check what the media stage actually
returned. An article's own image can be absent from the rendered page's image
list (agibot.com), in which case the lead image of a reference is the way in.
Company logos resolve from the site icon once `websiteUrl` is set by hand -
needed for ugo (ugo.plus).

# Roundups

When one article covers many things, prefer per item: a deep link (anchor or "read more"), else the maker's own product page or press release, and only then the shared article, flagged as generic.

# Aerospace

@BuildDesk, category `Aerospace` (with `Defense & Military` for a military
programme), sixteen pins on 2026-09-20 (2334-2349). The vertical had 22 pins
and **one future date** before this run.

**Two halves, because the vertical was short at both ends.** Ten landmark
firsts that were simply absent from the corpus - the Wright Flyer, Lindbergh,
the He 178, the Bell X-1, the Comet entering service, the 747, Concorde, the
A300, the A380 and the 787 - and six recent or scheduled milestones that put
pins in 2026, 2027 and 2028.

**The pin is the flight, not the aircraft.** A type has no date; its first
flight, its entry into service, its type certificate and its first delivery all
do. Title them that way ("The Boeing 747 Makes Its First Flight", "The FAA
Certifies the Boeing 737-7").

**Wikipedia's aircraft-type article is a good source for a historical first.**
The infobox dates the first flight and the development section names the pilot,
the airfield and the duration - enough for the whole pin without going beyond
the page. Place it where the page says the aircraft flew from (Paine Field,
Toulouse-Blagnac, Muroc, Marienehe), never the manufacturer's head office.

**Company is whoever the page names as manufacturer**, which is not always the
modern brand: the Flyer is the Wright Cycle Company, the Spirit of St. Louis is
Ryan Airlines, Concorde is Sud Aviation, the 747 and 787 are Boeing Commercial
Airplanes while the 737-7 release says plain Boeing. Follow the page.

**Budgets are not costs.** A defence programme page offers annual appropriations
and design contracts; none of them is the cost of the flight or delivery being
pinned, so these pins carry no `price`.

**Video is a hand pick.** `media:videos` matched none of the sixteen because an
event-phrased title shares almost no words with a video title. Search the
YouTube Data API per pin and take a newsreel archive (British Movietone,
British Pathe, AP Archive) for a historical first, the maker's or agency's own
channel (Airbus, NASA Armstrong, Northrop Grumman) where it has one, and a news
broadcaster for a recent regulatory event. Store it the way
`scripts/media/productVideos.ts` does.

**Read back what `media:top-up` attached.** Five of seventeen pictures it added
were of the wrong subject entirely ([Learnings](learnings.md)). Commons
`list=search&srnamespace=6` finds the right one for most; for an aircraft not
yet in service (737-7, A350F) Commons has nothing, and 2 media is better than a
lookalike.

# Rocket launches (SpaceX)

`npm run spacex:launches` reads Launch Library 2 (`ll.thespacedevs.com`, keyless, ~15 calls/hour) and posts one pin per launch with a day-or-better NET, at the launch pad, through the real API. The pin page draws a `flightPath` (table `PinFlightPath`, 0049) from the pad. Flight Club (`flightclub.io`) has the real trajectories but its `api.flightclub.io` needs a login, so the line is an **estimated ground track** (`src/lib/groundTrack.ts`: circular orbit at the target inclination, Earth turning under it, slow first ~9 minutes) and the pin links the launch's Flight Club page (`flightclub_url` from LL2). Heavens-Above tracks satellites, not launches. Inclination is a rule of thumb (`src/lib/launchOrbit.ts`): ISS 51.6, SSO 97.5, Starlink 53 (70 for group 15 from California), Starship 26. Missions it cannot place (GTO, lunar, unknown orbit) get a pin and no path. An already-pinned launch has only its path refreshed, so NET slips are not followed yet.



# Prize announcements (Nobel)

The Nobel Foundation publishes the year's six announcement dates twice: on
[prize announcement dates](https://www.nobelprize.org/prizes/about/prize-announcement-dates/)
and in a February press release, which is the better read because it gives the
hall and street address as well as the hour ("Wallenbergsalen, Nobel Forum,
Nobels vag 1, Solna"). Everything is CEST in October, so subtract two hours.

Five of the six say "at the earliest", which is `scheduled` with that phrase
quoted; only the Peace Prize gives a firm time.

**The trap is the `sourceUrl`.** One schedule page covers six prizes and the
route rejects a duplicate `sourceUrl`, so the page can be the source of at most
one pin. Each prize's own **YouTube announcement live stream** solves it: the
schedule page links one per prize, they are already titled "Announcement of the
2026 Nobel Prize in Physics", and oEmbed confirms each is the official Nobel
Prize channel. The stream is the `sourceUrl` and a type 3 medium; the schedule
page and the press release are references on all six.

Places: the Nobel Forum in Solna (medicine), the Royal Swedish Academy of
Sciences at Frescati (physics, chemistry, economic sciences) and the Borssalen
in Gamla stan (literature). Wikipedia's REST summary carries coordinates for
all of them; Nominatim finds the Nobel Forum but not the two academies by their
English names.

The literature prize had no category to go in, so `Arts & Literature` was added
to `src/lib/categories.ts` - and a new category needs its label in all six
message files, or it falls back to the English name (`Elections` and
`Macroeconomics` had been left that way and were filled in at the same time).

# TV series (TVmaze)

`GET https://api.tvmaze.com/schedule/full` is one keyless call that returns
**every** future episode TVmaze knows - about 6,200 of them - each with its show
embedded. Filter to `number === 1` for a season premiere, to English `Scripted`,
`Animation` and `Documentary`, and to the show's `weight` (its popularity score,
0-100): at 100 there are about 30 premieres, at 99 about 67, and below about 95
it is local strands. `npm run tv:premieres`.

* **The forward schedule is near-term.** 202 season premieres land in October
  2026 and 14 in January 2027, but only about seven across the whole of 2027 -
  the industry has not dated it yet. This is the argument for running it
  nightly rather than once: each show joins as it is dated.
* **Never publish TVmaze's episode count for a future season.** It lists a
  season episode by episode as the broadcaster confirms dates, so season 38 of
  The Simpsons reads as 2 episodes in September and 22 by spring. The job now
  compares the count against the median of the show's finished seasons and
  publishes nothing unless it looks like the real order (a first season needs
  six). Of 30 pins in the first run, 23 had a partial count that had to be
  cleared afterwards.
* **Place the pin with a company and no address** and the save puts it at the
  broadcaster's headquarters, the same path that places a film at its studio.
* **A streaming brand has no headquarters in Wikidata.** "Prime Video",
  "Disney+" and "Apple TV" are filed as services, not companies, so P159 is
  empty and 17 pins landed nowhere. The fix is to point the company at the
  owner's article (Amazon, The Walt Disney Company, Apple Inc., NBCUniversal
  for Peacock, BBC for iPlayer). After that 66 of 67 were placed; STARZ is the
  holdout, because Wikidata knows only that it is in Colorado.
* Seasons are chained by the job itself, each answering the one before it.
  Anime's automatic sequel threading is MAL-id based and does not see TV shows.

# Drug readouts (ClinicalTrials.gov)

`GET https://clinicaltrials.gov/api/v2/studies` with
`filter.advanced=AREA[Phase]PHASE3 AND AREA[PrimaryCompletionDate]RANGE[a,b] AND AREA[LeadSponsorClass]INDUSTRY AND AREA[OverallStatus]RECRUITING`,
sorted by `EnrollmentCount:desc`. The primary completion date is when the last
participant's primary outcome is measured - the day the answer exists, months
before a regulator sees it. `npm run health:trials`.

* These dates are the sponsor's own estimate and they slip, so every pin is
  `dateConfidence: estimated` and says so. A date given as `2028-06` is pinned
  on the first of the month, which the reasoning states.
* **Asking for a `fields` list strips each intervention's `type`**, so a filter
  on `type` silently matches nothing and the job returns zero rows.
* **Naming the drug is the hard part.** The registry lists the experimental arm
  first and comparators after, so take the first non-placebo name: the shortest
  name gave tamoxifen over camizestrant, and skipping names with digits gave
  Truvada over MK-8527. What to skip is a *dose line* (`BGF MDI 320/14.4/9.6
  ug`), and only when something else is left.
* A condition of "Healthy" or "Healthy Volunteers" describes who enrolled, not
  what the trial is about; take the next condition.
* The sponsor's ticker goes on with `stocks`, but **the note is kept on the
  company, not the pin**, so it has to describe the company in general. "runs
  the trial" was written onto ten pharma companies and had to be replaced with
  proper descriptions.
* Only sponsors on the script's own list are pinned, which is what gives each
  pin a headquarters and a ticker.
* **PDUFA dates are not scrapeable this way.** The FDA's advisory committee
  calendar renders its table client-side and serves no rows to `curl`, and
  PDUFA action dates live in company press releases. That vertical needs a
  search-driven job, not a nightly keyless one.

# Sport fixtures

The fixture itself, as against the betting market on it, which is @OddsDesk's.
Wikipedia's tournament article carries the dates in its opening sentence in a
quotable form ("is due to take place in Australia from 1 October to 13 November
2027"), and the article is the `sourceUrl`, one per tournament. Multi-day events
are all-day with the end at 00:00Z the day after the last day.

Place it at the venue when there is one: the opening stadium for a tournament
(Perth Stadium for the 2027 Rugby World Cup, whose final is in Sydney), the
single stadium for a one-off (Mercedes-Benz Stadium, Ford Field, Adare Manor).
For a tournament spread over several countries with no final venue named, pick
the lead host's flagship ground and say in the summary that this is what the pin
is doing. Venue coordinates and a lead photograph both come from Wikipedia's
REST summary in one call.

This is the vertical that best fills a far calendar, because governing bodies
date their tournaments years ahead: of nine pins, six fell between April and
November 2027, the emptiest stretch on the timeline.


# Solar eclipses (NASA)

`npm run astronomy:eclipses` reads NASA's decade tables
(`eclipse.gsfc.nasa.gov/SEdecade/SEdecade<decade>.html`) for the type, saros,
magnitude and the regions the path crosses, then each eclipse's own path page
for the point of greatest eclipse. The path page is the pin's `sourceUrl`,
which gives the already-pinned test for free.

* **Central eclipses only** - total, annular, hybrid. A partial has no central
  path and so no point of greatest eclipse, and is not the kind anyone travels
  for.
* **Take the time from the path page, not the decade table.** The table's clock
  is TD, the uniform dynamical timescale; the path page gives UT, which is what
  a clock at the eclipse reads. Delta-T separates them by about 72 seconds this
  century. The label is written both `Greatest Eclipse: Time =` and `Instant of
  Greatest Eclipse : Time =`, with a space before the colon, so match `\s*:`.
* **Non-central eclipses have stub path pages** (2043 Apr 09, 2043 Oct 03). The
  five-millennium catalogue `SEcat5/SE2001-2100.html` still has their position,
  to the whole degree, and its clock is TD with delta-T in its own column.
* **The title names the country at greatest eclipse**, not the head of NASA's
  path list, which runs west to east: the 2030 annular lists Algeria first and
  is deepest over Siberia. When that point is at sea, the head of the list is
  the fallback.
* Per-eclipse files are filed by century (`SEpath2001`, `SEgoogle2001`,
  `SEplot2001`) even though the index pages are per decade.
* `--refresh` re-saves what the job owns by `PUT`; an eclipse pinned by hand
  keeps its own pin.

# Tournaments (Wikipedia)

`npm run sports:tournaments` works from a curated list - there is no keyless
index of "every major tournament" and the ones worth a pin are a knowable set.
Each entry names the tournament's article, the venue article that carries
coordinates, and the governing body that becomes the pin's company.

* **The dates are in the opening sentence** in about five shapes, and sometimes
  without a year ("from 23 July to 8 August in Lima"), which then comes from
  the article title.
* **A bare "in <Month> <Year>" is usually not the tournament.** "In December
  2024, Saudi Arabia was formally confirmed as the host" pinned the 2034 World
  Cup ten years early. Require scheduling language in the same clause and a
  year no earlier than the article's.
* **The already-pinned test must carry the year**, or "Summer Olympics" finds
  whichever edition was pinned first.
* **Coordinates chain**: REST summary, then `action=query&prop=coordinates`,
  then Nominatim by name - and Nominatim wants the local name ("Estadio
  Nacional, Lima, Peru", not "National Stadium of Peru"). Some stadium
  articles carry no coordinate template at all.
* Wikipedia's REST summary 429s after about a dozen quick calls; space them
  1.6s with a backoff.
* A tournament with no announced dates is skipped, not guessed, and picked up
  on a later run. Where no opening venue is announced the pin sits at the lead
  host's flagship ground **and says so in the description**.

# A city's construction projects

Asked what is being built somewhere, work from the bodies that build it rather than from a roundup. One WebSearch ("<city> major construction projects <years> opening completion milestone") names the projects; each one's date then comes from its owner - the transit district, the airport authority, the council of governments, the university, the city - and that owner's page is the pin's `sourceUrl`, so five pins have five sources rather than one listicle between them ([Learnings](learnings.md)).

**Check for an existing pin with `&sort=relevance`, or in SQL.** The search endpoint defaults to date order and will answer a project's own name with unrelated 19th-century pins; sixteen agents read that as "nothing here" and one of them re-pinned a project that already had a pin. `user:`, `posted:` and `tag:` terms resolve in SQL and are always current. `duplicates:suggest` will not save you: it pairs on +/-1 day, and the same milestone re-scraped carries a different estimated date.

Each pin is a dated milestone, not the project: the gates opening, the crossing opening, the platform opening, major construction starting, the building opening. Place it at the thing, not at the owner's head office. Where the owner's page and recent reporting disagree, the owner's older promise is `originalStartDate` and the pin is `delayed` - that disagreement is the delay. A cost figure only goes in when it is the whole of the pin's own event; half of a binational project is not the project.
