# Project specs: parking and parks backfill, leftover work (2026-11-11)

Context: `PinProject.parking` (spaces) and `PinProject.parkAcres` (acres of parks, migration 0262) show as tiles in the pin page's Project Specs panel.
Rule: record a figure only if a page states it explicitly for that project and event (no search-summary-only, district/masterplan-wide, predecessor-building, Wikipedia-only or aggregator-only figures; null beats a doubtful number).
Save with `PUT /api/pins/:id/project` (whole row: merge the existing values, add the figure and a note, set `sourceUrl` only if empty), on local and prod (admin token via the `admin-login-refresh` skill). Match prod pins by title first.

## Done
- Round 1: 254 large projects researched in 6 lanes; 25 pins saved on local and prod (7 text-derived: 493, 2200, 2224, 2247, 3244, 7075, 20655; 18 researched: 7182, 7226, 2222, 2545, 7213, 18233, 2219, 710, 3384, 2212, 934, 575, 3347, 7193, 2291, 150, 482, 886) plus 3238.
- Round 2 (349 smaller projects, lanes 7-12): lanes 8, 9, 12 and 7 stopped on the 5-hour usage limit before writing results; lane 10 reached about half; lane 11 finished with nothing new.

- Round 3 (the 42 likeliest, 3 lanes, 2026-11-11): 6 pins saved on local and prod: 4935 (1,250 spaces), 689 (2.4 ac), 626 (276), 599 (64, permitted capacity), 735 (1,499 spaces, 9 ac), 696 (0.5 ac). Pins in that list with no stated figure need no further research.
- Held from round 3: 2289 Olympia (2.5 ac is public realm, trade-wiki source), 2197 Harvard ERC (2 ac open space; parking 620/580/800 conflict), 2198 Ragon (864 spaces serve the whole building, not the first tower), 2196 South Station (530 vs up to 527 for Phase 1, no as-built), 624 Taipei (699 is another venue).

## Open questions
- **7075 Arbora Court:** resolved 2026-11-11. The pin's cited Daily Journal of Commerce article (djc.com/news/co/12110997.html) states 113 spaces (60 church, 53 Bellwether); the row note now cites it.
- **2211 National Western Equestrian Center:** 1,000 underground spaces (Equine Chronicle Q&A) conflicts with "at least 580" in the adjacent garage reporting; confirm scope before saving.
- Held, unconfirmed: 578 Kai Tak (850 spaces / 34.6 ac: search summaries only), 647 Exchange TRX (10-acre rooftop park, Wikipedia only), 701 SoFi (25 ac is all of Hollywood Park), 2169 Obama Center (garage cap 450, primary minutes unreadable), 2257 Yongsan (green space citywide figure), 2300 Tongzhou (880 vs 700+), 2251 Torch Tower (490 database only), 7057 Sawyer's Walk (961 soft), 3896 Nike (70 ac lumps all open space), 664 Aspern (computed), 3026 Aramco Stadium (8,883 unverified), 20640 Perry's Cafe (up to 240, document unreadable), 20876 UCSD Pepper Canyon East (2 ac park, one source).

## Researched in round 3 (the likeliest 42; see Done). Kept for reference
Stadium, terminal, campus, mixed-use, civic and park projects plus large towers with garages. Research as before (agents draft JSON to `scratchpad/resultN.json`, session vets and saves).
- 642 — CityGate Tower Completed in Gothenburg
- 696 — The Transamerica Pyramid Opens for Business
- 716 — One Park Drive Opens in London's Wood Wharf
- 956 — Empire State Development Opens the Moynihan Train Hall at Penn Station
- 2172 — Houston's Rebuilt Terminal B North Concourse Opens
- 2196 — South Station Tower Is Completed Above Boston's Rail Terminal
- 2230 — Cosm's LED Dome Opens as Centennial Yards' First Venue
- 2289 — Olympia Opens to the Public After Its Kensington Rebuild
- 3225 — San Diego Airport's New Terminal 1 Opens With 19 Gates
- 3489 — Ferrero Opens Chicago Innovation Center in Marshall Field Building
- 20878 — UC San Diego Health Plans 180,000 sq ft La Jolla Outpatient Pavilion for Orthopedics and N
- 624 — Taipei Performing Arts Center Officially Opens
- 719 — One Vanderbilt Opens Beside Grand Central
- 735 — Frank Gehry's MPK 20 Opens at Facebook's Menlo Park Campus
- 2163 — San Diego Airport's Terminal 1 Reaches Its Final 30 Gates
- 2174 — GRB Houston South Opens as the Convention District's First Phase
- 2197 — Harvard Opens the First Phase of Its Enterprise Research Campus
- 2231 — Georgia Tech Dedicates the George and Scheller Towers
- 2290 — Construction Starts on the New Hillingdon Hospital
- 3234 — Gaylord Pacific Resort Opens on the Chula Vista Bayfront
- 4935 — New $362M Mobile International Airport Terminal Opens
- 626 — Habitat 67 Opens at Montreal's Expo 67
- 757 — Dubai Opera Opens in Downtown Dubai
- 2166 — UC San Diego Targets Summer 2027 Start for New Hillcrest Hospital
- 2181 — Waterline Opens in Austin as the Tallest Building in Texas
- 2198 — Mass General's Ragon Building Opens Its First Tower to Patients
- 2235 — Singapore's Eastern General Hospital Campus Opens in Bedok North
- 3249 — Anthropic Leases the Whole 27-Story Tower at 300 Howard Street
- 20650 — Newman Building Redevelopment (North Park)
- 496 — 432 Park Avenue Opens on Manhattan's Billionaires' Row
- 599 — 220 Central Park South Completes on Billionaires' Row
- 683 — 40 Leadenhall Tower Completes in the City of London
- 704 — 111 West 57th Street Finishes as the World's Thinnest Skyscraper
- 726 — Transforming London’s Broadgate: 100 Liverpool Street
- 741 — Dalston Works Becomes the World's Largest Timber Building
- 689 — Little Island Opens on the Hudson River
- 2171 — UChicago Medicine's Cancer Pavilion Takes Its First Patients
- 2194 — Los Angeles Breaks Ground on Its Convention Center Expansion
- 2225 — Miami International Airport's New Concourse K Is Due to Open
- 2282 — New Ontario Science Centre Is Due to Open at Ontario Place
- 3180 — Sophie Maxwell Building Opens as Potrero Power Station's First New Homes
- 3474 — Ferrero Opens Its First North American Chocolate Factory in Bloomington

## Lower odds (59): mostly hotels and landmark towers; try only if the first group pays off
- 132 — Dubai Dynamic Tower: Historical Rotating Skyscraper Proposal
- 434 — Muraba Veil Skyscraper
- 520 — Ciel Dubai Marina Opens as World's Tallest Hotel
- 609 — Frankfurt's Omniturm, an Early Swing-Use Skyscraper, Opens
- 733 — One Thousand Museum Completes in Miami
- 748 — Beirut Terraces Completes as a Layered Skyscraper
- 4164 — Bulgari's First US Hotel, in Miami Beach, Now Pushed to 2029
- 15279 — The Westerly Tower Opens at Hilton Aruba on Palm Beach
- 15285 — HOSHINOYA Nara Prison Opens in a Meiji-Era Former Prison
- 15291 — Raffles Jeddah Opens on the Red Sea Corniche
- 15298 — Waldorf Astoria Kuala Lumpur Opens October 30, Debuting the Brand in Malaysia
- 134 — Jeddah tower: World's Tallest Building- 1Km+
- 443 — Burj Azizi Races for Second Tallest
- 524 — Senna Tower Breaks Ground in Balneário Camboriú
- 669 — Sapphire by the Gardens' Skybridge Completes in Melbourne
- 697 — Crown Sydney Opens at Barangaroo
- 754 — BD Bacatá's Crowdfunded Tower Tops Out in Bogotá
- 3799 — Alo Yoga Leases the Former CAA Building as Its Beverly Hills Headquarters
- 15274 — Four Seasons Hotel and Residences Cartagena Opens in Getsemaní
- 15280 — Delano Miami Beach Reopens After a Six-Year Renovation
- 15286 — Conrad Nagoya Opens Atop The Landmark Nagoya Sakae
- 15292 — Corinthia Rome Opens in the Former Bank of Italy Palazzo
- 15299 — Cambridge House, Auberge Collection Plans February 2027 Mayfair Opening
- 136 — Suzhou Zhongnan Center Restarts as a 499-Meter Redesign
- 448 — Jeddah Tower Nears Completion
- 538 — Manhattan's 'Jailscraper' Delayed to 2032
- 681 — The Brooklyn Tower Finally Receives Its Certificate of Occupancy
- 703 — Central Park Tower Welcomes Its First Residents
- 721 — Australia 108 Tops Out as Tallest Residential Tower in Southern Hemisphere
- 739 — Leeza SOHO Opens with the World’s Tallest Atrium
- 2328 — 1X Opens the NEO Factory in Hayward
- 3818 — Alo Yoga Buys the La Peer Building for $90 Million as Its Next Headquarters
- 4944 — Globalinx Ocean City Cable Landing Station Ready for Service
- 15275 — St. Regis Costa Mujeres Resort Opens Near Cancún
- 15281 — 1 Hotel Austin Opens in Texas's Tallest Tower
- 15287 — Banyan Tree Mount Emei Opens at the Foot of a UNESCO Site
- 15293 — COMO Le Beauvallon Reopens on the Gulf of Saint-Tropez
- 15300 — Waldorf Astoria London Admiralty Arch Targets Late-2026 Opening
- 633 — Contractor Sues Over 161 Maiden Lane's Leaning Foundation
- 763 — ICEHOTEL 365 Opens as the World's First Year-Round Ice Hotel
- 4058 — Aman New York Opens in the Crown Building
- 15276 — The Cooper, Charleston's Waterfront Luxury Hotel, Opens
- 15282 — Imperial Hotel, Kyoto Opens in Gion's Yasaka Kaikan
- 15288 — The St. Regis Budapest Opens in the Klotild Palace
- 15294 — Danieli, Venezia, a Four Seasons Hotel, Reopens on the Riva degli Schiavoni
- 431 — 520 Fifth Avenue Tops Out
- 513 — DC Tower 2 Set to Complete Vienna's Donau City Skyline
- 608 — Woolworth Building Tops Off Its Luxury Condo Conversion
- 641 — Egypt's Iconic Tower Completed
- 714 — Why Shanghai Tower Failed
- 732 — 53W53 Completes Above Manhattan's MoMA
- 746 — Edinburgh's Royal Hospital for Children and Young People Finally Opens
- 800 — Mjøstårnet Becomes the World's Tallest Timber Tower in Brumunddal
- 4141 — The Chancery Rosewood Opens in London's Former US Embassy
- 15278 — Aman's First Mexico Resort, Amanvari, Opens on Baja's East Cape
- 15284 — Four Seasons Tokyo at Marunouchi Reopens After André Fu Redesign
- 15290 — Waldorf Astoria Rabat-Salé Opens in Morocco's Tallest Tower
- 15297 — Fairmont New Orleans Opens November 2, Returning the Brand After Two Decades
- 15303 — Six Senses London Opens in the Whiteley Building, Bayswater

## Not worth researching
- About 120 HUD LIHTC / ArcGIS-sourced affordable-housing pins (ids 7019-7240, 15 lanes' worth): their pages almost never state parking or park acreage.
- About 20 data-centre, solar, battery, plant and factory pins: acres are site totals, not open space.
- Round-1 and round-2 lanes found about 1-2% yield outside stadiums, large housing schemes and civic parks.
