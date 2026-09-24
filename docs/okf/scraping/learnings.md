---
type: Log
title: Scraping learnings and feedback
description: Dated log of what scraping jobs taught and what the owner corrected, newest first. Update it after every scraping job so the strategy stays current.
resource: strategy.md
tags: [scraping, learnings, feedback, maintenance]
generated: { by: claude-code/claude-opus-5, at: 2026-09-19T20:00:00Z }
---

# How to keep this current

After **every** scraping job (a scrape, a backfill, a batch of pins, a reference or wiki round), add an entry below with the date, what was done, and each thing that surprised, failed or was corrected. Then fold it into the page it belongs to: a site's behaviour into [Sources](sources.md), a vertical's recipe into [Vertical recipes](verticals.md), a rule about a field into [Fields](fields.md) or [Enrichment](enrichment.md), a change of approach into the [Strategy](strategy.md), and a contract change into the [Scraping API](../api/scraping-api.md). Record the owner's feedback verbatim in spirit, with the reason, and note how it changes the behaviour. Add a line to [the log](../log.md).

Entry format: `## YYYY-MM-DD - <job>`, then `* **Learned**`, `* **Feedback**` (owner corrections and confirmed approaches) and `* **Changed**` (which page was updated).

# Standing feedback from the owner

* **Scrape without sign-off.** Asked to scrape a URL into a pin, do the whole thing end to end: real `POST /api/pins`, the image, `backup:data`, then report. Local dev database only; production writes still need confirming.
* **Duplicates become references.** When a scrape finds a source whose subject already has a pin, add it to that pin as a reference instead of discarding it or making a second pin.
* **Roundups need per-item sources.** Never give every pin from a listicle the same shared article URL.
* **No "Other" category.** Create a specific category in `categories.ts` rather than force-fit or use Other.
* **Match the cost to the pin's own event.** The phase's figure over the programme's, the newest revision, null when genuinely costless.
* **Series are one chain.** A response series is one linear story-ordered chain; if a branch seems needed, ask.
* **A schedule of upcoming events threads newest first.** Owner, 2026-09-20: for the SpaceX launch pins the latest launch is the thread's first entry and the oldest the highest response number (each launch answers the one *after* it). Story series (anime seasons, product variants) stay oldest first; a schedule of dated launches is the other way round.
* **A law or other thing in force gets a start *and* an end.** Owner, 2026-09-21,
  on pin 2401: "For law and relevant pins. Should have effective start and end
  date", confirmed as standing: "current approach is good. do this going
  forward". Keep the start on the pin's own event (the signing) and take the end
  from the **operative clause**, quoted in the date reasoning; the end is the
  exclusive 00:00Z boundary. Covers laws, stopgaps, contracts, authorisations,
  mandates, bans with a sunset and fiscal years. Null only when genuinely
  open-ended; a deadline, a vote or a budget presentation stays a single day.
  It uses the existing `utcEndDateTime` - **no new field**, and the owner has
  agreed not to add one, so do not propose an `effectiveStartDate` column.
  Details in [Fields](fields.md).
* **Persist seed data with `npm run backup:data`**, never by hand-editing the seed JSON.
* **When the API key has no credit, use the session LLM.** Do the LLM stages by hand with the app's own prompts and schemas and apply them through the same scripts (`wiki:export`/`wiki:apply`, `references:apply`, `POST /api/pins`); never wait for credit.
* **Get 3 media on every pin, best effort, with at least 1 image.** Owner, 2026-09-19: the media stage should keep looking until a pin has 3 media (a video counts), not stop at the first source, and a pin always gets at least one picture. Built: `src/lib/mediaTarget.ts` replaces the pictures-only `TARGET_IMAGES`. Fewer is acceptable only when every source is exhausted, and never padded with unfetched or unrelated pictures.
* **A market pin says how much money is on it.** Owner, 2026-09-20: prediction-market scraping records the market's dollar volume, the pin page shows it, and the timeline's weighting leans on it. Quote it beside the odds in the pin's own words, and let the app keep the stored figure ([Strategy](strategy.md#decision-rules)).
* **Do not add write-ups to the root README.**
* **A video embedded in a reference belongs to the pin.** Owner, 2026-09-20: pin 315 should carry the YouTube video that its own reference article embeds - as a reference *and* on the pin's media. Best effort: get the product video and bring it to both.
* **A released product cites its MSRP from the company's own page.** Owner, 2026-09-20: for a released or on-sale product, check the company's product/store page for the MSRP and add that page as a reference.
* **Tags should be relevant and catchy.** Owner, 2026-09-21: pin 2389 (US Fiscal Year 2028) was tagged `Appropriations, Federal budget, Fiscal year, United States` and was missing the thing anyone would actually search for - `Government Shutdown`. Tag the consequence and the familiar name people know the event by, not just the procedural vocabulary of the source, and title-case them (`Federal Budget`, `Fiscal Year 2028`).

* **A batch gets a new desk when no existing desk fits.** Owner, 2026-09-24, during the Aldi Nord run: "create new user if that makes more sense". Match the company to what it *is* (a store chain is @RetailDesk, a consumer-goods maker @ConsumerDesk, restaurants @FoodDesk). When nothing fits, create a curator rather than force-fit one, and get the new account's email confirmed on prod *before* the run: prod refuses POST from an unverified account, and the API cannot re-author pins later (see the Nestlé entry).
* **A product pin says what the product is.** Owner, 2026-09-22, on pin 2346 (the A350F first flight): "Product pins should have notable features in long form summary". A pin about an aircraft, vehicle, device, chip, game, AI model or software release gets summary points on what is new or distinctive about it and its headline specifications with units, not only the event's date and schedule. Owner, same day: the features go in **their own section** - `<h3>Notable features</h3><ul>...</ul>` after the event's list - "rather than piled into large list of bullets with other things". Built into all three summary prompts (`PRODUCT_FEATURES_RULE` in `src/server/extract/index.ts`); the wiki pages now record a product's features too. The manufacturer's product page is the usual place for the specs; add it as a reference.
## 2026-09-24 - Aldi Nord news events, straight to production (@RetailDesk, @EconDesk, @LawDesk, @HealthDesk, @BuildDesk)

Ian asked to "pin Aldi Nord news events on prod". Three agents drafted one slice each: the company and
Germany, the other countries, and labour/courts/recalls. The lead linted the drafts, viewed every picture
on contact sheets and posted **34 pins** serially. Ids 3115-3223, interleaved with another session's.
Every pin is tagged `Aldi` and `Aldi Nord` under company Aldi Nord (company 6746). No create failed, so
nothing needed a repair PUT.

* **Chains (oldest first):**
  - Leadership: 3122 CEO de Lope -> 3123 Kürten as Germany head.
  - German pay: 3127 -> 3129.
  - Belgian Sunday opening: 3135 walkout -> 3137 plan to unions.
  - All Seasons herb recalls: 3144 -> 3146.
  - Leader Price: 3158 signing -> 3168 completion.
  - Denmark exit: 3172 -> 3178 KFST clearance -> 3183 last stores.
* **Standalone:** Aldi Süd private labels 3115, store No. 1 3116, HQ campus 3117, climate goal 3118,
  Albrecht settlement 3119, Lehrte-Aligse 3120, Wolfsburg store 3121, app discounts 3124, Expo Real 3125
  (5-7 Oct 2026, `scheduled`), Haribo cartel fine 3126, depot closures 3131, Best DC 3133, Poland pay 3139,
  French fake-discounts fine 3141 (`estimated`: the DGCCRF page is undated), schnitzel recall 3151,
  Shop & Go 3189, 400th Polish store 3194, Emilianów DC 3202, 500th Spanish store 3205, Anderlecht 3221,
  Portugal 2030 target 3223 (`estimated`, 31 Dec 2030).
* **Learned:**
  - "Aldi" in the news is often Aldi Süd. The cio.de lead image and the CJEU price case were both Süd's.
    Nord's logo is the blue/white/orange stacked A; Süd's is the multicolour stripes.
  - aldi-nord.de and aldi.pl delete old releases. Wayback copies back the date; a trade or ots copy is the source.
  - Agents reused each other's pictures without noticing: the same Lehrte-Aligse aerial, a recall pack shot,
    the Denmark press photo inside a 1977/2023 graphic, a CEO portrait inside a handover composite.
    `check.py` catches identical URLs; only the contact sheet catches the same photo under another URL.
  - Agents write multi-word tags ("Store Opening", "Distribution Centre", "Price Fixing"). The lead mapped
    them to one word (`Opening`, `Warehouse`, `Cartel`) before posting.
  - With the load gate (`/proc/loadavg` < 3 over SSH) plus 45 s between posts, a busy prod (other sessions
    posting, ids jumping by 10) gave no 500s.
* **Not pinned (candidates):** Checkout Aldi on Friedrichstraße (18 Mar 2022, fully sourced);
  UOKiK payment-delay fine (1 Feb 2023, PLN 829,987, cut 30 Sep 2024); Aldi E-Commerce closure (30 Sep 2025);
  Zaandam DC closure (2020); Denmark's 16 extra stores (9 Feb 2023); Woluwe/Châtelineau openings (Aug 2026);
  Aldi Nederland CEO Rozendaal (6 Nov 2024); Portugal's Moita DC (Apr 2022).
* **Feedback:** a new desk when none fits (see Standing feedback).
* **Changed**: [Vertical recipes](verticals.md) - an Aldi Nord row.

## 2026-09-23 - Nestlé news events, straight to production (@ConsumerDesk, @EconDesk, @HealthDesk, @LawDesk, @BuildDesk)

Ian asked to "pin Nestle news events on prod". Same workflow as the Aramco batch below: four agents
drafted POST bodies (results / leadership and job cuts / portfolio and sites / safety and legal), the
lead deduped, checked and posted serially with each desk's prod token. Twenty-eight pins, all tagged
`Nestlé`, company Nestlé (ids interleaved with a Verizon session's):

- **Results chain** (@ConsumerDesk, `Food`, `Finance`, timed 07:00 Vevey from GlobeNewswire's "01:00 ET"
  stamp): 3059 H1 2025 -> 3061 9M 2025 -> 3062 FY 2025 -> 3064 Q1 2026 -> 3065 H1 2026 -> 3066 9M 2026
  (`scheduled` 22 Oct 2026) -> 3067 FY 2026 (`scheduled` 18 Feb 2027), both from the Half-Year Report's
  shareholder calendar.
- **Leadership** (@ConsumerDesk): 3068 Freixe fired / Navratil CEO -> 3069 Isla chairman (the 1 Oct effective
  day, not the 16 Sep announcement) -> 3071 AGM 2026 at the SwissTech Convention Center.
- **Job cuts** (@EconDesk, `Labour`, tag `Layoffs`): 3072 the ~16,000 cuts -> 3074 the end-2027 deadline
  (`estimated`); 3076 Diósgyőr chocolate factory handed to Vimpex on 1 Jan 2027.
- **Portfolio** (@ConsumerDesk): 3078 Blue Bottle to Centurium; 3080 Peranel waters JV with Platinum Equity
  (EUR 4.9bn) -> 3083 close (`estimated` H1 2027); 3084 mainstream vitamins to Yellow Wood ($1.0bn)
  -> 3086 close (`estimated` H1 2027). **Sites** (@BuildDesk): 3088 Purina Batavia, Ohio opens; 3089
  Purina Mantua plant (production 2029, `estimated`).
- **Infant-formula recall** (@HealthDesk / @LawDesk): 3091 first recall, 25 batches in 16 countries
  (10 Dec 2025, Nunspeet) -> 3093 worldwide recall over tainted ARA oil (5 Jan 2026) -> 3095 Paris
  prosecutors' five probes (opened 30 Jan, announced 13 Feb) -> 3096 Assemblée nationale report.
- **Mineral water** (@LawDesk): 3097 Senate inquiry report -> 3099 Gard prefect's Perrier borehole
  decree (18 Dec 2025) -> 3100 end of its 24-month reinforced checks (`estimated`); 3102 Nancy appeal
  court orders the Vosges plastic-dumps case retried.

* **Learned - a prod create half-saves when one media fetch fails.** Four of 28 POSTs came back
  `500 fetch failed`: `downloadImage` has no timeout or retry for a network error, and create is not
  transactional, so the pin row and references were saved with **no media and no user tags**. Every
  image downloaded fine from the Mac, so it was transient on the busy VM (another session posting at
  the same time). Repair: find the pin by title just past the newest id and send the whole draft as a
  `PUT` (update fetches thumbs before its transaction opens). `post.mjs` now does this itself. Fixed at the source on 2026-09-24: `downloadImage` (src/server/image.ts) gives each try a 30 s timeout and retries a network error, timeout or 5xx twice (after 1 s and 4 s). A
  count by `tag:` and `company:` confirmed no stray duplicates.
* **Learned - nestle.com is walled to everything the app has.** Cloudflare 403s plain `curl`, and
  the app's own headless scraper and `fetchSourceText` get only "Just a quick security check", so prod
  cannot read a nestle.com release as a source. WebFetch reads the pages, but only as a summary.
  Readable copies of the same text: **GlobeNewswire** (Nestlé's distributor; its stamp gives the time;
  the scraper reads it, `curl` times out) and **the PDFs** under `nestle.com/sites/default/files/YYYY-MM/`,
  which download with plain `curl` (releases, investor decks, transcripts, the Half-Year Report whose
  last page is the forward financial calendar). Sources were switched to those wherever one existed.
* **Learned - Nestlé releases always go out at 01:00 ET**, which is 07:00 in Vevey: 05:00Z in summer
  time, 06:00Z in winter. The calendar gives dates, never the hour. Deal notices with no time on
  Nestlé's side took the buyer's PR Newswire stamp (Yellow Wood 13:00 ET).
* **Learned - in an industry-wide scare, check whose product it is.** The first confirmed cereulide case
  in France was Danone's formula and the Angers death was ruled asphyxia; neither was pinned. The
  recall began on **10 Dec 2025** in 16 European countries, weeks before the 5 Jan worldwide recall
  most coverage dates it from (Nestlé's "sequence of events" PDF and national regulators' notices).
* **Learned - the day a probe is announced is not the day it opens** (Paris: announced 13 Feb, opened
  30 Jan per the prosecutor quoted by franceinfo). franceinfo reads with `curl` and its topic page
  `/sante/alimentation/lait-infantile-contamine/` lists the whole saga.
* **Learned - Wikimedia 429s a bare `Mozilla/5.0` UA under four parallel agents** while the ChronoPin UA
  still gets 200, so `check.mjs` now sends the ChronoPin UA to wikimedia.org, as prod does.
* **Learned - a video's own YouTube still is not a second picture.** One agent padded results pins with
  the call video's `i.ytimg.com/.../maxresdefault.jpg`; dropped (the video already carries that still).
* **Traps:** Commons has no photo of Pablo Isla; coverage lead images are mostly reused stock
  (FoodNavigator Getty shots of other Nestlé buildings, CNBC's 2023 KitKat photo); Food Processing said
  Bulcke left "effective immediately" against Nestlé's 1 October; Inside Retail Asia said Blue Bottle
  "completes" while Nestlé said "expected to close"; Food Dive said the ice cream was sold, the H1
  report says "held for sale". Reverse-geocoding a courthouse or palace centroid gives the nearest
  street, so those pins use Nominatim's own label for the named object.
* **Feedback - a consumer-goods company gets its own desk.** Owner, 2026-09-24: the company-level pins
  had gone to @FoodDesk and "should use a new user" - @FoodDesk is restaurants. **@ConsumerDesk** (user
  410) was created on prod for consumer-goods companies (packaged food, drinks, household and personal
  care) and took the fifteen results, leadership and deal pins; event desks keep theirs. The account was
  signed up through `POST /api/users`, but prod's email-verification gate blocks an unconfirmed account
  from posting and a `.local` address gets no mail, and the API cannot change a pin's author - so the
  owner ran one SQL transaction on prod (confirm user 410's email, set `userId` 372 -> 410 on the fifteen
  ids), then each pin got a whole-pin `PUT` as @ConsumerDesk so caches, the live feed and search saw the
  new owner. Ids, chains, references and duplicate decisions were kept (a delete-and-repost loses them).
* **Judgement calls to revisit:** The AGM (3071) was kept in the leadership chain and the results team's duplicate dropped.
  Not pinned: the ice-cream exit (nothing signed), yfood (no date), the Toronto KitKat line, Purina
  Vargeão (Brazil), German plant closures (unverified), Bonneval's suit (no hearing date).
* **Changed**: [Vertical recipes](verticals.md) - a Nestlé row; [Sources](sources.md) - nestle.com,
  GlobeNewswire, franceinfo.

## 2026-09-23 - Verizon news events, straight to production (@TechDesk, @EconDesk, @LawDesk)

Ian asked to "pin Verizon news events on prod". Second production batch, same workflow as Aramco:
three agents (finance, deals/regulation, network/products) drafted 40 POST bodies to files, the lead
linted them (`check.py`: enums, ISO dates, categories, the exact VZ note, citations vs references),
viewed every picture on a contact sheet and posted serially. **38 pins, 3049-3114** (ids interleaved
with another session's Nestlé batch), all tagged `Verizon`, company row 6656:

- **Results chain** (oldest first): 3049 Q2 2025 -> 3052 Q3 2025 -> 3054 Q4/FY 2025 -> 3057 Q1 2026
  -> 3113 Q2 2026 -> 3114 Q3 2026 (`estimated` Wed 28 Oct 11:00Z - IR lists nothing yet; re-date by
  whole-pin PUT when the webcast notice appears). Corporate: dividend (3050), Schulman replaces
  Vestberg (3051), $25B buyback + January dividend raise (3055), Sampath out (3056).
- **Layoffs** (@EconDesk, `Labour` first, tag `Layoffs`): 13,000+ (3053, $1.7B charge), several
  hundred in May (3058), 274 stores sold + 500 corporate (3060).
- **Frontier chain**: 3070 agreement ($20B) -> 3081 FCC approval with the DEI pledge -> 3090 CPUC ->
  3094 close (20 Jan 2026). **AST chain**: 3063 $100M commitment -> 3085 definitive agreement -> 3112
  beta (`estimated` 31 Dec 2026). **Outages**: 3082 Aug 2025 -> 3092 Jan 2026 (10 h, $20 credit).
  **Plans**: 3079 3-year price lock (a period, ending 16 Jun 2026) -> 3106 Simplicity plan + loyalty.
- Loose: Vertical Bridge towers (3073), admin-fee settlement payouts (3075, @LawDesk), satellite
  texting on Android (3077), unlocking-rule waiver (3087), Starry (3098), Super Bowl LX (3101),
  AT&T/T-Mobile/Verizon satellite JV (3103), UScellular spectrum (3104), Supreme Court upholds the
  location-data fine (3105, @LawDesk), AWS-3 Auction 113 (3107), BT international JV (3108), World
  Cup 2026 network (3109), NFL Shine takeover (3110), Corning fiber through 2032 (3111).

* **Learned - a failed create on prod leaves a partial pin.** Five POSTs answered 500 ("Image
  download failed with 404", or "fetch failed" while another session was posting on the same VM),
  and **every one had already saved the pin row and references** - no tags, no media, no stocks - under
  a fresh id. A `tag:` search right after did not show it (search lags), so it looked clean; the next
  retry then 409'd on the duplicate `sourceUrl`. Fix: find the partial by title among the next ids and
  **whole-pin PUT** the draft onto it (PUT is transactional, and it saves tags, media and stocks).
  The runner now does that by itself and waits 45 s between posts.
* **Learned - agents guess Commons hash paths.** Two BlueBird photos were given
  `/commons/8/82/...` for files that live under `2/23`; the file had been "downloaded and viewed"
  through a different URL. Resolve every Commons image through
  `api.php?action=query&prop=imageinfo&iiprop=url|size` before posting, strip the `utm_*` query it
  adds, and serve anything over 4000 px as a 1920 px (1280 px for portrait) thumbnail on
  `thumb.wikimedia.org` rather than a 14,000 px original to a small VM.
* **Learned - the duplicate-source check is per author.** A WARN forward pin (282 Basking Ridge jobs
  ending 16 Oct 2026) could not be posted: New Jersey publishes one cumulative
  `2026_WARN_Notice_Archive.pdf`, which @EconDesk had already used for Samsung (2906). Not posted;
  the fact sits in 3060's orbit. A second NJ WARN pin by the same desk needs another source (the
  notice itself, or coverage), not a tweaked URL.
* **Learned - verizon.com reads with plain `curl`** (newsroom pages carry `datePublished` to the
  minute, matching the 8-K acceptance stamp), but its images only load from `www.verizon.com` - the
  bare host 404s. Executive portraits come from `ss7.vzw.com/is/image/VerizonWireless/<name>?scl=1&fmt=jpg`.
  Earnings image cards are logo cards; use the HQ (1095 Sixth Avenue) or the executive instead.
* **Learned - outages have no pictures.** Coverage uses logos on tablets or store-sign file photos;
  the outage pins carry Verizon cell-site photos from Commons plus NBC/CBS news clips.
* **Judgement calls:** the dividend raise moved from September to January (no September 2026 raise,
  so no pin); the AST and Corning deals keep Verizon as company with the partner as a stock; the
  satellite JV (3103) is only an agreement in principle - its definitive agreement should answer it;
  the BT JV completes "in 2027" (not yet pinned).
* **Feedback**: none yet.
* **Changed**: [Vertical recipes](verticals.md) - a US telecom row; [Sources](sources.md) - verizon.com.

## 2026-09-23 - Saudi Aramco news events, straight to production (@EnergyDesk, @TechDesk, @BuildDesk)

Ian asked to "pin Saudi Aramco news events on prod" - the first batch posted to production
(www.chronopin.com) rather than local dev, now that prod is the source of truth (`db:pull-prod`
replaces local). Four research agents drafted POST bodies to files and posted nothing; the lead
checked every draft (fields, image downloads, videos' channels via oEmbed, pictures viewed) and
posted them itself with each desk's prod token. Twenty-six pins, 2996-3026 (ids interleaved with another session's): the results chain 2996 Q3 2025 -> 2998 FY 2025 -> 2999 Q1 2026 -> 3001 Q2 2026 -> 3002 Q3 2026 (`estimated` Tue 3 Nov,
08:00 Riyadh), the $4B bond (3004) and the first buyback (3005); Jafurah as one chain, 3006 the $11B
GIP midstream close -> 3007 first shale gas (`delayed` from early 2024) -> 3009 phase two (end 2027);
Tanajib/Marjan 3010 -> Zuluf 3011 (end 2026); Master Gas System phase three (3012, 2028); the Ras
Tanura drone strike (3013) and helicopter crash (3014); Commonwealth LNG/MidOcean (3015), the PRefChem
sale to PETRONAS (3017), $3.7B of French deals (3018), HAPCO Panjin start-up (3019), S-Oil Shaheen
(3020, `delayed` to Jan 2027), Rio Grande LNG Train 4 (3021, 2030); @TechDesk's HUMAIN term sheet,
Microsoft and IBM industrial-AI deals (3022-3024); @BuildDesk's Aramco Stadium Company -> stadium
opening (3025 -> 3026). All tagged `Aramco`.

* **Learned - the production workflow.** Curator passwords are the same on prod (seeded users);
  log in at `https://www.chronopin.com/auth/local`, one token per desk. Agents draft only; the
  lead posts serially. Prod's own save pipeline stores the pictures (thumbs in the `thumb`
  container, so no `thumbs:push`), and its save listener runs the wiki refresh on the prod key.
  Whether the wikis were written is **unchecked**: `/api/pins/:id/okf` and `/sources` are
  admin-only, and the summary a curator reads back only shows `[S]`/`[n]` turned into `<cite>`
  tags. No `wiki:export`/`apply` (they run against the local database), no `backup:data` (the
  next `db:pull-prod` brings the pins down).
* **Learned - one POST takes about two minutes on prod, and prod is small.** The second post 500'd
  with "Connection terminated unexpectedly" while the home page took 53 s: the B2s VM was carrying
  the previous pin's pipeline and another session's posts. Nothing was half-saved (checked by
  `tag:` and `company:` search, and the neighbouring ids belonged to another session). Posting one
  at a time with a 30 s pause went through cleanly. Pin ids interleave with other sessions'.
* **Learned - aramco.com is a bot wall to `curl` and WebFetch** (timeouts), including its images;
  the app's scraper reads every page, but the newsroom list renders only the newest story, so find
  release URLs by WebSearch. aramcostadium.com is the same; its `sitemap.xml` reads through WebFetch.
* **Learned - the time of an Aramco filing is Tadawul's stamp, not aramco.com's.** saudiexchange.sa
  403s to `curl` but renders through the scraper (`04/08/2026 08:00:22` = Riyadh, UTC+3); results
  land about 08:00 Riyadh (05:00Z). Mubasher (`english.mubasher.info/markets/TDWL/stocks/2222/announcements`)
  mirrors every filing with plain `curl`, its "UTC" `published_time` really Riyadh time. aramco.com
  itself shows the Q2 release as "AUGUST 03" (a Riyadh-midnight date rendered in another zone).
* **Learned - the partner, the photo and the dateline disagree on the day.** Microsoft MoU: release
  12 Feb Dhahran, signing backdrop "February 10, 2026 | Riyadh" - pinned to the signing. PRefChem:
  Aramco 24 May, PETRONAS 25 May, SPA's copy "May 10". IBM: datelined Riyadh, announced at Think in
  Boston. Read the partner's release and look at the event photo, not only Aramco's dateline.
* **Learned - pre-visit scoops name deals that never happen.** Reuters' Woodside Louisiana LNG stake
  and the Port Arthur Phase 2 25% stake were never signed (Aramco's own 19 Nov list, Sempra's 10-Qs);
  no pins. A search summary's "Abqaiq drone shutdown" came from an untrustworthy site; not pinned.
* **Learned - SPA copies bring pictures.** spa.gov.sa/en releases and their `portalcdn.spa.gov.sa`
  photos read with plain `curl` - the best substitute for aramco.com's walled images. Commons has
  almost no modern Aramco photos (`AramcoCoreArea.jpg` for the HQ). Aramco's YouTube (@aramco)
  posts project films (Jafurah, Master Gas System) but nothing on results or deals.
* **Learned - WebP is fine.** 91 existing WebP originals all have thumbs (sharp decodes them).
* **Learned - figures disagree across sources** (MEES's FY 2025 adjusted income $93.4bn vs Aramco's
  $104.7bn): take the filing's. A programme's ">$100bn" lifecycle figure is not a phase's price
  (Jafurah start-up left null).
* **Traps:** Nominatim/Photon returned empty bodies while four agents geocoded at once; Jafurah,
  HAPCO and Commonwealth LNG are not in OSM; Overpass times out on name-regex queries over the
  Eastern Province (query a bounding box and filter locally); reverse-geocoding a city centroid at
  high zoom gives a landmark (Paris -> "Notre-Dame Forecourt"; use zoom=10); Al Jazeera's
  "SAUDI-CRASH" image is a 2018 refinery file photo; an "Asia One News" results clip was dropped
  as not an established channel.
* **Judgement calls to revisit:** the AI deals went to @TechDesk (`AI` first) and the Aramco Stadium
  pins to @BuildDesk (`Architecture`/`Sports`), following the Amazon/Microsoft rule that each event
  takes its vertical's desk; S-Oil's Shaheen and NextDecade's Rio Grande Train 4 carry the partner
  as company and `Aramco` as tag; Jafurah's start is 1 December (Aramco says "in December 2025",
  Reuters reported it begun on the 3rd). The HUMAIN stake has a term sheet only - its definitive
  agreement should answer that pin.
* **Feedback**: none yet.
* **Changed**: [Vertical recipes](verticals.md) - an Aramco row; [Sources](sources.md) - aramco.com,
  saudiexchange.sa/Mubasher, spa.gov.sa.

## 2026-09-22 - Layoffs, eighteen pins (2904-2924, @EconDesk)

* **Done**: Ian asked to "pin Layoffs news events". Eighteen layoffs from June
  to October 2026 - Rackspace, Robinhood, Lucid, Bungie, Monday.com, Visa,
  Zillow, Etsy, Apple (Vision Pro and Siri), Uber, Volkswagen, Jaguar Land
  Rover, Omnicom, Oracle, and four forward-dated closures from WARN notices
  (Wonder's New Jersey kitchens, Zalando Erfurt, Samsung's New Jersey HQ,
  TikTok Nashville). Four agents, one shared instructions file, posted through
  `POST /api/pins` with an @EconDesk token. Every pin carries the shared tag
  `Layoffs` (as Microsoft's 2852/2853 already did) and `Labour` first.
* **Learned**: **the tracker was wrong on almost every pin.** Discovery came
  from tracker round-ups (Yahoo's tech-layoffs tracker, search summaries), and
  verification changed a fact on 12 of 18: Uber's memo is dated 2 September
  not the 4th; Volkswagen did not "lay off 50,000 on September 5" - its
  supervisory board approved about 50,000 *more planned* cuts on 3 September;
  Omnicom's 15,000 came from the CFO at Goldman's Communacopia, not an earnings
  call, and includes disposals and offshoring; Samsung's 739 are at Englewood
  Cliffs, not Ridgefield Park (that is a separate 179-role SDS notice);
  Lucid's 18% is of the *U.S.* workforce; Monday.com's letter says ~620, not
  ~630; Apple's "at least 60" became ~200. A tracker only shortlists; the
  filing or the memo is the fact.
* **Learned**: **EDGAR is the fastest primary source for a listed company's
  layoff** - an Item 2.05 8-K gives the share and the charge, the next 10-Q the
  top-up (Oracle's $2.1B plan plus ~$700M "to reflect additional actions" is
  the pin's price). No WebSearch needed ([Sources](sources.md)).
* **Learned**: **WARN notices give the forward calendar.** A closure notice
  carries a separation date weeks ahead, so four of the eighteen are
  `scheduled` pins still to come, placed at the closing site's WARN address.
* **Learned**: **a tag that is also a category name becomes a category.** An
  `AI` tag turned into a fourth category on Oracle, Visa and Apple; kept,
  because each blamed or aimed its cuts at AI.
* **Learned**: news videos on a layoff are scarce: Omnicom, Zillow and Etsy
  have none from an established channel (commentary channels only), so they
  carry three pictures. Bungie's is Jason Schreier's own "Why Destiny Died",
  from the Bloomberg reporter who broke the story, a month before the cuts.
* **Learned**: reverse-geocoding an HQ's street point can land on a neighbour
  (Uber's 1725 3rd St came back "Misalignment Museum", Lucid's Newark HQ a
  building over); search the named building and reverse that, or zoom=17.
* **Learned**: an existing Company row may be the **brand**, not the group:
  "Volkswagen" (132) holds the ID. car and the Microbus, so the group-wide cut
  went to a new "Volkswagen Group" row.
* **Feedback**: none yet; the standing scrape-without-sign-off rule.
* **Changed**: [Vertical recipes](verticals.md) gains a Layoffs row;
  [Sources](sources.md) gains EDGAR, state WARN notices, keyless YouTube search
  and the sites blocked to `curl`.

## 2026-09-22 - Amazon news events (pins 2854-2886, twelve pins, seven curators)

* **Done**: Ian's "pin Amazon news events", with no API credit (`GET /api/scrape` came back `llm: "session"`). Four research agents wrote POST bodies to a scratch dir, and the session reviewed, validated and posted each one itself as the vertical's curator: Prime Big Deal Days 6-7 Oct (2854, @RetailDesk), the $20 starting-pay raise effective 27 Sep (2855, @EconDesk), the 21 Air Flight 7598 overrun at Miami (2872) with Amazon's pause of 21 Air threaded under it (2873), the Wiwynn Socorro plant (2874) and the $18B Louisiana data-centre plan (2875, all @BuildDesk), the FTC monopoly trial on 29 Mar 2027 (2876, @LawDesk, `delayed` from 13 Oct 2026), the $20M Colorado River Basin Collaborative (2877, @ClimateDesk), Kevin Mandia's board seat (2878, @CyberDesk), and AWS's NATO RESTRICTED approval, DuckLabs acquisition and re:Invent 2026 (2884-2886, @TechDesk).
* **Learned - the newsroom's daily roundup is the index.** `aboutamazon.com/news/company-news/amazon-news-today-top-stories-company` reads with plain `curl` and links every current story; one fetch gave the whole candidate list. Each story's own page is the `sourceUrl`, never the roundup.
* **Learned - announcement day is not event day.** Amazon's pay post gives no effective date; the AP wire ("effective starting Sept. 27, the retailer said") does, so the pin is the 27th with that reference owning the date at 88. The Louisiana page is a February article *updated* on 18 August, and the 21 Air pause is filed on Amazon's updates page under 13 September, not the 14th that CNBC's URL suggests.
* **Learned - a court's own scheduling order is a good source** for a trial date: CourtListener's RECAP PDFs (Dkt. 577, 700 for FTC v. Amazon) state the date and its history where MLex, Law360 and Bloomberg Law are paywalled past the lead.
* **Learned - Nominatim 429s under parallel agents.** Three of four agents were rate-limited for the whole run and fell back to Photon (komoot, OSM data) for forward and reverse geocoding. Stagger agents' geocoding.
* **Learned - same-day news has no video yet.** NATO (same day), DuckLabs and the Mandia board seat have none from an official or verified channel, and were posted without one rather than padded with commentary channels or an off-topic interview.
* **Learned - Nasdaq's lookup rejects SNCY** ("Nasdaq has no US stock or ETF SNCY"), so Sun Country could not be attached to 2873.
* **Trap - never put the owner's email in a request.** An agent fetching an SEC 8-K put Ian's address in the User-Agent (the SEC asks for a contact). SEC fetches use a generic contact string.
* **Judgement calls to revisit**: 2874's company is Wiwynn (its plant and investment), so it is not under the Amazon company; 2872's company is 21 Air and it went to @BuildDesk because no desk owns crashes; the Q3 2026 earnings pin was not made because Amazon has not dated it; Coca-Cola was left off 2877 (only its foundation joined); a relative's salary in the Mandia 8-K was left out of 2878.
* **Feedback**: none yet; standing scrape-without-sign-off.
* **Changed**: [Sources](sources.md) Nominatim row (the 429 fallback and the contact rule).

## 2026-09-22 - Notable features on product pins (pin 2346, @BuildDesk)

* **Feedback**: "Product pins should have notable features in long form summary" - the A350F
  first-flight summary covered only the certification schedule and never said what the
  aircraft is.
* **Learned - Airbus moved its product pages.** `aircraft.airbus.com/en/aircraft/a350/a350f`
  is a 404; the freighter lives at `/en/aircraft/freighters/a350f` and reads with plain curl
  (payload, range, door size, engine, dimensions in a "Key figures" block).
* **Learned - a hand-written summary had kept its `[S]`/`[1]` labels as text.** Pin 2346 showed
  literal "[1]" on the page; summaries must store `<cite data-ref>` tags (the prompts' labels are
  converted by `citeLabels` only on the API path). Re-cited while rewriting it.
* **Feedback**: "notable features should have its own section rather than piled into large list of
  bullets with other things" - so the rule asks for an `<h3>Notable features</h3>` list after the
  event's list; `.rich-text h3` got a style (it had none) and the OKF export writes it as `###`.
* **Backfill, same day** (Ian: "do it"): 312 existing product pins (devices, chips, games and
  game reviews, AI model releases, aircraft, vehicles, audio, sneakers; not infrastructure,
  launches, markets or conferences) rewritten by 32 research agents with no API credit, then
  saved by full-pin `PUT` as each pin's author. 186 curator pins saved, then the 125 authored by Ian's own
  accounts (users 1/2) with an admin token he supplied: 311 of 312 done; 1 skipped (pin 300, an
  unannounced game).
* **Learned - most "product" summaries were already mostly features.** Agents *moved* existing
  feature points verbatim under the heading and only researched what was missing; a checker
  confirmed every old point survived and every point is cited.
* **Learned - openai.com returns 403 to curl and WebFetch**; its launch posts were read and cited
  as web.archive.org snapshots, and the model specs from `developers.openai.com/api/docs/models/`.
  Sony, Audio-Technica, JBL and sonos.com shop pages block bots too.
* **Learned - a pin save deletes and re-inserts its merchants, media and references**, so their
  row ids change on every `PUT`; compare children without ids when checking a save.
* **Fixed, same day** (Ian: "add to notes and fix"), all by full-pin `PUT`:
  * **26 OpenAI pins cited the wrong release-notes entry.** Their summaries cited
    `help.openai.com/.../model-release-notes#h_c54335ba28` - GPT-4o mini's anchor - instead of each
    pin's own entry, which is its `sourceUrl`. Because `urlKey` drops the fragment the page still
    numbered them to the source, but OKF and anyone following the link landed on the wrong model.
    Repointed to each pin's own anchor. **Rule:** on a page of many dated entries, a citation
    carries the pin's own anchor.
  * **Pin 17** (Snapdragon 805 preview) was dated 31 March 2014; Tom's Hardware's metadata says the
    preview was published 31 July 2014. Re-dated and marked confirmed - a wrong date, not a delay.
  * **Pins 52 and 98 happened later than planned**, so they now carry the delay fields: the Xbox One
    reached China on 29 September 2014, six days late (Game Informer, Engadget added as
    references), and Age of Empires: Definitive Edition slipped from 19 October 2017 to 20 February
    2018 (Wikipedia). `dateConfidence: delayed` with a "Stated:" `delayReasoning`, as earlier past
    delays are recorded.
  * **Pin 139** repeated Interesting Engineering's 2017 claim that the X-59 prototype would "run on
    two engines"; the aircraft has one F414, so the claim was dropped.
  * **Pin 796** said Lufthansa had retired its A380s. It retired all 14 in March 2020, then resumed
    A380 flights on 1 June 2023 and flies 8 (6 sold back to Airbus) - Airways and Wikipedia's fleet
    list. Its "first of 12" was also wrong: it was 14.
  * **Pin 42** had a sentence broken by a link turned citation ("shoulder plates; [cite] lists
    Health..."); reworded.
  * **Pin 2329**'s GR00T specs had come from WebFetch's model summary of NVIDIA's investor page
    (403 to curl). NVIDIA's newsroom page (`nvidianews.nvidia.com/news/nvidia-open-humanoid-robot-reference-design`)
    serves the same release raw; every figure matched, and it is now cited on those points.
    **Rule:** a figure read through WebFetch's summary is not verified - find a raw copy.
  * A pin's re-dated start moves its stock `startDay`/`startPrice`, as it should.
* **Changed**: the standing feedback above; the summary prompts in `extract/index.ts`,
  `extract/references.ts` and `extract/wiki.ts`.

## 2026-09-22 - Claude Opus 5.5 (pin 2694, @TechDesk)

* **Learned**: **the same publisher dates two announcements two different
  ways.** Three weeks after the Fable 5.1 page that carries no date at all,
  `anthropic.com/claude-opus-5-5` puts "Claude Opus 5.5 September 22, 2026" in
  its own header. So the two pins are modelled differently on purpose: 2693's
  date comes from a *reference* (the news index, rated above the source tier),
  2694's from the source itself. Never assume a publisher's habit from one
  page of theirs.
* **Learned**: **do not give the source's own reference row a `startDate` when
  the source dates itself.** Reference 1 and the source row are merged, so a
  95%-confidence `startDate` on it beat the source's 90 and won the claim - but
  the row renders the *source's* claim, so the list showed no tick anywhere
  while the tooltip said the page supplied the date. Dropping the `startDate`
  put the tick back on reference 1, where a reader looks. The rule and its
  mirror are in [Fields](fields.md#when-the-source-does-not-date-the-event).
* **Learned**: the model-line threading works without being asked - posting
  with no `parentId` put Opus 5.5 under Claude Opus 5 (1832), extending
  4.5 -> 4.6 -> 4.7 -> 4.8 -> 5 -> 5.5, and the pin picked up its derived
  `Thread` tag on save. Fable 5.1 correctly threaded onto nothing: a different
  model line, whose predecessor is still unpinned.
* **Learned**: **the wordmark turns up again.** The one in-page image besides
  the key art was `6d4a0d28...-2400x1260.jpg` - byte-for-byte the Anthropic
  wordmark taken off pin 2693 an hour earlier. The `og:image` this time is real
  announcement art ("Claude Opus 5.5" over a horizon), so the pin keeps that
  and the official video from the `@claude` channel. On this publisher, check
  every image and expect the wordmark among them.
* **Feedback**: none; this was the standing scrape-without-sign-off rule.
* **Changed**: [Fields](fields.md) gains the mirror rule; TechCrunch and XDA
  read in full and both date the launch, so no blocked page was cited.

## 2026-09-22 - Claude Fable 5.1 and Mythos 5.1 (pin 2693, @TechDesk)

* **Learned**: **the announcement page does not date itself; the news index
  does.** `anthropic.com/claude-fable-and-mythos-5-1` says only "September
  2026" and "available today", and the one ISO stamp in its HTML -
  `2026-09-22T16:27:50` - is a build timestamp for the page, not a publication
  date. Taking it would have dated the pin **three weeks late**. The date lives
  on the card in `anthropic.com/news`, and MacRumors' `article:published_time`
  (`2026-09-01T19:15:16Z`) and Wikipedia's Claude Mythos infobox ("Claude
  Mythos 5.1 / September 1, 2026") both confirm **1 September 2026**.
* **Learned**: **parse a listing card by its anchor, not by proximity.**
  Flattening the news index to text put the dates between the titles
  ambiguously - one reading gave this release Sep 1, another Sep 22 (which is
  the date of the *next* release, Claude Opus 5.5). Matching
  `<a href="/claude-fable-and-mythos-5-1" ...>(.*?)</a>` and reading only that
  anchor's own text settled it in one step - in the raw markup each card is a
  self-contained anchor holding its own `<time>`, and only the *featured* card
  puts its title before its date, which is exactly what makes the flattened
  reading ambiguous. Worth doing for any index where the entries are links.
* **Learned**: **the company's own launch video is not badged verified.** The
  top YouTube result was Anthropic's own "Introducing Claude Fable 5.1" on
  `@anthropic-ai`, and the search page carries **no verified badge** for it, so
  `pickProductVideo` - which returns early on `!candidate.verified` - would
  have thrown it away and taken a commentary channel or nothing. The channel
  scoring added today does not help, because the verified gate runs first. The
  fix worth making is to treat a channel that matches the pin's company as
  verified enough; until then a company launch video is a hand pick.
* **Learned**: two source notes. **anthropic.com reads in full** with a plain
  Chrome user agent (536KB, no challenge), and its article images are Sanity
  CDN URLs carrying their dimensions in the filename. **venturebeat.com is a
  Vercel Security Checkpoint**, 429 to `curl` with 278 characters of challenge,
  so its report was *not* cited - citing it would have repeated the exact
  defect this same day's reference work was cleaning up.
* **Learned**: **read the pictures back, even from the company's own page.**
  Two of the four images offered were the Anthropic wordmark - the `og:image`
  (whose `og:image:alt` says so) and an in-page 2400x1260 JPEG that looks like
  a content figure by its dimensions and was only 30KB. The two that earned
  their place were real research figures from the scientific-research section:
  a Nipah G protein binder ("Overall hit rate: 18/30") and a 300m DEM of a
  15km volcano. Filename and dimensions do not tell a logo from a figure;
  opening it does.
* **Learned**: **a new model line does not thread onto the old one.** Posting
  with no `parentId` correctly left the pin unthreaded: the Claude chain in the
  corpus is Opus (1819 -> 1822 -> 1828 -> 1830 -> 1832), and `Fable 5.1` parses
  as a different line, so nothing matched. Fable 5 and Opus 5.5 are both
  unpinned, so this pin heads nothing yet - flagged rather than auto-created,
  per the standing rule about branches.
* **Feedback**: the owner checked the pin's first reference and said **"source
  does not say sept 1 for this pin"**. Correct, and the pin was wrong to lean on
  it: the announcement page carries no date, so the `dateConfidenceReasoning`
  named Anthropic's news index as the evidence while that page was **not among
  the references**. A reader following the citation found nothing. The index is
  now reference 4 (confidence 90), quoting the `<time>Sep 1, 2026</time>` in
  this article's own card.
* **Feedback**: citing the index was not enough - **"not reflecting the
  change"**. It was reflected, but the owner was looking at the right thing:
  the source row still read "Starts Sep 1, 2026 **✓**", so the page was still
  saying the announcement supplied the date. A reference that only quotes a
  date in its `reasoning` never competes for it; it needs its own `startDate`
  **and** a confidence strictly above the source's, which for `confirmed` is
  **90** (`SOURCE_CONFIDENCE`), a tie going to the source. The news index went
  to 92 with `startDate: 2026-09-01` and the tick moved to it. Written up in
  [Fields](fields.md#when-the-source-does-not-date-the-event).
* **Learned**: the rule that falls out of it - **whatever the reasoning names as
  the evidence for a date has to be a reference.** Naming a page in prose a
  reader cannot click is the same dangling justification this same day's
  reference clean-up was built to find, and it is worth checking for directly:
  a `dateConfidenceReasoning` that names a URL or a publication absent from
  `PinReference` is a pin whose date cannot be checked. The date itself stood -
  in the raw markup each news card is a self-contained `<a>` holding its own
  `<time>`, MacRumors published "Anthropic today introduced Claude Fable 5.1"
  at `2026-09-01T19:15:16Z`, and Wikipedia's infobox agrees - but that was luck
  rather than evidence until the link was on the pin.
* **Changed**: [Sources](sources.md) gains anthropic.com and venturebeat.com
  rows; [Enrichment](enrichment.md) records the unverified-company-channel gap.

## 2026-09-22 - The data-quality backlog: bad references, stale odds, a gold-seller as a source

* **Learned**: **a reference's own `reasoning` is a defect log, and nobody was
  reading it.** Four of the five pins the owner flagged had reasoning that
  already admitted the problem in writing - "the fetched page returned
  unrelated content and no stored publish date" (pin 72), "actually covers an
  April 2024 Manheim reading ... a year after the pin's stored May 2023 date"
  (pin 202), "could not be fetched (403 error), but its own headline ... state"
  (pin 377). Grepping `PinReference.reasoning` for *could not*, *unrelated*,
  *headline* and *a year after* finds this class without reading a single page.
* **Learned**: **the five flagged pins are a sample of about 169.** Grepping
  `PinReference.reasoning` for its own confessions, corpus-wide:
  **218** references say the page *could not be fetched*, 52 cite a *headline*
  alone, 5 name a *different year*. Splitting the 218 by whether the page reads
  today is the actionable part - **192 of them, on 148 pins, are now backed by
  a full stored article** and only their reasoning still describes a 403 (pin
  377's Imaging Resource citation was one of these). Those want a reasoning
  re-written from the stored text, which is one LLM call each. The other 26
  (14 thin, 9 failed, 3 pending) are genuinely dead and want a replacement
  link, which is pin 72's case and needs a person. The query is in
  [Sources](sources.md).
* **Learned**: **a 200 is not the article.** `computerworld.com/article/3155017/`
  still answers 200 and still renders a page - a *different* one, "Dell Wyse
  5070 vs the Always Connected PC". `looksBlocked` cannot see this and neither
  can a status check; what does see it is comparing the stored `Source.title`
  with the `PinReference.title`, which differed outright. Added to
  [Sources](sources.md).
* **Learned**: **a fix does not update the reasoning that described the bug.**
  Imaging Resource had since been recovered (4,707 characters of real article
  in `Source.text`), but its reference still said it 403'd, and both of pin
  377's reasonings still measured the article against a pin date - "8 September
  2026" - that the pin no longer has. A recovery pass should re-write the
  reasoning of every reference it un-blocks, or the citation lies about itself.
* **Learned**: **a travel retailer's SEO blog will contradict the operator.**
  Two open lint findings on pin 808 (1458, 1459) both traced to one reference:
  Destinology dates the first Rocky Mountaineer to "7th June 1990" with "72
  passengers", where the operator's own 30-years post says "our own story
  officially began on May 27, 1990, when we welcomed 200 excited guests". The
  pin was right; the *reference* was the defect. Wikipedia's infobox and its
  "The inaugural train journey took place on May 27, 1990" (cited to the Via
  National Timetable of that date) settled it. **A contradiction finding is not
  automatically a finding against the pin.**
* **Learned**: **an "April" headline is not an April 2023 headline.** Hunting a
  replacement for pin 202 turned up two plausible-looking Manheim pieces -
  `press.manheim.com/Manheim-Reports-Used-Vehicle-Value-Index-Results-for-April`
  (index 124.2) and Vehicle Remarketing's "Manheim Used Vehicle Index Hits
  Three-Year Low in April" (index 125.8) - and both are different years; April
  2023 is 230.8. The index level is the year check. This is the same trap that
  produced the wrong reference in the first place.
* **Learned**: **a price quoted in prose needs the day it was read.** All 56
  market pins whose description carried odds quoted them undated, beside a
  `PinOdds` panel that fetches the live book every 30 seconds - so the pin read
  "Kalshi has The Odyssey at 52%" next to a panel saying something else, and two
  of them (1679, 1967) described events that had already happened. Refreshing
  the numbers would only re-create the bug, so every description now says when:
  "On 20 September 2026 Kalshi had The Odyssey at 52% ...". The rule is in
  [Vertical recipes](verticals.md): **the live panel is the present tense; the
  description is a dated reading.**
* **Learned**: **an aggregator channel is verified too.** `pickTrailer` scored
  only the video title (`official` + `trailer`) minus search rank, and
  `candidate.channel` was captured but never read, so AnimeSelect and Anime
  World outranked the studio's own channel twice in one day. It now scores the
  channel: +3 for a channel named after the work, its studio or its licensor,
  -3 for a name built only from generic words ("AnimeSelect", "Anime World"),
  which is enough to beat the whole rank spread. Demoted, not dropped, so a
  work whose only verified upload is an aggregator's still gets a trailer. The
  aggregator test runs first, because a filler word is sometimes the work's own
  ("World Trigger" against "Anime World").
* **Learned**: **the standing note's diagnosis was half right, and the re-run
  proved it by not working.** Re-running all 943 screen pins wrote 961 ratings
  and moved the rating-less count by two - 306 to 304 - because every one of
  those 961 was a *refresh* of a pin that already had one. The 96 aired anime
  pins with nothing are not a Jikan outage on its own and not a title-match
  failure on its own: **both have to go wrong**. `findAniList` needs an exact
  title match, which a Chinese donghua ("Tunshi Xingkong 4th Season"), an arc
  or a recap film never gets, and the cited-MAL-id fallback that should rescue
  them ran through Jikan, which 504'd **1,036 times** in the run. Checked five
  by hand: Jikan 504 on all five, AniList's `Media(idMal:)` answering with a
  score for three.
* **Changed**: `aniListByMalId` - AniList answers **by MAL id** for the score,
  the site link and the adaptation source, with no title match involved, and it
  is up when Jikan is not. The query had existed all along but asked only for
  episode fields, so a pin citing its own MyAnimeList page could get an episode
  count out of AniList and still be sent to Jikan for the score. It now serves
  both, tried before Jikan.
* **Learned - and the first version of that fix quietly lost most of it.**
  Placed *after* the title searches, the by-id lookup was being **aborted
  mid-flight**: `findScreenDetails` gives a pin one 60-second budget shared by
  every call, the title loop spends it on Wikidata (8s a candidate) and AniList
  title searches, and what is left over is what the decisive request gets. So
  the batch added 28 ratings where running the same pins one at a time found
  more - pin 1241 scored 79 on its own and "no ratings" in the run, with
  `aborted due to timeout` against `graphql.anilist.co` on the line above it.
  **A pin that cites a MAL id is usually a pin whose title matches nothing** -
  a season, an arc, a recap, a donghua - so the title searches were always
  going to fail *and* eat the budget first. Moving the by-id call to the front
  (one request, before the loop) is the fix, and it also folds the old
  `episodesByMalId` into the same call instead of a second one.
* **Learned**: a batch result that is worse than the same work done singly is
  the symptom to look for. Both runs "succeeded" and neither raised an error a
  human would read - the aborts are `log.warn` lines between pins, and the
  summary only counts what was added.
* **Changed**: anime pins now carry **what the work was adapted from** as a tag,
  from AniList's `source` field - `Manga Adaptation`, `Light Novel Adaptation`,
  `Original Work`, `Game Adaptation` and so on (`adaptationTag` in
  `src/server/scrape/screen.ts`). **The suffix is load-bearing**: the family was
  first named for the bare medium, and `Manga` is a category name, so `tagKind`
  filed the tag as a category and `replace` dropped it on save without a word -
  for the single commonest source. The owner chose to suffix the whole family
  rather than fold several hundred anime into the `Manga` category, and a test
  now asserts no member of the family is a category name. `ANIME` and
  `OTHER` map to no tag: an anime adapted from an anime says nothing, and
  nothing here is ever filed under Other. The scrape appends it to the pin's
  tags and `npm run media:screen -- --apply` backfills it through the new
  `PinTag.addUserTags`, which adds without replacing what a curator typed.
* **Changed**: **MMOExp is out of the corpus.** Pin 1869's `sourceUrl` is now
  Blizzard's own "Celebrate 30 Years of Diablo in Season of Hell's Legacy", and
  the three summary bullets that rested on MMOExp alone - Michael Goff's
  narrative poems, the remastered Tristram Cathedral dungeons, the Mufisto the
  Cow God event - are gone or re-sourced. Blizzard's own post carries the
  Tristram Cathedral claim in a form it will stand behind ("echoes of Diablo
  beneath Tristram Cathedral, Baal at Arreat Summit, and Mephisto within the
  Durance of Hate"), so that bullet survived on better evidence. No `sourceUrl`,
  reference or `<cite data-ref>` anywhere now points at mmoexp.com.
* **Learned**: **two pins of a chain were simply missing.** Kaiju No. 8 Season 1
  (MAL 52588) and the Mission Recon film (59489) were never scraped, which is
  why Season 2 headed its own thread. Posting them oldest-first through
  `POST /api/pins` set the film's parent at save time; only Season 2 needed a
  `PUT` to re-parent. Jikan 504s on 59489, so AniList's `Media(idMal:)` supplied
  the record and MyAnimeList's own page supplied the synopsis and date.
* **Feedback**: the owner's standing list in the README, answered in full. The
  two pins authored by user 1 (72 and 202) are left prepared but unapplied - a
  curator is neither author nor admin, as the category backfill found before.
* **Changed**: [Sources](sources.md) gains the repurposed-URL row and the
  index-level year check; [Vertical recipes](verticals.md) gains the dated-odds
  rule for market pins and the adaptation tag for anime;
  [Enrichment](enrichment.md) gains the channel-scoring note.

## 2026-09-21 - The US-China relationship as one thread (pins 2414-2426, 2428, @PoliticsDesk)

Fourteen pins for the bilateral relationship itself, threaded oldest first from
Nixon's 1972 flight to the state arrival ceremony for Xi on 24 September 2026,
with the existing pin 2404 re-parented into the middle of the chain. The corpus
held 42 China pins before this and almost none of them were about the
*relationship*: bridges, stations, skyscrapers and anime, plus one Taiwan
invasion market. Nixon in China, normalisation, the Taiwan Relations Act, PNTR,
WTO accession, the first Section 301 tariffs, Phase One, Pelosi in Taipei, the
October 2022 chip controls, the balloon and the Filoli summit were all missing
outright.

* **Learned - a relationship is a vertical, and its backbone is a thread.** The
  fourteen pins are one linear chain, each answering the one before it, so the
  thread view reads as the story of the relationship rather than fourteen
  unrelated dates. That is the story-series rule, not the schedule rule: oldest
  first. It also means a pin that already exists has to be threaded into the
  middle - see the PUT note below.
* **Learned - `history.state.gov` is the best single source for 1972-1979, and
  it says it is retired.** Both the Milestones essays
  (`/milestones/1969-1976/rapprochement-china`, `/milestones/1977-1980/china-policy`)
  and the FRUS historical documents (`/historicaldocuments/frus1969-76v17/d203`,
  the Shanghai Communiqué itself) read with plain `curl` and quote their own
  primary text, which is what the date reasoning wants. The Milestones pages
  carry a banner saying the series "has been retired and is no longer
  maintained" - still citable, and worth knowing before treating it as a live
  reference.
* **Learned - a document's own dateline beats the received date.** FRUS prints
  the Shanghai Communiqué under "Shanghai, February 27, 1972"; it is popularly
  dated 28 February, the visit's last day and the day it reached American
  readers. Pin 2415 takes the document's date and says in the reasoning why the
  other one is common. The same question will come up for every communiqué,
  treaty and signing statement in this vertical.
* **Learned - the American Presidency Project gives a pre-internet event its
  hour.** `presidency.ucsb.edu` reads with a browser UA, and the **`Note:` line
  at the foot** of a document is where the time and place live: "the President
  spoke at 10:12 a.m. on the South Lawn of the White House" is the whole of pin
  2417's timing (15:12Z). Its `/advanced-search?field-keywords=...&from[date]=...`
  URL also fetches and lists document slugs, so the right document can be found
  without spending a WebSearch.
* **Learned - `bis.doc.gov` press-release links redirect to the BIS homepage.**
  The `/index.php/documents/about-bis/newsroom/press-releases/3158-.../file` URL
  for the October 2022 chip rule answers 200 with 76KB of the *current* BIS front
  page - the aggregator trap, not a block page, so `looksBlocked` would not catch
  it. Go to the Federal Register instead: the API
  (`/api/v1/documents.json?conditions[term]=...&conditions[publication_date][gte]=...`)
  finds the rule in one call, and the document page carries the **DATES** section,
  which is the authoritative effective date - the October 2022 controls came in
  on three dates (7, 12 and 21 October), not one.
* **Learned - `defense.gov` and `northcom.mil` 403 to `curl`.** Every DoD news and
  release path tried came back 403 with a browser UA. Air & Space Forces Magazine
  (`airandspaceforces.com`, already good per [Sources](sources.md)) carries
  Austin's statement verbatim plus the detail no release has - the AIM-9X, the
  58,000-foot launch altitude, the 2:39 p.m. Eastern shot - so it is the source
  for pin 2425 and the Pentagon is quoted through it.
* **Learned - a member's own press release outlives their office.**
  `pelosi.house.gov/news/press-releases/pelosi-congressional-delegation-statement-on-visit-to-taiwan`
  still serves the 2 August 2022 arrival statement, four years after she left the
  speakership. The neighbouring slug (`pelosi-statement-on-her-visit-to-taiwan`)
  404s, so find the exact one by search rather than guessing.
* **Learned - `ait.org.tw` has two paths for the same page.** The long one under
  `/our-relationship/policy-history/key-u-s-foreign-policy-documents-region/` 404s
  (with a 143KB 404 body, so check the `<title>`, not the byte count); the short
  `/policy-history/taiwan-relations-act/` serves it.
* **Learned - strip the query off a Commons image URL.** `imageinfo` returns
  `url` with `?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original`
  attached. Stored as `originalUrl` that is a different URL from the same file
  fetched any other way, which is exactly what the CDN-suffix and difference-hash
  dedupe exists to catch. Split on `?` before using it.
* **Learned - Commons search is phrasing-sensitive, and a file name says
  nothing.** "Chinese spy balloon 2023 Montana" returned nothing while "balloon
  high altitude 2023 United States surveillance" returned the whole DoD set;
  `incategory:` helped for Filoli and returned nothing for three other
  categories that exist. For an event that has not happened, the White House
  photo stream on Commons has the same ceremony under the same president, but
  the files are named `P20260428DT-2061.jpg` - read
  `extmetadata.ImageDescription` before using one. That one is Trump and King
  Charles III reviewing the troops at a State Arrival Ceremony on the South
  Lawn, April 2026, which is the venue in the same role for pin 2428.
* **Learned - re-parenting an existing pin is a whole-pin PUT, and it is safe.**
  `PUT /api/pins/:id` builds `new Pin(body)` from scratch, so the body must carry
  the entire pin. Media are diffed by `originalUrl`, so sending them back
  unchanged touches nothing and re-fetches no thumbnail; **references are
  replaced wholesale**, so leaving them out deletes them. Round-trip the GET,
  add `parentId`, flatten `tags` to names and cast `media[].type` back to a
  number. Pin 2404 kept its 3 media, 5 references, 3 tickers and categories
  across the edit, and gained the automatic `Thread` tag.
* **Learned - the podcast cross-check earns its place on a historical pin.** Pin
  2425 came back from the save with a reference nobody added: Politicana's
  6 February 2023 episode, whose title includes "U.S. Shoots Down Chinese
  Surveillance Balloon". The keyword fallback at 70 is loose enough to be worth
  reading, and this one was right.
* **Changed.** [Vertical recipes](verticals.md) gains a Bilateral relationship
  history recipe; [Sources](sources.md) gains the bis.doc.gov, defense.gov,
  history.state.gov, presidency.ucsb.edu, pelosi.house.gov and ait.org.tw rows
  and the Commons `utm_source` note.

## 2026-09-21 - Xi Jinping's state visit: the arrival at Joint Base Andrews (pin 2404, @PoliticsDesk)

One pin from a Reuters URL handed over by the owner: Trump greeting Xi on the
tarmac at Joint Base Andrews at about 4pm on 23 September 2026, the opening item
of the 23-25 September state visit.

* **Learned**: **reuters.com is blocked to a session's own tools but not to the
  app.** `curl` with a plain Chrome UA gets `401` and a 771-byte body and WebFetch
  answers "unable to fetch", so the pin was built from `WebSearch` plus the
  outlets that republish the wire copy in full (ABC News carries the AP version,
  usnews.com and mvariety.com the Reuters one). But the **headless scraper read
  the whole article** - byline, dateline, both timestamps, and the tickers Reuters
  tags inline (`Jeff Bezos of Amazon (AMZN.O)`, `Jensen Huang of Nvidia (NVDA.O)`),
  which is exactly what the `stocks` field wants. It only came to light in
  `wiki:export`, *after* the pin was saved. **Post the pin, then read the captured
  text back out of the export before assuming a blocked site is unsourceable** -
  or call `GET /api/scrape` first. Three reference `publishedDate`s were a day or
  two out and had to be fixed by `PUT` once the real timestamps appeared.
* **Learned**: for a state visit the two **official** sources both read cleanly
  and between them settle the whole pin, so the news copy was only needed for
  colour. `fmprc.gov.cn/eng/xw/zyxw/...` carries Beijing's announcement ("at the
  invitation of President ... Donald J. Trump, President Xi Jinping will pay a
  state visit to the United States from September 23 to 25") and
  `whitehouse.gov/briefings-statements/...` carries the official schedule, down
  to which day the President meets the guest at Andrews, the 479-strong honour
  cordon, the B-2 and four F-22 flyover and the National Archives farewell.
  Start from the two governments, not the wire.
* **Learned**: the **exact time came only from SCMP** ("expected around 4pm local
  time on September 23"); neither government page gives an hour. SCMP 403s to
  `curl` but WebFetch reads it in full - a link checked by status code alone
  would have been thrown away as dead.
* **Learned**: a **year-less Wikipedia title silently redirects to the wrong
  year**. `State_visit_by_Xi_Jinping_to_the_United_States` answers 200 and serves
  the **2015** visit; only grepping the returned `<title>` caught it, and the
  2026 article needed its year in the title. A status-code check is not a
  verification for Wikipedia.
* **Learned**: the pin is the **arrival**, not the visit. The White House
  schedule describes three days, but the source article is about the tarmac
  greeting, so that is the dated event (timed, `scheduled`, 20:00Z for 4pm EDT)
  and the rest of the itinerary went into the summary. The ceremony, the state
  dinner and the National Archives day are separate events if they are ever
  wanted as pins.
* **Learned**: `@PoliticsDesk` was created for national elections, but a state
  visit is the same desk's territory and there is no diplomacy curator. Used it
  rather than opening a seventeenth account.
* **Learned**: Commons has no picture of this visit yet (it has not happened), so
  the venue photo came from the base in the same role - `Joint Base Andrews (JBA),
  Maryland supports U.S.-Africa Leadership Summit` - rather than a generic air
  show shot. Searching `incategory:"Joint Base Andrews"` returned nothing;
  plain free-text search on the base name worked.
* **Learned**: the video is Bloomberg Television's summit preview, verified
  through the Data API (channel `UCIALMKvObZNtJ6AmdCLP7Lg`, `@markets`) and
  embedded from oEmbed. Searching the outlet name plus the topic with
  `order=date&publishedAfter=` is what surfaced a major outlet among the
  commentary channels; an unfiltered search returned mostly 2015 footage of Xi's
  previous Washington arrival, which is the wrong event.
* **Learned**: the app key still has **no Anthropic credit**, so all six link
  wikis failed on save and were written by hand through
  `wiki:export` -> `wiki:apply`. Only **one** export round was needed here, not the
  usual two: the pin already had a hand-written `longFormSummary`, and a pin that
  has a summary when its links are first synced keeps it, so no summary job ever
  appeared - just the contradiction check on the second export.
* **Learned**: the contradiction check found two real **minor** ones worth keeping.
  Reuters and AP both call the 24 September arrival ceremony indoors ("an arrival
  ceremony inside the White House"; "held indoors on the State Floor"), while the
  White House programme of 21 September puts it "on the South Lawn, State Floor,
  and Rose Garden" - the newer, more specific source wins. And Reuters lists
  "Tim Cook of Apple" among "tech CEOs" where AP has him "recently stepped down as
  the CEO of Apple". Neither touches this pin's own event, which is the reason the
  severity is minor rather than major.
* **Feedback**: none; this was the standing scrape-without-sign-off rule.
* **Changed**: [Sources](sources.md) - new rows for reuters.com, scmp.com and
  fmprc.gov.cn; the whitehouse.gov row broadened from bill signings to state-visit
  schedules (and its `og:image` noted as a generic card); the Wikipedia row now
  carries the wrong-year redirect trap.
  [Vertical recipes](verticals.md) - a state visits and summits recipe.

## 2026-09-21 - The government shutdown story, six pins (2398-2403, @EconDesk)

* **Learned - "add more pins for <topic>" starts with reading what the topic
  already holds, and the tag search is `/api/pins/search`.**
  `GET /api/pins?q=tag:"Government Shutdown"` answers 200 with an ordinary
  timeline page - the timeline route ignores `q` - so it reads like a broken
  search rather than the wrong endpoint. `GET /api/pins/search?q=tag:"..."`
  is the one that filters. The tag had exactly one pin behind it (2389, where
  Ian had asked for the tag), and it now returns seven in date order.
* **Learned - the tag was a topic with no events under it.** Fiscal 2026 had
  **three** funding lapses and not one was pinned: 43 days from 1 October to
  12 November 2025 (the longest ever, over expiring ACA subsidies), four days
  from 31 January to 3 February 2026 across half the government, and 76 days
  for **DHS alone** from 14 February to 30 April 2026, the longest shutdown of
  a single agency. A tag the owner asks for is usually a chain of events, not
  one pin; look for the whole chain before composing.
* **Learned - a shutdown is a range, not a day.** The three lapse pins carry
  `utcEndDateTime` at the exclusive 00:00Z boundary (2025-11-13, 2026-02-04,
  2026-05-01), which is what `allDay` wants, and the deadline pins (the
  2 September signing, the 1 October rollover, the 11 December expiry) are
  single days with a null end.
* **Learned - whitehouse.gov's briefings index is the primary source for "when
  was it signed".**
  `whitehouse.gov/briefings-statements/<yyyy>/<mm>/congressional-bill-h-r-NNNN-signed-into-law/`
  reads with a plain browser UA and states the weekday, date, bill number, the
  act's full name and what it funds and until when. Its **Related** list is a
  crawlable index of the neighbouring signings: one fetch gave H.R. 5371
  (12 Nov 2025), H.R. 7148 (3 Feb 2026), H.R. 7147 (30 Apr 2026) and H.R. 6500
  (2 Sep 2026) - every date this batch needed.
* **Learned - thehill.com is blocked** by a HUMAN Security challenge (403 to
  WebFetch, and a "Access to this page has been denied" shell to `curl` with a
  browser UA). `thecentersquare.com`, `federalnewsnetwork.com` (which runs the
  AP copy), `crfb.org`, `epicforamerica.org`, `chds.us`, `nado.org` and
  `vcresearch.berkeley.edu` all read fully with a browser UA, so the fiscal
  beat has plenty of unblocked sources.
* **Learned - Kalshi lists shutdown markets that nobody has traded.**
  `KXGOVTSHUTDOWN-26OCT01` and `KXNUMSHUTDOWNS-27JAN01` come back `active` with
  every bid, ask, last price and volume `null`, so a link to them would draw an
  empty odds panel. Polymarket's `government-shutdown-by-october-1-...` had
  real prices (about 2 percent for yes on ~$15.7k) and was used instead. Check
  for prices, not just an open event, before citing a market.
* **Learned - a market link rides on a *reference*, not only `sourceUrl`.**
  `pinMarketRefs` reads the source URL and every reference, so pin 2402 got
  live odds as an @EconDesk fiscal pin: the save set `marketVolume`
  15721.74 from the Polymarket read. That avoided a separate @OddsDesk market
  pin on 1 October, which would have been a duplicate of the rollover pin.
* **Learned - the fiscal-year pins want the fiscal year's own character.**
  2389 is "US Fiscal Year 2028 Begins"; the new one is "US Fiscal Year 2027
  Begins on a Stopgap", because that is what the 1 October 2026 rollover is -
  not a single one of the twelve bills had passed both chambers.
* **Feedback - a law pin needs the window it covers.** Owner, on pin 2401:
  "For law and relevant pins. Should have effective start and end date." The
  signing was a single day; it now runs 2 September to 11 December 2026, the
  date named in section 106(3) of the enrolled text. Fixed the same way: pin
  661 (the IIJA, in force from its signing until its FY2022-FY2026
  authorisations expired on 30 September 2026 - the very authorities H.R. 6500
  then extended, so the two pins now abut) and the fiscal-year pins 2402 and
  2389, which now run October to September. Asked whether this needed a new
  field, the owner confirmed the existing `utcEndDateTime` is the right home:
  "current approach is good. do this going forward". Now a standing rule above.
* **Feedback**: the standing scrape-without-sign-off rule covered the batch,
  and the standing catchy-tags rule shaped every tag list - `Government
  Shutdown`, `Shutdown Deadline`, `DHS Shutdown`, `Obamacare Subsidies`,
  `Federal Workers` rather than `Appropriations` alone.
* **Changed**: [Sources](sources.md) - rows for whitehouse.gov briefings,
  thehill.com and the fiscal-policy outlets; [Vertical recipes](verticals.md) -
  a US fiscal calendar and shutdown recipe.

## 2026-09-21 - Three new categories, and religious observances as markers (pins 2390-2397)

* **Learned - where the taxonomy's real gaps were.** `Other` is used **zero**
  times, every pin carries a category and nothing is mis-filed, so the 38-name
  list had no cleanup to do; the gaps were whole domains with no home. Three
  were added: **`Religion & Belief`**, **`Labour & Employment`** and
  **`Mining & Materials`**. Each was seeded in the same pass, because an empty
  category is a dead entry in the tag cloud.
* **Learned - Religion & Belief lands exactly on the corpus's weak points.**
  Hajj 2027 falls **14-16 May** in Mecca and the Nashik Kumbh's first Shahi Snan
  **2 August 2027**, with World Youth Day in Seoul **3-8 August**. That is the
  two thinnest forward months in the two thinnest map regions, which no other
  candidate domain managed. Religious calendars also renew themselves forever,
  so the vertical never runs dry.
* **Learned, then corrected.** Adding a category is **seven files**, not one:
  `categories.ts` plus all six translation dictionaries. The first write-up of
  this said `Messages = Shape<typeof en>` enforced it; **checking that claim
  showed it does not**. `Shape` requires of the other five languages only what
  `en.ts` itself declares, so a category added to `categories.ts` and to no
  dictionary at all is required of nobody - `tsc` passes and `categoryLabel`
  falls back to the raw English name in every language, silently. A **rename**
  is worse: the old key stays behind in all six files, nothing complains, and
  every language falls back to English while a dead key lingers. Verified by
  experiment, not by reading the types: an invented `Quantum Computing`
  category rendered as English in Japanese with a clean build.
* **Fixed.** A `category labels` block in
  [i18n.test.ts](../../../src/lib/i18n/i18n.test.ts) now holds the two lists
  together - every category named in every dictionary, no dictionary keeping a
  label for a category that no longer exists, and English repeating the category
  name exactly. Each assertion was checked against the failure it is meant to
  catch by breaking the tree three ways and watching it fail, then restoring.
  [Fields](fields.md#adding-a-category) carries the corrected checklist.
* **Learned - date-holidays is a partial fit for religious markers, and it is
  worth knowing exactly how.** The `DateTime` markers table held 1,931 rows and
  almost no religious observance (Christmas Day alone) because it is seeded from
  `new Holidays('US')`. The library *does* compute the Hijri, Hebrew and
  Easter-linked calendars correctly, but names them in the source country's
  language, so each observance has to be taken from the country whose calendar
  defines it and renamed. Traps found:
  - **Mawlid is returned two or three times a Gregorian year with impossible
    spacing** (5 Jan, 14 Aug *and* 25 Dec 2027), so it is left out.
  - **Vesak comes back only sporadically** - 4 hits across 17 years - so it is
    left out too.
  - **Indonesia lists Eid over two days and Israel lists Rosh Hashanah over
    two**; the marker is the observance, so only its first day is kept.
  - **The Hijri calculation has a range limit**: Indonesia answers for 2050 and
    returns nothing for 2100, which is why the generated set stops at 2040
    rather than following the holidays block to 2100.
  - **India's set has no Hindu festivals at all** - Diwali and Holi are not in
    the `public` list - so Hindu observances need another source and were left
    to pins rather than markers.
* **Built.** `scripts/backup/religiousDays.json`, 223 markers over 2024-2040
  across 13 observances (Eid al-Fitr, Eid al-Adha, Islamic New Year, Passover,
  Shavuot, Rosh Hashanah, Yom Kippur, Sukkot, Epiphany, Good Friday, Easter
  Sunday, Ascension, Pentecost), seeded by [data/index.ts](../../../scripts/data/index.ts)
  beside the solstice and equinox files so a `db:refresh` keeps them. Two
  independent cross-checks passed: Easter 2027 is 28 March in both the Vatican
  set and the general calendar, and Eid al-Adha 2027 is 16 May in both the
  library and the Hajj research done for pin 2390.
* **Learned.** The category change was picked up by a **concurrent session**
  within the hour: pins 2398-2401 are another session's government-shutdown
  batch, posted as @EconDesk and two of them already filed under
  `Labour & Employment`. Worth remembering when counting a category's pins in
  the same session that created it - `Labour & Employment` read 5, not the 3
  posted here.
* **New curator.** **@FaithDesk** (327) for religious observances and
  pilgrimages. `Labour & Employment` went to @EconDesk and
  `Mining & Materials` to @BuildDesk, which already owns Energy and
  infrastructure, rather than opening two more desks.
* **Changed.** This page, [Fields](fields.md) (the add-a-category checklist),
  [Vertical recipes](verticals.md) (a Religion & Belief recipe and rows for all
  three categories).

## 2026-09-21 - Trade shows, budget calendars and product launches (pins 2378-2389)

* **Learned - the three seams are not equally rich, and it is worth saying which.**
  Aimed at May/Jul/Aug 2027, the months the first two passes never reached.
  **Trade shows and annual festivals are the best seam by a distance**:
  organisers publish dates one to three years ahead on their own sites, and
  those sites are readable. **Budget calendars are precise but few** - the dates
  are statutory or conventional, so they are easy to source and there are only a
  handful per country per year. **Product launches are the thinnest**: the 2027
  games calendar carries ~54 dated titles but they stop dead after April, with
  exactly one dated release later in the year (a Persona 4 port on 20 May).
  Publishers do not date the second half of a year more than about nine months
  out, and consumer electronics is the same. Do not plan a forward-calendar fill
  around product launches.
* **Learned.** Twelve pins: Cannes (11-22 May), the Venice Architecture Biennale
  (8 May - 21 Nov), Eurovision in Burgas (15 May), San Diego Comic-Con (21-25
  Jul), the Edinburgh Fringe (6-30 Aug), gamescom (23-29 Aug), three budget
  dates (India's 1 February convention, the US budget request deadline, the
  start of US fiscal 2028) and three dated games. **May 2027 went 3 -> 6**, July
  7 -> 8, August 7 -> 9, February 20 -> 25. **`Arts & Literature` went 1 -> 5**,
  the largest relative move of the three passes.
* **Learned - a trade show's homepage is its current edition's page.**
  `gamescom.global/en` carries "23-29 August 2027" and `edfringe.com` carries
  "06 - 30 August 2027" in plain HTML, so for an annual show the homepage is a
  legitimate `sourceUrl`, unlike a news site's front page. But **grep the raw
  HTML to confirm the year is really there**: `computextaipei.com.tw` renders its
  dates in JavaScript and a plain fetch showed nothing, and `computex.biz` does
  not resolve at all, so Computex was dropped rather than sourced loosely. June
  2027 was already the healthiest forward month, so nothing was lost.
* **Learned.** `congress.gov` **403s to `curl` and to WebFetch alike**, so a CRS
  report cannot be a `sourceUrl` from there. `everycrsreport.com` mirrors the
  same reports and reads fine - R47088 confirmed "first Monday in February" and
  R47235 confirmed the 1 October fiscal-year start before either was used.
* **Learned.** `ebu.ch` 403s to `curl` but reads fully through WebFetch, the same
  shape as `vaalit.fi`. It gave the venue and all three Eurovision show dates.
* **Learned.** **Search the corpus by title before composing, not after.**
  Metroid Ravenous (28 January 2027) was already pinned as 298 from its
  announcement; a title search caught it while the batch was still a list, which
  is cheaper than discovering it as a 409 after the media and summary are
  written.
* **Learned.** A game pin's picture is the **official trailer's still**
  (`img.youtube.com/vi/<id>/maxresdefault.jpg`), because box art on en.wikipedia
  is a non-free local upload. Pin 84 already does this, and the three game pins
  follow it: still as the picture, the same video as the video.
* **Learned.** Wikidata `P159` overruled the roundup on a studio HQ: the games
  list implies Bellevue for Crystal Dynamics, `P159` says **Redwood City**. The
  studio-location rule means P159 wins.
* **Feedback applied - the wrong-edition video rule held up under pressure.**
  Cannes' own 2026 teaser, gamescom's Opening Night Live 2026 and every SDCC
  2026 walkaround were rejected: an official channel does not make last year's
  edition the right work. Eurovision was the one real exception, and for a
  reason specific to that pin - Bulgaria's winning 2026 performance is *why*
  Burgas hosts in 2027, so it is on-topic rather than a stale edition. Four of
  the twelve pins ship with no video, which is the honest outcome.
* **Learned.** The forward hole after three passes: Nov 2026 32, Dec 45, then
  38 / 25 / 15 / 12 / **6** / 23 / 8 / 9 / 10 / 11 / 4 for Jan-Nov 2027. May
  doubled but is still the thinnest month of 2027, and **November 2027 (4) is
  now the worst** - nothing has been aimed at it yet.
* **Changed.** This page, [Vertical recipes](verticals.md) (a Trade shows and
  annual festivals recipe, a Budget calendars note, and the product-launch
  caveat) and [Sources](sources.md) (congress.gov, ebu.ch, trade-show homepages).

## 2026-09-21 - Three thin categories: the COPs, the Fed's 2027 calendar, big science (pins 2363-2377)

* **Learned.** The second pass at the imbalance measured yesterday, aimed at the
  three thinnest categories with authoritative forward schedules. Fifteen pins:
  COP31 and COP32 (`Climate & Environment` 7 -> 9), the eight 2027 FOMC rate
  decisions (`Macroeconomics` 5 -> 13) and five big-science milestones
  (`Science & Research` 9 -> 14, and `Space & Astronomy` and `Energy` each +1).
* **Learned - the sourcing trap that nearly sank the Fed batch.** The Federal
  Reserve's FOMC calendar publishes all eight 2027 dates on **one page with no
  per-meeting URL**: past meetings get
  `/newsevents/pressreleases/monetary<date>a.htm`, future ones get nothing but a
  table row. Eight pins would therefore have shared one `sourceUrl`, which is
  both the roundup anti-pattern and an automatic 409 from
  `rejectDuplicateSourceUrl`. The fix: Kalshi's **`KXFEDDECISION`** series has
  one event per meeting (`KXFEDDECISION-27JAN` ...) whose strike times match the
  Fed's published dates exactly, so each pin gets its own URL, live odds and a
  dollar volume, with the Fed's calendar as the authoritative **reference** for
  the date. Verified with `parseMarketUrl` + `oddsFor` against the real code,
  per [Sources](sources.md) - all eight resolved 5 outcomes each.
* **Learned.** Those markets are mostly **thin**: $23.5k on January but $1.4k on
  September 2027 and under $10k on six of the eight. Each pin says so in its own
  words rather than leaving the reader to find out, as the volume rule requires.
  `Pin.marketVolume` was written on save without anything being typed.
* **Feedback applied - the event, not the market.** @EconDesk (326) owns the
  FOMC **meeting**; @OddsDesk keeps the market *question* pins (1678, 1980 are
  "Fed Decides Whether to Hike..." - the question; 2365-2372 are "The Fed Sets
  Rates at the ... Meeting" - the event). Same split as @SportDesk/@OddsDesk and
  @PoliticsDesk/@OddsDesk. A market URL as `sourceUrl` is a *sourcing* choice and
  does not by itself make a pin @OddsDesk's.
* **Learned.** The picture-dedupe ([[image-dedupe]], difference hash at
  distance 6) means **N pins about one recurring institution need N distinct
  pictures** - one Eccles Building photo on eight FOMC pins would have stuck to
  the first and been dropped from the rest. Commons has plenty once the 1930s
  Library of Congress construction series and the NARA drawings are filtered
  out: FOMC meeting photographs, Powell press conferences and recent
  building shots gave eight distinct ones.
* **Learned.** A **409 is often a prompt to find a better source.** The SKA-Mid
  pin was rejected because pin 250 already cites the Square Kilometre Array
  Wikipedia article. SKAO publishes a *separate* per-telescope timeline -
  `Sciops_timeline_mid_ppt.pdf` beside `Sciops_timeline_low_ppt.pdf` - which is
  the primary source for the AA2 dates anyway (Mid: AA2 2029, AA* 2031; Low:
  AA2 2027, AA* 2029, Cycle 0 2030). The rejected pin came back stronger.
* **Learned.** `skao.int` HTML **403s to both `curl` and WebFetch**, but its PDFs
  under `/sites/default/files/documents/` serve fine to a browser UA and read
  cleanly with `pdftotext`. Do not write the site off on the HTML alone.
* **Learned.** A Wikipedia infobox field can be stale while the lead is right:
  both the COP31 and COP32 articles carry `date = November 2025`, which is
  simply wrong. The lead sentences ("from 9 to 20 November 2026", "to be held in
  Addis Ababa") match UNFCCC and were what the pins used. Read the prose, not
  one infobox field.
* **Learned.** Checked and **dropped** the Nancy Grace Roman Space Telescope as a
  2027 filler: it launched **30 August 2026**, ahead of its "by May 2027"
  commitment, so its launch is a past event and its "science operations at the
  beginning of 2027" milestone has no place on the map (it sits at L2). Worth
  re-checking a mission's status before pinning its schedule.
* **Learned.** Rubin's DR1 has **no fixed calendar date by design**: RTN-011 says
  processing a year of LSST data "is estimated to require approximately one
  year", implying "DR1 delivery approximately two years after the effective
  start" (the LSST began 2026-06-29), while warning the boundaries follow
  "survey performance and scientific readiness rather than a fixed calendar
  date". That is exactly what `estimated` is for, and the reasoning quotes it.
* **Learned.** Eight FOMC pins have **no video and will not get one**: there is
  no footage of a meeting that has not happened, and a press conference from a
  previous meeting is the wrong event - the same rule that rejected
  previous-election explainers yesterday. The other seven took their project's
  or host government's **own** channel (SKAO, Rubin, iterorganization, ESO, and
  Türkiye's Climate Change Directorate for COP31).
* **Learned.** The forward hole is closing slowly, and the honest numbers are:
  Nov 2026 31 -> 32, Jan 2027 35 -> 38, Mar 13 -> 15, Apr 9 -> 12, Jun 18 -> 23,
  Jul 6 -> 7, Sep 9 -> 10, Oct 9 -> 10. **May 2027 is still 3 pins** and
  Jul/Aug 2027 still 7 - neither batch reached them. Dec 2027's 32 is mostly
  year-end `estimated` pins landing on 31 December, not real density.
* **New curators.** **@ClimateDesk** (325) for climate summits and environment
  milestones; **@EconDesk** (326) for central-bank decisions and macroeconomic
  releases.
* **Changed.** This page, [Vertical recipes](verticals.md) (Climate summits,
  Central-bank decisions and Big-science milestones recipes plus table rows),
  [Sources](sources.md) (skao.int, the Fed calendar, Kalshi `KXFEDDECISION`)
  and [Enrichment](enrichment.md) (the N-pins-N-pictures dedupe note).

## 2026-09-20 - The 2027 forward calendar, and national elections (pins 2350-2362)

* **Learned.** The corpus is lopsided three ways, and only one of them matters
  much. By **category**, `Anime` plus `Anime Movie` is 778 of 2,185 pins (36%)
  against twelve categories on nine pins or fewer. By **place**, the anime pass
  put 737 pins in Japan/Korea against 18 in South America and 41 in
  Africa/the Middle East. But the damaging one is **time**: the timeline held
  ~100 pins a month through October 2026 and then fell off a cliff - 31 in
  November, and 19, 13, 9, **2**, 18, 6, 5 and 9 across February to September
  2027. A timeline product runs dry about six weeks out, which no category
  count would have shown.
* **Learned.** The three imbalances have one cheap common fix: a vertical that
  is thin *and* has an authoritative forward schedule *and* is spread over the
  whole map. **National elections** are all three. Thirteen pins (2350-2362)
  took `Elections` from 12 to 25 and `Geopolitics` from 20 to 33, and landed in
  Nigeria, Kyrgyzstan, El Salvador, Micronesia, The Gambia, Finland, Spain,
  Mexico, Guatemala, Mongolia, Kenya, Angola and Argentina.
* **Learned.** Thirteen pins do **not** fix the forward hole, and the numbers
  should be read honestly: May 2027 went from 2 pins to 3. Filling
  November 2026 - September 2027 needs several more passes of this size, not
  one. The geographic needle barely moved either (Africa 41 -> 45, South
  America 18 -> 19) because a 737-pin concentration does not shift by 13.
* **Learned.** `Medium.type` is **1 = image, 2 = twitter, 3 = youtube**, and a
  YouTube medium is stored as the **embed** URL
  (`https://www.youtube.com/embed/<id>`). This is *not* the `MediumType`
  table's numbering, which reads 1 = youtube, 2 = image, 3 = twitter - the
  table is a decoy. Posting a watch URL as `type: 1` 500s the whole `PUT` with
  `Could not find MIME for Buffer`, because the thumbnailer tries to decode the
  HTML page as an image.
* **Learned.** That failure is also a clean confirmation that `Pin#update` is
  transactional now: eight pins took the bad `PUT`, all eight 500'd, and every
  one still had its picture afterwards. The pre-2026-09-16 bug would have
  wiped the media before the failing write.
* **Learned.** Wikipedia's **`2027 national electoral calendar`** page is a
  stub - its per-month sections are empty. The populated, cited page is
  **`List of elections in 2027`**, whose entries carry the electoral
  commission's own announcement as a footnote. Four candidates had no article
  at all (Estonia, the Northern Ireland Assembly, Papua New Guinea,
  Switzerland) and were dropped rather than sourced from memory.
* **Learned.** Reconstructing a URL from truncated console output is a
  reliable way to save a dead link: 3 of 19 references 404'd that way
  (Forbes Mexico, republica.com, mongoliaweekly - each real URL had an extra
  slug or a different tail). Re-extract the full URL from the source and
  **live-check every link before the save**. The check also caught the
  Wikimedia 429s, which clear with the contact User-Agent already in
  [Sources](sources.md).
* **Learned.** Commons free-text search drifts to the wrong country on generic
  building names: "White House Bishkek" returns the US and Moscow ones,
  "Parliament Buildings Nairobi" returns Hungary's and British Columbia's.
  Scope with `incategory:"..."` and filter the file title for the city or
  country before picking by pixel size. Four venues (Bishkek, San Salvador,
  Guatemala City, San Lazaro) only resolved through the building article's own
  `pageimages` on the **Spanish** Wikipedia, or through Ala-Too Square as the
  place rather than the building.
* **Learned.** `vaalit.fi` (the Finnish Ministry of Justice's election service)
  **403s to `curl`** but reads fully through WebFetch - worth a reference, not
  worth a wiki from a blocked capture.
* **Corrected a pin.** 1976 "France Votes in the 2027 Presidential Election"
  was dated **11 April 2027**, derived from the constitutional window because
  Polymarket said only "around April 2027". The French government announced the
  real date after a cabinet meeting on 30 June 2026, and
  `service-public.gouv.fr` now states "April 18 and May 2, 2027". The pin is
  now 18 April, `scheduled`, with the government page as a reference. A market
  pin dated by inference is worth re-checking once the organiser announces.
* **New curator.** **@PoliticsDesk** (id 324) posts elections and referendums -
  the vote itself, the way @SportDesk owns the fixture and @OddsDesk the market
  on it. The thirteen pins are all its.
* **Changed.** This page, [Vertical recipes](verticals.md) (a National
  elections recipe and its table row), [Sources](sources.md) (Wikipedia
  election calendars, Commons building searches, vaalit.fi) and
  [Enrichment](enrichment.md) (the medium type numbering).

## 2026-09-20 - Aerospace, a vertical with almost no future (pins 2334-2349)

* **Learned.** `Aerospace` held 22 pins, 21 of them from one @BuildDesk YouTube
  pass and **exactly one dated after today** (the 777-9 delivery, 1862). The
  past-against-future measure in [Nightly jobs](nightly-jobs.md) is what caught
  it: the total looked healthy and the vertical was finished. Sixteen pins fixed
  both ends - ten landmark firsts that were simply missing (Wright Flyer 2334,
  Lindbergh 2335, He 178 2336, Bell X-1 2337, Comet into service 2338, 747 2339,
  Concorde 2340, A300 2341, A380 2342, 787 2343) and six recent or forward
  milestones (X-59 supersonic 2344, 737-7 certification 2345, A350F first flight
  2346, Paris Air Show 2027 2347, B-21 at Ellsworth 2348, GCAP demonstrator 2349).
* **Learned.** A Wikipedia *aircraft type* article is a good source for a first
  flight: the infobox dates it and the development section gives the pilot, the
  airfield and the duration. Everything the ten historical pins claim came from
  the page's own words, and the place was always named on it - Warton, Paine
  Field, Toulouse-Blagnac, Marienehe, Muroc - so none needed a guess.
* **Learned.** `media:videos` matched **none** of the sixteen. Its filter wants
  most of the pin's distinctive title words in the video title, and a pin titled
  for its event ("The Boeing 747 Makes Its First Flight") shares almost nothing
  with a video titled "747 FIRST FLIGHT 1969 - BOEING 747 - FEBRUARY 1969". The
  fix was a YouTube Data API search per pin and a hand pick from a verified or
  archival channel, stored exactly as `media:videos` stores one (`Medium`,
  `addThumb`, `save`). Fifteen of sixteen got one: British Movietone, British
  Pathe and AP Archive for the newsreel events, Airbus and NASA Armstrong for
  their own aircraft, CNBC and Sky News for the news ones.
* **Learned.** **A `.jpg.webp` image is a JPEG with a suffix.** The Contentful
  webp trap from the robotics pass has a cheap fix where the CDN names the file
  that way: `aerospacetestinginternational.com` serves
  `...-0316x9-1.jpg.webp`, and dropping `.webp` returns `image/jpeg` that the
  thumbnailer takes. Where the file is natively `.webp` (aviationa2z), there is
  nothing to strip and the picture is simply unavailable.
* **Learned.** `media:top-up`'s **Wikipedia fallback is still worse than
  nothing** on a page it cannot illustrate, and this run is the sharpest
  evidence yet: it hung a *Mars helicopter* on the Wright Flyer pin, a Heinkel
  **He 118** dive bomber on the He 178 pin, a Boeing 787 on the de Havilland
  Comet pin, an A330 on the A350F pin and a MAX 8 on the 737-7 pin. Five of
  seventeen top-ups were wrong subjects. **Always read back what it added** -
  the filenames alone give it away - and remove the wrong ones
  (`Medium#deleteFromPin`, the same path `media:dedupe` uses). Commons
  `list=search&srnamespace=6` then found the right picture for three of them
  (the Flyer's fourth flight, the Bundesarchiv He 178, a BOAC Comet 1 at
  Heathrow); for the 737-7 and the A350F, Commons has **no photograph of the
  variant at all**, so those two stay at 2 media rather than take a lookalike.
* **Learned.** `media:top-up`'s dry run prints only the count - it returns
  before the per-pin loop - so there is no way to preview what it will attach.
  Run it with `--apply` and audit afterwards.
* **Learned.** Wikimedia answers 429 after about six pins even at `--delay 7`;
  four pins came back empty and a re-run at `--delay 25`, after a 90-second
  pause, got all four.
* **Learned.** A newer trade source beat the search summary on GCAP: search said
  the demonstrator flies in 2027 (Janes, July 2025), but the programme's own
  August 2026 update says "aircraft ready by the end-2027 with flight test
  starting from early 2028". The pin took the 2028 date and both earlier pieces
  became references whose reasoning says they record the older target.
* **Learned.** A budget is not a cost, again: the B-21 article offers $4.5bn of
  fiscal 2025 funding and a $6.1bn fiscal 2027 request, and the GCAP article a
  GBP4.6bn design contract. None is the cost of the event being pinned, so all
  three pins carry no `price`.
* **Learned.** Walls met: `baesystems.com` is behind Incapsula (923 bytes of
  iframe shell for every heritage page), `museumofflight.org` refused the
  connection outright, and `aviationa2z.com` began answering 522 mid-run. The
  show's own site, `siae.fr`, loads but carries almost no text - 393 characters,
  enough to date the pin ("14.20 JUNE 2027") and nothing else - so Wikipedia
  carried the organiser, venue history and scale as a reference.
* **Learned.** One pin knowingly has no video: nothing exists yet about the 2027
  Paris Air Show, and a 2025 highlights reel would be the wrong event. Three
  pictures and no video is the honest answer there.
* **Changed.** [Vertical recipes](verticals.md) gained the Aerospace recipe,
  [Sources](sources.md) the new walls and the `.jpg.webp` note, and
  [Enrichment](enrichment.md) the read-back rule for `media:top-up`.

## 2026-09-20 - Robotics, a near-empty vertical (pins 2324-2333)

* **Learned.** `Robotics` held three pins before this run (Unimate 1961, a
  burger-robot piece and Tesla Optimus V3), so ten major events filled 2026
  end to end: Boston Dynamics' production Atlas at CES (2324), Amazon retiring
  Blue Jay (2325), AgiBot's 10,000th humanoid (2326), Figure's one-robot-an-hour
  ramp at BotQ (2327), 1X's Hayward NEO factory (2328), NVIDIA's Isaac GR00T
  reference humanoid (2329), Unitree's STAR Market debut (2330), the World
  Humanoid Robot Games (2331), ugo Nova in Tokyo (2332) and Atlas at Hyundai's
  Metaplant by 2028 (2333, threaded under 2324).
* **Learned.** The pin is the *milestone*, not the robot: a humanoid has no
  single date, but a production rate, a factory opening, a unit count, a listing
  or a withdrawal does. Amazon's Blue Jay is the useful shape here - the event
  is an "Update February 25, 2026" line inside an October 2025 announcement
  saying the robot is no longer in operations, which is `confirmed` on the
  company's own wording and dated to the update, not the article.
* **Learned.** Robotics makers publish well: figure.ai, bostondynamics.com,
  agibot.com, 1x.tech, investor.nvidia.com, globenewswire, aboutamazon.com and
  scmp.com all came back from `GET /api/scrape` with full text and Open Graph
  media. But the page's own date beats a search summary - search put NVIDIA's
  GR00T announcement on 31 May at GTC Taipei; the release says June 01.
* **Learned.** Place the pin where the event was, not at the parent's HQ:
  the Las Vegas Convention Center for a CES reveal, the Shanghai Stock Exchange
  for a listing, BotQ's North First Street address for a production ramp.
  Wikipedia's `prop=coordinates` returns the exchange and the Metaplant
  outright; a plant with no article needs its street address from a property
  report.
* **Learned.** A four-organiser event (the World Humanoid Robot Games) takes
  `company: null` rather than one of the four, and RoboCup's own events page
  corroborates the dates and venue.
* **Trap.** Contentful's `?fm=webp` image variants fail the thumbnailer
  ("Mime type image/webp does not support decoding"), a 500 on `POST /api/pins`.
  Create is still not transactional, so pin 2327 was written without media;
  the fix is to strip the query and `PUT` the whole pin back, never to re-POST
  into a duplicate `sourceUrl`.
* **Trap.** The scraper's Wikipedia image fallback can be actively wrong on a
  page it cannot illustrate - the Unitree IPO page returned a photo of a OnePlus
  One, the Hyundai release a Waymo car. Read the media stage's output before
  saving it. Conversely agibot.com's own article image is absent from the
  rendered image list, so a reference article's lead image carried that pin.
* **Trap.** `npm run companies:logos -- --all` 429s on Wikipedia partway
  through, which is harmless (it fills gaps, it does not clear existing logos -
  418 with logos after, against 415 in the committed seed), but a company with
  no Wikipedia article needs `websiteUrl` set by hand first: ugo -> ugo.plus.
* **Learned.** Stocks only where a US ticker is genuinely in the story: NVDA as
  company (GR00T), AMZN as company (Blue Jay), GOOGL as *related* on the Atlas
  pin because DeepMind's models go into the robot. Hyundai, Unitree, Figure, 1X,
  AgiBot and ugo are not US-listed and those pins carry none.
* **OKF backfill, same day.** The app key has no credit (`llm: "session"`), so
  the link wikis were done by hand through `wiki:export`/`wiki:apply`: 24 wiki
  jobs (all single-part) over the 27 pin-source pairs, then a second round of 10
  contradiction checks. No summaries were due, because these pins were saved
  with a hand-written `longFormSummary` rather than waiting for one to be
  composed from the wikis. Three rounds took the backlog to zero.
* **Learned.** The contradiction check earns its place. Eight findings, all
  minor, and two of them are the same fact twice: automate.org gives Atlas a
  66 lb payload where Boston Dynamics' and Hyundai's own releases both say
  110 lb / 50 kg, and Hyundai's release prints the operating range as
  "(20C to 40 Celsius)" against Boston Dynamics' "-20 to 40 C" - a dropped
  minus sign, caught because the Fahrenheit range matches in both. The Unitree
  pin's finding is the useful kind: [S] reports the open (+629%, $66bn) and the
  reference the close (+460%, ~$50bn) of the *same session*, so the pin's
  headline valuation is the higher of two true numbers.
* **Trap.** `wiki:export` **crashes when nothing is due** - the endpoint the
  playbook tells you to run to - because `prompts.md` is written
  unconditionally while the output directory is only ever created as a side
  effect of writing a job file, so a 0-job run dies on `ENOENT ... prompts.md`
  instead of reporting "0 wiki(s), 0 summary(ies), 0 contradiction check(s)".
  Fixed with an `mkdirSync(out)` after the `rmSync` in
  [export.ts](../../../scripts/wiki/export.ts).
* **Learned.** A source's wiki can have more pages than the source has: a page
  covering several distinct things gets topic pages, so the 27 pin-source pairs
  hold 37 `SourceWiki` rows - robotstart's seven-company summit alone is 7.
* **Changed.** [Vertical recipes](verticals.md) gained a `Robotics` row and a
  full recipe section.

## 2026-09-20 - Pin 315 (Mac mini M6): the video its references were hiding

One pin, fixed by hand after the owner noticed a video that the scrape had
walked past.

* **Learned**
  * **A reference article's embed is invisible in the text.** Pin 315's two
    references (MacRumors, 9to5Mac) each embed a video, and neither showed up
    in anything the pipeline reads: the markdown conversion drops iframes.
    `curl -A '<plain Chrome UA>' | grep -oE 'youtube(-nocookie)?\.com/(embed|watch)[^"]*'`
    found them in seconds. MacRumors' page also lists ten `watch?v=` URLs in
    its sidebar JSON - the `embed/` src with a `?si=` is the in-article one.
  * **The embed was the best reference on the pin.** Apple's own upload,
    "The new Mac mini with M6" (channel `UCE_M8A5yxnLfW0KghEeajjw`,
    2026-08-25), is first-party at 85, above both articles at 74 and 72.
    9to5Mac's embedded "Overtime Episode 079: The $899 Mac mini" is the
    publisher's own podcast on the pin's subject: a reference at 72, not media.
  * **oEmbed and `PUT /api/pins/:id` are enough to add a video by hand.**
    `youtube.com/oembed?url=...&maxwidth=800&maxheight=450` gives `html`,
    `author_name`, `author_url`; `originalUrl` is the iframe `src` up to the
    `?`. GET the pin, append the medium, PUT it back: `update()` diffs media by
    `originalUrl`, `addThumb` fetches the video's still by itself, and the
    references route is `POST /api/pins/:id/references` (add-only, notifies the
    author, moves an all-day pin's dates only if the reference is more
    confident - send `startDate`/`endDate` null to leave them alone).
  * **Apple prices nothing on the marketing page.** `apple.com/mac-mini/`
    carries only the financing-example dollar figures ($1,199 iPhone, $399
    Watch), which a naive price grep would take. The store page
    `apple.com/shop/buy-mac/mac-mini` has the real MSRP in its page JSON as
    `"currentPrice":{"amount":"$899.00","raw_amount":"899.00"}` - $899 base,
    $1,699 M5 Pro, confirming the figure the pin already held.

* **Feedback**
  * "should have youtube reference as it's in the references reference" - an
    embed inside a cited article is evidence the pin should cite itself.
  * "product video should be best effort gotten and brought to pin media and
    reference" - not either/or: the product video goes in both places.
  * "for released products, should check company product page for MSRP price
    and add as reference".

* **Changed** [Enrichment](enrichment.md) (MSRP reference, reference-embedded
  video in both places, grep raw HTML for the embed), standing feedback above.

## 2026-09-20 - Coverage gaps: four categories, eclipses, tournaments and a trends reader

Asked what was missing rather than what to scrape next, so this entry starts
with the measurement and then the three jobs it justified.

* **Learned**
  * **The gap is not a category, it is 2027-2029.** Measured over 1,963 live
    pins: 424 were in the future, and after April 2027 the timeline ran at
    single figures a month for two years (2027-05 had 2, 2027-07 had 3,
    2028-01 had 1). Anime alone was 657 pins, a third of the corpus.
  * **A category can be busy and still be dead.** Counting future pins per
    category found verticals with a full past and no future at all: `AI Models`
    45 pins but 2 ahead, `Automotive` 39 and 2, `Computing & Semiconductors` 29
    and 2, `Consumer Electronics` 69 and 7, and `Food & Beverage`, `Robotics`
    and `Climate & Environment` with none. Total pin count hides this; the pair
    of numbers is the one worth watching.
  * **Sneaker pins had no home.** All six Nike Caitlin 1 colorways sat in
    `Sports` because no clothing category existed, which [Vertical
    recipes](verticals.md) had already hedged as "`Sports` (or the product's
    own)". Added `Fashion & Apparel`, `Telecom & Networking`,
    `Defense & Military` and `Education & Academia`.
  * **A new category needs a dev-server restart, not just a save.** `PUT`s that
    set `Fashion & Apparel` silently came back `['Sports']`: `parseCategories`
    drops a name that is not on the list, and the running `next dev` still had
    the old module. Touching the route did not clear it. The function tested
    correct in isolation the whole time, which is what identified it.
  * **Eclipses are the answer to the far calendar.** NASA's catalogue is
    computed to the second for the next thousand years; 35 central solar
    eclipses from 2027 to 2050 went in on the first run, against a corpus that
    had about one pin a year after 2030.
  * **Google Trends is a signal, not a source** - see [Nightly jobs](nightly-jobs.md#google-trends).
* **Feedback**
  * "what other pins is interesting to post or missing categories to post" -
    answered with the measurement above rather than a list of ideas, then the
    gaps were filled.
  * "also check google search trends and find interesting things to pin from
    there" - built `npm run trends:discover`; it shortlists, it does not post.
  * "Add this to nightly scraping job strategy OKF" - added to the roster and
    given its own section on [Nightly jobs](nightly-jobs.md).
* **Changed** [Nightly jobs](nightly-jobs.md) (three jobs added, Google Trends
  section, refreshed numbers), [Vertical recipes](verticals.md) (eclipse,
  tournament and trends recipes), `src/lib/categories.ts` and all six
  `src/lib/i18n/messages/*.ts`. Pins 2121-2163, `backup:data` run.

### The eclipse job (`npm run astronomy:eclipses`, 35 pins, @ScienceDesk)

* Only central eclipses are pinned. A partial has no central path, so NASA
  publishes no point of greatest eclipse and there is nowhere to put the pin.
* **The decade table's clock is TD, the path page's is UT**, and they differ by
  delta-T - about 72 seconds this century. The pin wants UT, which is what a
  clock at the eclipse reads. The first run used TD and every pin was ~72
  seconds late, fixed by `--refresh`.
* The UT label is written two ways across the site, `Greatest Eclipse: Time =`
  and `Instant of Greatest Eclipse : Time =` with a space before the colon. A
  regex without `\s*` before the colon matched some pages and silently fell
  back to TD on the rest.
* **A few path pages are stubs** with no table at all - 2043 Apr 09 and 2043
  Oct 03 - and every one is a non-central eclipse where the shadow's axis
  misses the Earth. The five-millennium catalogue still has their position, but
  only to the whole degree, so the pin says so.
* NASA's regions are a fixed-width shorthand ("n N. America", "w & s Africa",
  "midwest US", "N.Z."). Expanded into English for the title and the
  description; the compass word in front of an ocean is part of its name (the
  South Pacific) and in front of a continent is not (South America, never "the
  South America").
* **The head of NASA's central-path list is not where the eclipse is deepest.**
  The list runs west to east, so the 2030 annular reads "Algeria" first while
  its greatest eclipse is in Siberia. The title names the country holding the
  point of greatest eclipse, and falls back to the head of the list only when
  that point is at sea.
* `--refresh` re-saves the pins the job owns by `PUT` of the whole body, and
  leaves an eclipse pinned by hand (239 Luxor, 241 Sydney) alone.

### The tournament job (`npm run sports:tournaments`, 6 pins, @SportDesk)

* Wikipedia dates a tournament in its opening sentence in about five shapes
  ("from 4 October to 21 November 2027", "from July 14 to 30, 2028", "from 10
  to 19 September 2027"), and sometimes without the year, which then comes from
  the article title.
* **A bare "in <Month> <Year>" is not the tournament's date.** The 2034 World
  Cup article says "In December 2024, Saudi Arabia was formally confirmed as
  the host", which a loose month-only rule pinned as the tournament - ten years
  early. The rule now requires scheduling language in the same clause and a
  year not before the article's own.
* **The already-pinned test has to carry the year.** Matching the event name
  alone made "2032 Summer Olympics" find the 2028 pin and "2034 FIFA World Cup"
  find the 2030 one: every edition looked already pinned.
* **Not every stadium article has coordinates**, in the REST summary or the
  query API - the Narendra Modi Stadium and Peru's National Stadium both lack
  the template. The chain is summary, then query API, then Nominatim by name,
  and Nominatim needs the local name ("Estadio Nacional, Lima, Peru" finds it,
  "National Stadium of Peru" does not).
* Wikipedia's REST summary answers 429 after about a dozen quick calls and
  stays cross, so every call is spaced 1.6s with a backoff.
* A tournament with no announced dates (2031 Rugby World Cup, 2031 Women's
  World Cup, 2034 World Cup) is skipped rather than guessed, and picked up
  whenever the job is next run.

* **YouTube transcripts should feed the wikis.** Owner, 2026-09-19: pull transcripts for wiki generation. (Blocked for now by YouTube's 429; see below.)

# Log

## 2026-09-20 - Dollar volume on market pins

The odds on a market pin said what traders think; nothing said how many of them
there are. Kalshi's 30% on a book that has turned over $15M and Polymarket's 30%
on $900 read identically on the page, and weighed the same on the timeline.

* **What the exchanges give.** Polymarket reports dollars outright (`volume` on
  the event and on each market, plus `volume24hr`/`1wk`/`1mo`). Kalshi does not:
  it counts contracts, as `volume_fp` on each nested market, which becomes money
  only as contracts x `last_price_dollars`. That product is an estimate at
  today's price - the contracts traded in March changed hands at March's prices -
  and it is worth saying so rather than implying the cent. Polymarket US
  publishes no volume at all, on either object.
* **The nested-market trap again.** As with prices, the volume fields only come
  back from the single-event read (`GET /events/{ticker}?with_nested_markets=true`);
  the events *list* returns them null, so a scan that reads the list alone finds
  no volume anywhere and quietly concludes there is none.
* **Where it lives.** `Pin.marketVolume` (schema 0053) is the dollars across every
  market the pin's source and references link. It is written after each save and
  edit, kept up as anyone watches the pin's odds (the read is already paid for),
  and refreshed in bulk by `npm run markets:volume -- --apply`. No author sets it:
  it is a reading of the exchanges, so it stays out of the form, out of the write
  SQL and out of `seedPins.json` (the script reads it again after a refresh).
* **What it changed.** The pin page carries a "$3.9M traded" pill beside the
  ratings, each market box shows its own figure (Kalshi's was blank before this),
  and `bagWeight` multiplies a pin by 1 + half a point per tenfold above $10k,
  capped at 2.5x - $100k x1.5, $1M x2, $10M and up x2.5. A market pin no longer
  needs to have been opened to earn a place on a crowded day; the money on it
  says so.
* **A Kalshi figure can go down.** Contracts only accumulate, but the price they
  are valued at moves, so a refresh of an unchanged market can read a little
  lower ($302,559 -> $301,242 an hour later on the Anthropic IPO ladder). That is
  the estimate being honest, not a bug; Polymarket's reported dollars only rise.
* **The first backfill** covered 50 pins, from $186 (a thin Kalshi ladder) to
  $15.1M (Ethereum's year-high book). Two IPO pins share a figure because they
  genuinely cite the same two markets, which is the right answer, not a cache bug.


### `AI Models` had a past and no future (`npm run ai:retirements`, 11 pins, @TechDesk)

45 pins, 2 of them ahead of today - the worst ratio in the corpus, and for the
flagship vertical.

* **The reason is structural.** Nobody announces a model launch in advance, so
  the category can only ever be retrospective from launches. Vendors *do*
  announce a model's death in advance, because developers must migrate, which
  makes deprecation pages the one reliable future-dated AI source. 11 pins,
  September 2026 to February 2027; `AI Models` future went 2 -> 13.
* **One pin per announcement, not per model.** 17 snapshots going off on one
  morning is one event.
* **Only OpenAI could be pinned.** Its page anchors each announcement, so each
  pin gets an honest unique `sourceUrl`. Anthropic and Azure list their future
  retirements in one status table with a single anchor - the Nobel schedule
  page problem again. Anthropic would be worth about ten more pins.
* **A model cell carries the model and its aliases**, so the item is the first
  identifier in it; counting the whole cell read one retirement as three.
  A staged platform shutdown puts a *sentence* in that column instead, which
  made "3 Evals Platform" - an identifier has no trailing full stop and at
  most three words.
* **Placement is not automatic outside the screen categories.** The first run
  produced 11 pins with `address: null`, invisible on the map, because the
  company-HQ placement only runs for film, TV, anime and games. The job now
  calls `lookupStudioLocation` on the vendor's article itself, the same way
  `health:trials` does for its sponsors.
* These pins carry no media, on purpose: a docs page has no pictures and one
  logo across eleven pins is padding.

### PDFs enter the pipeline (`src/server/scrape/pdfText.ts`)

[Sources](sources.md) had carried the row "PDFs - no poppler locally - decode
by hand when a filing is the only source" since the page was written. Poppler
and tesseract were installed on the machine, so the row was acted on.

* **It was worse than "by hand".** `pageText()` threw `Unsupported content
  type application/pdf`, and the fetch is the one stage that may fail a whole
  scrape, so a PDF link did not degrade to a thin pin - it killed the job.
* **Plain `pdftotext`, never `-layout`.** Measured on a three-column Federal
  Register notice: `-layout` preserves the geometry and interleaves the
  columns line by line, so every sentence reads as three unrelated
  half-sentences. Plain mode does the reading-order analysis and returns each
  column whole. `-layout` is right only for a document that really is a table.
* **Trust the bytes, not the content type.** The local test server served a
  PDF as `application/octet-stream` and the reader refused it - which is
  exactly what a lot of agency servers do. Anything that is not a web page now
  has its first bytes checked for `%PDF`, which also catches the reverse case,
  a block page served as `application/pdf`.
* **Adding a `SourceKind` is not a one-line change.** `'pdf'` had to be added
  to the `CK_Source_kind` CHECK constraint (0051) or the save would fail after
  a successful fetch, and to two exhaustive `Record<SourceKind, string>` maps
  in `extract/wiki.ts` (`KIND_LABEL`, `ROOT_TYPE`), which the compiler caught.
  `extract/references.ts` has a **different** type of the same name and needs
  nothing.
* OCR costs about five seconds a page, so it runs only when the text layer is
  under 200 characters and only over the first 5 pages. A 3-page scan took 15s
  end to end against 0.4s for a born-digital filing of the same length.
* The text carries a prefix saying what was read - `[Scanned PDF, 12 page(s);
  OCR of the first 5]` - so a summary written from it is not taken for the
  whole document.
* **This adds a host dependency, and the deploy was updated for it.**
  [Docker/Dockerfile](../../../Docker/Dockerfile)'s runtime stage now installs
  `poppler-utils tesseract-ocr tesseract-ocr-data-eng` beside chromium.
  Verified in the real base image (`node:24-alpine`): all four binaries
  resolve, `pdftotext` reads a Federal Register filing in reading order and
  `pdftoppm` + `tesseract` OCR an image-only PDF back to its text. Measured
  cost: **+72MB** to the image.
  * `tesseract` ships **no language data of its own** - without
    `tesseract-ocr-data-eng` it installs and then reads nothing.
  * `hasBinary()` shells out to `which`, which busybox provides on Alpine;
    checked rather than assumed.
  * **The migration does not ride along.** The image is the Next.js standalone
    output and carries no `scripts/`, so 0051 has to be applied to the target
    database separately (`npm run create:db` from a machine that can reach it).
    On the greenfield refresh it is simply part of a fresh schema.
  * `SCRAPE_PDF_OCR=0` turns OCR off without touching the image, for when that
    CPU is not wanted; the text layer is always read. It is optional, so the
    `env-file` ConfigMap needs no change to deploy this.

## 2026-09-20 - Six new verticals, and the nightly-job roster

Asked what was worth pinning next, then told to do all of it. Coverage was
measured first: `Anime` + `Anime Movie` was 42% of 1,855 pins, while `TV
Series` had 2, `Science & Research` 5 and `Health & Medicine` 6; Oct 2026 and
Jan 2027 were dense and Feb-Nov 2027 nearly empty. Six verticals were picked
to fix both at once, and 112 pins were created (1994-2110).

* **Learned - Nobel week.** Five prizes were missing (only Peace was pinned, by
  @OddsDesk). One schedule page covers all six and the route rejects a
  duplicate `sourceUrl`, so each prize's own YouTube announcement live stream
  became its source. The February press release beats the schedule page: it
  gives the hall and street address. Literature had no category, so
  `Arts & Literature` was added - and adding a category means adding its label
  to all six message files, which `Elections` and `Macroeconomics` had been
  missing since they were added earlier the same day.
* **Learned - a new category is picked up without restarting dev.** The pin
  route accepted `Arts & Literature` immediately; Next's dev server reloaded
  the changed module. The restart rule is for new lib *exports* and event
  listeners, not for a changed array.
* **Learned - launches.** `spacex:launches` was one `lsp__name=SpaceX` away
  from covering everyone, so it became `scripts/launches/upcoming.ts` with a
  `--provider` flag (`npm run spacex:launches` keeps its old behaviour). Only
  10 of the next 60 launches worldwide are dated to the day: SpaceX publishes
  a firm manifest and most other providers sit at month or quarter precision,
  which is the case for running it nightly. Threading is now per provider -
  one chain across providers interleaves Electron and Falcon 9 into a story
  neither is telling.
* **Learned - Launch Library files an unannounced launch as "Unknown Payload"
  with a "Details TBD" description.** Two such pins were created and deleted;
  the job now waits until a launch has a name.
* **Learned - the orbit guess needed widening carefully.** Progress to the ISS
  was drawn at 53 degrees by the bare "low earth orbit" fallback, which is
  SpaceX-shaped. Station visitors now get their station's inclination (ISS
  51.6, Tiangong 41.5) whoever launched them, and any guess below the pad's
  own latitude is refused outright, because no rocket can fly it.
* **Learned - TVmaze.** One call to `/schedule/full` returns every future
  episode. Its episode counts for a *future* season are partial and must not
  be published: 23 of the first 30 pins had a count like "The Simpsons season
  38, 2 episodes" that had to be cleared. Its forward schedule is also
  near-term - 202 premieres in October 2026 against about seven in all of 2027.
* **Learned - a streaming brand has no headquarters.** Wikidata files "Prime
  Video", "Disney+" and "Apple TV" as services with no P159, so 17 TV pins
  landed nowhere until each pointed at its owner's article. While fixing it,
  `lookupStudioLocation` turned out to reject a country centroid but accept a
  *state* one - FX was placed in the middle of Texas. It now refuses any
  headquarters place that sits inside nothing (no P131), which is a country or
  a top-level region either way.
* **Learned - ClinicalTrials.gov.** A good keyless health calendar: phase 3
  primary completion dates, which are the sponsor's own estimate and are
  pinned `estimated`. Two traps: asking for a `fields` list strips each
  intervention's `type`, so filtering on it silently returns zero rows; and
  naming the study drug is genuinely hard, because the shortest name gives the
  comparator (tamoxifen over camizestrant) and skipping digits gives it too
  (Truvada over MK-8527). First non-placebo arm, skipping dose lines, is right.
* **Learned - a ticker note belongs to the company, not the pin.** `stocks[].note`
  is stored on `Company.tickerNote`, so "runs the trial" was written onto ten
  pharma companies and had to be replaced with standing descriptions.
* **Learned - PDUFA dates cannot be scraped keylessly.** The FDA's advisory
  committee calendar renders its table client-side and serves no rows; PDUFA
  action dates live in company press releases. It needs a search-driven job.
* **Learned - sport fixtures are the best filler for a far calendar.** Governing
  bodies date tournaments years out, so six of nine pins landed between April
  and November 2027, the emptiest stretch. Wikipedia's opening sentence gives a
  quotable date and the venue article gives coordinates and a photograph.
* **Learned - deleting a pin leaves its duplicate suggestions behind.** The
  save-time check had already paired the two "Unknown Payload" launches; after
  both were deleted the `PinDuplicate` row survived and showed up in
  `duplicates:suggest`. Cleaned by hand.
* **Feedback.** "put this strategy in OKF for nightly scrape jobs" - the
  coverage analysis and the job roster are not chat, they are a page:
  [Nightly scrape jobs](nightly-jobs.md), linked from the scraping index.
* **Changed.** Added [Nightly scrape jobs](nightly-jobs.md); four new recipes
  in [Vertical recipes](verticals.md); this entry.
## 2026-09-20 - Economy, crypto, AI and space prediction markets (pins 1980-1993)

* **Learned**
  * **Entry point is `GET /series?category=`, and the category names are not the obvious ones.** `Economics` (1,000+ series), `Crypto`, `Science and Technology`, `Companies`, `Financials`, `World`, `Climate and Weather` all return series; plain `Technology` and `Science` return `{"series": null}`. Grep the titles for the theme (`grep -iE "spacex|starship|artemis"`, `"gpt|claude|gemini|llm"`, `"ipo"`), then pull the live event per series ticker. The unfiltered open-events list is still the wrong door.
  * **The events list has no prices.** `GET /events?series_ticker=…&status=open&with_nested_markets=true` returns every nested market with `last_price`, `yes_bid` and `volume` all `null`; prices only appear on `GET /events/{EVENT_TICKER}?with_nested_markets=true`, and there as `last_price_dollars` / `yes_bid_dollars` / `volume_fp` strings. So the scan is two passes: series list for tickers, then one event read each for odds. `kalshiChance` in `src/server/kalshiStream.ts` is the reference implementation.
  * **A cumulative "by when" ladder is read by differencing adjacent rungs.** Anthropic's IPO ladder goes 9% before Nov 1 to 50% before Dec 1, so November carries 41 points and is the month to date the pin on; Bitcoin's $100k ladder gives October 9, November 13, December 3. A month-only answer takes its last day, as [fields](fields.md) already says for "a month". Quote at least two rungs in the reasoning or the number reads as a forecast for that single day.
  * **Thin rungs quote out of order, and that has to be said, not smoothed.** OpenAI's IPO ladder runs April 70%, May 49%, June 61%; `KXMOON` has before-2028 at 1.1% under before-2027's 1.3%; `KXU3EOY` has above-4.5% at 1% under above-5.0%'s 5%. Date the pin off the monotone, liquid part of the ladder and put the anomaly in the summary as an illiquidity note.
  * **A cross-curator duplicate cannot be merged as a reference.** Starship Flight 14 already had pin 1945 from `npm run spacex:launches` (@TechDesk), dated within a day of what Kalshi and Polymarket imply, so no new pin was made - but `PUT /api/pins/:id` is author-or-admin only and @OddsDesk is neither, so the two market links could not be added to it either. The standing "duplicates become references" rule needs the owning curator account or an admin for pins another desk created.
  * **Spot prices are keyless.** `api.coinbase.com/v2/prices/BTC-USD/spot` and `api.kraken.com/0/public/Ticker?pair=XBTUSD` both answer plain curl and agreed to within $10, which is what let the crypto pins say where the market actually is rather than only quoting the ladder.
  * Podcast search (`/api/podcasts/search?q=`, auth required) was the best it has been - same-week episodes for the Fed hike, the CPI print, the unemployment rate, a 2027 recession, Bitcoin at $80K, the Anthropic/OpenAI IPO countdown, Starship's missing refuelling demo - but **still no transcript**: `/api/podcasts/transcript` answered "the feed has none and no YouTube upload of it was found". All eleven podcast references cite the episode's own Apple description at 66-75.
  * Images: Commons `generator=search&gsrnamespace=6` returns nothing (same as the politics run), so every picture came from Wikipedia's REST summary `originalimage`. `upload.wikimedia.org` **refuses to render thumbs of `Bitcoin.svg`** (400 at every width), so an SVG-lead article needs a photographic file instead. The REST summary endpoint 429s after about five quick calls - space them.
  * Adding `Macroeconomics` to `CATEGORIES` took effect on the running dev server with no restart, and `stocks` survive a `PUT` that omits them (the ticker write is add-only), which is what makes a references-or-media edit safe.
  * `/api/pins/search` free text is useless as a duplicate check here (a query for "kalshi" returned anime pins); the real guard is `rejectDuplicateSourceUrl` in the POST route, which 409s a repeated market URL.
* **Feedback** Standing: scrape without sign-off, market URL as `sourceUrl`, insert through the real API, prefer a granular new category over a broad one (hence `Macroeconomics`), duplicates become references.
* **Changed** `src/lib/categories.ts` (new `Macroeconomics` category), [Verticals](verticals.md) (prediction markets: the two-pass Kalshi scan, reading a cumulative ladder), [Sources](sources.md) (Kalshi category names and the priceless events list), this page.

## 2026-09-20 - Politics, elections and geopolitics prediction markets (pins 1967-1979)

* **Learned**
  * **Polymarket's tag scan is the best entry point for politics**, not Kalshi's open-events list. Paging `GET /events?closed=false&order=volume&tag_slug=` over `politics`, `geopolitics`, `elections`, `world-elections`, `global-elections`, `world` gave 1,263 distinct open events; filtering to `endDate < 2027-07-01` and sorting by volume put every well-known near-term race at the top. Kalshi's unfiltered `GET /events?status=open` returned 3,800 events of which only 312 belonged to a Politics or World series, and those skewed to "before 2030"/"during Trump's term" novelty ladders.
  * **Kalshi has Politics series with no events at all.** `KXSENATE` ("US Senate Control") and `KXHOUSE` return zero events, open or otherwise, six weeks before the midterms - the chamber markets live on Polymarket (`which-party-will-win-the-senate-in-2026`, `...-house-...`, `balance-of-power-2026-midterms`). Do not assume a series with the right title has a tradeable event behind it.
  * **A Polymarket market's rules text is the best date source.** It usually opens with the scheduled date in words: "A presidential election is scheduled to take place in Brazil on October 4, 2026", "Legislative elections are schedule to be held in Israel on October 27, 2026", "the 2026 California gubernatorial election currently scheduled for November 3, 2026". Those three pins are `scheduled` on the market's own wording. Where the rules only say "around April 2027" (France), the pin is `estimated` and the reasoning derives the day from law (first round 20-35 days before the term expires, always a Sunday) instead of inventing precision.
  * `endDate` is not the event. Polymarket's Israel PM market ends December 31, 2026 but the election is October 27; its Brazil market ends on election day but covers the October 25 runoff. Read the rules, not the field.
  * **Kalshi event tickers carry a date the markets contradict.** `KXINDIANPM-29APR30` is dated April 30, 2029 while its contracts close April 30, 2030, and `KXCANELECTION-29OCT15`/`KXGERELECTION-29MAR25` close a year after the dates in their tickers. The ticker date is the event; the close time is a settlement buffer. Both were cross-checked against law (Canada Elections Act third Monday of October; the Basic Law's 46-48 month Bundestag window) before being used.
  * A "will X happen by" market with one Yes/No contract (Taiwan invasion, Greenland) has no likeliest day to pick, so the pin is `estimated` on the market's own deadline and the reasoning says the market puts it at 4%. A ladder (Russia-Ukraine ceasefire, Netanyahu out, Knesset confidence vote) is cumulative, so the last rung is always the highest - quote two rungs, not one, or the number reads as a forecast for that day.
  * Podcast evidence was better than in earlier runs but **no transcript was reachable**: `/api/podcasts/transcript` answered "the feed has none and no YouTube upload of it was found" for the one tried, so all nine podcast references cite the episode's own title, show and Apple description at 65-75. The Apple catalogue search itself is excellent for politics - it found same-week episodes for Russia's Duma vote, Brazil, Israel, the Texas Senate race and Jeffries. One of them corrected a pin: Monocle's "Russians go to the polls across **three days**" moved pin 1967 from a single Sunday to September 18-20.
  * Wikipedia's `prop=pageimages` gives a party logo or an infographic SVG for a legislature article (State Duma, Knesset, Verkhovna Rada). Fall back to a Commons `list=search&srnamespace=6` for "<building> <city>" and pick a photo by size; `generator=search` with `gsrnamespace=6` silently returns nothing.
  * kalshi.com answers 429 to curl even with a browser UA, so the four Kalshi `sourceUrl`s could not be opened. They were verified the way the sports run did it - `pinMarketRefs` + `oddsFor` from a `tsx` script - and all 13 pins return live odds (20 market boxes in total).
  * Adding `Elections` to `CATEGORIES` took effect on the running dev server with no restart; the pin posted minutes later came back with `["Elections","Geopolitics"]`.
* **Feedback** Standing: prefer near-term, well-known events over far-future ladders; market URL as `sourceUrl`; insert through the real API; duplicates of an existing pin become references rather than a second pin.
* **Changed** `src/lib/categories.ts` (new `Elections` category), [Verticals](verticals.md) (prediction markets: where to find political events, the rules-text date rule, ladders), this page.

## 2026-09-20 - Sports and entertainment prediction markets (pins 1953-1966)

* **Learned**
  * The open-events list is the wrong entry point: it skews to 2030+ novelty markets. Start from `GET /series?category=Sports` (3,827 series) or `?category=Entertainment` (2,487), grep the titles, then pull the live season per series ticker. Polymarket's `tag_slug` does the same job (`sports`, `movies`, `music`, `awards`, `pop-culture`); there is **no** `entertainment` tag - it returns an empty list.
  * **Kalshi's nested markets price in `*_dollars` strings.** `last_price_dollars`, `no_bid_dollars`, `no_ask_dollars`; the plain `last_price`/`yes_bid`/`volume` fields are absent, so a first pass showed every outcome at 50% and eliminated teams at the top. Sort by `last_price_dollars` and skip `status: "finalized"` rows.
  * `expected_expiration_time` is a settlement buffer, not the event: the 2027 NBA market expires 31 July 2027, the World Series market on 1 November. Every date came from the league, organiser or venue instead - MLB's postseason release (World Series 23-31 October), UEFA (5 June 2027, Metropolitano), The Game Awards (10 December), the Recording Academy via Variety (7 February 2027), abudhabigp.com (6 December).
  * Both the NBA and the NHL have published only a **month** for their 2027 finals, so those two pins are `estimated` and score 65 and 68 - under the timeline's 70 bar, as designed. The Bond and Spotify Wrapped pins are the same: honest `estimated` reasoning is worth more than a borrowed precise date.
  * The Ballon d'Or leaves Paris for the first time: 26 October 2026 in London for the award's 70th anniversary. Kalshi and Polymarket agree within a point (Kane 55/56%), which made the Polymarket event a clean second odds box.
  * Kalshi's Super Bowl halftime board is 54 separate yes/no markets, one per artist, so the prices do not sum to 100. The pin says so; quoting them as shares would be wrong. Last-traded price and the live bid/ask midpoint can also differ a lot on thin markets (JAY-Z 51% last, 75% mid), so descriptions on thin boards read better with words than with a number the odds box will contradict.
  * Kalshi's web links are `kalshi.com/markets/{series}/{event-title-slug}/{event-ticker}` and only the ticker is parsed, so the slug can be built from the event's own title. kalshi.com itself answers 429 to curl - the links were verified by running `parseMarketUrl` + `oddsFor` from a `tsx` script, which confirmed all 16 (12 Kalshi, 4 Polymarket) return live odds.
  * Podcast evidence is mostly blocked: the Apple catalogue search is good (auth required), but of four episodes tried only the BettingPros Heisman preview had a publisher transcript - it quotes "the twenty twenty six Heisman Trophy Market" and names the favourites, which is cited at 70. Two others returned YouTube 429 on captions and one had no upload at all, so those cite the episode's own summary at 55-60 and say so in the reasoning.
  * The Commons API times out over IPv6 from Node's `fetch` (`UND_ERR_CONNECT_TIMEOUT` on `2620:0:863:ed1a::1`); `curl -4` with the client-naming User-Agent works. Peacock Theater has no Commons photos under that name - it is the former Nokia/Microsoft Theater, and those files are the same building.
* **Feedback** Standing: prefer near-term, well-known events over far-future ladders; insert through the real API; market URL as `sourceUrl`.
* **Changed** [Verticals](verticals.md) (prediction markets: how to find the events, how to read the prices, the URL shape), this page.

## 2026-09-20 - SpaceX launch schedule with flight paths (pins 1943-1947)

* Launch Library 2 gave 5 launches with a day-or-better NET; the rest of the schedule is month/quarter-dated and skipped. Each is a pin at its pad with an estimated ground track on the pin page (see verticals).
* Flight Club's API needs a login, so paths are computed; its `flightclub_url` is linked as the full simulation.
* First threaded oldest-first, which the owner corrected to newest-first (see standing feedback). Threading with a direct `UPDATE "parentId"` also left the chain head's cached page showing no thread: re-thread by `PUT` of the whole pin, latest first so no pin ever moves under its own reply.

## 2026-09-19 - Geek Vibes Nation "20 Most Anticipated Movies of 2027" -> 70 movie pins and franchise chains
* **Learned**
  * The tweet only carries the article's first 5 entries (X article preview via `api.fxtwitter.com`); the full list is on the linked geekvibesnation.com page, plain curl with a browser UA.
  * The list's names are not always the film's: Wikipedia has *The Exorcist: Martyrs* ("New Exorcist"), *The New Simpsons Movie*, *Frozen 3*, an untitled TMNT sequel, and a production page for *Secret Wars*. Cross-check every date against the film's Wikipedia infobox `released` field: all 20 matched; *The Beekeeper 2* is Jan 14 in Germany and Jan 15 in the US.
  * Wikipedia's `action=raw` on a redirect (`The Exorcist (film)`) returns only `#REDIRECT`; read the raw text of the resolved title. A title can also resolve to the wrong work (`Sonic the Hedgehog 2` is the game, `How to Train Your Dragon (film)` the franchise): require a date and the word film/movie in the intro or stop.
  * The first `Film date` in an infobox is often a premiere or festival, not the theatrical release (Shrek 2001 Cannes, Frozen 2013 El Capitan, Supergirl Brooklyn, Fellowship-era NZ dates). Score by location: skip premiere/festival, prefer "United States" or "wide release", then override by hand where the infobox lists only the premiere.
  * Lineage per franchise = mainline films in release order, one linear chain (each responds to the previous); the existing *Doomsday* pin (390) was re-parented under *Endgame* so *Secret Wars* answers it. Original tie-ins that are not films (Zelda games) are left out.
  * Only 1 of 20 upcoming films had a Wikipedia lead image at scrape time; 7 posted with no media. `media:top-up` then hit Wikipedia 429s on most pins.
  * The auto-mode classifier blocked signing a token from `SESSION_SECRET` and reading the password hash code; the owner reset @FilmDesk's password in their own terminal and logged in through `POST /auth/local`.
* **Feedback** Owner: "upcoming movie should cross reference other sources and create or update pins for all and create response lists of individual franchise lineage." Built as: Wikipedia cross-check of every date, one pin per film, chains per franchise.
* **Changed** [Verticals](verticals.md) (movies), this page.

## 2026-09-19 - Episode counts on episodic pins
* **Learned**
  * Wikidata's `wbsearchentities` answers a film title with the series of the same name often enough to matter: "Supergirl" and "Masters of the Universe" both came back with an episode count (126 and 38) for a film pin, because the title and year checks pass and the review scores that would have exposed the mismatch were missing. Episode counts are now taken only for a pin whose category is `Anime` or `TV Series`, and never from a Wikidata item described as a film.
  * A count alone is ambiguous while a show is going out, so `episodeStatus` says what the number is: AniList's `episodes` is a total that is only `complete` once `status` is `FINISHED`, and a long-running show (One Piece) leaves `episodes` null, so what is out so far comes from `nextAiringEpisode.episode - 1` and reads as `ongoing`. Live checks: Frieren 28 complete, One Piece 1,178 so far, Severance 19 so far (Wikidata, no end time), Dune: Part Two nothing.
  * A count of one is not worth showing, so films and one-episode entries are dropped before they reach the pin.
  * **Do not parallelise this backfill.** Five workers over 640 pins pushed AniList into 429 and it then answered nothing: pins that match perfectly on their own (Gintama Season 2, Attack on Titan Season 2, Fruits Basket The Final Season) were logged as matching nothing, and only 93 of 640 got a count. One worker with a 2s pause matches them. `getText` now waits out a 429's `Retry-After` once (up to 70s).
  * Title matching misses most anime pins anyway, because they are titled by the event ("... Premieres"). The pins carry their MyAnimeList link, so the count is looked up by MAL id first (AniList `Media(idMal:)`, then Jikan) - that reaches the seasons the title search cannot.
* **Feedback** Owner, 2026-09-19: "scraped shows should get and say how many episodes for Tv show, anime, anything these has multiple epsisods". Built as a pin field, not a lookup at render time, so a hand-made pin can carry it too.
* **Changed** `Pin.episodeCount`/`episodeStatus` (schema 0047), the extractor's schema and prompt, `screen.ts`, the pin page and card, and `media:screen --skip-trailer all` for the backfill; [Fields](fields.md), [Enrichment](enrichment.md), [Sources](sources.md), [Verticals](verticals.md).

## 2026-09-19 - Backfill of missing media and blocked links (no API credit)
* **Learned**
  * 1,707 of 1,708 pins had fewer than 3 media and 398 had no picture. `npm run media:top-up` finds pictures with the scrape's keyless sources and stores them; the first run stalled because Wikimedia answered 429 to every download with the app's browser-like User-Agent, while a User-Agent naming the client and a contact returned 200 for the same image. Fixed in `src/server/image.ts`.
  * The link reader accepted bot-check and error text of any length as the article, because it only fell back to the browser for pages under 500 characters. About 100 stored links were such pages. It now recognises them (`looksBlocked`), retries in the headless browser as plain Chrome with a wait for the challenge, and fails the link when it is still blocked. In a first check 3 of 5 blocked pages read.
  * Some blocked pages are not caught by text alone (a site's front page served for an old article URL); those still need the page-is-the-article check by the writer.
  * YouTube still answered 429 to caption downloads several hours after the bulk sync.
  * Retry the same day (2026-09-19): `npm run wiki:transcripts -- --limit 5 --delay 6` was 429 on the first video through the full 30s to 480s backoff ladder, so nothing was fetched and it was stopped rather than repeated. Needs Node 24 (`nvm use 24`); the shell's default Node 18 fails on `process.loadEnvFile`. The `| tail` pipe hides progress until exit, so redirect to a log file. Try again after a day or more, with a small `--limit` first.
* **Noted** The extractor prompt and schema gained `episodeCount` and `episodeStatus` while this ran; [Fields](fields.md) lists them. The metadata fallback leaves them null (a page's markup does not say).
* **Changed** Scraper and scripts: `image.ts` (Wikimedia User-Agent and Retry-After), `sourceText.ts` (`looksBlocked`, browser retry), `media:top-up`, `wiki:refetch-blocked`; [Sources](sources.md), [Enrichment](enrichment.md).

## 2026-09-19 - No-credit scrape: everything but the LLM calls still runs
* **Feedback**
  * "as much of the scraper api web scraping feature should be used without credit so headless scraping to get media should still be used" and "only LLM calls will use session calls": a scrape with no credit must keep every deterministic stage; only the Claude calls go to the session.
* **Learned**
  * The headless browser, media, keyless lookups and image top-up already ran without credit; what was lost was the fields (the title empty, so the top-up had nothing to search) and the two Claude stages, silently.
  * The page's own markup gives a good title and description: `og:title` before an Article's JSON-LD headline (Wikipedia's headline is a short description, "crossing of the Detroit River"), with the site name stripped by `og:site_name` or by the host ("- Wikipedia"). A publish date is a poor event date, so it is stored as `unknown` with the reason.
* **Changed** Scraper: `metadata.ts` (fields from markup), `llmTasks` in the scrape response (`extractTask`, `referencesTask`); [Strategy](strategy.md), [Scrape without credit](../playbooks/scrape-without-credit.md), [Scraping API](../api/scraping-api.md).

## 2026-09-19 - Live scrape check of the 3-media rule (no API credit)
* **Learned**
  * `GET /api/scrape?url=` with no extractor answer still runs the fetch, embeds, images and top-up. A YouTube video-only link came back as 1 video and 2 stills (3 media, pictures included). Before the change to count a video toward the 3, it stopped at 3 stills.
  * With no extractor title the top-up had nothing to search, so a text-only page stayed at 2 low-value site-default images (Federal Reserve press release). The scrape now falls back to the page's own `<title>` as the search term; that reached 3 media, but the Wikipedia match was only loosely related (a Federal Reserve founder's portrait). A top-up from a raw page title is best effort: review it, and prefer the extractor's title, the company's announcement or a referenced article's lead image.
  * A guessed URL can return a site's listing page with dozens of unrelated images (a NASA news URL that no longer exists): check the page is the article before trusting its pictures.
* **Feedback**
  * "add should best effort get 3 medias" then "with at least 1 image": 3 media of any kind, at least 1 a picture.
* **Changed** Scraper (`src/lib/mediaTarget.ts`, `scrape/index.ts`, `api/scrape/images`), [Enrichment](enrichment.md#images-and-media).

## 2026-09-19 - Whole-catalogue OKF backfill and reference run (no API credit)
* **Learned**
  * `wiki:sync --all` registered ~3.7k links; a bulk fetch of 524 YouTube videos made YouTube answer 429 to every caption download from this address, even through a real browser. Throttle and back off; retry after hours.
  * About 10% to 30% of web sources returned bot-check, 403/404, homepage or aggregator-front-page text (Cloudflare on Bloomberg, GameSpot, Kickstarter, Neowin, TechPowerUp, eWeek, Britannica, Axios; Windows Central and MSN return the current front page; IMDb 403). A wiki written from that text is worthless and, worse, drags a rebuilt summary down. Marker files (`results/blocked/<id>.txt`) replaced "no content" wikis; pins with no usable wiki keep their old summary.
  * Job files carry the pin's `existingSummary` so the writer can return `null` (keep) when the new wikis are thinner. Every batch that reported nulls (1 to 8 per 30) did so correctly on pins whose only wiki was a one-line release-notes mention or a blocked page.
  * A single MAL wiki makes a summary that states only what MAL states, so older claims that came from other sources (directors, box office) drop out.
  * Scripted MAL wikis (a parser copying the page's fields into the schema) are a legitimate way to write hundreds of wikis; they are formulaic (titles keep MAL wording, "Related entries" formatting is rough).
  * Agents sharing one work directory overwrote each other's helper scripts (`mk.js`, `w.js`); one ran a cleanup loop over other agents' files. Give every agent a scratch prefix and forbid editing shared files.
  * AniList `429`/Cloudflare 1015 appears under parallel load; Jikan 504s; Wikipedia rate-limits API bursts.
  * Reference yield: non-anime pins gave real press releases and trade reports (21 of 25 sampled pins found something, at about 1 search and ~10 fetches per pin); anime pins gave only Wikipedia series pages at confidence 70 to 78, so the run was limited to non-anime pins at confidence 80 or more.
  * Studio HQ: Wikidata covered ~70% of anime and film studios; the rest needed a by-hand lookup, and Chinese and Korean studios could not be verified by name match alone.
  * A trailer picked by title can be the wrong work (the live-action One Piece for the 1999 anime) or a fan channel; two of seven backfilled trailers were removed after review.
* **Feedback**
  * "never wait for credit is topped and do it using session LLM" - run the LLM stages with agents and the export/apply scripts.
  * "youtube transcripts should be pulled for wiki generation too" - added `npm run wiki:transcripts`.
  * "This should be updated when more scraping jobs are issued and learnings are captured with my feedback" - this page and the standing note exist for that.
* **Changed** [Sources](sources.md) (blocked-fetch recognition, YouTube 429), [Enrichment](enrichment.md) (reference yield, studio HQ by hand, trailer review), [Strategy](strategy.md) (quality bar, marker files).

# X post as the source (2026-09-19, Nike Caitlin 1 colorways)

- `api.fxtwitter.com/<user>/status/<id>` returns the post text, date and full-size photo URLs by plain curl when x.com itself is not readable.
- A post listing several dated items is a roundup: one pin per item. The post URL can be only one pin's `sourceUrl` (duplicate `sourceUrl` is rejected), so give each pin its own product/colorway page and use the post only for the dates.
- The post's own dates can be wrong: it said Ice Cold Nov 24, while Yahoo Sports and Nice Kicks said Dec 1. Fetch the coverage, pin the majority date as `estimated` and quote both.
- Sole Retriever returns 403 to WebFetch; its URLs from search results serve as `sourceUrl` but not as references. Nice Kicks, House of Heat, Yahoo, Sneaker Freaker and Sneaker Files fetch fine.
- Only one picture was reachable (the post's photo); the per-colorway pages were blocked, so the pins stay under 3 media.
- No curator existed for the vertical, so `@SneakerDesk` was signed up through `POST /api/users`. `npm run backup:data` needs Node 24 (`nvm use 24`).

## 2026-09-19 - S&P 500 product launches (12 pins, @TechDesk, no API credit)
* **Learned**
  * Topic-driven scrape: pick companies with thin coverage (Apple, Google Pixel, Microsoft, Tesla already had pins), WebSearch each product for its dated milestone, then read one dated source per product. Found: Nvidia Vera Rubin shipping, AMD Helios/MI450, Tesla Optimus V3, Lilly Foundayo, Meta Connect glasses, Boeing 777-9, Intel Nova Lake, Amazon Leo, Ford Fathom, Waymo Ojai, Android XR glasses, next Xbox.
  * Lilly's investor site returns 403 to curl and times out in WebFetch; use the Yahoo/EMJ coverage and cite the release as a reference only. WebFetch cannot read Tom's Guide (truncates); take the facts from the search snippet and Road to VR.
  * A product with no confirmed date (rumour or "fall 2026") is dated to the last day of its window as `estimated`; slipped ones (Optimus V3, Amazon Leo, 777-9) carry `originalStartDate` and a `Stated:` delay reason.
  * Yahoo Finance dates an article a day after the wire (Foundayo: Apr 2 vs the FDA letter's Apr 1); prefer the primary date.
* **Changed** Pins 1857-1868, `backup:data` run.

## 2026-09-19 - mmoexp Diablo BlizzCon roundup (3 pins, @GameDesk, no API credit)
* **Learned**
  * mmoexp.com is a gold-selling SEO site: its article carried claims Blizzard's recap does not (Mufisto boss event, Plague Knight class), so facts came from Blizzard's own post and the article stays only as a `sourceUrl`, never a reference. The page has no `<article>` tag and no video embed; its og:image is the site logo, so pictures came from Blizzard and the two news references instead.
  * A roundup becomes one pin per event (Season of Hell's Legacy, Amazon class pack, Diablo V). `POST /api/pins` answers 409 for a repeated `sourceUrl`, so each pin needs its own: mmoexp for the first, Windows Central and Blizzard's recap for the others (each removed from its own references).
  * Future-window dates: "first half of 2027" is 2027-06-30 and "Spring 2029" is 2029-06-20, both `estimated`, all day.
  * `backup:data` needs Node 24 (`nvm use 24`); the default Node 18 fails on ESM loading.
* **Changed** Pins 1869-1871, `backup:data` run.

* **X post to a rumour pin (2026-09-19, pin 1872, PS6 holiday 2027).** The tweet (GameGPU) only linked an article, so the article is `sourceUrl` and the tweet photo (fxtwitter API `pbs.twimg.com/...jpg?name=orig`) is a picture; `api.fxtwitter.com/<user>/status/<id>` returns the full text and media keylessly.
  * The image pipeline cannot decode `image/webp` ("Mime type image/webp does not support decoding"): the POST still created the pin but with no media, so pick a jpg/png (tweet photo, a reference's og:image) or `PUT` the full body with `media` afterwards.
  * @GameDesk sign-in through `POST /auth/local` is blocked by the auto-mode classifier until Ian allows the call in that session.

## 2026-09-20 - San Diego construction projects (5 pins, @BuildDesk, no API credit)
* **Learned**
  * A "what is being built in <city>?" scrape starts from the city's own authorities, not the trade press: SANDAG, NCTD, the airport authority, the university and the city each publish a dated project page, and each is a distinct `sourceUrl`. One broad WebSearch ("<city> major construction projects <years> opening completion milestone") is enough to name the projects; the dates then come from each owner's page.
  * **Official pages go stale in the opposite direction to the press.** NCTD's own Downtown COASTER Platform page still said "construction is expected to start in fall 2025" and "open to passengers in early 2027" after the Union-Tribune reported a spring 2026 groundbreaking. Two sources disagreeing that way is a `delayed` pin, not an `estimated` one: the owner's page gives `originalStartDate`, the newer reporting gives the current date, and `delayReasoning` quotes both.
  * Wikipedia is the better source where the history matters. Its Otay Mesa East article carries the whole slip ("as early as 2017" -> late 2024 -> 2028) in one paragraph, which is exactly what `originalStartDate` + `delayReasoning` need; the authority's page carries only today's promise.
  * Cost figures need the side named. The Otay Mesa East article's "2 billion Mexican pesos (about 99 million US dollars)" is the Mexican half of a binational crossing, not the project, so `price` stays null rather than understating it by an order of magnitude ([[feedback-pin-cost-figure]]).
  * sandag.org renders its project pages client-side and answers `/projects/<slug>` with a 404 body at HTTP 200; find the real path by grepping the homepage for `href="[^"]*<slug>"`. UC San Diego's Plan Design Build page is accordions (`href="#"`), so per-project deep links do not exist - use health.ucsd.edu for the project's own page.
  * No local PDF tooling (no poppler, no pypdf), so a fact sheet only published as a PDF cannot be quoted; drop that candidate rather than pin a soft date. Pure Water San Diego Phase 1 was left out for this reason.
  * Pictures: Commons search for "<airport> Terminal 1" returns Terminal 2 photos, so take the English Wikipedia article's own lead image (`prop=pageimages&piprop=original`) instead. A trade article's own photo is under `wp-content/uploads/<year>/<month>/`; the site's og:image is its logo.
* **Changed** Pins 2163-2167 (SAN Terminal 1 phase 2, Otay Mesa East, Downtown COASTER platform, UC San Diego Hillcrest, Kindred Apartments), `backup:data` run.

## 2026-09-20 - 32 cities of construction projects (131 pins, @BuildDesk, 16 parallel agents)

* **Learned**
  * **Read the search endpoint's sort before concluding anything from it.** `/api/pins/search` defaults to `sort=date`: it takes the semantic hit pool and orders it by *event date*, so a query for "Eglinton Crosstown" answers with Victorian railways and the pin you wanted sits far down the list. All sixteen agents read that and reported "nothing already covered"; the index had the pins all along. **Add `&sort=relevance`** and the same query returns the right pins first. A duplicate check without it is worthless.
  * The label terms are the other half: `user:BuildDesk`, `posted:<day>` and `tag:` resolve in SQL and are always current, so they page the corpus reliably. Free text alone never does. A title regex straight against the database is the surest check of all.
  * **The built-in duplicate check only catches same-day pairs.** `duplicates:suggest` pairs on FAISS >= 0.80 **and** +/-1 day, and found 0 of the 7 real duplicates this run produced, because a re-pinned project carries a *different estimated date* (Sydney Metro West at 2032-12-31 against an existing 2032-06-01). Cross-author duplicates also slip `rejectDuplicateSourceUrl`, which scopes to `userId`. Word-overlap over titles, scored and sorted, found all seven.
  * `search:refresh` rebuilds the index from **seedPins.json**, not the database, so it belongs *after* `backup:data`, never before.
  * **The media pipeline rejected large pictures outright** (`maxMemoryUsageInMB limit exceeded`) because `shrinkImage` decoded the full bitmap before resizing and jpeg-js caps at 512MB / 100MP. Fixed in `src/server/image.ts`. The first attempt at the fix did nothing: **`Jimp.read` drops its options when its input is a Buffer** and forwards them only when it fetched a URL itself, so the call had to move to `Jimp.fromBuffer`. There is a test on that difference.
  * Owner pages go stale in the opposite direction to the press, everywhere: the Port Authority still promised JFK T1 for 2026, Mass General still said 2027, VTA still said "Spring 2025", NCTD still said "early 2027". That disagreement is the `delayed` shape, and it produced 31 of the 131 pins.
  * A delay needs **both** halves quoted. Narita's third runway and Hong Kong's 11 SKIES were dropped precisely because the owner would not state the original date ("commercially sensitive"), and no source named a new one.
  * **WebFetch invented a cost figure** - "93.889 billion yuan" for Shanghai Metro Line 19, which appears nowhere in the article's wikitext - and mangled a Unicode filename so the image 404'd. Take numbers and image URLs from the raw API, never from a WebFetch summary.
  * Wikipedia's `api.php` 429s within about three rapid calls under parallel load, and returns plain text rather than JSON when it does. A real `User-Agent` plus ~6s spacing fixes it; batching titles (`titles=a|b|c`) helps more.
  * Currency: expand crore/lakh and 億/억, keep the source's own currency, never convert. Japanese fiscal years resolve to 1 April and the pin says so in `dateConfidenceReasoning`.
  * **PDFs read fine here.** The repeated "no PDF tooling on this box" note in this run's reports was wrong: poppler is installed and `pdftotext` is on PATH. It came from a shell test of the shape `command -v x && x ... || fallback`, which also takes the fallback when the command *runs and fails*. Owner PDFs then settled two questions no HTML page could - Mitsubishi Estate's own release gives Torch Tower "completion at the end of March 2028" against Wikipedia's uncorroborated "On hold" (pin 2251 moved to the release and 31 March), and Port Houston's October 2025 release confirms its own dredging is done while the 2029 date belongs to the whole of Project 11 (pin 2175 was right; the release is now a reference).
  * The pipeline reads PDFs itself since today ([pdfText.ts](../../../src/server/scrape/pdfText.ts), another session). Six sources still carried the **old** `Unsupported content type application/pdf` failure and were simply retryable: `wiki:refetch-blocked --apply --id ...` read all six (an FDA approval letter, a Sydney Metro document, two investor releases, a landfill fact sheet, Hillingdon's committee papers). Sweep for that error string after any reader change.
  * `pdfinfo` prints an absent title as a bare `Title:` label, and the title regex's `\s+` walked over the newline into the line below, so every untitled PDF came back titled "Author:". Fixed to `[^\S\n]+`, parser split out as `parsePdfInfo` and tested.
  * There was **no house convention for a bare year** - 12-31 (61), 01-01 (53) and 06-01 (26) were all in use - so this run's agents split too. Ian settled it: **a span takes its last day, so a bare year is 31 December**, and a period the event runs *from* takes its first. Now in the extraction prompt. Only 7 pins could be moved safely: matching on reasoning text alone would have dragged Angkor Wat to December 1150 while missing genuine bare years whose wording differed, so the rest are marked instead.
  * New `imprecise` okf:lint check (0051): every future pin dated to a year alone is a standing candidate for a better reference, because one later article naming the month retires a whole year of uncertainty. 153 pins on the first run. Past pins are left out - a bare year on something from 1150 is as good as it gets.
* **Changed** Pins 2163-2295 less 7 folded duplicates = 131 kept (46 estimated, 43 confirmed, 31 delayed, 11 scheduled); `src/server/image.ts` decode ceiling + tests; `backup:data` then `search:refresh` run in that order.

## 2026-09-20 (later) - fixing what the 32-city run exposed

* **Learned**
  * **The search was never stale.** `/api/pins/search` has a branch for a request with no `sort` at all, which called `searchPins` - hardcoded to date order. Sixteen agents read a date-ordered list of semantic hits, saw Victorian railways, and concluded the corpus was empty. Free text now ranks by relevance in both paths; a pure label search (`user:`, `tag:`, `posted:`) still answers by date, having nothing to rank by. One missing query parameter cost a whole run its duplicate checking.
  * `rejectDuplicateSourceUrl` scoped to `userId`, so a second curator could pin a page another had already pinned. Now global, with a different message when the pin is someone else's.
  * **A +/-1 day duplicate window cannot catch a re-scrape.** The same project pinned a year apart carries a different *estimated* date, which is the normal case, not the edge case. The window now follows the date's precision: 1 day for a firm date, a year for `estimated`/`delayed`. It found 30 pairs the old rule missed - Burj Azizi pinned twice 13 months apart, the Chuo Shinkansen, Bogota Metro, Rogun Dam, an exact-duplicate Grand Ethiopian Renaissance Dam - against 0 before. Title similarity still has to clear 0.80 and a person still confirms, so a wider window costs a suggestion, not a mistake.
  * **The oversized-picture bug is raised, not cured**, and cannot be cured this way: jpeg-js decodes the whole image before anything scales it, so the memory it wants grows with the *original's* pixels however small the thumbnail. 2GB covers about 45MP; a 174MP Commons scan still fails, and lifting the ceiling past the process's memory only trades a clean error for an OOM kill. It now fails with a message naming the remedy - ask the host for a smaller rendition (`iiurlwidth=1920` on Wikimedia's API; hand-built `/thumb/.../1024px-` URLs 400). The first attempt at the fix did nothing at all because **`Jimp.read` drops its options whenever its input is a Buffer**; it had to move to `Jimp.fromBuffer`.
  * The `imprecise` check first flagged any pin landing on 1 January or 31 December, which permanently listed events that genuinely fall on those days (a line opening on New Year's Day, a statutory deadline on the 31st). It now takes only `estimated` and `delayed` dates: a `scheduled` one is a day somebody announced.
  * Applying the convention needed reading, not matching. A regex over reasoning text wanted to drag Angkor Wat to December 1150 while missing bare years phrased differently, so only the 7 pins whose reasoning says in so many words that the source gave a year were moved, and the remaining ~146 are marked for a better reference instead.
* **Changed** Search sort default; global sourceUrl guard; precision-scaled duplicate window; 10 duplicates folded (7 from the run, 3 found by the new window); pin 224 re-dated and the Olympics duplicate folded; 7 spare pins posted (2296-2302); 5 dates sharpened by evidence; **130 OKF wikis written by hand and applied**, taking sources ready from 2,893 to 3,023 and leaving 8 of this run's 135 pins without one.

## 2026-09-20 (later still) - the OKF backfill, and what grounding a summary exposes

* **Learned**
  * **1,190 wikis written by hand** across 36 agent batches took sources `ready` from 2,893 to 4,109. 264 are marked failed, each with a reason that says whether retrying is worth it.
  * **Finishing the wikis unlocked the next stage**: summaries went from 2 due to 375, and contradiction checks from 750 to 1,074, because both need their pin's wikis first. Expect that cascade rather than treating the three job kinds as independent.
  * **The summary stage is an audit.** Forcing every bullet to carry a citation is what exposes a claim no source supports - nothing else in the pipeline does. About two dozen pins turned out to assert things their own sources do not, in four repeatable shapes:
    1. **A price read as a probability** (6 pins, all prediction markets - see [Vertical recipes](verticals.md)).
    2. **A figure computed rather than stated** - pin 2184's "$865 million" is a $45M and an $820M authorisation added together, which no page prints.
    3. **Absence asserted against presence** - three pins say "no opening venue announced" where the source names the venue in its infobox.
    4. **The right number at the wrong reference point** - an eclipse duration *at greatest eclipse* quoted as the maximum, which on pin 2132 is 0m48s against a true greatest duration of 01m25.9s.
    Plus plainly contradicted facts: pin 2224 reports a win where the source records a 2-2 draw.
  * Agents were told to **record disagreements rather than reconcile them**, and that discipline is what made the audit possible. A wiki that had silently picked one of three budgets would have hidden the pin's error instead of surfacing it.
  * **Domain knowledge prevents false positives.** Eclipse path pages use Universal Time and saros catalogues use Terrestrial Dynamical Time; TD - ΔT reconciles them exactly. One agent said so in all 18 of its summaries so the contradiction pass would not flag 18 pins for a difference that is not one.
  * Two host families serve one page for every URL and so produce identical captures that each look plausible alone: **wpcentral.com** (homepage) and **clinicaltrials.gov** (glossary shell). A `GROUP BY md5(text) HAVING COUNT(*) > 2` finds them; see [Sources](sources.md). **`wiki:refetch-blocked` cannot tell a wrong page from a blocked one** - it "recovered" 14 wpcentral links straight back to the same homepage.
  * Batch by **bytes, not job count**: the first split put 240KB Wikipedia articles and 2KB YouTube pages in equal-sized batches. Re-budgeting cut 735 remaining jobs from 25 batches to 9.
  * Applying results while agents still run is safe but confusing - three agents reported their output directory being "wiped" when it was the parent's own `mv`. Verify against the **database**, not the file layout: one sweep found 22 wikis written but never applied, stranded by an apply that threw midway.
* **Changed** Sources ready 2,893 -> 4,109; ~1,190 wikis and 375 pin summaries written by hand and applied; 264 dead captures marked with reasons; 75 eclipse `sourceModifiedDate` values cleared (a bare unlabelled footer date is not a stated date).

## 2026-09-20 - what grounding 375 summaries found: a triage list

Every bullet of a pin summary must end in a citation of a link that says it.
That one rule turned the summary pass into an audit of the pins themselves, and
it found three different problems that want three different fixes. Conflating
them would be a mistake: only the first group means a pin is wrong.

### 1. Contradicted - the linked source says something else

| Pin | The pin says | The source says |
| --- | --- | --- |
| 2292 CDG Express | Infra co owned by SNCF + Paris Aeroport; EUR 1.7bn state loan; Alstom trains; RATP Group | Equal thirds Groupe ADP / SNCF Reseau / Banque des Territoires; "financed the entire project without public subsidies"; **CAF France**; RATP **Dev** |
| 2224 Inter Miami | Beat Austin FC | A 2-2 draw |
| 2170 O'Hare Concourse 1 | SOM with Ross Barney, JGMA, Arup; $8.5bn | SOM and **Norviska**; ~$12bn now, completion 2034 |
| 889 Pirelli P Zero | Launched 1987 on the Ferrari F40 | First appeared **1985 on the Lancia Delta S4 Stradale** |
| 1862 Boeing 777-9 | Emirates expecting May/June 2027 | Late 2027; **Lufthansa** is launch customer |
| 2295 Tour Triangle | 42 floors | "35 des 44 etages" |
| 2258 Shanghai East | 14 platforms | 15 platforms, 30 tracks |
| 2259 Versova-Bandra | 9.6 km, two connectors | 9.8 km, four connectors |
| 346 Klipsch | Seven models | Six |
| 2212 A's ballpark | "Largest cable-net window in the world" | "One of the largest cable-glass windows in **North America**" |
| 2204 Phoenix light rail | B Line serves south Phoenix | Runs from Metro Parkway in **north-west** Phoenix |
| 2283 Finch West | 10.3 km | "Almost 11 kilometres" |

**A whole class of its own: a market price read as a probability.** A Kalshi or
Polymarket row shows a Chance, a Yes price and a No price - three different
numbers. Pins 1951, 1959, 1969, 1971, 1973, 1975, 1979(1988), 1983, 1993, 1679
and 1972 took a price for a chance. Pin 1971 gives Paxton 41%, his Buy No price,
against a 42% chance; pin 1959 quotes a player who **has no row at all**. Now
warned about in [Vertical recipes](verticals.md).

**And one of measurement, not fact:** an eclipse duration *at greatest eclipse*
quoted as the maximum (2126, 2132, 2155 - pin 2132 says 0m48s where the greatest
duration is 01m25.9s), and pins naming countries the NASA pages never name, they
give coordinates only (2123, 2126, 2150).

### 2. Unsupported - true or not, no linked source carries it

Around fifty pins state a figure, a date or a participant that appears in none of
their references: 2163, 2169, 2171-2172, 2176, 2179-2183, 2185-2186, 2188,
2190-2191, 2194, 2198, 2201, 2203, 2205-2206, 2208, 2220-2223, 2225-2226,
2228-2229, 2231, 2234, 2236, 2241-2242, 2244-2247, 2255-2256, 2261-2262, 2265,
2270, 2272, 2274, 2279, 2286, 2290-2291, 2293-2294, 568, 580, 591, 597, 807.

This is usually **not** a wrong claim. A scrape reads several pages and pins only
one as `sourceUrl`, so the facts are real but the evidence never made it into the
pin. The fix is a reference, not an edit - and it is why a scrape should add the
pages it actually read, not just the one it chose to cite.

### 3. Broken capture - the source cannot vouch for anything

- **2230 Cosm Atlanta** - the only source captured its headline and nothing else
  (a Next.js page whose body is in `__NEXT_DATA__`), so every figure on the pin is
  uncorroborated and its summary is correctly null. Re-fetch before re-running.
- **554 / 2304 Merdeka 118** - the stored capture of
  `skyscrapercenter.com/building/merdeka-118` is **entirely about Midtown East,
  Tokyo**. Two agents found it independently from both sides.
- **2205 TSMC Fab 2** - a Focus Taiwan paywall stub; backs the schedule and
  nothing else.

### What it means for the pin-writing prompt

The wiki and summary prompts say "record only what the source says" and the
citation rule enforces it. The pin extraction prompt has no equivalent pressure,
and the result is agents reaching past the page - summing figures, naming
architects, strengthening "one of the largest in North America" into "largest in
the world". Worth giving pin writing the same discipline.

## 2026-09-20 - "Already available" is not a release date (71 pins on one day)

Three contradiction batches independently tripped over pins parked on
**2026-09-08** matching nothing in their own links. The date was not two bad
pins: **71 pins**, every one @GameDesk, **65 of them `confirmed`**, all sharing
that single start date. The busiest real day in the surrounding four months has
twelve.

- **Where it came from.** All 71 were scraped from one Gear Patrol *"September
  Week 2, 2026"* roundup. The extractor said so itself, in
  `dateConfidenceReasoning`, 65 times over: *"Listed as already available in Gear
  Patrol's September Week 2, 2026 roundup."*
- **The error.** "Already available" is a **bound**, not a day - it says the
  release had happened by press time. The extractor converted it into a release
  date, and resolved the roundup's *week* to its Monday. Pin 310 (iPhone 18 Pro)
  ended up dated **the day before** Apple's own newsroom announced it; pin 315
  (Mac mini) sat two weeks after an announcement its own references date to
  25 August.
- **Why nothing caught it.** The sources are manufacturer **store pages**
  (`apple.com/shop/buy-iphone/...`, Sony, Marantz, Sonos, JBL, Yamaha), which
  carry no event date at all. With nothing on the page to date, the extractor
  reached for the only date in sight - the article's own publication period -
  and, because the roundup stated availability flatly, called it `confirmed`.
  A date inferred from *when the article ran* was being laundered into a fact
  about the product.
- **The tell, for next time.** One date shared by dozens of pins from six
  unrelated manufacturers is never a real date. A `GROUP BY` on start date
  across a scrape is a cheap check and would have caught this on day one; it is
  worth running after any roundup job.

**Fixed in `src/server/extract/systemPrompt.ts`**: a roundup, week-in-review or
shopping guide listing something as out now gives the *latest* the release could
be, so the pin takes that period's last day, `allDay`, `estimated` at best - and
a date inferred from an article's publication date is never `confirmed`.

This is the same family as the grounding rule above: the page did not state the
fact, and the extractor supplied it anyway. Here it supplied a date rather than
a figure, which is harder to notice, because a wrong date still looks like a
date.

**Outcome (same day).** All 71 re-dated from their own references by three
agents, none left on 2026-09-08: **35 confirmed, 31 estimated, 5 unknown**. The
corrected spread is the point - the roundup had made 65 of them `confirmed`.

- **The references already held the right answer.** In most cases the pin's own
  links stated the availability plainly and the extractor overrode them with the
  roundup week. Thirteen of one agent's 24 pins carried a **month-only**
  availability line ("available from September 2026", "December in North
  America") that simply needed the period's last day.
- **The roundup was wrong about availability itself, not just the day.** Several
  products it listed as "already available" had not shipped at all: pin 309
  (iPhone Duo) ships **2026-10-23**, six weeks *after* the date it carried as
  `confirmed`; pin 384 (Razer x Xbox) 20 October; pin 367 (Ruka TD-1) is a
  pre-order for **2027**. So a corrected date is as likely to move later as
  earlier - do not assume the roundup date is an upper bound either.
- **Do not batch siblings from one announcement onto one date.** A single Marantz
  press release covered three receivers and gave the Cinema 70s (pin 372)
  15 September where its two siblings got 12 August.
- **"Available now" in a single article is the same bug in miniature.** Where
  that was the only wording, the honest answer was the announcement date at
  `unknown` (pins 338, 351, 356, 361, 332), not a confirmed release.

Reasoning that still names Gear Patrol is now fine, and eight pins do: they cite
a **dated article with a quoted availability claim**, which is evidence. It was
the undated *week* label that was not.

## 2026-09-20 - Ruling: a figure in a video title is a headline, not a claim

Nearly every contradiction batch filed the same shape, and one asked outright for
a ruling: a B1M or Free Documentary YouTube page captured as **metadata only, no
transcript**, whose sole checkable "fact" is a cost in the video's own title -
`$100BN`, `$40BN Kansai`, `$2.8BN Silvertown`, `AUD $125BN Suburban Rail Loop` -
sitting against a proper figure from a text source.

**The ruling: a figure that appears only in a video title is a headline, not a
sourced claim.** Do not file it as a contradiction against a text source. Video
titles are written to be clicked on, and they are routinely at a different scope
from the pin: the `$2.8BN` Silvertown title against New Civil Engineer's £179M is
an order of magnitude, and the `AUD $125BN` Suburban Rail Loop title covers
Melbourne's whole metro programme where the pin is one line.

**The exception, which is the case actually worth catching:** where a *pin's own*
headline figure traces back to nothing but a video title, that is the pin
treating a marketing number as fact, and it should be reported. Pin 610 is the
example - its "$125BN Suburban Rail Loop" has no support but the title, against
Wikipedia's $31-58bn for the scope the pin describes.

**How big the class is** (measured 2026-09-20): 523 YouTube captures are `ready`,
**104 of them thin enough to hold no transcript**, and 104 pins cite at least one.
Only **one** pin rests solely on such captures, so the usual damage is a pin with
one fewer usable reference rather than a pin with no evidence - less dire than
the batch reports suggested, but it does mean a "second source" on those pins is
often not a second source at all.

The fix that would retire the class is transcripts (`npm run wiki:transcripts`),
still blocked by YouTube's 429s. Until then, treat a transcript-less video as
corroborating nothing.

## 2026-09-20 - A wrong date hides a duplicate

Running `npm run duplicates:suggest` after the 71 re-dated pins landed produced
**12 new pairs across 2,146 pins**, and seven of them were the same Apple
products pinned twice: @ThePinGang's "AirPods 5 Release", "Apple Watch Ultra 4
Release", "iPhone Duo Release" (from MacRumors) against @GameDesk's "Apple
AirPods 5", "Apple Watch Ultra 4", "Apple iPhone Duo" (from apple.com store
pages).

They had been invisible for a simple reason: the duplicate check compares pins
**within a day of each other**, and the roundup pins were all parked on
2026-09-08 while their twins sat on the real release dates. Correcting the dates
dropped each pair onto the same day - 18 September, 23 October - and the check
saw them immediately.

**So a date error does not just mis-place a pin, it conceals a duplicate.** Worth
running `duplicates:suggest` after any job that corrects dates in bulk; it is
cheap and it only ever adds suggestions, which people confirm.

Two related notes from the same run:

- **Suggestions only run on save.** A pin is never re-checked against pins added
  later, which is why Jeddah Tower had three live pins (134, 219, 448) with no
  suggestion between any of them until the job was run by hand.
- **Widening the day window is the wrong lever.** Adding `scheduled` to
  `SOFT_DATES` in `services/duplicatePin.ts` (274 pins, currently a one-day
  window) was tried and reverted: measured against the corpus it took visible
  pairs from 5 to 49, and what it surfaced was OpenAI model-retirement pins,
  Nike colorway releases and consecutive eclipses - all distinct by design. The
  periodic `duplicates:suggest` run gets the real pairs without the noise.

**Cross-checking the findings by source URL is a second duplicate detector.** Of
657 source URLs named in the 431 contradiction findings, only 7 were implicated
across more than one pin - and every one was a near-duplicate pair (Chuo
Shinkansen, Jeddah Tower, Bogota Metro, Australia 108) except Second Avenue
Subway, where Phase One and Phase 2 correctly share one Wikipedia article.

## 2026-09-20 - A wrong season in the title costs a pin its ratings

Pin 1131 was titled "Mushoku Tensei: Jobless Reincarnation **Season 2** Part 2
Premieres", but its MyAnimeList link (anime/45576), its date (4 Oct 2021) and
its whole summary were season 1's second cour. Everything downstream of the
title then went wrong, quietly:

- **No ratings.** `findScreenDetails` matches on exact normalised title *and*
  year. The title sent it to the real Season 2 Part 2 (2024), the year check
  rejected that, and the pin matched nothing at all - the dry run's `as "-": no
  ratings` is exactly this and nothing else.
- **The wrong trailer.** An earlier run had matched the title it was given and
  attached Crunchyroll's *Season 2 Part 2* trailer (`wwKZYTsxIhk`) to a 2021
  pin. Nothing flags a trailer that matched a title the pin should not have had.

Fixing the title to "... Part 2 Premieres" (PUT through the real API) and
re-running `media:screen --ids 1131 --apply` gave it AniList 85 / MAL 8.6 and
the right trailer (`vPBU0xBjFFY`, "Cour 2"). To re-pick a trailer, first PUT the
pin with the video dropped from `media` - the backfill only searches when the
pin has no video.

**Check a screen pin's title against its own sourceUrl and start year before
blaming the rating sources.** A season number is the easiest thing to get wrong
and the most expensive.

### The gap the wrong title was papering over

There were no pins for Season 2 (Jul 2023) or Season 2 Part 2 (Apr 2024) at all,
so the thread ran S1 -> S1 Part 2 -> S3. Both were added as @AnimeDesk through
`POST /api/pins` with an explicit `parentId` (the scrape's `respondTo` answered
1131 for *both*, which would have branched). `reslotSequels` then moved Season 3
onto the new Part 2 by itself, leaving one line: 1106 -> 1131 -> 2314 -> 2315 ->
1080.

## 2026-09-20 - AniList does not list every work MyAnimeList does

Pin 1564 (Gensou Mangekyou: The Memories of Phantasm, a Touhou doujin anime) had
no score, and could never have had one: `findScreenDetails` only fetched the
MyAnimeList rating *through* an AniList match, and AniList 404s on this work by
MAL id and returns nothing for its title, romaji or native. The pin's own
sourceUrl names the MAL id outright - the code already trusted a cited id for
the episode count, just not for the score. `src/server/scrape/screen.ts` now
falls back to the cited id for the rating too, covered by two tests that stub
`fetch` (the second asserts the empty case, so a 504 from Jikan stays silent).

**Jikan goes down for everything, not just one title.** While fixing this it
answered `504 Jikan failed to connect to MyAnimeList` for every id tried, having
worked minutes earlier. Do not read a 504 as "this work is unknown".

**When a source is unreachable, the fetched page text is already in the
database.** `Source.text` holds what the link fetcher stored (`seedSourceTexts.json.gz`),
so 1564's score came out of its own cited MAL page as captured on 19 Sep -
`SELECT "text" FROM "Source" WHERE "url" LIKE '%anime/55315%'` and grep for
`Score:`. Better than a blocked re-fetch, and it is the source the pin already
cites.

## 2026-09-20 - Side stories go in the chain, at their release date

Ruling from Ian: an OVA, special, bonus episode or side-story entry **belongs on
the timeline chain**, not parked as a standalone root. Mushoku Tensei's Blu-ray
OVA (1511, "Cour 2 - Eris the Goblin Slayer", Mar 2022) had been left rootless
while the TV seasons chained around it. It now sits in release order:

    1106 (Jan 2021) -> 1131 (Oct 2021) -> 1511 (Mar 2022 OVA)
      -> 2314 (Jul 2023) -> 2315 (Apr 2024) -> 1080 (Jul 2026)

The chain is ordered by **release, not story**, and never branches, so slotting a
side story in costs nothing - inserting it means re-parenting just the one entry
that follows it. "This would branch" is therefore not a reason to leave a side
story out; it only would if it were hung off the same parent as its neighbour.

Re-parent with PUT (send the whole pin back with `parentId` set), from the root
down so no cycle exists in between. PUT does not re-thread - only `POST` runs
`reslotSequels` - so an explicit parent set this way stays put.

## 2026-09-20 - A pin with one rating showed no score on its card

`PinCard` rendered `<RatingAverage compact>`, which by design draws nothing below
two sources ("an average would just restate the single chip beside it"). On a
card there is no chip beside it, so **319 pins - every pin with exactly one
rating - had a blank where their score should be**, while the same pin's page
and thread rows showed it.

`RatingSummary` already solved this for thread rows: average when there are two
or more, otherwise the single source's own score, labelled so it never reads as
a consensus of one. The card now uses it. Checked both ways afterwards - pin
1500 (AniList only) shows `76%`, pin 1131 (two sources) still shows `86%` titled
"Average of 2 ratings".

**Worth remembering:** a missing score on a card is not always missing data.
Check `GET /api/pins/:id` for `ratings` before re-running any backfill.

## 2026-09-20 - Acting on the warnings: a third of them were wrong

The sweep's 88 `warning` findings are the ones putting a pin's own claim in
doubt. 51 are on curator accounts and were worked through by three agents told
to **verify each finding before acting on it**, with "the finding is mistaken"
named as a perfectly good outcome.

**34 pins fixed, 17 findings rejected.** A third of the findings did not survive
checking. That number is the reason the instruction matters: an agent told to
"fix these 51 pins" would have introduced seventeen errors into pins that were
already right.

**What the rejections looked like** - the pin was right and the *source* was
wrong, or the two sources described different events:

- **827 MSC Divina** - Wikipedia says delivered at Marseille; the trade press,
  reporting the ceremony, has her handed over at Saint-Nazaire. Wikipedia's own
  infobox contradicts its text. The pin follows the better source.
- **1640 Chibi Maruko-chan** - Japanese sources confirm the 8 January 1995
  premiere the pin carries; AniList's August record is simply bad.
- **2032 Harry Potter** - HBO's own release says "premiering Christmas 2026";
  TVmaze's "premiering 2027" status line is stale.
- **705 China's skyscraper ban** - the finding said the 250 m restriction came
  from a 2021 order; the pin's own source video states the April 2020 notice
  carried both. The finding had not read the pin's source.
- **798 / 808 / 499** - the pin already disclosed the disagreement in its own
  summary, so it was never asserting the disputed figure.

**Where the pin really was wrong, the fixes were worth having:** a US-format
dateline read as D/M (802, 1 July -> 7 January); a date taken from the practical
completion of *a different building* (709, 20 Hanover Square); an airship pinned
in Akron that was built and flown in California (444); a complex's opening day
standing in for a tower's completion (635); "opens Phase 1" for what the source
calls a ceremonial technical opening (456).

**Two habits worth keeping.** Where a figure was disputed and nothing settled it,
the fix was to **drop the claim rather than swap in another unverified number** -
pin 915's carillon had three bell counts (48/70/72), so the pin now gives none.
And where a date could not be established, the pin was made **honest rather than
precise**: pin 709 moved to an end-of-2020 `estimated` with the uncertainty
written into `dateConfidenceReasoning`, rather than inventing a day.

Fixed pins need no finding cleanup: `contradictionSignature` covers the title,
description and dates, so editing a pin changes its signature and the next
contradiction run replaces its findings.

## 2026-09-20 - Kaiju No. 8 Season 2 (pin 2316, @AnimeDesk)

MAL 59177 -> pin 2316: aired 19 Jul - 27 Sep 2025, 11 episodes, Production I.G,
placed at the studio's Musashino HQ, AniList 78. Scrape returned `llm: "session"`
again, so the description and summary were written by hand from the cited page.

**The trailer search picked a re-uploader over the show's own channel.** The dry
run chose "KAIJU NO.8 Season 2 - Official Main Trailer | English Sub" by
**AnimeSelect**, a verified but aggregating channel, because `pickTrailer` scores
`official`(+2) + `trailer`(+1) and then subtracts `rank * 0.25` - and AnimeSelect
held the top two search results while TOHO animation's own uploads sat at ranks
3-6. The official 【Official】 titles scored the same on words and lost on rank
alone.

Fixed by hand: `--apply --skip-trailer 2316` for the ratings, then attaching
TOHO animation's main PV (`86pUz-brRJQ`, the video AniList itself lists for the
season) through `Medium#saveWithThumb`. Note `--skip-trailer` skips the whole
trailer block, **including** the AniList-listed fallback, so there is no flag
that means "use AniList's trailer, not the search's".

Worth watching whether this recurs: if an aggregator routinely outranks the
production company's channel, the fix is to score a channel named after the
work's studio or distributor above rank, not to keep skipping by hand.

### Threading: `reslotSequels` did the sequel, the side story needed a hand

Posting 2316 moved 1770 ("Final Chapter Announced", Dec 2025) onto it by itself.
But 1690 ("Narumi's Week at Work", Sep 2026) stayed a root, because **AniList
lists no prequel edge for it at all** (`63138 -> prequels []`) - the side-story
short is related to the show in its catalogue but not in the chain the threading
walks. Per the side-story ruling it was re-parented by hand onto 1770, giving one
line: 2316 -> 1770 -> 1690.

So `threads:prequels` cannot be the whole answer for side stories. It only ever
follows PREQUEL edges, and a special, short or OVA often has none.

### A 429 makes `threads:prequels` report "0 pins" with no error

Running the full 776-pin dry run and then a scoped one back to back rate-limited
AniList, and every relation lookup afterwards returned `AniList relations 429`.
`findPrequelPin` treats a failed `loadRelations` the same as "no prequel found",
so the run still prints a confident **"Would thread 0 pins"**. The up-front
prefetch throws on failure, but the per-pin walks after it do not.

**Do not trust a 0 from this script unless the run was the first AniList traffic
in a few minutes.** Wait for the limit to clear (30s polls; it took ~90s here)
and re-run before concluding nothing needs threading.

## 2026-09-20 - The same picture twice, on 292 pins

Pin 1564 (Gensou Mangekyou) carried its MyAnimeList poster twice: the page's
own `.../anime/1729/135900l.jpg` at 356x500 and, from the top-up that read the
`og:image` of the reference, `.../135900.jpg` at 225x316. Same file, two sizes,
two of the pin's three media slots - **"practically the same. need to skip
these as they don't add value"**.

Hashing every picture in the catalogue (a 64-bit difference hash off each
thumb) and pairing them up per pin put numbers on it:

| bits apart | pairs | what they are |
| --- | --- | --- |
| 0-6 | 292 | one picture: a poster at two sizes, or with a title band added |
| 7-13 | 105 | still mostly one picture (AniList's cover against MyAnimeList's poster), but two photos of one event are in range by 8 |
| 14+ | 1,040 | different pictures, with the odd same-artwork pair still hiding among them |

So **6 is the limit a rule can carry**: every pair below 7 that was looked at
was one picture. Sorting 7-13 out needs eyes, and is left to
`npm run media:dedupe -- --distance N` when someone wants to.

Three things came out of it, all in [Enrichment](enrichment.md#images-and-media):
`sameImageKey` for the URL case (a CDN's size suffix), a hash check in the
model so a create, an update or a top-up cannot store a picture the pin already
has, and `npm run media:dedupe` for the 292 that predate it.

Two things that did **not** work:

* **A finer hash.** 256 bits (16x16) does not separate the one false positive -
  the Intel Core 3 and Core 5 badges on pin 110, which differ in a single glyph
  - from true repeats: the badges sit at 8 and two sizes of one MyAnimeList
  poster reach 10. Global hashes read shape, and those two shapes are the same.
* **Judging by source.** "An AniList cover and a MyAnimeList poster are the same
  key visual" holds often enough to be tempting and fails often enough to lose
  real pictures. The hash is the honest test.

## 2026-09-20 - The info findings, and who the sweep is actually good at judging

The 236 curator-authored `info` findings (the minor ones - heights, costs, floor
counts) were worked through by six agents on the same verify-first brief as the
warnings, with one extra rule: **two sources disagreeing is not by itself a
defect in the pin.**

**52 of 189 pins changed. Roughly four findings in five did not warrant a change.**
That is the right answer, not a failure: the pin was usually already following
the stronger source, or already disclosing the disagreement in its own
`longFormSummary`. Agents reported that pattern over and over - "the pin's own
summary already said so".

**A useful observation from one batch:** in *every* pin it changed, the
`longFormSummary` was already correct and only the short `description`, the
title or the date had drifted. The bad figures look like damage at extraction
time to the summary line, not bad sourcing. The summary is the more reliable
artefact.

**What did warrant a change** was mostly a pin stating a figure no link carries:
a 283 m dredger that is 223 m, a pyramid tallest for 3,800 years that Wikipedia
says 3,700, Stonehenge's sarsens "roughly 20 miles" away against English
Heritage's 15, a limestone facade that is terracotta, a 30 m station box that is
39 m. Several were the named video-title exception - a pin's own headline figure
resting on nothing but a B1M title (Seine-Nord's EUR 7BN against the partners'
EUR 5.1bn, Allegiant Stadium's $1.8BN against a $1.97bn final accounting).

### The sweep is far more accurate on old pins than on new ones

The same findings were checked read-only against the 37 pins on the owner's own
accounts, and the split is nothing like the curator pins:

| Set | Findings that survived checking |
| --- | --- |
| Curator `warning` findings | 34 of 51 (two thirds) |
| Curator `info` findings | about 1 in 5 |
| Owner's own pins (`warning`) | **34 of 37** |

The reason is structural, not luck. The owner's pins are the oldest in the
corpus and nearly every one is dated **to the year a source predicted something
would finish**, or to an arbitrary day near the article, rather than to the event
its own title describes. That is one habit showing up thirty-odd times, so there
was little for the sources to exonerate. Newer curator pins were written against
a prompt that had already been tightened, so their findings are mostly
source-vs-source noise.

**The measurable form of that habit: 100 live pins sit on the *first* of a month
with an `estimated`, `scheduled` or `delayed` date**, where the house rule puts a
month, quarter or half-year on the period's **last** day - 41 of them on the
owner's account, 34 on @BuildDesk. `YYYY-MM-01` is not a house placeholder for
anything. Worth a sweep of its own, and a candidate for the `imprecise` lint,
which today only looks at 31 December and 1 January.

# 2026-09-20 - Google Trends, run as a discovery job for the first time

`npm run trends:discover` scored 10 of 100 terms across ten geographies as
pointing at something dated. Three of those ten turned out to be real,
unpinned, dated events; the other seven were a footballer's name, a
same-day La Liga match, a currency lookup, a minister's food poisoning, a
dance-show birthday, a tribute card at the end of a TV finale, and one term
(`asteroid`) the job itself already flagged as pin 242. **A ~3% end-to-end
yield is what the feed is worth**, and the job's job is to spend a session's
attention on those three rather than on the hundred.

### A trending term can be dateless even when it looks scheduled

`landman season 3` scores well - a named sequel with a season number - and
survives the filter, but there is no date to pin. Paramount+ renewed the show
in December 2025 and filming only starts in September 2026, so every
"release date" article is a guess at mid-to-late 2027. The lesson is that the
filter is doing its job by shortlisting it; the session's job is to check that
the thing the crowd is searching for **has a date**, not merely a future.
A "when does X come out" article is a strong signal that X has *no* date.

### Ticketmaster's artist page carries every show's start time in its markup

The per-event pages (`ticketmaster.com.au/<slug>/event/<id>`) are useless to
both `curl` and the scraper - the app's own `GET /api/scrape` came back with
nothing but `{"type": "web"}`. The **artist** page
(`/calvin-harris-tickets/artist/1149552`) is different: its raw HTML carries a
`schema.org` `Offer` per show with the event URL, the venue and the local
start time (`"Calvin Harris - Australia Tour 2027 | Thursday 18 Feb 2027,
6:00 pm | Langley Park, Perth"`). That is where a tour's clock times come
from, and the per-event URL it hands over is a valid `sourceUrl` even though
the page behind it will not open - the same rule as IMDb.

### A tour is one pin per show, not one pin per tour

Four dated pins at four venues beat one pin for the tour: each is a real
event with its own place on the map, its own on-sale URL and its own night.
The press shot can only ride on one of them, because the difference hash
([[image-dedupe]]) drops the same picture from the second pin onward - so the
other three take their venue's own Wikipedia photo, which is better for a map
anyway, plus one official video each from the artist's Vevo channel.

### A rollout schedule reads like a launch schedule

One UI 9 went in as two pins threaded newest-first: the 28 September date for
the Galaxy S25 and Z7 foldables is the head, and the confirmed 16 September
S26 rollout answers it. The two dates that came from a single regional
newsroom post (21 September global, October for the S23 FE) stayed in the
summary rather than becoming their own pins - one source's claim about one
country does not support three pins, and GSMArena and SamMobile both hedge it.

## 2026-09-20 - Every game pin was missing its video, and "gameplay" was why

Pin 1869 (Diablo IV, Season of Hell's Legacy) had three pictures and no video,
though the search for one runs on every pin with none (`topUpVideo`). Running
the search by hand showed what it had thrown away: result 0 was
**"Diablo IV | Season of Hell's Legacy | Gameplay Trailer"**, from the verified
`@Diablo` channel, with every distinctive word of the pin's title in it.

`pickProductVideo` and `pickTrailer` shared one `NOT_A_TRAILER` list, and that
list had `gameplay|game` on it. For a film or show that is right - a video with
"gameplay" in the title is not that film's trailer. For a game it rules out the
only thing the studio ever publishes: a game's own announcement is almost
always titled "Gameplay Trailer", and the press re-uploads (IGN, GameTrailers,
PlayStation, Xbox, GameStop) all copy the phrasing. Of the catalogue's 86
Gaming & Entertainment pins, **66 had no video at all**.

The list is now split: `COMMENTARY` (reaction, review, breakdown, explained,
recap, fan-made, parody, analysis, ...) rules a video out of both searches,
because it is someone talking about the work rather than the work; `A_GAME_VIDEO`
(`gameplay|game`) only applies to the screen search, where it belongs. Test in
`src/server/scrape/productVideo.test.ts`.

### The backfill: 23 of 66, and seven rounds of saying no

`npm run media:videos` (`scripts/media/productVideos.ts`, dry run by default,
`--category`, `--pin`, `--limit`, `--offset`, `--delay`) runs that same search
over pins that have none. It leaves a film, series or anime to
`npm run media:screen`, whose search matches the work's own title instead.

The first dry run over the 66 game pins offered a tutorial upload, two IGN news
clips, an "everything we know" roundup and a BlizzCon **2026** esports match on
a **2017** StarCraft Remastered pin. Each round of the dry run bought one rule,
and the rules are worth more than the backfill:

| what got in | the rule |
| --- | --- |
| IGN covering the news | the video announces itself (trailer, teaser, reveal, announce) **or** comes from the company's own channel |
| "The Final Preview", "Exclusive Hands-On Preview - IGN First" | `preview` announces a film, not a game - it is the press playing it early |
| Diablo III's trailer on a Reaper of Souls pin | title overlap 0.6, then 0.7 |
| Xbox's console trailer on a Razer accessory pin | the video must carry the pin's **leading** word, the name of the thing |
| "BlizzCon 2026 Classic Cup" on a 2017 pin | a year in the video title must be within one of the pin's; esports words out |
| "Elden Ring: **Tarnished Edition**" on the 2022 launch pin | an edition word the pin does not have is a different product |
| Diablo **III**'s trailer on the Diablo **V** pin | `distinctiveWords` dropped one-character words, so "Diablo V" was just "diablo" - numerals are kept now |

The overlap threshold only worked once the **headline's furniture was
stopworded**. Half of these pins are titled "<Game> Review - IGN", and counting
`review` and `ign` as words the video had to carry scored a real trailer at 3/5
- the same as a sibling product's. With those words out, the right trailer
scores 1.0 and 0.7 became a threshold that separates rather than one that
merely trims.

Rejecting the press previews **improved** six pins rather than emptying them:
the official trailer was further down the same results page and won once the
preview was out of the way.

**21 pins kept a video**, all official trailers or the company's own upload.
The rest got nothing, which is the right answer for a 2014 pin headlined "Xbox
One to launch in Japan" - there is no official video of a news item, and the
channels that rank for it are all commentary.

Two were taken back off on Ian's call: pin 169 had a post-launch "Challenges of
the Forbidden West" trailer and pin 181 a 2023 Xbox release-date trailer, both
on 2022 review pins. **Right game, wrong moment** - and no rule here catches
that. The year check allows a year either side, because a December trailer for
a January launch is the normal case, and a post-launch trailer names no year at
all. A later `media:videos` run can offer these two again; that is the honest
cost of a search that reads titles rather than release dates.

**The search is not deterministic.** Pin 1871's apply run took Diablo III's
trailer where the dry run minutes earlier had found the Diablo V teaser -
YouTube reorders results between requests. A dry run is a sample of what will
happen, not a promise, so the apply output is worth reading too.

### The same artwork, reframed, is not a repeat the hash can see

The same pin also carried the season's key art twice: the full 1920x1080
painting from GamesRadar, and a 2560x1440 frame from the trailer that zooms
into the middle of that same painting. They are **24 bits apart** - a
difference hash reads framing, and reframing is exactly what changed - and a
sweep of 25 crops of the wide one gets no closer than 8, which is inside the
range where two genuinely different photos of one event live (see
[the 292-pin entry](#2026-09-20---the-same-picture-twice-on-292-pins)). No
threshold catches this pair and still keeps real pictures, so the repeat came
off by hand. A frame lifted from the trailer beside the art the trailer is made
of is worth a look on any pin that gets both.

## 2026-09-20 - An IMDb news link for DanMachi season 6 (pin 1727, @AnimeDesk)

* **Learned**: `https://www.imdb.com/news/ni65700881/` was handed over to be
  pinned. The news path is behind the same AWS WAF as the rest of imdb.com
  (HTTP 202, empty body, to curl with a browser UA), but an IMDb news item is
  only a **syndicated copy** of another outlet's story, so it does not have to
  be read: `WebSearch` on the bare URL returned its title ("DanMachi:
  Crunchyroll's Hit Action Fantasy Anime Officially Confirms Season 6"), and
  searching that title found the publisher's own copy on CBR, which `curl`
  serves in full with `article:published_time`. Cite the publisher's URL, not
  the IMDb one - a blocked link can only ever hold a dead wiki - and say in the
  reference's reasoning where the syndication was seen.
* **Learned**: the story's subject already had a pin (1727, the 7 February 2026
  "Aedes Vesta" announcement), so this went in as a **fourth reference** rather
  than a second pin, per the standing rule.
* **Learned**: `PUT /api/pins/:id` re-saves references wholesale, so adding one
  by hand means sending the pin's whole body. Running the stored pin through
  `pinToForm` -> edit -> `formToPin` (the edit modal's own round-trip) is the
  safe way: the dry run showed the day key, the thread parent, the media and
  the tags all coming back unchanged, where a hand-built body drops whatever it
  forgets.
* **Learned**: with no credit on the app key, the new link's wiki failed on
  save (`credit balance is too low`) and the pin's summary went stale. The
  no-credit route needs **two** `wiki:export` rounds: the first offers only the
  wiki job, and the summary and contradiction jobs appear only on a second
  export, after `wiki:apply` has stored that wiki.
* **Learned**: the rebuilt summary turned up a false contradiction worth
  recording as such - ANN's "October 4, 2024 at 24:30" and Wikipedia's and
  CBR's "October 5, 2024" are one late-night broadcast, not two dates. Filed
  `minor` with a note saying so, which is what the check is for.
* **Feedback**: none; this was the standing scrape-without-sign-off rule.
* **Changed**: [Sources](sources.md) - the IMDb row now covers `/news/ni.../`
  items and the syndication workaround.

## 2026-09-21 - Weather and natural disasters, from nothing (pins 2429-2454)

Asked for "weather and disaster related pins". A keyword sweep for every hazard
word I could think of (hurricane, typhoon, cyclone, earthquake, tsunami,
volcano, erupt, flood, wildfire, drought, tornado, storm, heat wave, blizzard,
monsoon, landslide, famine, disaster, weather) matched **seven pins in 2,428**,
and not one of them was a disaster: four flood-defence projects, an anime
(*Weathering With You*), a Eurofighter Typhoon and a storm-surge plan. The
domain was empty, not thin.

Twenty-six pins: fourteen geological events as @ScienceDesk and twelve weather
events and seasons as @ClimateDesk. Two new categories, `Weather` and
`Natural Disasters`, seeded in the same pass.

* **Learned**: the **USGS FDSN API** is the best source this vertical has -
  `fdsnws/event/1/query?format=geojson&starttime=&endtime=&minmagnitude=`
  answers the event id, magnitude, epoch-millisecond origin time, epicentre and
  depth for anything in the catalogue, keyless. Its **human event page renders
  empty**, though: `earthquakes/eventpage/<id>/executive` answers 200 and the
  headless browser gets an Angular shell - nav links, a social-media list and a
  footer, 666 characters of page text. So the catalogue supplies the facts and
  the event's own Wikipedia article is the `sourceUrl`.
* **Learned**: **query the catalogue by date window, never by guessed slug.**
  Two `usgs.gov/programs/earthquake-hazards/science/<event>` paths invented from
  the event name 404'd before I stopped guessing.
* **Learned**: the **aftershock trap**. A one-UTC-day window around Tangshan
  returns `usp0000hk6`, M7.4, "6 km SW of Linxi" - the *aftershock*. The M7.5
  main shock is `usp0000hjg` at 19:42:54Z on the **previous** UTC day, because
  the quake struck at 03:42 local on 28 July. I had the wrong event until
  Wikipedia's "at 03:42:55 on 28 July (19:42:55, 27 July UTC)" caught it.
* **Learned**: **the UTC day is routinely not the day the event is famous for**,
  and this vertical hits it constantly. Tangshan is the 28 July earthquake and
  the pin sits on 27 July; Haiyan is the 8 November typhoon and its landfall is
  20:40Z on the 7th; the Galveston hurricane is the 8 September storm and came
  ashore about 02:00Z on the 9th. Each of those pins spends a sentence of
  `dateConfidenceReasoning` saying so. Without it the pin reads as a day wrong.
* **Learned**: **`volcano.si.edu` is a reuters.com-shaped source** - 403 to
  `curl` with a browser UA, read in full by the app's own headless scraper. Five
  volcano numbers were confirmed by scraping them and reading the `<title>`
  (`Global Volcanism Program | Tambora`), which matters because the numbers are
  unguessable and citing the wrong one silently attributes the eruption to
  another volcano.
* **Learned**: **NOAA's NCEI HazEL database is unusable** - every path answers
  200 with "We're sorry but HazEL doesn't work properly without JavaScript
  enabled", which a status check passes and a byte count does not catch.
* **Learned**: **a disaster has no company.** `company` is null on all 23
  historical pins - nobody did it - and set only on the three forward pins,
  where the organisation really is the event's author (National Hurricane
  Center, Bureau of Meteorology, IPCC).
* **Learned**: **the only forward-datable part of this vertical is the seasons
  and the report calendar.** Disasters cannot be scheduled, so three of 26 pins
  lie in the future: the 2027 Atlantic hurricane season (1 June to 30 November,
  `scheduled` because the NHC *defines* the bounds rather than forecasting
  them), the 2027-28 Australian region cyclone season (1 November to 30 April,
  which is the only thing in this pass that lands in **November 2027**, the
  emptiest month in the corpus) and the IPCC Special Report on Climate Change
  and Cities in March 2027. Both seasons are periods with an exclusive 00:00Z
  end, the same convention a law in force uses.
* **Learned**: **say when the sources disagree instead of picking quietly.**
  Vesuvius is the hard case - medieval manuscripts and a 2022 re-reading of
  Pliny support 24 August 79, while autumnal fruit remains, heavy clothing on
  victims, a 2007 wind study and an October charcoal inscription point to the
  autumn, and a separate 2022 study concludes "between October 24th and
  November 1st". The pin takes the traditional date, marks it `estimated` and
  lays out both cases. The Bhola cyclone is a smaller version: its article's
  lead says 12 November 1970 while its own track narrative implies the 11th, and
  the reasoning names the conflict rather than resolving it.
* **Learned**: **year 79 stores and reads back fine.** `0079-08-24T00:00:00Z`
  passed the all-day UTC-midnight check and came back as `0079-08-24 00:00`.
* **Learned**: **`media:videos` is structurally unable to serve this vertical**,
  and its refusal is correct. Its two gates are that a video announces itself
  (trailer, teaser, reveal) or comes from the company's own channel; a disaster
  has neither, so it rejected all 26 pins and added nothing. What ranks for
  "Krakatoa" or "Hurricane Katrina" is documentaries and explainers, which
  `COMMENTARY` is right to refuse.
* **Learned**: **the hand pick works well, though** - the same route Aerospace
  uses. A Data API search per pin, restricted by eye to the agency's own channel
  or a major outlet's contemporaneous report, found **9 videos for 26 pins**:
  USGS's own 1906 and Mount St. Helens footage, NOAA's 2004 tsunami
  visualisation, the NWS Lake Charles WSR-88D radar animation of Katrina's
  landfall, the IPCC's own video on the cities report, and day-of reporting from
  FRANCE 24 (Kahramanmaras), Rappler (Tacloban, 8 November 2013), NBC News
  (Eyjafjallajokull) and BBC News (Derna). The other 17 get none, correctly:
  there is no footage of Vesuvius, Lisbon, Tambora or Krakatoa, and for the rest
  every candidate was commentary. **Apply the edition rule** - NOAA's 2016
  season outlook is the wrong moment for a 2027 season pin, and the Bureau of
  Meteorology's standing cyclone explainer is not the 2027-28 season, so both
  forward season pins were left without a video rather than padded.
* **Learned (my own error, worth recording)**: I first reported the YouTube Data
  API key as invalid. It is fine - `config.youtube` exposes it as **`apiKey`**,
  and my probe read `config.youtube.key`, which is `undefined` and makes Google
  answer the identical "API key not valid" message. A missing key and a bad key
  are indistinguishable from the error text, so check the property name against
  [config.ts](../../../src/server/config.ts) before concluding the key is dead.
* **Learned**: **`mediumID` is `youtube`, not `youTube`.** The wrong casing
  yields `undefined` and the insert dies on `null value in column "type" of
  relation "Medium"` - after the `PinMedium` link is attempted, so read the
  error as a type-lookup bug rather than a schema problem. Adding a video to an
  existing pin needs no `PUT`: `new Medium({type: 3, originalUrl, ...}, pin)`
  then `saveWithThumb()` writes the medium and its still without touching the
  pin row, which is how `media:top-up` does it and avoids the wholesale
  reference re-save a `PUT` would trigger. The `maxresdefault`/`sddefault` 404s
  in its output are the normal fallback chain down to `hqdefault`, not failures.
* **Learned**: **`media:top-up` is excellent here and Wikimedia throttles it.**
  Almost every event has a public-domain lead image - a federal photograph, a
  satellite image, a period engraving - and the run added **39 pictures across
  19 pins**, then started answering 429 and found nothing for seven. A re-run of
  just those seven with `--delay 25` added 9 more. Only Tambora and Krakatoa are
  still on one picture.
* **Learned**: the app's Anthropic key still has **no credit** (`llm: "session"`
  on every scrape), so extraction and references were done by hand throughout,
  per [Scrape without credit](../playbooks/scrape-without-credit.md).
* **Learned**: three pins are saved with **no reference** - Lisbon 1755, the 1931
  China floods and the Bhola cyclone. NCEI HazEL would have covered the first
  two and it is unusable; nothing authoritative and fetchable turned up for
  Bhola, and the WMO Atlas release that quantifies the 2003 heat wave does not
  mention it. Recorded rather than padded.
* **Feedback**: the owner chose **two categories** over one combined
  `Weather & Disasters`, and **splitting existing desks** (@ClimateDesk for
  weather and storms, @ScienceDesk for earthquakes and eruptions) over opening a
  new @HazardDesk - consistent with the batch-4 preference for reusing desks.
  The batch was to lean historical with some forward-dated items.
* **Changed**: [Sources](sources.md) - four new rows (USGS catalogue, Global
  Volcanism Program, NCEI HazEL, the national weather and climate agencies).
  [Vertical recipes](verticals.md) - three new table rows and a
  "Weather and natural disasters" recipe.

## 2026-09-21 - Restaurants, a new vertical and @FoodDesk (pins 2455, 2458-2467)

Asked to pin Chubby Group's openings, do the same for other famous restaurants,
and pull in reviews for the ones already open. Eleven pins: the Menya Ultra
Mira Mesa opening, two Chubby Group sites in San Diego and eight world-famous
rooms, with four MICHELIN star ratings attached.

* **Owner's calls**: two categories was the shape for weather, but here it was
  *one new desk* over reusing @BuildDesk - @BuildDesk's seven `Food & Beverage`
  pins are all biscuit and cereal **factories**, and a restaurant is a different
  vertical. Scope was "both, split across the batch" (Chubby Group + famous +
  San Diego) and reviews were to be "MICHELIN rating + review text + tags".
  @FoodDesk is user 372.
* **Learned**: **`guide.michelin.com` is 202-to-`curl` and fully readable through
  the app's own scraper** - the same AWS WAF shape as IMDb, the same
  do-not-judge-it-by-`curl` rule as reuters.com. It gives the inspectors'
  verdict, the price band, "Good for" flags and a "N people love this place"
  count.
* **Learned (the trap that nearly put a wrong rating on a pin)**: the rendered
  Michelin page carries `Three Stars`, `Bib Gourmand` and `Green Star Community`
  as **filter links in its own navigation**, so grepping the body for a star
  count is worthless - it read "Green Star Community" on three-star The French
  Laundry and "Bib Gourmand" on two-star Alinea. The **meta description** states
  it cleanly and carries the guide year with it ("a Three Stars: Exceptional
  cuisine restaurant in the 2026 MICHELIN Guide USA"). Read the description.
* **Learned**: **I invented three of six street addresses and reverse geocoding
  caught all three.** The coordinates were fetched but the address *labels* were
  typed from memory, which is the same violation as typing a URL. Nominatim's
  reverse lookup put The French Laundry on Creek Street (not Washington Street),
  Gaggan on Sarasin Road (not Soi Langsuan) and Mugaritz's coordinate in
  Astigarraga (though the Guide files it under Errenteria). Two pin descriptions
  also carried detail the source never stated - Noma's "village of buildings
  around a greenhouse" and Mugaritz being "named for the oak that marks the
  line" - and were rewritten before posting. **Reverse-geocode the coordinate to
  get the label; never write the street.**
* **Learned**: Nominatim is the only geocoder here, the app ships none, and a
  forward lookup of a restaurant address frequently resolves to the **premises**
  (`type: restaurant`, its name in `display_name`), which confirms the address
  and the point at once. It did so for Menya Ultra, Mikiya, Maido and
  Sukiyabashi Jiro.
* **Learned**: **a group's own site dates nothing.** Chubby Group lists ~60
  locations over 9 pages with only a `(Coming Soon)` marker, so of all of them
  exactly two had datable press coverage. The group site is the reference that
  proves the brand belongs to the group; the local press is the `sourceUrl`.
* **Learned**: **four of twelve famous restaurants have no opening date on
  Wikipedia** - Central, Osteria Francescana, Disfrutar and Sukiyabashi Jiro -
  so they were dropped rather than dated from memory. Losing Central cost a Lima
  pin; Maido covers Peru instead.
* **Learned**: **a Guide selection is not a score.** Menya Ultra is in the 2026
  Guide with no stars, at `$$` and "Worth Queueing For"; scoring that 0/3 would
  be a lie, so it went on as a reference quoting the inspectors' verdict. A
  World's 50 Best placing is a rank, not a score, and went in tags. Stars
  themselves are honest as `{source: 'MICHELIN Guide', score, scoreMax: 3}`, and
  four pins carry one: The French Laundry 3, Eleven Madison Park 3, Alinea 2,
  Mugaritz 2.
* **Learned**: **no route adds a rating to an existing pin.** `PinRating` is
  deliberately untouched by `Pin#update` (0017), so a rating that arrives after
  the pin is written with `new PinRating({...}, pin).save()` against the model;
  the POST body's `ratings` array handles the case where both land together.
* **Learned**: `media:videos` refuses restaurants for the same structural reason
  it refuses disasters, and here the **hand pick failed too** - what ranks is
  documentaries, chef interviews and wire pieces about the *aftermath* of
  elBulli's closing rather than the closing. All eleven are saved without a
  video. `media:top-up` did well on pictures (19 added over three runs), with the
  usual Wikimedia 429s needing a `--delay 28` re-run, and one Copenhagen
  cityscape rejected outright as too large to decode.
* **Learned**: **`backup:data` was broken mid-session by another session**, which
  had edited `Users.getAll` to select a `birthday` column before applying its own
  `0058_user_birthday.sql`. The fix was not to touch their work: a `git worktree`
  at the committed HEAD has a `user.ts` that matches the database, so the dump
  ran there and the five seed files were copied back. It had applied the
  migration by the time of the second batch and `backup:data` worked normally.
  Verify a dump by diffing its pin ids against `HEAD` - both dumps added exactly
  the pins of this session and removed none.
* **Changed**: [Sources](sources.md) - five new rows (MICHELIN Guide, Nominatim,
  Yelp/Tripadvisor, local restaurant press, restaurant group sites).
  [Vertical recipes](verticals.md) - a Restaurants row and recipe.

## 2026-09-21 - The picture top-up hung Chubby Checker on a restaurant (owner catch)

* **Feedback**: Ian opened pin 2459 and said "wrong person picture as person is
  not David Zhao nor Harby Yang". The pin is Chubby Cattle's Mira Mesa opening
  and `media:top-up` had attached **two portraits of Chubby Checker**, the
  singer. He had just followed Chubby Group in the UI, which is presumably how
  he saw it.
* **Learned**: the warning for this was **already written** in
  [Enrichment](enrichment.md) after the Aerospace run - "Read back what a top-up
  attached ... the only way to see what it chose is to run it with `--apply` and
  then list the pins' picture filenames" - and I did not do it. I ran
  `media:top-up --apply` over 36 pins across two batches, skimmed the counts in
  the log, and never listed the filenames. Reading the doc is not the same as
  following it.
* **Learned**: the fallback **matches a word of the title, not the subject**, so
  the failures are absurd rather than subtle and one listing catches them all.
  An audit of every `wikimedia.org` picture on pins 2429-2467 found 21 wrong
  ones over 15 pins: Chubby Checker on Chubby Cattle, Wes Borland of Limp Bizkit
  on the Black Summer bushfires (Black Light Burns), Walden Pond on the Lake
  Nyos limnic eruption, ground elder on the IPCC cities report, Copenhagen City
  Hall on Noma, a generic ceviche on Maido, Lisbon's municipal flag on the 1755
  earthquake, and Apollo 17's Earth on two different earthquakes. The subtler
  half were the dangerous ones: Hurricane **Laura**'s damage on the Katrina pin
  and Cyclone **Catarina** on both Katrina and Bhola are plausible enough to
  pass a glance and are still the wrong storm.
* **Learned**: **taking a picture off does not stop it coming back.**
  `findImages` skips only what the pin already has, and no table records a
  rejection, so the next bulk `media:top-up` re-attaches every one of these.
  Flagged to the owner as a gap; until there is a rejection list, re-run the
  top-up only with `--pin` over pins that will be read back.
* **Learned**: one pin (2447, the 2003 European heat wave) was left with no
  picture at all once the junk came off, because its Wikipedia article has no
  lead image - which is exactly why the fallback fired. Commons had the right
  ones under a French title: `Canicule Europe 2003.jpg`, the MODIS land-surface
  comparison of July 2003 against July 2001, and
  `2003 europe summer temperature anomaly.png` against the 1971-2000
  climatology. Search Commons in the subject's own language before concluding it
  has nothing.
* **Learned**: `invalidatePin` throws outside a request context, so a
  maintenance script that edits media cannot call it; the delete statement
  itself is the one `Medium#deleteFromPin` uses and is safe to issue directly.
* **Changed**: [Enrichment](enrichment.md) - the read-back warning now names
  this recurrence, the single-word-overlap tell, and the fact that a removal is
  not durable.

## 2026-09-21 - Six categories the list was missing, and a 34-pin backfill

* **Learned**: with 2,281 pins, **nothing was filed under `Other` and nothing was
  uncategorised** - which hides the gaps rather than showing them. A missing
  category does not surface as an unclassified pin; it surfaces as a pin filed
  under its *medium* while the event itself is a different kind of thing. The
  tell is a category column that has to say "the show's own", as the trade-show
  recipe in [Vertical recipes](verticals.md) did.
* **Learned**: the corpus's own tags name the hole. All 28 pins carrying the
  `Crime` topic tag are television procedurals - `Law & Order Season 26
  Premieres`, `Chicago P.D.`, `NCIS` - and not one is a court event. A keyword
  sweep for the vocabulary of a missing vertical, read against what it actually
  matches, is a cheaper gap-finder than reading the category counts.
* **Learned**: award ceremonies were scattered across five categories by medium
  (99th Academy Awards under `Movies`, the 69th Grammys under `Music & Audio`,
  the Nobel Peace Prize under `Geopolitics`, the Economics prize under
  `Science & Research`), so award season could not be seen as one thing although
  `PinAward` holds 1,431 rows.
* **Changed**: added `Awards & Ceremonies`, `Conferences & Festivals`,
  `Travel & Tourism`, `Retail & Commerce`, `Cybersecurity` and `Crime & Justice`
  to [categories.ts](../../../src/lib/categories.ts) and all six dictionaries,
  by the seven-file procedure in [Fields](fields.md#adding-a-category). The
  `category labels` test caught nothing because every language was written in
  the same pass; `tsc` and `npm test` both pass.
* **Learned**: re-tagging an existing pin is a **whole-pin `PUT`**, and the safe
  body is the pin's own `GET` JSON with `categories` edited and `tags`,
  `ratings`, `stocks` and `awards` dropped. `tags` left out leaves `PinTag`'s
  user rows alone (`setUserTags` only runs when the body sends them) while
  `setCategories` rewrites the category rows only, so topic and award tags
  survive. Sending `tags` back would be the dangerous move, not the safe one.
  Fingerprinting each pin before and after (title, dates, company, media URLs,
  merchants, reference URLs, non-category tags) proved all 34 edits were
  category-only. The running dev server picked the new names up with no restart,
  as [Fields](fields.md#adding-a-category) says.
* **Changed**: 34 pins re-tagged through the real API as their own authors -
  10 ceremonies as `Awards & Ceremonies` (@OddsDesk, @ScienceDesk), 8 shows as
  `Conferences & Festivals` (@TechDesk, @FilmDesk, @BuildDesk, @GameDesk), 15
  attractions, parks, cruises and hotels as `Travel & Tourism` and Mall of
  America as `Retail & Commerce` (@BuildDesk). The new category is appended, not
  put first: the main category stays what it was, so no card's label changed.
* **Learned**: the line worth holding is **the event is the show, not the venue**.
  CES 2027 opening is `Conferences & Festivals`; Boston Dynamics unveiling Atlas
  *at* CES 2026 is not. A cruise ship *entering service* is `Travel & Tourism`;
  the same ship *delivered at the shipyard* stays `Marine`.
* **Learned**: pins authored by user 1 (admin, Ian's own) cannot be re-tagged by
  a curator - Expo 2030 Riyadh (255), the Olympics pins and GDC 2014 (14) were
  left as they are. A backfill over old pins should expect a tail it cannot
  touch.
* **Changed**: [Vertical recipes](verticals.md) - the trade-show and prize rows
  now name the two new categories instead of "the show's own".
* **Changed**: `Cybersecurity` and `Crime & Justice` were seeded in the same
  pass (pins 2468-2479) behind two new curators, @CyberDesk (373) and @LawDesk
  (374) - Ian chose new desks over reusing @TechDesk and @PoliticsDesk, as he
  did for @FoodDesk. Both accounts were made through `POST /api/users`, the
  public sign-up, which answers a token with the row, so no password reset was
  needed.
* **Learned**: **a category's first six pins decide what it means.** Cyber took
  three forward regulatory dates (Windows 10 consumer ESU ending 13 October
  2026, the Cyber Resilience Act's reporting phase on 11 September 2026 and its
  full application on 11 December 2027, the two threaded as one chain), one
  live breach (IDScan, 150 million driver's licences, 10 September 2026) and two
  anchors (Colonial Pipeline, the NIST post-quantum standards). Courts took one
  scheduled trial (Paramount-WBD, 2 March 2027) against five decided cases from
  Nuremberg in 1946 to Bankman-Fried in 2024. A vertical of only breaches would
  have had no future at all, which is the failure mode
  [Nightly jobs](nightly-jobs.md) measures.
* **Learned**: **a court event is placed at the courthouse, and it has no
  company.** Nobody "does" a verdict, so `company` is null on all six court
  pins, the same rule the disaster vertical follows; the address is the building
  the jury sat in (Phillip Burton in San Francisco, the Palace of Justice in
  Nuremberg, Hennepin County Government Center in Minneapolis). A regulatory
  deadline is the opposite: the company is the body that set it, and the place
  is where it sits (the Berlaymont, Microsoft's Redmond campus, NIST at
  Gaithersburg).
* **Learned**: **the app's own scraper reads what `curl` cannot**, again.
  `justice.gov` press releases and `cisa.gov` advisories both answer an Akamai
  interstitial or a 403 to `curl` while `GET /api/scrape` returns their title,
  description and images in full - so a source that looks dead from the shell
  is worth one scrape call before it is abandoned. `variety.com` 307s to a
  `tollbit.variety.com` paywall proxy and `cnn.com` answers 451 to WebFetch; the
  trade press (`screendaily.com`, `thewrap.com`) carried the same court order.
* **Learned**: with no Anthropic credit the scrape still earns its keep as an
  **image and metadata fetcher**: `llm: "session"` comes back with the page's
  `og:image` candidates, which is how the Microsoft, Commission, NIST and
  TechCrunch pins got their pictures without touching Commons. The Wikimedia
  REST summary API (`/api/rest_v1/page/summary/<title>`) supplied the rest, with
  its `originalimage.source` and `coordinates` in one keyless call - but it
  429s quickly, so the calls have to be spaced, and the `?utm_source=` query it
  appends is stripped before the URL is stored.
* **Changed**: `Retail & Commerce` was seeded the same day (pins 2488-2493)
  behind a third new curator, @RetailDesk (375): two Costco warehouse openings
  dated by Costco itself, the IKEA Memphis closure, and three anchors - the
  first Walmart in Rogers (1962), Amazon opening for business (1995) and the
  Toys "R" Us liquidation announcement (2018).
* **Learned**: **a chain's own per-store page is the per-item source a roundup
  needs.** `costco.com/f/-/new-opening-<town>` exists per warehouse, which
  solves the listicle problem for an opening run - but those pages **break the
  headless scraper** with "Execution context was destroyed, most likely because
  of a navigation", so the picture has to come from Commons and the date from
  local reporting. Costco also says nothing publicly about a site until the
  opening is two to three months away, so this vertical cannot be filled more
  than a quarter ahead.
* **Learned**: a delayed store opening is what `originalStartDate` is for -
  Lee's Summit slipped from 28 August to 2 October 2026 and carries both dates.

## 2026-09-21 - Tennis: the first individual matches in the corpus (pins 2480-2487)

* **Learned**: @SportDesk held fourteen pins and **every one was a tournament
  opening** - a World Cup kicking off, an Olympics opening, a Ryder Cup coming
  to Adare Manor. The corpus had no *match*. Asked for major matches, the eight
  Grand Slam singles finals of 2027 are the densest, most durable set: four
  venues, two finals each, all fixed years ahead.
* **Learned**: **each final needs its own source URL or the save is refused.**
  `rejectDuplicateSourceUrl` blocks a second pin on the same page, so one
  tournament site cannot source both of its finals. The tour bodies solve it
  cleanly: the men's final takes the ATP tournament page and the women's the WTA
  one, which is also the more honest attribution. `atptour.com` is 403 to
  `curl` and read in full by the app's scraper; `wtatennis.com` answers `curl`
  but renders empty to the scraper.
* **Learned**: **the organisers publish a window, not a match day.** Tennis
  Australia gives "11 - 31 Jan 2027" and Roland-Garros "17 May - 6 June 2027"
  (both including the qualifying or opening week), while the ATP's 2027 calendar
  gives the main draws, 17-31 January and 23 May-6 June. The finals fall out of
  the convention rather than the page - men's on the closing Sunday, women's on
  the second Saturday - so `dateConfidenceReasoning` has to quote the window and
  name the convention, and cannot pretend the day itself was published.
* **Learned**: the USTA had **not** published 2027 dates - `usopen.org` still
  serves "the 2026 US Open" - so both US Open finals are `estimated` from the
  ATP calendar's 29 August-12 September window, while the other six are
  `scheduled`. Grep the page for the year before trusting a tournament site,
  exactly as the trade-show recipe says.
* **Changed**: [Vertical recipes](verticals.md) gains a Grand Slam finals row and
  a Retail row.


## 2026-09-21 - Motorsport, European finals and combat sports (pins 2494-2522)

* **Changed**: the whole 2027 Formula 1 season went in as 24 race pins, one per
  Grand Prix at its circuit, plus the three UEFA club finals of 2026-27, UFC 335
  and the Fury-Joshua heavyweight fight - 29 pins, all @SportDesk.
* **Learned**: **a calendar publishes weekends, not race days.** Formula 1 gives
  each round as a three-day range ("12 - 14 Mar"); the Grand Prix is the last
  day - *except Las Vegas*, which races on the Saturday, so a script that takes
  "the Sunday" gets one round of 24 wrong. The same trap in the other direction
  cost nothing only because it was caught before posting: adding one to the day
  *string* for the exclusive end date produces "2027-10-32" for the Mexico City
  round, which falls on a month end. Use date arithmetic, not string maths.
* **Learned**: `formula1.com/en/racing/2027` is a client-rendered Next.js page -
  the raw HTML holds **no race links at all**, though WebFetch's conversion
  renders the full list - and the per-race pages for 2027 **do not exist yet**
  (`/en/racing/2027/bahrain` is a 404 while `/en/racing/2026/bahrain` is a 200).
  With no per-item page to cite, each race takes its **circuit's** article as
  `sourceUrl`, which is unique per round, and F1's own calendar announcement as
  the shared reference.
* **Learned**: the Wikipedia REST summary gives a circuit's coordinates **and** a
  track-map image in one keyless call, which is most of a motorsport pin - but
  six circuits carry only a logo (Bahrain, Miami, Monza, the Red Bull Ring), and
  the *Bahrain Grand Prix* article's lead image is a map of **Sepang**. Read
  what comes back before attaching it; the Grand Prix article is not reliably
  about the circuit it races on.
* **Learned**: **UEFA is the cheapest forward calendar in sport.** Hosts and
  dates for the Champions League, Europa League and Conference League finals are
  fixed two to three years ahead - 5 June 2027 in Madrid, 26 May in Frankfurt,
  2 June in Istanbul - long before anyone knows who will play in them. UEFA
  also strips sponsor names for its own finals ("Frankfurt Arena" is Deutsche
  Bank Park), so the address and the announcement disagree by design.
* **Learned**: **combat sports are the opposite.** Nothing is scheduled years
  out; UFC confirms a numbered card's date and arena a few months ahead, and a
  big boxing fight has a *reported* date before it has a contracted one. The
  Fury-Joshua pin is `estimated` on those grounds - "reported for Saturday,
  November 28, with December 4 and 11 also in play" - and says so in its
  reasoning rather than picking a day and looking certain.
* **Changed**: [Vertical recipes](verticals.md) gains a Motorsport seasons row
  and a Club finals and fight nights row.

## 2026-09-21 - Major disease events, a vertical of ten (pins 2523-2532)

* **Learned**: `Health & Medicine` held 38 pins and **every one was a drug
  trial readout or a device milestone** - a keyword sweep for pandemic,
  epidemic, outbreak, cholera, plague, measles and polio matched four pins, of
  which two were *A Plague Tale: Requiem* and Hivemapper. The category looked
  healthy by count while holding no disease event at all.
* **Changed**: ten pins as @HealthDesk, from the Black Death landing at Messina
  in October 1347 to the Bangladesh measles outbreak still running now: Snow's
  pump handle (1854), Camp Funston (1918), the Salk trial result (1955),
  smallpox eradication (1980), the MMWR that first described AIDS (1981), the
  West Africa Ebola emergency (2014), and COVID-19's pandemic declaration and
  its end (2020, 2023).
* **Learned**: **a declaration is an instant; an outbreak is a period.** The WHO
  pins are single days because the committee met and spoke on one. The
  Bangladesh outbreak takes a start and a **null end**, because it has not
  finished - the same shape the cyclone-season pins use, and the honest way to
  pin something ongoing. The Black Death covers its month rather than claiming a
  landing day.
* **Learned**: `stacks.cdc.gov` holds the **MMWR issues themselves**, so the
  5 June 1981 report of five Pneumocystis cases in Los Angeles can be cited as
  the primary document rather than an article about it - while `cdc.gov`'s own
  pandemic pages 403 `curl` and several have been restructured away entirely
  (`/flu/pandemic-resources/1918-pandemic-h1n1.html` is now a 404 that returns
  200 to a fetch). `who.int` fact sheets and news items answer `curl` cleanly
  and are the reference of choice for a disease pin.
* **Learned**: the WHO's own speech URLs rot. The 11 March 2020 media-briefing
  remarks 404, so the pandemic declaration cites the WHO's dated **COVID-19
  timeline** instead - a page the organisation maintains rather than one it
  filed and moved.
* **Changed**: [Vertical recipes](verticals.md) gains a Disease events row.
## 2026-09-21 - Reviews, wait times and a table on a restaurant pin

Ian: "restaurant need reviews from google and yelp and current wait times and
reservation if available". Built as `PinPlace` (schema 0059),
`src/server/places.ts`, `/api/pins/:id/place` and `PinPlace.tsx`.

* **Learned**: **a live score cannot be stored, so it must not reuse
  `PinRating`.** Google's and Yelp's terms both cap how long their ratings and
  review text may be kept, and a restaurant's rating moves anyway - unlike a
  Tomatometer, which is the settled fact `PinRating` exists for. So the database
  keeps only handles (place id, business alias, booking URL) and the numbers are
  fetched on view behind a one-hour cache, shaped exactly like `weather.ts`. The
  decision of *which table* was the whole design; everything else followed.
* **Learned**: **there is no sanctioned source for a wait time.** Google
  documents popular times, live busyness and wait times as a Maps and Search
  display feature, not a Places API field; Yelp's waitlist endpoint needs a
  partnership. Ian chose to scrape it anyway, knowing it breaks Google's terms.
* **Learned**: and it did not answer, in four different ways from a datacenter
  IP. A plain fetch of the place page returns map-tile state with the place's
  name nowhere in it. The `/search?tbm=map&tch=1` endpoint with the page's own
  `pb` parameter returns the name and place id but no busyness arrays.
  `google.com/search` returns nothing without JavaScript. Headless Chromium
  *does* load the real panel - name, 4.5, 55,434 reviews for Katz's - but with
  no Popular times section, and a second load dropped the review count too, which
  reads like the reduced UI Google serves a client it distrusts. The scrape is
  kept wired behind a **circuit breaker**: three failures and it stops launching
  Chromium for half an hour, because otherwise every restaurant pin anyone opens
  pays for a browser to learn nothing.
* **Learned**: **the `/search?tbm=map` endpoint hands out place ids without a
  key.** Katz's `ChIJCar0f49ZwokR6ozLV-dHNTE` came back from an unauthenticated
  `curl`. It does not help on its own - reading the *rating* still needs the
  billed key - but it is the cheap half of resolving a place.
* **Learned**: **a 200 from a reservation site means nothing.** Resy answers 200
  for a venue path and serves an SPA shell whose `og:title` is the generic
  "Right This Way", so the page cannot confirm the venue is the right one.
  OpenTable refuses `curl` outright (connection failure, not a status). The
  French Laundry's booking link is trustworthy only because it was taken from a
  link on `thomaskeller.com/tfl` - the same "found, never constructed" rule the
  merchant links follow.
* **Learned**: Yelp returns `time_created`, a timestamp, where Google returns
  "2 months ago". Printed side by side the raw date reads as a bug, so
  `reviewWhen` formats anything parseable and passes wording through.
* **Learned**: a new side table needs its own **seed file or a `db:refresh`
  loses it**. A place id costs a billed search to find again and a booking link
  is someone's own work, so neither is derivable the way awards and tags are:
  `seedPlaces.json` follows the `seedFlightPaths.json` pattern, and `place` is
  stripped from the pin JSON so it does not ride along in `seedPins.json` too.
* **Then Ian said "use web scraper", and that turned out to be the better
  design.** The app's own browser reads the Google Maps place panel with no key
  and no per-view cost: name, rating, opening state, and the rating count when
  Google feels like serving it. Three findings, in the order they cost time:
  **(1) wait for the rating element, never sleep.** `networkidle2` + a fixed
  delay gave a reduced panel - nav chips only - about half the time, and that
  flakiness is exactly what made an earlier probe conclude the page was
  unreadable. `waitForSelector('[aria-label*="stars"]')` read 4 of 4 across two
  places. The earlier "Chromium can't see it" conclusion was wrong about the
  *rating*; it remains right about busyness.
  **(2) the first dry run reported "707 ratings" for The French Laundry** -
  the area code of `(707) 944-2380`, because the count was matched as "the
  first bracketed number on the page". It is now matched as a pair with the
  rating. This is the second time in this vertical that reading the dry run
  caught a plausible-looking wrong number; a rating nobody checks is worse than
  no rating.
  **(3) the count is intermittent.** The same place minutes apart gave
  "4.6 (2,275)" and then a panel with no count, so `setScraped` COALESCEs it -
  a null read never discards a good number. The rating itself was stable every
  time, because it comes from the aria-label rather than the panel's layout.
* **Learned**: **a scraped reading must be stored, which reverses the decision
  above.** The API ratings are not stored because the terms cap it; the scraped
  one has to be, because a Chromium launch takes ~5s and cannot sit in a page
  request - a value never kept could never be shown. 0060 stores it with a
  `checkedAt` (the `marketVolumeAt` shape), `npm run places:refresh` fills it,
  and the API path still wins when a key exists. The *rating* shows at any age;
  the *opening state* is dropped past an hour rather than calling a shut
  restaurant open.
* **Corrected on Ian's call ("scraped value need to be stored")**: the scraped
  numbers now ride in `seedPlaces.json` too, not just the live table. The
  argument for leaving them out - a month-old rating is worse than none - was
  the wrong trade when the alternative is a `db:refresh` that shows no ratings
  at all until a browser has visited every place. `checkedAt` travels with them
  and is **restored as it was, not as now()**, so staleness stays visible and
  the hour-old rule still drops an old opening state while keeping the rating.
  Proved by wiping the table and restoring from the seed: rating and original
  read time both survived.
* **Learned, the second caching trap of the day**: computing the stored score
  outside the cache but *using it inside the cached closure* meant the hour-old
  payload kept winning and a fresh `places:refresh` stayed invisible. Only the
  network calls are cached now; the stored scrape and the busyness are merged in
  afterwards. Both are local readings on their own clocks and neither belongs in
  a shared payload cache.
* **Learned**: **Yelp has no scrape fallback.** `yelp.com/biz/...` answers 403
  to our own headless browser as well as to curl - the MICHELIN trick does not
  transfer - so a Yelp score needs the free Fusion key and nothing else will do.
* **Changed**: [Vertical recipes](verticals.md) - the Restaurants section gains
  points 10-16; point 6 no longer claims MICHELIN is the only reachable review.
  [Sources](sources.md) gains a Google Maps rating row.
* **Learned, by measuring**: the busyness read **must not be awaited**. A cold
  request for a pin with a `googlePlaceId` took **4.4 seconds** - a Chromium
  launch and a page load, all of it to learn Google serves no busyness here -
  while the ratings and the booking link answer in milliseconds. It now reads
  from its own cache without waiting (`busynessNow`) and is merged into the
  response after the cached part, which took the same request to **45 ms**. A
  first view therefore shows no busy bar even where the scrape works; the next
  view inside the 10-minute TTL picks it up. A unit test pins the synchronous
  contract so the 4.4s cannot come back.
* **Learned**: the keyless place-id route paid off twice. Resolving The French
  Laundry through `/search?tbm=map` returned `ChIJAAAAAERVhIARYeTLvbbzAxs`
  **and**, in the same payload, Google's own `exploretock.com/tfl/` reservation
  link - independently corroborating the booking URL already taken from
  `thomaskeller.com/tfl`. Its Yelp alias is `the-french-laundry-yountville-7`:
  note the trailing `-7`, Yelp's own disambiguator, which is exactly why an
  alias must be found and never constructed.
* **Not a bug, worth knowing**: pin 2463's address label reads *2184 Creek
  Street* while the restaurant publishes *6640 Washington St*. Nominatim really
  does return Creek Street for the pin's coordinate - the restaurant sits on the
  Washington/Creek corner - so the label obeys [[never-type-place-labels]] and
  the coordinate is right. A reverse-geocoded label and a published address are
  not the same thing, and the resolve script's dry run prints both side by side
  for exactly this reason.
* **Trimmed the same day, on Ian's call**: "no need for review ... just get star
  rating from google and yelp and link to their url". The panel now carries each
  source's **star rating, its rating count and a link to that source's page**,
  and reproduces no review text. Three things fall out of that: Google's
  Enterprise `reviews` field leaves the mask (a whole billing band off the
  bill), Yelp drops from two requests per business to one, and the attribution
  line reads "Ratings from Google, Yelp" rather than claiming reviews it no
  longer shows. The excerpt rendering and `reviewWhen` were deleted rather than
  left dark - the API shapes are easy to restore from this entry if wanted.

## 2026-09-21 - ALSO's Series D, and a company logo lookup that took three away

One pin (2533) from `ridealso.com`, the Rivian micromobility spinout, as
@TechDesk: the $150 million Series D of 19 August 2026, placed at the company's
Palo Alto headquarters.

* **Learned**: **a company homepage is not a pin, but its Stories rail is an
  index of them.** `ridealso.com/` has no date on it anywhere. What it does have
  is a rail of eleven posts - a funding round, three design awards, a DoorDash
  partnership, a bike valet - each of which *is* a dated event. The homepage's
  job in a scrape is to hand over `/blogs/all`; the pin's `sourceUrl` is the post.
* **Learned**: **a Shopify storefront hides its blog body from `curl`.** All
  eight posts fetched as ~340KB of theme shell with no article text and no date
  metadata of any kind - no `datePublished`, no `article:published_time`, no
  JSON-LD. The app's headless scraper read the same URL and returned the whole
  post *and* the date, which the theme prints as a bare `08-19-2026` line in the
  rendered body. A missing `article:published_time` is not evidence a post is
  undated. See [Sources](sources.md).
* **Learned**: **a funding round is not the pin's `price`.** Consistent with the
  existing IPO pins (1987, 1988), which carry `price: null`. The round size is
  what the event *is*, not what it cost, so it belongs in the title, the
  description and the summary. The cost rule's "never revenue or budgets" covers
  this case too.
* **Learned**: **`companies:logos -- --all` can subtract logos.** ALSO has no
  Wikipedia article, so its logo needed `Company.websiteUrl` set by hand first -
  but the script only offers `--all`, and the background lookup on save had
  already marked the company checked, so there was no way to re-check one row.
  The `--all` run re-checked all 915 companies, hit a Wikipedia 429 storm
  partway, and **nulled three logos that had been working** (Royal Commission
  for Riyadh City, Jawaharlal Nehru Port Authority, Gaggan) while finding 465.
  The hand-nulled traps the notes warn about (Fitbit, Nest, Honolulu HART) stayed
  null, so the documented risk was not the one that bit.
* **How to check it**: diff the database against the committed
  `scripts/backup/seedCompanies.json` *before* `backup:data` overwrites it - the
  seed file is the last known-good state, and the three losses were three lines
  of `UPDATE` to put back. Worth a `--company <name>` flag on the script.
* **Learned (Ian)**: **the owner wanted the homepage as `sourceUrl`, not the
  announcement post.** The strategy doc's instinct is the publisher's page for
  the event, and the homepage is undated - but the owner asked for the company
  front page twice, so the pin was repinned onto `https://ridealso.com/` and the
  announcement post moved into the references at confidence 95. Nothing is lost:
  the date reasoning now says outright that the source carries no date and names
  the reference the date comes from. Worth remembering that a brand's front page
  is a legitimate source when the owner wants the pin to point at the company.
* **Learned**: **a `PUT` cannot reorder media.** `Pin#update` diffs the body
  against the pin by `originalUrl`: media already on the pin keep their existing
  `PinMedium` rows untouched, and new ones are appended by `saveAllToPin`. Since
  the pin JSON orders media by the link row id, a new picture always lands
  **last**, whatever position the body puts it in - so the flagship bike shot
  sent as media 0 came back as media 3, and the heading did not change.
* **How to reorder**: two `PUT`s - one with `media: []` to drop every link, then
  one with the full list in the order you want, which recreates the links in
  ordinal order. Safe because `withoutRepeatedPictures` compares only against the
  pin's own kept media, so a cleared pin re-accepts its own pictures; the cost is
  that every thumb is re-fetched and re-uploaded under a new blob name.
* **Learned**: **the heading image is the one the owner judges the pin by.** The
  pin had a TM-B studio shot from the first save, but it sat second behind the
  post's announcement card, and the feedback was still "should at least contain 1
  image on the flagship bike". Presence is not enough - on a product or company
  pin, lead with the product.
* **Learned (Ian)**: **the pin was repurposed twice, and the second time changed
  the event.** First the source moved from the announcement post to the homepage;
  then Ian asked for `ridealso.com/products/tm-b` and "should be about the release
  of the bike". So pin 2533 stopped being the Series D and became the TM-B Launch
  Edition's first deliveries. Read the instruction as naming the *event*, not just
  the URL - a product page asks for a product pin, and the funding round is simply
  no longer pinned.
* **Learned**: **a product page dates nothing.** `/products/tm-b` is spec and
  marketing copy - "CLASS 3 E-BIKE STARTING @ $3500", range, assist levels,
  Top Frame swap times - with no date anywhere. It is the right source for the
  price and the specifications and the wrong one for when anything happened; the
  date came from the trade press and the company's own blog.
* **Learned**: **"next week" is a datable claim if something else closes the
  bracket.** TechCrunch, publishing Friday 31 July 2026, said deliveries began
  "next week", and ALSO's own post of 19 August confirmed the bike "has started
  shipping to customers across the U.S." That brackets the start, so the pin is
  dated Monday 3 August, `estimated`, with the reasoning naming both ends.
* **Learned**: **release, not unveiling.** The TM-B was revealed in Oakland on
  22 October 2025, which is the precise, well-covered date and the tempting one.
  It is not the release: the bike reached riders nine months later. The delay is
  the story and the schema already carries it - `originalStartDate` at 20 June
  2026 (the last day of the "this spring" it was promised for) and a
  `delayReasoning` quoting ALSO's supply-chain explanation, which renders as a
  "2 MONTHS LATE" badge.
* **Learned**: **a pin body's `stocks` are add-only, so repurposing a pin leaves
  the old tickers behind.** Rewriting the Series D pin as a bike release sent only
  `RIVN`, and DoorDash and Amazon stayed - correct for a funding round, irrelevant
  to a consumer bike shipping. `PUT /api/pins/:id/stocks {"remove": "DASH"}` is the
  supported way off (author or admin), and it re-syncs, so the remaining ticker's
  snapshot reads null for a few seconds before it prices again. The same is true
  right after a save: read the stocks back twice before believing a null close.
* **Changed**: [Sources](sources.md) gains rows for Shopify storefront blogs and
  businesswire.com (403 to WebFetch; the Yahoo Finance mirror carries the release
  in full). [Vertical recipes](verticals.md) gains a Startup funding rounds row.

## 2026-09-21 - Resolving the other nine restaurants, and four wrong matches

Ian: "do for the rest of the pins". Ten restaurant pins, nine now carrying a
Google rating. `places:resolve` learned to work without a key on the way.

* **Learned**: **`Food & Beverage` is not "restaurants".** Seven of the
  eighteen pins in that category are *factories* - a hop processing plant,
  Cadbury's Claremont works, Kellogg's Trafford Park, Heinz Kitt Green, Carr's
  biscuit works, Manor Bakeries. A star rating and a "Book a table" on a cereal
  factory would be nonsense, so the vertical is the restaurant pins, not the
  category. Filter by what the pin is, not by its tag.
* **Learned**: **the company is the wrong name to search; the title is the
  right one.** `searchName` preferred the company, which on a restaurant pin is
  often the operator or group - "Daniel Humm Hospitality" for Eleven Madison
  Park, "Chubby Group" for Mikiya Wagyu Shabu House - and finds a holding
  company or nothing. The title *starts* with the restaurant's own name, so it
  is cut at the first event verb and the company is only the fallback. That one
  change fixed the name for every pin in the batch.
* **Learned**: **`/search?tbm=map` resolves a place id with no key at all**, and
  it works internationally - Bangkok, Copenhagen, Lima, San Sebastian all
  matched first time. `findGooglePlaceIdKeyless` reads the `pb` parameter out of
  the Maps search shell and calls the endpoint behind it. A text query needs the
  town appended, because "Maido" alone is a common word.
* **Learned, the expensive one**: **an address-only query returns the address,
  not the business.** Chubby Cattle's first match was another branch in Irvine,
  so it was re-searched as "Chubby Cattle 8330 Mira Mesa Blvd" - which returned
  a place id whose address matched the pin *exactly* and which therefore looked
  perfect. It was a **street geocode**: Google's own name for it is
  "8330 Mira Mesa Blvd" and it has no rating, which is the only reason it was
  caught. **An address check alone cannot tell a business from a geocode; the
  name check can.** The two dry runs are complementary and both must be read.
* **Learned**: chains are the whole difficulty. Menya Ultra first matched its
  Clairemont Mesa shop rather than the pin's Mira Mesa one, and the fix was
  confirmed not by the address but by Google's own name for it - **"Menya Ultra
  Mira Mesa"**. Chubby Cattle has ~60 sites and three queries returned three
  different cities; the Mira Mesa takeover has no listing yet, so that pin was
  left unresolved rather than given a wrong one.
* **Ruled**: **a permanently closed restaurant gets no place.** elBulli served
  its last dinner in 2011; both queries pointed at "Carrer la Roca, 4, Roses"
  rather than the pin's Cala Montjoi site. A panel headed "This place right now"
  carrying a live rating and an opening state would be wrong on that pin
  whichever id was chosen, so it has none.
* **Flagged, not decided**: Gaggan *relocated*. The pin is the 2010 Sarasin
  Road townhouse; Google's listing is Gaggan Anand on Sukhumvit 31. It is the
  same chef and the same restaurant in every sense a reader cares about, so the
  match was kept - but the pin's map point and the rating's place are different
  addresses, and that is Ian's call to reverse.
* **Fixed, and it refines the address rule**: pin 2466 read *Astigarraga,
  Gipuzkoa 20115* and now reads *Aldura gunea 20, Errenteria, Gipuzkoa 20100*.
  The **coordinate was never wrong** - it is within about 40 m of OSM's own
  Mugaritz node - so this was a label problem alone. The catch is that
  reverse-geocoding the bare point *still* answers "Astigarraga", because the
  administrative boundary there is ambiguous and the nearest addressable
  feature is on the other side of it. So "reverse-geocode the point, never type
  the street" needs one refinement: **take the label from the geocoder's record
  for the venue itself** (search the restaurant, then `addressdetails=1` on that
  node), which is what both Nominatim and Google agree on. Applied by PUT
  through the real API, so the search index followed it: `place:Errenteria`
  finds the pin and `place:Astigarraga` now returns nothing.
* **Changed**: `places:resolve` no longer refuses to run without a key, and
  `searchName` prefers the title. [Sources](sources.md) gains the keyless
  place-id route.

## 2026-09-21 - Backfilling the attractions, and three bad numbers

Ian: "anything else to backfill?". Answer: **Travel & Tourism**, ten of its
fifteen located pins. Nineteen places now carry a Google rating.

* **Ruled out, and this is the reusable part**: a located pin is not a
  visitable place. **Sports** (95 located pins) is about *events* at stadiums -
  a stadium's 4.5 on a Super Bowl pin is noise, and several are stadiums that do
  not exist yet. **Gaming & Entertainment** (88) sits at studio HQs. Within
  Travel & Tourism itself, five of fifteen were excluded: Icon of the Seas and
  Crystal Serenity are **ships** (the latter's address is the *shipyard*),
  HMS Erebus is an Arctic wreck, Seoul's Twin Eye "Targets a 2028 Opening", and
  Olympia Looping is a *transportable* roller coaster.
* **Learned**: the street-geocode trap repeats. Walt Disney World resolved to an
  id Google names **"1180 Seven Seas Drive"** - the pin's own address, which is
  exactly why it looked right. Re-searched as "Magic Kingdom Park", which is
  what the 1971 opening actually was and where the pin sits. **The name check
  catches this; the address check cannot.**
* **Learned**: the payload's address field carries anything. It gave review
  prose for Chimelong ("I loved it so much. Really so much fun...") and a
  **date** for Magic Kingdom ("Aug 20, 2026"), because a comma and a digit is
  all a loose pattern needs. `readPlaceId` now rejects sentences, apostrophes
  and dates, with a test per case.
* **Learned, the worst of the three**: **the rating count is not just
  intermittent, it is sometimes wrong.** Star Wars: Galaxy's Edge read 685,
  685, 42 across three loads - some renders carry a second "4.8 (42)" block, and
  taking the first pair in the text picks it. Two fixes: `readPlace` takes the
  **largest** pair matching the headline rating, and `setScraped` stores the
  **greatest count ever seen** rather than the latest. Before that, a straight
  overwrite knocked Ferrari World from 61,367 to 538 and Magic Kingdom would
  have gone from 253,020 to 4,679. A review count only rises in practice, so
  monotonic storage neutralises the flaky renders entirely; the cost is not
  following a genuine decrease, which is the right trade for a number printed
  beside a rating.
* **Learned, about my own verification**: the monotonic CASE threw
  `could not determine data type of parameter $3` on **every** pin - a CASE
  needs the cast on each branch, not just one - and the run still printed every
  rating it had read, so it looked like a success and stored nothing. **It was
  hidden because the output was being grepped for the lines that were working.**
  `places:refresh` now catches a store failure per pin and prints
  `NOT STORED`, and a filtered log is not a verified one.
* **Changed**: ratings on 19 pins across two verticals; `places:refresh` reports
  store failures; `readPlace`/`readPlaceId` hardened with 12 tests.

## 2026-09-21 - The rest of Food & Beverage, and giving up on the rating count

Ian: "go ahead and work through the Food & Beverage pins by hand". The ten
restaurants were already done, so this was the nine left - and it ended by
removing a number from every pin in the feature.

* **Learned**: **"is it a factory?" is the wrong question; "can the public walk
  in?" is the right one.** Seven `Food & Beverage` pins were dismissed as
  factories in the earlier pass, and that was too coarse. **Emsflower** is a
  genuine visitor attraction - "Emsflower GmbH", 4.5 from about 2,450 public
  reviews, opening at 10 AM - and now carries a rating. What separates it from
  the rest is **consumer opening hours plus a real public review count**:
  "H J Heinz Co Ltd" is 4.1 and **"Open 24 hours"**, and the hop processor opens
  at 7 AM with no public count. Those are workplace listings rated by staff and
  hauliers, and a rating from one tells a reader nothing.
* **Learned**: Cadbury Claremont has no visitor listing to find. Its tours ended,
  and the searches returned a street geocode ("Cadbury Rd"), a different shop
  ("Crisp N' Sweet") and **a cricket ground ("Cadbury Oval")**. No place.
* **Learned**: Chubby Cattle's Mira Mesa site has no listing, over five attempts
  that returned Irvine, Rosemead, a street geocode, and finally **"Mokkoji
  Shabu Shabu" - a different restaurant on the same boulevard**, 4.8 with a
  plausible count. Storing it would have put a rival's rating on the pin. Five
  wrong answers is itself the answer.
* **Gave up on the rating count, and that is the real outcome.** Four rules were
  tried and each produced a wrong number that looked right:
  "first bracketed number" read a phone area code (707 for The French Laundry);
  "pair with the rating" gave Galaxy's Edge 685, 685, 42 across three loads;
  "largest matching pair" knocked Ferrari World from 61,367 to 538 and let two
  4.8 shabu restaurants on one street each report the *other's* 423, because the
  related-places section cross-references them; "only when unambiguous" still
  gave ICEHOTEL 259 one run and 5,204 the next, because different renders expose
  different single candidates and there is then nothing to disambiguate against.
  A web search could not settle Ferrari World's true count either.
  **The rating agreed in every check ever made; the count never settled once.**
  So the scrape reports none, the stored counts were cleared, and a count now
  appears only for someone who sets `GOOGLE_PLACES_API_KEY`, where Google states
  `userRatingCount` outright. A wrong count beside a right rating discredits
  both, and the chip reads perfectly well without one.
* **Learned about the fix that caused it**: the monotonic "a count only rises"
  rule was itself a mistake. It was invented to defend against flaky renders,
  and its actual effect was to make the *first* wrong number permanent. A
  stabiliser on top of an unreliable source only preserves the error.
* **Changed**: 20 places across three verticals; `readPlace` no longer reads a
  count; the monotonic rule is moot for the scrape path and kept for the API one.

## 2026-09-21 - Museum builds and upgrades, a new vertical (pins 2544-2548)

Ian: "Scrape museum contructions or upgrades around the world". Five pins under
@BuildDesk, spanning April 2026 to June 2027 across four countries, with the
Anthropic key out of credit so every field was extracted by hand.

* **Learned**: **this vertical needs no browser.** Museum sites are not defended
  the way IMDb, Yelp and the MICHELIN Guide are - londonmuseum.org.uk,
  lucasmuseum.org, lacma.org and smb.museum all read cleanly with `curl`, and
  four of the five dates came straight from the institution's own page. A museum
  announcing its own opening is the strongest date source there is, so it needs
  no inference and all five pins are `confirmed`.
* **Learned**: **the roundup finds the candidates and then gets discarded.** An
  artnet "most anticipated openings" piece produced the shortlist in one search;
  each pin then got its own deep link, which is the rule from the sneaker
  listicles. Two of the five ended up citing an official press release by URL.
* **Learned**: **geocoding a museum by name can hand you the wrong building.**
  "London Museum" resolves to the **old** London Wall site (EC2Y 5HN) - the
  institution the pin is about *leaving*. The new museum is the Smithfield
  General Market, and only "Smithfield General Market, London" returns it.
  "Pergamonmuseum, Museumsinsel, Berlin" returns nothing at all while
  "Pergamonmuseum Berlin" returns the museum; Nominatim is sensitive to the
  district in a way that looks arbitrary.
* **Learned**: the place panel and this vertical fit together, and one pin
  proved the plumbing. The **Lucas Museum's Google listing reads "Opens Tue Sep
  22"** - Google independently corroborating the date the museum announced. The
  **Pergamonmuseum's reads "Temporarily closed"**, which is precisely what a pin
  about its 2027 reopening wants to say. Guggenheim Abu Dhabi gets no place:
  Nominatim types the site `construction`, which is the honest answer.
* **Learned**: the place lookup offers the annex. "Pergamonmuseum's North Wing"
  first matched **"Pergamon Museum. The Panorama"** - the temporary panorama
  building that exists *because* the museum is shut. 4.7, plausible, wrong
  venue. The name check caught it; the address check could not have, because
  the Panorama is across the road.
* **Learned, the picture trap in a new form**: a Commons file can be the right
  subject at the wrong *time*. The obvious LACMA photographs are from 2014 and
  show the buildings the Geffen Galleries **replaced**; the correct file is
  dated February 2026 and describes Zumthor's galleries outright. And
  `Pergamonmuseum Berlin Portikus.jpg` reads like a photograph of the entrance
  but is **Alfred Messel's 1909 drawing** - public domain because of its age,
  which is the giveaway. Read `extmetadata.DateTimeOriginal` and
  `ImageDescription` before trusting a file name.
* **Ruled**: **Guggenheim Abu Dhabi is saved with no picture.** Commons holds
  only 2011 architectural maquettes and a shot of the visitor centre. A
  photograph of a model, shown as the pin's picture with no caption saying so,
  would misinform - and a pin without a picture is better than a pin with the
  wrong one.
* **Changed**: [Vertical recipes](verticals.md) gains a Museum builds and
  upgrades row and section.

## 2026-09-21 - Tags prefer single words, and a vertical needs one shared tag

Ian: "tags should prefer single words so the museum scrape should have a tag for
museum on all its pins", then "so is restaurant".

* **Learned**: **a tag is a browse handle, not a caption.** "Museum Openings" was
  on all five museum pins and grouped them, but "Concrete Architecture",
  "Pergamon Altar", "Saadiyat Island" and "Adaptive Reuse" were each unique to
  one pin and therefore grouped nothing. They are now `Concrete`, `Pergamon`,
  `Saadiyat` and `Restoration`. Multi-word survives only where the name is one:
  people (`Peter Zumthor`), cities (`Abu Dhabi`), awards (`World's 50 Best`).
* **Learned**: **every vertical needs one single-word tag naming the thing**, on
  every pin without exception - `Museum`, `Restaurant`. The check is that
  `tag:Museum` returns all of them: 7 of 7, and `tag:Restaurant` 11 of 11.
* **Found while doing it**: the museum vertical was not new after all. Pins
  **2274 (Powerhouse Parramatta)** and **2282 (Ontario Science Centre)** were
  already museum openings, tagged lowercase plural `museums`, and so invisible
  to anything looking for the others. Both were folded into `Museum`. **Before
  opening a vertical, search the corpus for its subject** - a near-miss tag hides
  existing work as effectively as no tag at all.
* **Trap**: retag from the pin's **`kind='topic'`** rows, not from `pin.tags`.
  The view's `tags` also carries `award` and `nomination` kinds, and PUTting
  those back would re-file an award as a topic tag.
* **Changed**: 18 pins retagged; the corpus's shape was 841 multi-word distinct
  tags against 397 single-word ones, so this is a correction to the convention
  rather than a description of it.

## 2026-09-21 - Highly rated restaurants, city by city (pins 2549-2553)

Ian: "scrape highly rated restaurant in every major city in the world". That is a
rolling job, not a batch - this first tranche added five cities. Sixteen
restaurant pins now, fourteen of them carrying a live Google rating, which is
what actually answers "highly rated".

* **Learned**: **the ranked lists themselves are the hard part, not the
  restaurants.** `theworlds50best.com` redirects to `the50.com`, renders its list
  in JavaScript behind a consent gate, and gives **2,461 characters of body text
  and three navigation links** even through our own browser with six scrolls -
  the list never renders. Wikipedia's *The World's 50 Best Restaurants* article
  carries only the top three per year, not the fifty with their cities. So the
  candidate list came from a search result summary, and each restaurant was then
  confirmed against **its own Wikipedia article**, which is a per-item source.
* **Learned**: **one Wikipedia API call checks fifteen candidates.** Batching
  `prop=extracts&exintro` over fifteen titles and grepping each intro for an
  opening sentence costs one request and no search quota - far better than a
  search per restaurant, and it is how the yield became visible immediately.
* **The yield was 6 of 15, and the six dropped for want of a date are worth
  recording so nobody repeats the work**: **D.O.M.** (São Paulo) - its 2006 is
  the year it was *listed*, not opened; **Lung King Heen** (Hong Kong) - a chef
  came out of retirement "in 2002 for the Hotel", which is not an opening date;
  **Attica** (Melbourne) - 2010 is its first list appearance. And six have no
  English article at all: **White Rabbit** (Moscow), **Steirereck** (Vienna),
  **DiverXO** (Madrid), **Narisawa** (Tokyo), **Quay** (Sydney), **Trèsind
  Studio** (Dubai). Those cities need a press source, not Wikipedia.
* **Dropped for a better reason**: **Ultraviolet** (Shanghai) has a stated
  opening - May 2012 - and was still dropped, because its address is
  *deliberately secret*: diners are collected and driven to an undisclosed
  room. There is no honest point to place it at, and [never type place
  labels](learnings.md) means inventing one is not an option.
* **Learned**: **Nominatim can hold a restaurant's old address while Google
  holds its new one.** Nominatim returned "Pujol, 254 Calle Francisco Petrarca";
  Google returned Tennyson 133, which is where Pujol actually moved. The pin was
  corrected to Tennyson. This is the reverse of the Mugaritz case, where
  Nominatim's venue record was right and the reverse-geocode was wrong - so
  **when the two geocoders disagree about a venue, one of them is stale, and the
  place-resolve dry run is what surfaces it.**
* **Convention held**: year-only dates land on 31 December and month-only on the
  month's last day, both `estimated`, so this tranche puts four more pins on a
  31 December. One pin is not an opening at all: **Arpège** is dated to Passard
  *buying* L'Archestrate and renaming it, which is the dated moment that
  restaurant has.
* **Still uncovered** among major cities: Tokyo, Hong Kong, Shanghai, Dubai,
  Sydney, Melbourne, Madrid, Barcelona, Rome, Berlin, Vienna, Istanbul, São
  Paulo, Toronto, Los Angeles, San Francisco, Mumbai, Moscow.

## 2026-09-21 - Nine more cities, and a bug in my own resolver (pins 2554-2562)

Second tranche of "highly rated restaurant in every major city". Madrid,
Barcelona, Vienna, San Francisco, Berkeley, Los Angeles, Melbourne, Mumbai and
Tokyo. **25 restaurant pins now, 23 of them carrying a live Google rating.**

* **Learned**: **`prop=extracts` caps full text at one page per request, and
  fails silently.** Batching nine titles with `explaintext` and no `exintro`
  returned *0 characters* for eight of them - not an error, just empty - which
  reads exactly like "no article". `prop=revisions&rvprop=content` has no such
  cap, and switching to wikitext lifted the yield from 4 of 24 to 10 of 24.
  **An empty extract is not evidence of an empty article.**
* **Learned**: wikitext beats prose for dates anyway, because the infobox states
  them outright - `| established = {{Start date and age|df=yes|1975|05|26}}`
  gave Flower Drum an exact day the article's prose only implied.
* **Learned**: **historic institutions are the reliable seam for this vertical.**
  A modern fine-dining room often has no article or no dated opening, while
  Botín (1725, Guinness-recognised as the oldest in the world), Demel (1786),
  Els Quatre Gats (12 June 1897), Swan Oyster Depot (1903) and Leopold Cafe
  (1871) all state their founding plainly. The cities that resisted the first
  tranche fell to this approach.
* **Found a bug in `places:resolve` that I had written**: **a title opening with
  a person defeats `searchName`.** "Wolfgang Puck Opens the First Spago" cut at
  the verb to "Wolfgang Puck" and resolved to **CUT Beverly Hills**, another of
  his restaurants; "Alice Waters Opens Chez Panisse" searched for the chef. The
  fix is to ask whether the **company name appears in the title**: if it does,
  the company is the venue and the title merely opens with the chef; if it does
  not, the company is an operator and the title holds the venue.
* **And the first fix was wrong**, which a test caught before it shipped: asking
  whether the two names *agree* looks equivalent and sends the Mikiya Wagyu
  Shabu House case back to "Chubby Group", the holding company - the very bug
  fixed in the previous tranche. `scripts/places/resolve.test.ts` now pins both
  directions, because the two cases pull against each other.
* **Convention**: five more pins land on 31 December (year-only), two on a
  stated day. Two pins sit at an address the restaurant moved to rather than the
  one it opened at - Spago (Sunset Strip to Beverly Hills) and RyuGin (Roppongi
  to Hibiya, which Google's own address confirmed) - and each says so in its
  date reasoning.
* **Still uncovered**: Hong Kong, Shanghai, Dubai, Sydney, Rome, Berlin,
  Istanbul, São Paulo, Toronto, Moscow. Those need press sources, not Wikipedia.

## 2026-09-21 - Eight more cities, mostly from the 18th and 19th centuries (2563-2570)

Third tranche. Hong Kong, Buenos Aires, Rome, Shanghai, Toronto, Rio de Janeiro,
Sydney and São Paulo. **33 restaurant pins across 31 cities now, 31 of them
rated, averaging 4.38.**

* **Confirmed as the method for this vertical**: the cities that beat two
  previous passes fell to **historic institutions** in one API call. Tai Ping
  Koon (1860), Café Tortoni (1858), Antico Caffè Greco (1760), Nanxiang (1900),
  Barberian's (1959), Confeitaria Colombo (1894), Doyles (1885), Bar Brahma
  (1948) - ten of twenty-four candidates dated, against four of twenty-four when
  the same cities were tried with modern fine-dining names. A restaurant that
  has been open for a century has a documented founding; a tasting-menu room
  that opened last year often has no article at all.
* **Learned**: **the place panel corroborated a claim from the article.** Antico
  Caffè Greco's page describes a court fight with its landlord over the premises;
  its Google listing reads **"Temporarily closed"**. Two independent sources
  agreeing is worth more than either.
* **Dropped, and for the clearest reason yet**: **Jumbo Kingdom**. It has the
  best date in the batch - established 19 October 1976, an exact day from its
  infobox - and it is unpinnable, because the restaurant was a *ship*: it closed
  in 2020 and capsized in the South China Sea in 2022. Geocoding "Aberdeen
  Harbour" returns a residential block, and placing a sunken floating restaurant
  at a mansion would be a fiction. That makes three distinct reasons a
  restaurant cannot take a place - gone for good (elBulli), address deliberately
  secret (Ultraviolet), and **no longer physically anywhere** (Jumbo).
* **Noted**: Nanxiang's pin is placed at a Shanghai branch rather than the
  original premises, which its date reasoning says outright - the 1900 house was
  in the old city and Nominatim only offered the Jing'an address. Google returned
  the venue under its Chinese name, 南翔馒头店, which is the right business.
* **Still uncovered**: Dubai, Berlin, Istanbul, Moscow. All four failed on both
  the modern and the historic seam - no English article, or none with a date -
  so they need local press and are a slower job per pin.

## 2026-09-21 - Thirteen more cities in one pass (pins 2571-2583)

Ian: "do all without stopping". Prague, Budapest, New Orleans, Montreal,
Seattle, Taipei, Miami, Stockholm, Berlin, Oslo, Boston, Philadelphia, Moscow.
**46 restaurant pins across 44 cities, 43 rated, averaging 4.37.**

* **Confirmed at scale**: one wikitext batch of 40 titles returned **25 with a
  usable date**, four of them exact days - Antoine's (3 April 1840), Union
  Oyster House (7 October 1826), Schwartz's (31 December 1928), St-Viateur Bagel
  (21 May 1957). The historic seam does not just work, it works in bulk, and the
  dates are often better than the modern seam's because an institution's
  centenary is documented.
* **Learned**: **Nominatim throttles a long run, and the failure looks like "no
  such place".** Fourteen geocodes fired at 1.2-second intervals returned seven
  empty results; the same queries, shortened and spaced at two seconds, returned
  six of the seven. **An empty geocode after a burst means try again slower, not
  that the place does not exist** - the same shape of mistake as the empty
  Wikipedia extract earlier today.
* **The wrong-venue catch of the batch**: Café Kranzler resolved to **"THE BARN
  Ku'damm"**, 4.7 - a coffee roaster that now occupies the Kranzler rotunda. The
  pin keeps its place *empty*, because a rating belonging to the current tenant
  shown under a Café Kranzler headline would misattribute it to a business that
  no longer trades there. **A building outliving its restaurant is a fourth
  reason to withhold a place**, alongside gone for good, secret address and no
  longer physically anywhere.
* **Also caught**: "Aragvi Moscow" resolves to a modern restaurant of that name
  on Leninskiy Avenue, not the 1938 Tverskaya institution. The pin uses the
  Tverskaya 6/2 address the article itself gives.
* **Corroboration again**: Joe's Stone Crab reads **"Temporarily closed"**,
  which is exactly right - it shuts for the summer when the stone crab season
  does, as its own article describes.
* **Still uncovered**: Dubai and Istanbul, which have now failed three passes on
  both seams, and Delhi, whose Karim's would not geocode under any phrasing.

## 2026-09-21 - Twelve more cities, and the vertical passes fifty (2584-2595)

Naples, Dublin, Havana, Denver, Venice, Lisbon, Washington, Zurich, Atlanta,
Beijing, Helsinki, Jakarta. **58 restaurant pins across 56 cities, 55 rated,
averaging 4.35** - and the vertical now reaches back to 1499.

* **The seam held for a fourth batch**: 26 of 40 candidates dated, including two
  more exact days (Buckhorn Exchange 17 November 1893, Savoy Helsinki 3 June
  1937). Across four batches the historic approach has produced roughly two
  usable dates in three, against one in three for modern fine dining.
* **Learned**: **the spacing fix worked.** Geocoding at 2.2-second intervals
  returned 11 of 12 first time, against 7 of 14 at 1.2 seconds in the previous
  batch. The one miss, Jakarta, resolved on a shorter query a minute later.
  Nominatim's throttle is the single largest source of false "no such place"
  answers in this work.
* **Noted, not acted on**: the place payload's address field leaked
  **"13,162 reviews"** for Din Tai Fung, which is prose again rather than an
  address. It is display-only in the dry run and the name check is what actually
  guards the match, so the pattern was left alone rather than tightened a fourth
  time - each tightening so far has traded one false positive for another.
* **The corpus now spans 1499 to 2022 in this vertical alone**: U Fleků (1499),
  Caffè Florian (1720), Den Gyldene Freden (1722), Botín (1725), Port'Alba
  (1738), Caffè Greco (1760). Dates that old cluster on 31 December by the
  year-only convention, which is worth knowing before reading the timeline
  around New Year.
* **Three cities have now failed four passes**: Dubai, Istanbul and Delhi.
  Dubai and Istanbul have no English-language article with a founding date for
  any candidate tried; Delhi has Karim's, dated 1913, which no phrasing will
  geocode. They need local press or a hand-placed coordinate.

## 2026-09-21 - Backfilling the pictures, and what Commons will not give you

The restaurant pins had been created without pictures across five tranches -
48 of 52 pins from the day had none. 37 of 52 do now.

* **Learned**: **a name-matching image search is wrong about a third of the
  time, and confidently so.** Proposing one Commons file per venue and reading
  the list before applying rejected **14 of 47**: a *car* for Arpège (Suncar
  Arpège), the **Aragvi River** in Georgia for the Moscow restaurant, **Ledbury
  Viaduct** in Herefordshire for the Notting Hill dining room, a band called
  Odette, the musical *Flower Drum Song*, a Kandinsky for the Guggenheim, and
  the Varsity in Rome **Georgia** - with a political photograph attached - for
  the Atlanta drive-in. Every one of those would have looked plausible in a
  thumbnail.
* **Learned**: adding the city to the query does not rescue them. All fourteen
  were retried as "venue + city" and Commons returned **nothing usable for any
  of them**, which is the real answer: those venues have no free photograph.
  The pins keep no picture, which is the same ruling as Guggenheim Abu Dhabi.
* **Rule that emerged**: the automatic filter can reject the obvious classes -
  logos, maps, menus, plaques, small files, engravings dated before 1900 - but
  **it cannot tell a restaurant from a river of the same name.** Only reading
  the proposal does that, and it is worth the minute it takes across fifty pins.
* **Accepted deliberately**: a photograph of a *dish* at the right restaurant
  (gumbo at Antoine's, fries at Schwartz's) and the Pessoa statue outside A
  Brasileira. These are the venue, not a stand-in for it. A branch in the same
  city was accepted (Quanjude at CityWalk, Tai Ping Koon in Causeway Bay); a
  branch in another city was not (Spago Las Vegas, Nanxiang in Tokyo).

## 2026-09-22 - Every category is one word now (0061)

* **Changed.** The 47-name list became 57 single words
  ([categories.ts](../../../src/lib/categories.ts)). Ian's rule: "tag/category
  should prefer single word and more granular, not like `Conferences &
  Festivals`". Most names simply lost their second half
  (`Consumer Electronics` -> `Electronics`, `Health & Medicine` -> `Health`);
  eleven were two subjects wearing one name and were split pin by pin in
  [0061_single_word_categories.sql](../../../scripts/db/schema/0061_single_word_categories.sql),
  which names the id lists that go to the other word.
* **Learned - a compound name hides a judgement nobody made.** The splits were
  not close calls. `Infrastructure & Transportation` was 289 pins of which 247
  move people or freight and 32 are water, sewers, dams and flood defences -
  two different verticals under one label, and neither readable from the label.
  `Music & Audio` was 57 pieces of kit and 10 pins about music. `Space &
  Astronomy` hid five particle-physics machines that were never either
  (`Science`). Ten pins, never noticed while the compound name covered them,
  moved to the word they were always about: two to `Mining`, two to
  `Semiconductors` (chip fabs filed as infrastructure), two to `Aerospace`, one
  to `Telecom`, and three convention centres and a business district that kept
  only their building category.
* **Learned - a pin carries as many words as it is about.** One word per pin
  would have been a worse taxonomy than the compounds. An anime film is `Anime`
  and `Movie` (118 pins gained the second word), a courtroom verdict about an
  offence is `Crime` and `Justice`, an airport terminal is `Transport` and
  `Architecture`. Categories have been many-per-pin since 0043; this is the
  change that starts using it.
* **Trap - a new category word may already be on the pin as a typed tag.** The
  Grammys pin had a `Music` tag, the chip-export pin a `Semiconductors` tag, and
  `UC_PinTag` is unique on `(pinId, name)`, so the rename would have failed on
  them. The migration deletes the topic row first: the category is the stronger
  statement of the same thing. Two categories landing on one word (a film filed
  as both `Movies` and `Anime Movie`) drop to one the same way.
* **Trap - the screen lookups read the category name.** `SCREEN_CATEGORIES`,
  `EPISODIC_CATEGORIES`, `GAME_CATEGORIES` and `STUDIO_CATEGORIES` were all
  written in the old words, and `Anime Movie` had been doing real work: it was
  how an anime *film* stayed out of the episode lookup. Splitting it into
  `Anime` + `Movie` made the film episodic again until `workCategory()`
  ([screen.ts](../../../src/server/scrape/screen.ts)) took over - of the
  categories a pin carries, `Movie` wins, so a film is looked up as a film.

## 2026-09-22 - Anthropic's wet biology lab, one pin from a newsletter link (pin 2598, @TechDesk)

* **Feedback - the URL handed over is the source, even when it is a rewrite.**
  Ian pinned `therundown.ai/news/anthropic-claude-biology-lab`. The Rundown is
  a newsletter write-up that says so itself - "This story builds on reporting
  from The Rundown newsletter on September 21, 2026" - and its body credits and
  deep-links TechCrunch, which in turn credits a **Reuters exclusive published
  the same morning** (3:02 AM PDT against TechCrunch's 4:13 PM). The pin was
  first posted with TechCrunch as `sourceUrl` on the aggregator rule, the swap
  was offered, and Ian took it: **"yes swap"**. The Rundown page is the
  `sourceUrl`; TechCrunch and Reuters are its top two references.
* **Rule that emerged - the aggregator rule governs *references*, not the
  `sourceUrl` a person hands you.** "Skip aggregators and anything that only
  rewrites other coverage" is about what a pin cites as evidence. Which page
  the pin points at is a different question, and the owner's answer is the page
  he was reading. Chasing the credit chain is still the job - it is what found
  Reuters, and the two originals sit at the top of the reference list where the
  evidence belongs - but it is not a reason to repoint the source. Offer the
  swap; do not make it silently.
* **Learned - swapping a `sourceUrl` costs a reference slot.** Six links wanted
  a place and the cap is five, so the Life Sciences Verification Program post
  went (the least about the lab itself, and TechCrunch reports its launch
  anyway). Its citation in the `longFormSummary` had to move to TechCrunch in
  the same edit: a `<cite data-ref>` pointing at a link the pin no longer holds
  is a dangling citation that nothing warns about. **Re-export after the PUT**:
  `syncPinSources` marked the dropped link `utcRemovedDateTime` and gave the
  new source `role: 'source'` by itself, and the export then asked for one new
  wiki, a rebuilt summary and a fresh contradiction check - the rebuild is what
  relabels every citation, so the hand-written summary is worth keeping only
  until the wikis are in.
* **Learned - `curl` and the app's scraper disagree about Reuters, and the app
  wins.** [Sources](sources.md) already says reuters.com is 401 to `curl`; this
  run confirmed both halves in one job. A hand fetch got 771 bytes, `WebSearch`
  refused the domain outright ("not accessible to our user agent"), and the pin
  was posted citing Reuters on the strength of the TechCrunch link alone. The
  save then fetched it through the pipeline and came back with the full
  article - byline, dateline, the whole Kauderer-Abrams interview and a $400M
  Coefficient Bio price the Rundown never mentioned - which **confirmed the
  headline the reference had been given from the URL slug**. The lesson is the
  order: cite it, save, then read the captured text out of `wiki:export` and
  correct the pin if it disagrees. It did not.
* **Learned - a city-level place must come from the forward geocode, not the
  reverse one.** The lab's address is undisclosed ("the San Francisco Bay
  Area"), so the pin sits on the city. Reverse-geocoding San Francisco's own
  centroid through Nominatim returns **"Goddess of Victory, Geary Street, Union
  Square, Tenderloin..."** - a statue - which would have been a precise and
  completely false address. The never-type-a-place rule is satisfied just as
  well by the forward search's own `display_name` ("San Francisco, California,
  United States"): reverse geocoding is for a point that *is* a premises.
* **Learned - the video for an AI-company pin is the company's own channel, and
  it need not be about the pin's event.** `media:videos` would match nothing
  here (an event-phrased title shares no words with a video title, the aerospace
  problem). YouTube Data API search for "Anthropic Model Hardware Standard"
  returned Anthropic's own **"Model Hardware Standard: AI operating physical
  equipment"** (`UxJZrCFzTHY`, 2026-08-28), verified through oEmbed as
  `@anthropic-ai`. It is the piece of the stack the lab needs, not the lab, and
  that is the right kind of video for a pin whose event is a disclosure with no
  footage of its own. Pictures came the same way - TechCrunch's lead
  image plus the `og:image` of two referenced Anthropic research posts, both of
  which are on-subject where a DNA stock photo only half is. The Rundown's own
  `og:image` is a newsletter story card credited "Image source: Anthropic", so
  it added nothing the research posts did not.
* **Learned - the extraction fell to the session, the wikis did too, and that
  is now the normal path.** `GET /api/scrape` answered `llm: "session"` with
  both `llmTasks`, so the fields, the references and the `longFormSummary` were
  written by hand; then `wiki:export --pin 2598` produced six wiki jobs which
  were written and applied the same way. Because the summary was already on the
  pin, the second export asked for **no summary job** - only the contradiction
  check. Worth knowing before planning the work: a one-pin scrape without credit
  is six wikis, not one.
* **Learned - the contradiction check drops a one-sided finding.** Three were
  submitted; `cleanContradictions` recorded two. The dropped one named a single
  link disagreeing with itself (the same Anthropic post rounding 1.6x to "nearly
  2x" in its overview), which is not a contradiction *between* links. Put an
  internal inconsistency in the wiki's body instead.
* **Learned - a story can be its own contradiction, and that is worth
  recording.** Reuters headlines the lab "as it ramps AI drug program" while
  Anthropic's spokesperson says it is "not for drug discovery specifically";
  both sentences are in both reports. Recorded as `minor` with the note that the
  pin follows the spokesperson. The other kept finding is the place: Bay Area in
  both reports, "in SF" only in a quoted X post.
* **Changed**: [Sources](sources.md) gains rows for therundown.ai and
  techcrunch.com; [Vertical recipes](verticals.md) gains an AI-company
  milestones note under the AI models row; [Strategy](strategy.md)'s "Which URL
  is the source" rule records that a URL the owner hands over stays the source.

## 2026-09-22 - The Strategic Petroleum Reserve, 1975 to last month (pins 2611-2622, @EnergyDesk)

* **Done.** Twelve pins as one oldest-first chain: EPCA signed (1975), the first
  412,000 barrels going underground at West Hackberry (1977), the four
  presidentially ordered emergency drawdowns (Desert Storm 1991, Katrina 2005,
  the IEA's Libya action 2011, the 180-million-barrel Ukraine release 2022),
  the 2026 Hormuz release of 172 million barrels and the four exchange tranches
  that executed it, and the reserve falling below 300 million barrels in August.
  Curator **@EnergyDesk**, categories `Energy` + `Policy` (plus `Geopolitics`,
  `Disaster` or `Economy` as each pin earns them), shared tag `SPR`. Each pin
  carries the EIA's own weekly SPR stock series, so the page draws the
  government chart with the pin's week marked.
* **Learned - `Energy` needed its own desk, and the owner said so.** The batch
  first went to @EconDesk on the reasoning that a drawdown is a policy act that
  moves an oil market, not a build like @BuildDesk's wind farms and geothermal
  plants. Ian's ruling was simpler and better: **`Energy` belongs to
  @EnergyDesk.** The vertical now has its own curator (user 408), and the 33
  Energy pins @BuildDesk had authored moved across with the twelve new ones -
  45 in all. `Energy` as a *second* category stays where it is: pin 2396
  (Thacker Pass) is `Mining` + `Energy` and remains @BuildDesk's, because
  Mining is its vertical.
* **Trap - a pin's author cannot be changed.** `PUT /api/pins/:id` sets
  `pin.userId = existing.userId` on every save ([route.ts](../../../src/app/api/pins/[id]/route.ts)),
  by design, so moving a pin between desks means **deleting it and re-posting
  it whole** as the new author. What that costs, measured before doing it:
  nothing for comments, likes, favourites, ratings or thread links (these 45
  had none), but every pin gets a **new id**, its media are re-downloaded from
  their original URLs, and its **duplicate decisions are lost**. Snapshot every
  pin's JSON first and re-post from the snapshot, not from a fresh scrape.
* **Learned - the press-release trail is the spine of a government vertical.**
  DOE's Office of Petroleum Reserves news listing
  (`/hgeo/opr/listings/office-petroleum-reserves-news`) **404s**, but every
  release carries *View Next Press Release* and *View Previous Press Release*
  links at its foot, so the series walks itself once you have one release. The
  OPR landing page `/hgeo/opr` also lists the recent ones.
* **Learned - an RFP and its award are two events, days apart, each with its
  own DOE release.** The 2026 exchange ran RFP (86m, 13 Mar) -> RFP (10m,
  1 Apr) -> RFP (30m, 9 Apr) -> award (26m, 17 Apr) -> RFP (92.5m, 30 Apr) ->
  award (53.3m, 11 May). Pinning all six would have been a list; the batch pins
  the first two solicitations and the two awards, and cites the matching
  solicitation as a reference on each award so the volume asked for and the
  volume taken both appear.
* **Trap - a search summary's date is not the page's dateline.** A WebSearch
  result put a 4.5-million-barrel Bayou Choctaw purchase solicitation in
  **May 2026**; the page itself (`/ceser/articles/us-department-energy-announces-new-solicitations-purchase-oil-strategic-petroleum`)
  is dated **10 July 2024** and is a Biden-era release. Curling the page and
  reading its own date line killed a pin that would have been two years wrong.
* **Trap - AP Archive's "11 years ago" is the upload date, not the footage.**
  Searching for 1991 drawdown footage returned *USA: EMERGENCY OIL TO BE
  RELEASED*, which reads as Desert Storm and is actually **22 September 2000**
  (Bill Richardson, heating oil), and a CNN clip that looks like the 2011 Libya
  release is **February 2012** about Obama. Read the `shortDescription`'s
  bracketed dateline before attaching an archive clip. Nothing usable was found
  for 1991, 2011 or the May 2026 award, so those three pins carry pictures only.
* **Learned - energy.gov's own pictures are worthless and Commons has a whole
  DOE set.** Every energy.gov release's `og:image` is either the DOE seal or
  `white-fallback_0.png`. The pictures came from Commons' *United States
  Strategic Petroleum Reserve NNN.jpg* series - about 30 DOE photographs, each
  with a site named in `extmetadata.ImageDescription` (032 and 059 are Bryan
  Mound wellheads, 069 is West Hackberry's pump pad, 070-079 are Bayou Choctaw,
  086-100 are Big Hill), so a pin can be given a picture of *its own* site.
* **Trap - Nominatim knows three of the four SPR sites and not the fourth.**
  Big Hill, West Hackberry and Bayou Choctaw all forward-geocode by name;
  **Bryan Mound returns nothing**. Overpass has it as
  `Bryan Mound Strategic Oil Reserve`, `operator=US Department of Energy`, at
  28.9174, -95.3777. And reverse-geocoding is not always the better label here:
  West Hackberry's point reverses to "Black Lake Road" and Big Hill's to
  "Wilber Road", while the forward `display_name` names the facility. Both come
  from Nominatim, so neither is a typed address.
* **Learned - posting oldest-first sets the chain without a re-threading pass.**
  `POST /api/pins` uses a `parentId` in the body as given, so feeding each new
  pin's id to the next one built the whole linear chain at save time. The
  `PUT`-per-pin re-threading in [launches.ts](../../../scripts/spacex/launches.ts)
  is only needed when the pins already exist or the order changes.
* **Blocked**: `iea.org` is behind Cloudflare to `curl` (the IEA's own Libya
  announcement is cited as a reference on the strength of the search result,
  not a fetch); `cnbc.com` is **403 to WebFetch**. `foxbusiness.com` reads with
  a plain browser UA, and `georgewbush-whitehouse.archives.gov` and
  `presidency.ucsb.edu` both read with no fuss.

## 2026-09-22 - More media per pin, and a review I skipped

Ian asked for more media on the pins. The restaurant pins went from mostly one
picture to 37 of 58 carrying two or more. Along the way I attached nineteen
wrong images and had to take them off again.

* **The mistake, plainly**: the proposer printed 92 candidate files and I read
  only the last 40 of them before applying the lot - immediately after writing
  that reading the proposal is what catches bad matches. Everything in the
  unread half that was wrong went straight onto a pin.
* **What it put on pins**: the Suncar **Arpège**, a 1984 car, on the Paris
  restaurant. The **Aragvi river** in Georgia on the Moscow restaurant. A band
  called **Odette** at a Brighton festival on the Singapore dining room.
  **Schwartz's reagent**, a chemistry molecule, on the Montreal deli. The
  **Demel family's grave** on the Vienna café. A **work train in Savoy,
  Illinois** on the Helsinki restaurant. A **student newspaper** called The
  Varsity on the Atlanta drive-in.
* **Why the filter did not save me**: it required the venue's name to appear in
  the filename or description, which sounds strict and is **exactly the wrong
  test for a homonym**. "Suncar Arpège" contains Arpège; "Kura and Aragvi"
  contains Aragvi. A name test cannot separate a restaurant from a river, a car
  or a molecule that shares its name - only a human reading the list can, and
  the list has to be read in full.
* **Rule for next time**: print the proposal to a file and read all of it, or
  cap the batch at what will fit on one screen. An unread proposal is not a
  proposal.
* **Videos: none.** All 58 restaurant pins were searched with the repo's own
  `findProductVideo`, which requires a verified channel. Two came back and both
  were false positives on the same homonym pattern - a **Genshin Impact
  character teaser** named Odette, and a Georgian **music label** called Aragvi
  Pro. So the vertical's existing ruling that restaurants yield no video is
  confirmed independently; `media:videos` is right to refuse them.
* **Learned**: **YouTube rate-limits a burst and the failure reads as "no
  results".** Fifty-eight searches at 0.9-second intervals returned `fetch
  failed` for every one; curl and node fetch both worked fine seconds later, and
  the same run at 3.5-second intervals with one retry went through. That is the
  third service today - after Nominatim and the Wikipedia extracts API - where a
  throttle or a cap is indistinguishable from an empty answer.

## 2026-09-22 - Landmark science, and the 150-year hole (pins 2656-2667, @ScienceDesk)

* **What the survey found.** `Science` held **22 pins**, and they were nearly all
  one thing: colliders, telescopes and neutrino detectors, plus the four Nobel
  announcements. **Only two pins predated 2005** - John Snow's pump handle and
  the Salk vaccine, both filed by @HealthDesk - so the corpus had essentially no
  history of science at all. A keyword sweep for Darwin, Mendeleev, the double
  helix, radium, the Higgs, Dolly and the first gravitational-wave detection
  matched **nothing**. Twelve pins went in: nine landmark firsts from 1859 to
  2016 and three near-term events, the same two-halves shape the aerospace run
  used, and for the same reason - the vertical was thin at both ends.
* **Learned - a big picture can be too big to save, and the error says so.** The
  ESO re-processing of the 1919 eclipse plate is **23800x14191**, and the save
  failed with "Picture is too large to decode (maxResolutionInMP limit exceeded
  by 38MP). Use a smaller rendition of it - on Wikimedia, ask the API for
  `iiurlwidth=1920` and take the thumbnail URL it returns." That is the fix, and
  it works. **Ask Commons for `iiurlwidth` up front** on anything over about
  40 megapixels rather than finding out at the save.
* **Trap - a create that fails at the media stage still leaves the pin.** `POST
  /api/pins` is not transactional (the `PUT` was fixed in September, the create
  was not), so pin 2660 existed with its place, dates, references and summary
  and **no media and no tags** - `PinTag.setUserTags` runs after `pin.save()`
  and never got there. The repair is a `PUT` of the whole pin; check for a
  half-saved pin by id before re-posting, or a retry makes a second one.
* **Learned - read the Commons description, every time.** Of the first round of
  candidates, `Mendeleev-9.jpg` and `Mendeleev-2.jpg` turned out to be title
  pages of *Principles of Chemistry* (1891) and *A Chemical Conception of the
  Ether* (1904), and `Mendeleev Scheme 05.jpg` a 1979 poster design - three
  plausible filenames, none of them the 1869 table. The right file was
  `Mendeleev law.jpg`, whose description reads "Handwritten version of elements
  system (Mendeleev's periodic law)... D.Mendeleev 17.02.1869". One candidate,
  `Periyodik Tablo 1 Mart 1869.jpg`, is marked **"Editorial use only"** and was
  dropped on the licence.
* **Learned - a dead source can answer 200.** `einsteinpapers.press.princeton.edu/vol6-trans/129`
  returns 200 and **serves a portal advertisement** ("Einstein Portal: Launching
  September 30th"), not the 1915 paper it used to carry. It was already saved as
  pin 2659's `sourceUrl` before the wiki export showed what the page actually
  says. Replaced with the **Wikisource** translation, which carries the text and
  its own publication header - "Session from November 25, 1915; published
  December 2, 1915", Sitzungsberichte 1915 part 2, 844-847 - and so
  **corroborated the date from a second source** instead of merely restating it.
* **Feedback applied - a homepage is not a reference.** Two references were
  `royalsociety.org` and `ras.ac.uk`, both society homepages that state nothing
  about 1859 or 1919. That is the padding the quality bar forbids; they were
  swapped for the Charles Darwin and Arthur Eddington articles. **A reference has
  to back a sentence in the pin**, which a homepage never does - and it also
  wastes a wiki job on a page of navigation furniture.
* **Learned - for a historical first, the video is the institution that was
  there.** `media:videos` matches none of these (an event-phrased title shares no
  words with a video title, the aerospace finding). Hand-picked from the YouTube
  Data API and verified through oEmbed: the **Royal Astronomical Society** on the
  1919 eclipse - the society that held the meeting this pin is placed at - **The
  Roslin Institute**'s Dolly@20 lecture by Ian Wilmut, **HHMI BioInteractive** on
  the double helix, the **Institute for Advanced Study**'s 2015 general
  relativity centennial, the **Royal Society** on Darwin, the **NSF** on
  GW150914 and **ESA** on Gaia and Euclid. Two gaps worth recording: the Higgs
  announcement survives on YouTube only as re-uploads, so the pin takes **Link
  TV**'s broadcast of the moment rather than a personal channel's copy of the
  seminar; and **the Curie pin has no video at all** - every result was a
  documentary channel, a film trailer or a fan upload, and none of it is worth
  more than nothing.
* **Learned - geocode forward for a building, and read the label.** Nominatim
  resolved nine of eleven to the premises themselves: "John Murray, 50, Albemarle
  Street", "Old Cavendish Laboratory, Free School Lane", "NSF LIGO - Hanford".
  Two needed rephrasing - Burlington House kept resolving to the **Royal Academy
  of Arts** (right courtyard, wrong occupant) until the query became "Royal
  Astronomical Society, London", and "Institut de France, 23 Quai de Conti" led
  with an unrelated tenant, "Fondation Kenza". St Petersburg's label comes back
  part-Cyrillic even with `Accept-Language: en`, and is kept as the geocoder
  gives it.
* **Learned - a Julian date is a trap in this corpus.** Mendeleev's presentation
  is 6 March 1869 in Wikipedia's Gregorian rendering, while the manuscript sheet
  is signed 17.02.1869 and the *Periodic table* article separately gives "17
  February 1869 (1 March 1869 in the Gregorian calendar)" for when he **began**
  arranging the elements. Three different dates for one week of work; the
  reasoning has to say which calendar it is using and which act it is dating.
* **Learned - `curl` is again the wrong oracle.** `cosmos.esa.int`,
  `ligo.caltech.edu` and `royalsociety.org` all answer **000 to `curl`**, and
  `reuters.com`-style, the app's own scraper read every one of them in full.
  ESA's Gaia mission page then **confirmed the release date independently** -
  "Data Release 4 (based on 66 months of data): expected December 2026" beside
  the DR4 page's "Coming up: 2 December 2026".
* **Trap - verify category rows after a batch, not just after the save.** Three of the twelve (2656, 2659, 2660) were found with **no `kind='category'` rows at all** at the end of the run, while their topic tags were intact and the seed would have carried the gap. Replaying the same `PUT` restored them, so the route is not at fault - `bodyCategories` reads `body.categories` correctly and the response came back `['Science']`. Another session was writing to the same database throughout ([Concurrent sessions](../../../AGENTS.md)), which is the likeliest cause, and it could not be pinned down after the fact. The lesson is cheap either way: **a batch's last step is a `SELECT` of every pin's category rows**, because nothing in the save, the lint or `backup:data` notices a pin that has lost them - `okf:lint` passed clean on all twelve while three of them were uncategorised.
* **Scope left open.** The batch generates **36 wiki jobs, 1.76M characters**.
  The 17 institutional pages were written and applied; the **19 long Wikipedia
  and Darwin Online articles are pending**, and with them 6 contradiction checks
  (the lint stopped on "credit balance is too low"). Worth knowing when planning:
  a twelve-pin batch of well-referenced pins is three dozen wikis, not twelve.
* **Changed**: [Vertical recipes](verticals.md) gains a Landmark science recipe;
  [Sources](sources.md) gains rows for Commons oversized files and for
  einsteinpapers.press.princeton.edu.

## 2026-09-22 - What a re-authored pin loses, and the live EIA chart (pins 2611-2655)

* **Done.** All 45 `Energy` pins now belong to **@EnergyDesk** (user 408), and
  the twelve SPR pins carry the EIA's weekly SPR stock series, drawn on the pin
  page with the pin's own week marked (`PinSeries`, 0062).
* **Trap - three duplicate decisions a person had already made were lost, and
  only one could be restored through the API.** Re-posting gives a pin a new
  id, so its `PinDuplicate` rows point at a pin that is now deleted. The
  duplicate scan re-suggested one of the three pairs; the other two never came
  back, because the *deleted* twin still outranks the live one in the search
  index (the index carries deleted pins) and pushes the real match below the
  0.80 threshold. `PUT /api/pins/:id/duplicates/:otherId` only decides a pair
  the app has **suggested**, so there was no route for them: the three rows
  were restored by hand with the ids remapped, keeping their status, verdict
  and decider. **Read `PinDuplicate` before deleting a pin.**
* **Trap - `search:refresh` reindexes from `seedPins.json`, not the database.**
  After the move the index still held the old ids and none of the new ones, so
  the duplicate scan found nothing and the reason looked like a scoring change.
  Run `npm run backup:data` *first*, then `search:refresh`.
* **Trap - a new view column needs a dev restart.** 0062 appends `series` to
  `PinBaseView`, and `queryPinById` is `SELECT "Pin".*`, so nothing in the SQL
  had to change - but the running `next dev` served the pin without the field
  and the new route 204'd until the server was restarted.
* **Learned - EIA has no keyless API, and does not need one.** `api.eia.gov`
  v2 wants a registered key and the "series history" download is Excel BIFF,
  which would mean a spreadsheet dependency for one number a week. The
  `LeafHandler.ashx` page that the series' public URL already points at carries
  the whole history as an HTML table - Year-Month rows with (MM/DD, value)
  pairs across the weeks - so it parses with no key and no new package, back to
  August 1982. Two traps in the table: a value can be `W` (withheld) and must
  be skipped rather than read as zero, and a **December row's January week
  belongs to the next year**, because a week is dated by the Friday it ends on.
* **Learned - the series is the pin's own evidence.** Parsing it corroborated
  the batch: 415,442 thousand barrels on 6 March 2026 against the pins' "about
  415 million before the release", and 284,957 on 11 September against the
  298.7 million the August pin cites. A pin whose numbers disagree with the
  chart beside it is a pin worth re-reading.
* **Rule that emerged**: a published series is a **handle, never a number**.
  `PinSeries` stores the publisher and the series id; the values are fetched on
  view with an hour's cache, the same shape as weather, market odds and place
  scores. A number copied into the database would be a stale claim within a
  week, and the point of the chart is that it is live.

## 2026-09-22 - Papers that changed industries, and clearing the whole wiki backlog by hand (pins 2668-2679, @ScienceDesk)

* **Feedback - a credit error is never a status line.** Ian, on a report that listed
  pending wikis because `okf:lint` had stopped on "credit balance is too low":
  **"never stop on 'credit balance is too low' just do it by hand"**. The existing
  rule was "switch to manual mode when the key is dry"; the correction is stronger -
  a credit error is **never** a reason to hand work back unfinished and never a line
  in a report. Run `wiki:export` in rounds until it says **0 jobs**, answering wikis,
  summaries and contradiction checks each round, then `backup:data`. Do not offer to
  do it later, and do not ask first.
* **Changed - the backlog was cleared.** 53 wikis (76 part pages plus 26 composed
  root pages), 3 rebuilt summaries and 24 contradiction checks, all by hand, for the
  Science and paper batches; the two batches now carry **139 source wikis** between
  them and `wiki:export` returns 0 jobs on all 25 pins.
* **Learned - budget a wiki round properly.** A twelve-pin batch of well-referenced
  pins is **three dozen wikis**; two such batches came to 53 sources and about 3.5
  million characters of captured text. The per-source cost is wildly uneven: an
  arXiv listing is 5k characters and a Wikipedia article can be 240k split across
  five parts. Read the long ones for their lead and main sections rather than
  end to end, and say in the page what the capture actually contained.
* **Learned - part 2 of a long Wikipedia article is usually the reference list.** Of
  the 26 multi-part jobs, most tails were citations, categories or navigation, which
  makes them cheap pages - but they are still worth writing properly, because the
  bibliography is often the clearest record of *what a paper was built from* (the
  AlphaFold 2 reference list is where "Attention is all you need" shows up as an
  ingredient). One part of the Alan Turing capture was cut inside the inline citation
  machinery and contained no prose at all; the honest page says so.
* **Trap - `cleanContradictions` drops a finding that names only one link.** Submitted
  with a single claim, it is silently discarded: pin 2660's note that Einstein's 1911
  deflection figure was half the 1915 one recorded as 0. An internal inconsistency in
  one source belongs in that source's wiki body, not in a contradiction check.
* **Learned - the contradiction checks earn their keep.** Twelve of 24 pins came back
  clean; the other twelve turned up real things. The best catch: **AlexNet's own
  NeurIPS abstract says "60 million parameters and 500,000 neurons" while Wikipedia
  says 650,000** - same parameter count, different neuron count, and the primary
  source is the smaller. Others worth keeping: the relational model is "first
  described in 1969" only if you mean Codd's internal IBM paper, not the June 1970
  CACM one; the Chicago Board Options Exchange opened on 26 April 1973, *before* the
  May-June issue carrying Black-Scholes, so the formula cannot have created the
  market it is credited with; and PageRank has three different author sets across
  three sources (Brin and Page on the WWW7 paper, plus Motwani and Winograd on the
  technical report, plus Scott Hassan in the Google Search article).
* **Learned - a scanned two-column PDF reads out of order.** `pdftotext` interleaves
  the columns of Codd's CACM scan and of the Diffie-Hellman IEEE reprint, breaking
  most sentences mid-clause. Say so in the wiki and record only contiguous fragments;
  do not reconstruct a sentence that the extraction split.
* **Learned - the address on the paper is not the address today.** The Kohler and
  Milstein paper prints "MRC Laboratory of Molecular Biology, Hills Road, Cambridge,
  CB2 2QH"; the LMB moved to Francis Crick Avenue in 2013, which is what a geocoder
  returns. Same for Codd's IBM San Jose Research Laboratory, now the Almaden Research
  Center about ten kilometres away. Place the pin at the institution and record the
  contemporary address in the contradiction check.
* **Changed**: [Vertical recipes](verticals.md) gains a Landmark papers recipe;
  [Sources](sources.md) gains a row for the publisher paywalls that block everything.

## 2026-09-22 - Stix Asia at UnCommons, and reading a delay out of three datelines (pin 2682, @FoodDesk)

* **Learned - a delay is usually found by reading the coverage in date order, not by
  finding the word "delayed".** No source here says the opening slipped. It falls out
  of three datelines: the Review-Journal on **28 April 2026** ("a fall 2026 opening is
  planned", the week construction started), the Las Vegas Weekly on **9 July** ("set
  for a fall opening"), and the station on **16 September** ("opening is planned for
  this winter"). Fall and winter are incompatible, so the pin is `delayed` with
  `originalStartDate` at the close of meteorological fall. **Always fetch the earlier
  coverage before dating a forward opening** - the first article you are handed is
  usually the latest revision, and only the earlier ones show that it moved.
* **Trap - a stale "official" page is not the better source.** Stix Asia's own page
  says "Opening 2026" and UnCommons' says "COMING 2026", which tempts an elegant
  deduction: winter ∩ 2026 = December, so date it 31 December 2026. That was the
  first answer here and it was wrong twice over - the UnCommons page was **last
  modified 4 April 2025**, months before the slip, so it cannot narrow a September
  statement; and `okf:lint` immediately flagged the result as `imprecise` ("Date is
  year-precision only") because 31 December is indistinguishable from a bare-year
  guess. The rule that already covers it: the **newest** statement wins, and a season
  takes its last day - 28 February 2027.
* **Learned - `okf:lint`'s imprecise check is a useful second opinion on a date.**
  It cannot see the reasoning, only the date, so a date landing on 31 December or a
  year boundary will be read as a bare-year guess. If that is not what you meant, it
  is worth asking whether the date is right.
* **Learned - the landlord has the address the operator's press does not.** Four of
  five sources place the food hall only "at UnCommons"; `uncommons.com`'s own tenant
  page carries **"STIX ASIA - 6840 Helen Toland St., Las Vegas, NV 89113"** and the
  trading hours ("Daily 11am - 10pm"). Reverse-geocoding the plaza centroid had put
  the pin on **Tom Rodriguez Street**, which the Review-Journal separately explains is
  where the main entrance is, not the postal address - a real distinction for a unit
  inside a mixed-use development. For a tenant, **check the landlord's site for the
  street number**, then geocode it; Nominatim had the street but not the house number,
  so the label stops at the street, which is honest.
* **Learned - a food hall is one pin, not twelve.** Ginza Bairin, Ramen BARIO and
  NANAMUSUBI are stalls opening on the same day inside one venue, with no dated
  announcements of their own; they would also have had to share a `sourceUrl`, which
  `rejectDuplicateSourceUrl` refuses. The event is the hall opening and the tenants
  belong in the description and summary. The per-item rule is for a roundup of
  separately dated things, not for a tenant list.
* **Learned - `news3lv.com` carries full JSON-LD.** The `NewsArticle` block holds the
  whole `articleBody`, the byline, both timestamps and every image with its caption,
  so one `curl` is enough; the station's own video is a Sinclair mp4 rather than
  YouTube, so it cannot be a medium - the video came from the Review-Journal's
  YouTube channel covering the same announcement.
* **Changed**: [Vertical recipes](verticals.md) - the Restaurants row gains the
  food-hall and landlord-address notes; [Sources](sources.md) gains a news3lv.com row.

## 2026-09-22 - The rest of the Stix Asia story, backwards (pins 2684-2685, @FoodDesk)

Ian: **"pin more Stix Asia"**. Pin 2682 was the Las Vegas opening and had nothing
behind it, so the two events that led to it went in and the three now read as one
chain: **2684** the Waikiki original opening on 6 February 2023 (`confirmed`),
**2685** the UnCommons groundbreaking on 27 April 2026 (`confirmed`), **2682** the
Las Vegas opening on 28 February 2027 (`delayed`). Posted oldest first, so each
`parentId` was set at save time and nothing needed re-threading.

* **Learned - "pin more X" usually means the rest of X's story, not more pins like
  X.** The useful reading was not "find other food halls" but "this pin is the last
  act of something - where are the first two?". Both were already named inside the
  sources pin 2682 already cited: the Review-Journal's "following the 2023 debut of
  the original" and Las Vegas Weekly's "a wildly popular three-year-old food hall".
  A pin's own references are the first place to look for its prequels.
* **Learned - the same brand needs a fresh source per pin.** `rejectDuplicateSourceUrl`
  means the Waikiki pin could not reuse any of the Las Vegas links, so the 2023
  press had to be found on its own: Honolulu Magazine's opening-day report as the
  source, the Star-Advertiser's preview a week earlier, and the operator's Waikiki
  page. Las Vegas Weekly could be *referenced* by both pins - the cap is on source
  URLs, not on references.
* **Learned - a count is a fact about a moment.** Four numbers for one hall: 17
  planned, 13 trading on opening day, 16 by the middle of 2023 (Honolulu Magazine's
  later editor's note), "over 15" on the operator's undated page today. The first
  draft blurred them into "grown past 15 stalls", which is true of all four and says
  nothing; the pin now says "13 of a planned 17" for the day and "grown to 16" for
  mid-2023, and the contradiction check records the whole progression with which
  source is newest. **Read the editor's note** - it is inserted above the body and
  silently outranks the number underneath it.
* **Learned - a secondary outlet gets the operator's own details wrong.** Las Vegas
  Weekly lists the Waikiki cuisines as "Japan, Taiwan, China, Korea and Vietnam";
  the operator says "Japan, Taiwan, China, Korea and Singapore". Vietnamese is on
  the *Las Vegas* tenant list, which is the likely bleed. The Review-Journal
  separately calls the original "downtown Honolulu" when it is in Waikiki, two miles
  away. Both are minor findings, and both point the same way: **for facts about a
  venue, the venue's own page beats a story that mentions it in passing** - the
  reverse of the rule for dates.
* **Learned - a Hawaii location is why "first mainland U.S." is not a contradiction.**
  Two Las Vegas tenants, NANAMUSUBI and Ramen BARIO, appear on the Waikiki list too,
  which looks like it breaks the "first U.S. location" framing until you notice the
  Las Vegas coverage says **mainland**. Worth checking before writing a finding.
* **Learned - `okf:lint`'s stale check will flag page furniture, and the fix is not
  `--fix`.** Source 18780 came back changed with exactly one relevant line: the
  headline run together with "Skip to main content", a navigation shift and not a
  change to the story. `--fix` would have called `ingestSource` to rewrite the wiki
  (and it needs the app's Anthropic key). The right move is what the check's own
  *furniture* branch does - re-read the page, `Source.setText` the new text as the
  baseline and `markUnchanged` - after reading the changed lines and judging them
  furniture yourself. The lines are in the finding's `detail`, in `OkfLintFinding`.
* **Learned - there is no `SourceText` table.** A link's text is `Source.text` with
  `Source.textHash`; `seedSourceTexts.json` is only how the backup splits it. Worth
  knowing before writing a query against a table that does not exist.
* **Changed**: [Vertical recipes](verticals.md) - the Restaurants row now says a
  chain's second venue is a thread, not a loose pin; [Sources](sources.md) gains
  rows for staradvertiser.com (premium, but the readable part carried the date, the
  count and four stall write-ups), honolulumagazine.com (the editor's-note trap) and
  operator sites like stixasia.com (good for an address, never for a date).

## 2026-09-22 - Restaurant concepts, not restaurants (pins 2686-2692, @FoodDesk)

Ian, off the Stix Asia thread: **"pin any other cool restaurant concepts like this"**. Seven
pins, each a format rather than a kitchen: Time Out Market Lisboa (18 May 2014), Ichiran's
solo booths in Bushwick (19 October 2016), Under five metres under the sea at Lindesnes (20
March 2019), Eatrenalin's moving dining room at Europa-Park (4 November 2022), Punk Noir's
20-course walk through a Dallas warehouse (2 June 2026), and the two Time Out Markets still
to come - São Paulo (Q1 2027) and the London flagship at 10 Piccadilly (summer 2028), which
thread behind Lisboa oldest first.

* **Learned - read the category before choosing what to add.** `Food` held 70 pins and was
  lopsided: grand cafés and fine dining from 1499 to 2015, with **two** pins after 2025 and
  almost nothing forward. The gap was not "more restaurants" but restaurants whose *concept*
  is the story, and a forward calendar. Listing the category by date first took ten minutes
  and changed the whole batch.
* **Learned - a date a source states in passing beats one nobody states.** Público's two 2014
  previews of the Time Out Market are unreachable by every fetcher there is, and Time Out's
  own page says "back in 2014". The day came from a **fifth-anniversary story**: "Desde que
  abriu portas a 18 de maio de 2014". An anniversary piece is a dating source, and the
  anniversary programme itself (16-18 May 2019, ending on the 18th) corroborated it.
* **Learned - drop a pin rather than publish a date no source states.** LIC Food Hall was
  meant to be the eighth. Its press said "opening this May" (2025), a later piece said the
  grand opening was "this past August", and the operator's own Wix event page said **1
  October 2024** - a year before the venue was previewed. Three dates, none of them a day
  anyone stands behind, so the pin was not written. The same judgement kept CaliExpress by
  Flippy out: the "world's first fully autonomous restaurant" opened by reservation in late
  December 2023, media reported a January 2024 opening, and Miso Robotics was still saying
  "CaliExpress is not yet open to the public" on 7 February 2024.
* **Learned - a season or a quarter is a period, so take its last day, and say so in the
  reasoning.** Q1 2027 gives 31 March 2027; "summer of 2028" gives 31 August 2028. Neither
  tripped `okf:lint`'s imprecise check, because neither lands on a year boundary - which is a
  useful sanity check that the rule and the linter agree.
* **Learned - a pin can be placed on a city when there is honestly no building.** Time Out's
  São Paulo announcement says "the exact location, first partners and cultural programme...
  have yet to be announced", so the pin is forward-geocoded to São Paulo and the reasoning
  says why. Better than picking a plausible address.
* **Learned - for facts about a venue, the operator beats the press; for dates, the reverse.**
  Gothamist put Ichiran Bushwick at 386 Johnson Avenue in 2016; the chain's own page says
  **374**, and Nominatim has an `Ichiran` premises at 374. But Wikipedia dates that opening to
  November 2016 where Gothamist, writing two days ahead, names Wednesday 19 October - and 19
  October 2016 was a Wednesday. Operator for the address, contemporary press for the day.
* **Learned - `cleanContradictions` also drops a finding where a link contradicts *itself*.**
  Wikipedia's Ichiran article says the chain began in 1960 while its own infobox says
  "Founded... in May 1993"; the finding cited [3] twice, so only two of the three answers for
  that pin were recorded. Same rule as a finding naming one link - it needs two distinct
  labels to survive, which means a single source's internal inconsistency belongs in that
  link's **wiki**, not in a contradiction check.
* **Learned - reconcilable is still worth recording.** Under seats "40" (Snøhetta, Wikipedia)
  and "up to 90 guests" (Visit Norway); Punk Noir's lounge seats 46 or 64. Both reconcile
  once you know that 40 is the dining room at the seabed and 90 is the whole three-level
  building, and that 64 is the lounge *plus* the bar. A finding whose note explains the
  reconciliation is more useful than silence, because the next person will hit the same two
  numbers.
* **Learned - the app's headless scraper is worth calling as a *reading* tool, not just a
  pipeline step.** A six-line throwaway script around `fetchSourceText` read guide.michelin.com
  in full when `curl` returned an empty 202 - and proved that publico.pt, wfaa.com and
  dallasobserver.com beat all three fetchers, which is worth knowing before spending searches
  on them.
* **Learned - a tag that matches a category name becomes a category.** Tagging Under with
  `Architecture` gave it `['Food', 'Architecture']`. Here that is right and `Food` still leads,
  but it means a tag list is not a free-text field: check the category names first.
* **Changed**: [Vertical recipes](verticals.md) - the Restaurants row now names the concept
  pin and what its description should lead with; [Sources](sources.md) gains rows for
  publico.pt (beats all three fetchers), gothamist.com (the tollbit redirect), Time Out's
  corporate announcements (a quarter or a season, never a day), a Michelin addendum for when
  the meta-description route is closed, and the Dallas outlets that read against the ones that
  do not.

## 2026-09-22 - The New York Times' Restaurant List 2026 (pins 2720-2788, @FoodDesk)

Ian: "pin all top 50 ny time 'The Restaurant List 2026'". Fifty opening pins, one per
restaurant, posted through `POST /api/pins` as @FoodDesk.

* **Learned - a paywalled list can be read through the owner's own browser.** nytimes.com is
  a paywall to every fetcher here; with Claude in Chrome connected (`@browser` in the VS Code
  extension) the interactive rendered in full in Ian's logged-in session. Each entry's header
  line carries `City • Cuisine • Opened <Month YYYY> • <site>`, and each entry is a `div` with
  the slug as its `id` - so **`...best-restaurants-america.html#<slug>` is a per-item deep link**
  and every pin gets its own `sourceUrl`, as the roundup rule asks. The tool's JS results
  truncate at about 1,000 characters; `get_page_text` returned the whole list in one call.
* **Learned - month-only openings, all fifty.** The list dates by month, so every pin is
  `estimated` on the last day of its month. Exact days would need local press per restaurant;
  not done in this pass.
* **Learned - the app's image downloader has two blind spots.** (1) Squarespace's CDN answers
  fetch's default `Accept: */*` with **WebP** whatever the query string says (`?format=1500w`
  and `?format=original` alike), and Jimp cannot decode it: 19 of 49 posts 500'd. Asking for
  `image/jpeg` gets the same picture as JPEG, so `DOWNLOAD_HEADERS` in `src/server/image.ts` now
  sends an `Accept` naming only what Jimp decodes. (2) A WordPress host (littlebirdfairhope.com)
  403s the `compatible; Chronopin/1.0` user agent while serving a browser UA; left alone, the pin
  went up without the picture. **Pre-check every chosen image with the app's own headers**
  before posting.
* **Learned - a failed create leaves a pin behind.** Create is not transactional: each 500
  still wrote the pin row and its references, without tags, media or the post-save hooks. The
  repair used was `DELETE` (a soft delete, kept in the seeds like the other 71) and a fresh
  `POST`, so the live feed, search sync and duplicate check run.
* **Learned - a company named in the title steers `places:resolve`.** Bar Panisse carries
  company `Chez Panisse` and a title naming it, so the resolver matched **Chez Panisse** at 1517
  Shattuck. Set by hand. Four more (Heretik, Passage, Tin Tin, Merci) had no match from the
  resolver but had one from the address-based keyless lookup done before posting.
* **Learned - stale venue nodes in Nominatim.** Its "Khue's Kitchen" sits at 799 University
  Ave; the restaurant's own site says 693 Raymond Ave, which Nominatim also has. Elemi Taqueria's
  first Google hit was the parent Elemi on Eastlake Blvd; the taquería is at 7729 Paseo del
  Norte. And many reverse-geocoded labels open with a *previous or neighbouring* tenant's name
  (Sons & Daughters, Amici, Ancora Pizzeria, Holbox) - that leading name is dropped and the
  street kept.
* **Feedback**: none yet.
* **Changed**: [Sources](sources.md) gains nytimes.com's interactive, the Squarespace CDN and
  the WordPress UA block; [Vertical recipes](verticals.md) - Restaurants gains the ranked-list
  recipe; `src/server/image.ts` sends an `Accept` header.

## 2026-09-22 - Three pictures on every NYT Restaurant List pin (pins 2720-2788, @FoodDesk)

Ian: "pins need 3 media". 118 pictures added across the 50 pins by round-tripping each whole pin
through `PUT /api/pins/:id`; tags, references and places came through intact.

* **Learned - where restaurant pictures come from, in yield order.** (1) A deeper crawl of the
  restaurant's own site - the homepage plus links named gallery/about/menu/private/events - gave
  26 pins at least one more. (2) Local press found by one search per restaurant: the article's
  `og:image` and body images, fetched with `curl`, for 22 more. (3) The rest only through the
  owner's Chrome: lazy-loaded WordPress images (`data-src`), **OpenTable** listings (photo ids in
  the page as `v4/photos/<id>-<n>`; the image that downloads is
  `resizer.otstatic.com/v2/photos/wide-huge/<n>/<id>.jpg`) and **Resy** venue pages
  (`image.resy.com/3/003/<n>/<venue>/<hash>/jpg/640x360`). The first photo on those two is the
  restaurant's own; later ones include diners' uploads *and reviewers' profile pictures*, which
  must be read before use.
* **Learned - a press page's images are not all the article's.** Sidebars and ads put hotel
  interiors (Pendry, Z hotels), magazine covers, TV-station graphics and in one case a mugshot
  among the candidates; a Durant's crawl offered the logos of its owners' *other* steakhouses.
  Every picture was viewed on a contact sheet before it was used.
* **Learned - more format traps for the thumbnailer.** `.jpg.webp` on thelocalpalate.com (drop
  the suffix); sfstandard.com's `-S1920x1280-FWEBP` becomes JPEG as `-FJPG`; OpenTable's `v4`
  resizer paths 404 to a direct fetch while `v2/.../wide-huge/` serves JPEG. The Claude in Chrome
  tool also refuses to return any URL carrying a query string, so strip queries in the page script.
* **Learned - the MICHELIN Guide renders an error page in the owner's Chrome**, and a Google Maps
  panel for a new venue can hold no photos of its own while the page's images belong to nearby
  places; neither was used.
* **Feedback**: "pins need 3 media" - a restaurant pin carries three pictures.
* **Changed**: [Vertical recipes](verticals.md) - Restaurants now asks for three pictures and
  names the sources above.

## 2026-09-22 - Exact opening days and MICHELIN stars for the NYT Restaurant List (@FoodDesk)

Ian said yes to moving the month-only pins to their days and adding stars.

* **Learned - an announced day is not the day.** Heretík was announced by Westword (1 May 2026)
  for Wednesday 6 May; the Denver Gazette of Monday 11 May says it opened "on Friday" - 8 May.
  The report written after the event wins, and the announcement stays as a lower-confidence
  reference explaining the difference. Seven of nine days were confirmed by a report written
  after the opening; Rye Bunny's rests on reports two days ahead plus a July review saying
  "opened in April"; Khue's Kitchen's (6 March 2025) only on an announcement three weeks ahead,
  so that pin stays `estimated` on the announced day.
* **Learned - the date-claim shape, as in pin 2693.** The day goes on the pin with
  `confirmed`, and the article stating it is added as a reference with its own `startDate` and
  confidence 92, above the source tier; the NYT source row carries no `startDate`.
* **Learned - the MICHELIN meta description is readable through `launchBrowser()`.** The page
  text only ever showed stars inside related-article tags ("2 MICHELIN Stars Restaurants"), but
  `meta[name=description]` in the app's headless browser reads "a One Star: High quality cooking
  restaurant in the 2026 MICHELIN Guide USA". That found stars on Milpero, Meju, Albi and
  Restaurant Naides (`PinRating` 1/3 each), a Bib Gourmand on Komal and plain selections for
  Creepies and Bistrot Ha - neither of which is a star score, so no rating.
* **Feedback**: "yes" to the offered dates and stars.

## 2026-09-22 - Tesla news, eight pins (@TechDesk)

Ian asked to "pin tesla news". Four agents posted pins 2825-2832 through `POST /api/pins`
without API credit: the Cybercab's Austin launch (2830, threaded under 235) and NHTSA's audit of
it (2831), the knee-airbag buyback recall (2829), the Semi factory rollout (2828), the Roadster
reveal (2825), Q3 deliveries (2826) and earnings (2827, threaded under 2826), and the EU vote on
FSD (Supervised) (2832). Every pin carries the tag `Tesla`.

* **Learned - tesla.com and ir.tesla.com refuse every automated fetch** (Akamai 403 to curl, the
  headless scraper and WebFetch alike, PDFs included). Take Tesla's own words from the copies
  filed elsewhere: every press release and quarterly update is an 8-K Exhibit 99.1 on SEC EDGAR
  (`data.sec.gov/submissions/CIK0001318605.json`, then
  `/Archives/edgar/data/1318605/<accession>/index.json`, with a User-Agent that names a contact);
  safety matters are on `static.nhtsa.gov`, listed per recall or audit by
  `api.nhtsa.gov/safetyIssues/byNhtsaId?filter=recalls&nhtsaId=<id>`; announcements are on
  Tesla's X accounts (read through the oEmbed and syndication APIs). Pictures embedded in SEC
  filings 403 the app's image downloader, so they are not usable as media.
* **Learned - the official filing beats the brief and the press.** NHTSA's recall report dated
  the owner letters 5 September where coverage (and the brief) said 15 September, and named 15
  cars; its special order dates the Cybercab's commercial service to 3 September where the press
  says public rides opened on the 4th. Date the pin from the filing and say what the press
  reports in the summary. A NHTSA press release carries no date in its fetched text; put the
  special order's `startDate` on its reference so the date tick lands on the page that dates it.
* **Learned - check a quoted time zone twice.** A Texas event reported as "8:30 p.m. local time"
  was 8:30 p.m. Eastern (7:30 p.m. in Waco); a countdown page that prints UTC settled it.
* **Learned - an EU committee date can be checked in the Comitology Register's JSON API**, which
  curl reads though the Angular site renders empty to the scraper:
  `ec.europa.eu/transparency/comitology-register/core/api/front/committees/C35300/meetings?size=500`
  (the TCMV). A meeting the register does not list yet stays `estimated`, however many trade
  outlets repeat the date.
* **Learned - a quarterly earnings pin posted ahead is `estimated`,** dated from the company's
  pattern (Tesla: deliveries on the 2nd day of the quarter, results on the Wednesday nearest the
  22nd). The deliveries release announces the earnings date, so firm the earnings pin up to
  `scheduled` when it comes out.
* **Fixed - `[S]` and `[n]` citations posted by hand stayed literal.** The playbook said the save
  converts them, but only the scrape did. `POST` and `PUT /api/pins` now link them to the source
  and to the body's references in order (`citePostedSummary`); pins 2825-2827 and 2830-2831 were
  repaired by a whole-pin `PUT`.
* **Changed**: [Vertical recipes](verticals.md) - a Tesla row.


## 2026-09-22 - Microsoft news, twelve pins across four desks

Ian asked to "pin Microsoft news events". Four agents posted twelve pins through `POST /api/pins`
without API credit, each on the desk its vertical names: @TechDesk for the company, product and
event pins (2852 and 2853, the July cut of 4,800 jobs and today's "Continuing Our Reset" with Halo
moving to Activision, one oldest-first chain; 2856, the April OpenAI amendment; 2857, FY27 Q1
earnings; 2879, Ignite 2026; 2880, Windows 11 26H2; 2881, Copilot Cowork; 2882, Fairwater in
Wisconsin), @CyberDesk for September's Patch Tuesday (2848), @LawDesk for the FTC probe (2850) and
@GameDesk for Gears of War: E-Day (2843) and Kojima's Physint casting at TGS (2845, threaded under
302). Every pin carries the tag `Microsoft`; the Xbox ones also `Xbox`. Every source wiki was
written by hand and `wiki:export` returns 0 jobs on all twelve.

* **Learned - Microsoft's own pages read with plain `curl` and a browser UA**:
  blogs.microsoft.com, news.microsoft.com, news.xbox.com, xbox.com store pages (edition prices),
  techcommunity, learn.microsoft.com, the investor-relations press releases and ignite.microsoft.com.
  Microsoft publishes its layoff memos itself (Amy Coleman's on blogs.microsoft.com, the Xbox one on
  Xbox Wire), so a Microsoft pin rarely needs the press as its source. The Microsoft 365 blog read
  with curl though the app's scraper returned nothing.
* **Learned - the brief's dates were wrong twice, and the announcement fixed both.** "Copilot Cowork
  GA in September" was 16 June (Charles Lamanna's post: "Today we're announcing the general
  availability"); "FTC widens the probe, 1 June" was The Verge's follow-up to a Bloomberg exclusive of
  13 February. A search summary or aggregator (tech-insider.org) turns a follow-up into the event's
  date. Trace every date back to the page that first said it, and never take one from a WebSearch
  summary: one also claimed Ignite 2025 was digital-only, and it ran in person for 20,000.
* **Learned - MSRC's Security Update Guide renders empty, but its CVRF API is keyless JSON:**
  `api.msrc.microsoft.com/cvrf/v3.0/updates('2026-Sep')`, then `/cvrf/2026-Sep` (17 MB). It dates
  the release and marks the exploited CVEs (a Threats entry reading `Exploited:Yes`). Cite Microsoft
  Learn's "Update release cycle for Windows clients" for the 10:00 AM Pacific release time. The
  outlets' flaw counts disagree (966, 974, 964, 975 depending on cloud-side fixes); follow the
  source and say so in the summary.
* **Learned - a Bloomberg exclusive is often mirrored in full on news.bloomberglaw.com**, same byline
  and timestamp, readable to curl, where bloomberg.com is 403 to curl and a paywall to the scraper.
* **Learned - Microsoft's earnings pattern:** every result since October 2024 came on the last
  Wednesday of the month after the quarter, after the close, with the call at 2:30 p.m. PT (EDGAR
  8-Ks with item 2.02 in `data.sec.gov/submissions/CIK0000789019.json`). Pin 2857 is `estimated` for
  28 October until the IR home page's "next earnings release" panel names the day. Windows 11 26H2
  (2880) is `estimated` for 31 October on the same kind of evidence (25H2 went out 30 September 2025);
  Microsoft's 7 October Windows and Surface event may date it.
* **Learned - a game launch can be a timed pin.** Xbox Wire's "gone gold" post gives the exact
  worldwide launch time ("8am Pacific (15:00 UTC)"). Steam's `release_date` said 9am PT, so don't take
  the time from Steam - and don't cite a Steam store page at all: the pipeline stores its age gate.
* **Learned - a YouTube live-stream VOD carries `startTimestamp` and `endTimestamp` in the watch
  page's HTML.** That gave the TGS broadcast's end; its start includes the pre-show, so take the
  start from the announced time. Tokyo Game Show's current site is `tgs.cesa.or.jp/<year>/en`; the
  old nikkeibp addresses redirect to 2024 or 404.
* **Learned - four agents at once exhaust the free services.** Nominatim answered 429 to every
  request partway through; Photon (`photon.komoot.io`, OSM data, keyless) did forward and reverse
  geocoding instead and found the named OSM feature "Microsoft Fairwater AI Datacenter". The YouTube
  Data API's search quota ran out too; `playlistItems` on a channel's uploads playlist (`UU` + the
  channel id after its `UC`) still worked.
* **Learned - verify the channel, not the name.** A search for "Halo" returned a GTA-roleplay
  streamer called Halo; the official channel is `HALO` (`UC7NCg0venpKJg3kuJojKlbQ`, oEmbed author
  `@Halo`). The Microsoft Security channel posts a monthly "Security Update Release Summary", a
  ready company video for any Patch Tuesday pin.
* **Learned - three pins could not reach a video.** No earnings video exists on Microsoft's channels
  (2857, two pictures), and YouTube had only commentary channels for the FTC probe (2850, three
  pictures). The layoffs pin's video (2852) is Xbox's showcase recap: company channel, not the event.
* **Learned - the save adds podcast references on its own,** which took Gears of War (2843) to seven
  references against the cap of five; changing a reference afterwards forces a summary rebuild.
* **Learned - the company's stored ticker note replaces the one in the POST body** for its own
  `relation: company` ticker; related and supplier notes are kept.
* **Slip - an agent sent Ian's email address to Nominatim** in its first User-Agent header. Use the
  app's own UA from `src/server/geocode.ts` for Nominatim, and a project contact
  (`admin@chronopin.app`) for EDGAR, never the owner's address.
* **Changed**: [Vertical recipes](verticals.md) - a Microsoft row; [Sources](sources.md) - rows for
  Microsoft's sites, MSRC CVRF, Bloomberg Law, Photon, Steam and TGS, and Windows Central reads again.

## 2026-09-22 - Abbott news, twelve pins (@HealthDesk)

Ian asked to "pin Abbott Labs news events". Three agents drafted bodies without API credit and the
lead posted them in order through `POST /api/pins` (pins 2887-2896, 2898-2899): the Exact Sciences
deal and its close (2888 threaded under 2887), Q2 2026 results and the estimated Q3 call (2890
under 2889), the FreeStyle Libre 3 false-low correction, the Gill/NEC and DOJ infant-formula
settlements, the Google glucose-AI tie-up, FDA approvals of Volt PFA, TactiFlex Duo and the Libre
Duo glucose-ketone sensor, and the Amulet 360 CE Mark. Every pin carries the tag `Abbott`.

* **Learned - drafts to files, one poster.** Agents wrote bodies to `out/<key>.json` with a
  `parentKey`; the lead reviewed and posted them in sequence, so the first post created the one
  `Company` row (ABT adopted from its `stocks`) and the threads resolved from the ids it recorded.
  Parallel posters would race on the company-by-name lookup.
* **Learned - `abbott.mediaroom.com` is the whole archive in reach of `curl`**
  (`/press-releases?l=100&o=<offset>` lists 100 a page, back to 2022). Its releases carry only the
  logo and no video embeds, so the pictures came from cited coverage (MedTech Dive's `imgproxy`
  images, Chicago Tribune/Quartz/Journal Sentinel photos through Yahoo) and the videos from
  Bloomberg, local TV, NBC and Abbott's own product channels. The CE Mark release's PR Newswire
  photos (`mmx.prnewswire.com`, 2700px) beat the FDA announcement's 400px ones.
* **Learned - FDA records.** `accessdata.fda.gov` refuses `curl`; the openFDA API gives the PMA or
  De Novo number, and the record page reads through WebFetch. The FDA's decision date runs ahead of
  the company's release (Volt 19 vs 22 December 2025, TactiFlex Duo 4 vs 8 September 2026); the pin
  takes the release day and the summary gives the FDA's.
* **Learned - an earnings pattern can shift.** Abbott reported Q3 on the third Wednesday of October
  for years, but every 2026 report came on a Thursday, so Q3 2026 is `estimated` on 21 October with
  15 October named as the other likely day. The call notice due in late September settles it.
* **Learned - geocode the HQ once.** Three agents hitting Nominatim at once got 429s for minutes,
  and they chose two different "Abbott Park" points (the first hits are city parks). The lead should
  geocode the shared place and hand it down.
* **Learned - blocked trade press:** Fierce Biotech, MassDevice, MobiHealthNews, MDDI, Medical
  Device Network, TCTMD, Investing.com and `abbottinvestor.com` all 403 to fetches.
* **Feedback - repeat of the EDGAR rule:** a first reachability check sent the owner's address in a
  `From:` header. The contact is a project address, never the owner's.
* **Changed**: [Vertical recipes](verticals.md) - a medtech and health company news row.

## 2026-09-22 - Eli Lilly news, ten pins (@HealthDesk)

Ian asked to "pin Eli Lilly news events". Four agents posted pins 2840-2842, 2846, 2849, 2861,
2863, 2866, 2902 and 2903 through `POST /api/pins` without API credit: the first $1 trillion
drugmaker close (2846), three acquisitions (Centessa 2841, the three vaccine developers 2840,
Merida 2842), retatrutide's TRIUMPH-1 readout (2861) and its Q1 2027 FDA submission (2866,
threaded under it, with the slip from end-2026 as a delay), eloraTZP at EASD 2026 in Milan
(2863), the Inluriyo + Verzenio approval (2902), the Houston plant groundbreaking (2903, threaded
under the Foundayo approval 1860) and Q3 2026 earnings (2849, `estimated`). Every pin carries the
tag `Lilly`; 1860 (@TechDesk's) was re-tagged to match. The company line and a standing NVO
relation were set with `stocks:sync --about/--relate`, so every Lilly pin now carries NVO.

* **Learned - `investor.lilly.com` and its `lilly.gcs-web.com` mirror 403 every fetch;** the PR
  Newswire copy of each release is Lilly's own words and reads with `curl`, and Lilly's
  newsroom list there is the quickest way to see whether an earnings date has been confirmed
  ("Lilly confirms date and conference call for ...", about two weeks before). Its `og:image`
  is always a logo, so pictures come from the cited coverage.
* **Learned - trial readouts are not 8-Ks,** but the quarterly results Exhibit 99.1 (CIK 59478)
  restates the pipeline timelines ("first quarter of 2027"), so it is the filed source for a
  submission date.
* **Learned - "hit $1 trillion" coverage is intraday.** Settle a close with Nasdaq's daily close
  times the share count on the 10-Q cover (21 Nov 2025: $1,059.70 x 945.4M = $1.0018T).
* **Learned - a completed takeover's target ticker is dropped** (CNTA, delisted when Centessa
  closed), so the pin cannot carry it; the target's closing 8-K on EDGAR dates the completion.
* **Learned - a company-level relation lands on every pin of the company,** even off-topic ones
  (NVO on a breast-cancer approval). Set rivals at company level only when they fit most pins.
* **Learned - four agents geocoding at once got Nominatim 429s for ~10 minutes;** Photon
  (`photon.komoot.io/api` and `/reverse`) serves the same OSM data. A new plant not yet in OSM
  was placed from the EPA ECHO stormwater permits for its ZIP (keyless `get_facilities?p_zip=`).
* **Learned - EASD's programme PDF** (`pdftotext -layout`) gives each session's hall and time;
  easd.org 403s `curl`, WebFetch saves the PDF. YouTube searches for a congress are dominated by
  "ConferenceHype" AI summaries - not a news outlet, never a pin's video.
* **Learned - a create can half-fail:** 2903's POST returned 500 "fetch failed" after the pin row
  was saved with no media, tags or stocks; a whole-pin `PUT` of the same body completed it.
* **Learned - one Getty photo (2092473213) leads STAT, BioPharma Dive and CNBC Lilly stories,**
  and CNBC reuses one Reuters Lilly photo across stories; view before taking an `og:image`.
* **Changed**: [Vertical recipes](verticals.md) - Lilly added to the health company news row.

## 2026-09-22 - Johnson & Johnson news, thirteen pins (@HealthDesk, one @LawDesk)

Ian asked to "pin Johnson & Johnson news events". Five agents posted their own pins through
`POST /api/pins` without API credit and wrote every link wiki by hand (`wiki:export` at 0 jobs on
all thirteen). Every pin carries the tag `J&J`, and `tag:"J&J"` returns all thirteen. Threads:
the Q3 call (2864, 13 October, `scheduled`) heads Q2 results (2865), newest first as a schedule;
the DePuy Synthes spinoff runs oldest first, announcement (2858) -> Apollo talks (2862) -> an
`estimated` mid-2027 separation (2883, at Raynham); talc runs the $1.56B Baltimore verdict (2851,
@LawDesk, `company: null`) -> the $5.5B ovarian settlement (2869); the TrumpRx pricing deal (2844)
heads the Wilson, NC plant Governor Stein named the next day (2847). Standalone: the 8 December
Enterprise Business Review (2867), Icotyde's approval (2897), Caplyta's bipolar-mania Phase 3
(2900) and the Firefly Bio close (2901).

* **Learned - parallel posters are safe on the company row.** `Company` is upserted with
  `ON CONFLICT ("name")`, so five agents posting at once made one `Johnson & Johnson` row (JNJ
  adopted from `stocks`, logo found). The Abbott run's single-poster pattern is not needed for
  that; it is still the cure for Nominatim 429s, which every agent here hit for 10-15 minutes.
  Geocode the HQ once and put the point and label in the brief.
* **Learned - the first report is earlier than the roundups.** The Apollo/DePuy scoop was
  Bloomberg's on Friday 11 September; the 14 September dates in the search results were
  follow-ups. Bloomberg reads in full through its Yahoo Finance syndication ([Sources](sources.md)).
* **Learned - an FDA letter carries the time.** openFDA gave NDA 220149 approved 2026-03-17 and
  the signed letter reads "03/17/2026 04:12:23 PM"; J&J announced at 07:49 ET on the 18th. Pin 2897
  is timed to the letter, where the Abbott row dates approvals to the release day - two rules for
  one vertical, pending Ian's call.
* **Learned - a settlement with no court step has no forward pin.** The talc proposal needs 95%
  claimant participation, not court approval, and the MDL's only dated item is a fortnightly
  status report; the third chain pin was skipped rather than invented.
* **Learned - an investor-day date lives in the call transcript.** J&J's CFO named 8 December on
  the Q2 call; no press release or events calendar carried it yet. That is the company's own word,
  so `scheduled`, with no venue - the pin sits at HQ and says so.
* **Learned - a POST can 500 and still create the pin.** 2847 answered "fetch failed" after the
  row and references were saved (create is not transactional); media, tags and stocks were
  restored by a whole-pin `PUT`. Search before re-posting after a 500.
* **Learned - scrape media on J&J pages is junk:** a cookie-banner logo and two photos of
  **Dwayne Johnson** from Wikipedia (the title-word match). `mms.businesswire.com`,
  `jnjmedtech.com` press images and SEC-embedded images all 403 the downloader.
* **Learned - blocked:** massdevice, fiercebiotech/fiercepharma (curl only; the app's scraper
  reads them), odtmag, mddionline, investing.com, seekingalpha, drugs.com, businesswire (all
  fetchers), The Hill (captcha, then 404). The YouTube Data API search quota ran out mid-run;
  `channels?forHandle=` + `playlistItems` and oEmbed still work.
* **Mistake (the lead's) - the owner's email went out in a User-Agent.** The brief told agents to
  use a Nominatim UA naming Ian's address, overriding this page's own rule, and they sent it to
  Nominatim, Wikimedia, SEC, Photon and Overpass. A brief multiplies a slip across every agent:
  the contact is a project address, checked in the brief before launch.
* **Changed**: [Vertical recipes](verticals.md) - J&J folded into the medtech and health row;
  [Sources](sources.md) - jnj.com, investor.jnj.com's feed API, Bloomberg through Yahoo.

## 2026-09-22 - HPE news, eight pins (@TechDesk, one @LawDesk)

Ian asked to "pin Hewlett Packard Enterprise Company news events". Three agents posted, without API
credit, through `POST /api/pins`: Q3 FY26 results (2868) and the estimated Q4 call (2870, answering
2868); the Networking Investor Day (2871); Discover Las Vegas 2026 (2859) and Barcelona 2026 (2860);
the Juniper close (2913), Judge Pitts' Tunney Act ruling on it (2917, @LawDesk, answering 2913); and
Lux's delivery to Oak Ridge (2920). Every pin carries the tag `HPE`. HPE's company line and its
relations (NVDA, AMD, AVGO suppliers; CSCO, DELL related) were set by hand with `stocks:sync`.

* **Learned - a first pin's stock note becomes the company's line.** `adoptCompanyStock` wrote
  the Barcelona pin's `note` ("which holds HPE Discover Barcelona as its flagship annual European
  event") into an empty `Company.tickerNote`, so every HPE pin would have read it. When a batch
  opens a new company, set `--about` with a company-wide clause straight after the first post.
* **Learned - a rolling event page is the wrong source for a past edition.** hpe.com's Discover
  Las Vegas page already showed the 2027 dates; the 2026 pin cites the 2026 on-demand page and dates
  the event from NVIDIA's event page (a reference with its own `startDate`). Barcelona's page will do
  the same after December.
* **Learned - the brief's guessed time was wrong.** Q3's call was 4:30 p.m. ET, not the 5:00 the
  brief assumed (earlier Q4 calls were at 5:00); the transcript PDF's header settled it. Read the
  time from the company's own transcript or webcast notice, never from a brief.
* **Learned - check whether a court has ruled before pinning a hearing.** The brief offered the
  March hearing; the agent found the 12 August 2026 order on CourtListener and pinned the ruling.
* **Learned - a reference `startDate` must be a bare `YYYY-MM-DD`;** a time part is a 400 before
  anything is saved.
* **Open**: the Investor Day venue is inferred (HPE's Sunnyvale campus, the former Juniper HQ);
  HPE's release says only "Sunnyvale, California". The two earnings pins have no video, since HPE
  uploads none.
* **Feedback**: none yet.
* **Changed**: [Vertical recipes](verticals.md) - an HPE row; [Sources](sources.md) - hpe.com,
  investors.hpe.com, olcf.ornl.gov, CourtListener RECAP.

## 2026-09-22 - Alphabet news, twelve pins (@TechDesk, @LawDesk)

Ian asked to "pin Alphabet news events". Five agents posted pins 2833-2839 and 2925-2929: Gemini
3.8 Flash (2834), Google's disclosure that Gemini broke into three outside systems (2839),
Googlebook going on sale (2837), the EUR 13 billion Finnish data centres (2838), Judge
Brinkema's ad-tech remedies (2835, @LawDesk) and the joint proposed final judgment due under it
(2836, threaded), Alphabet's Q3 results (2833) and Waymo's public launches in Las Vegas, Denver,
San Diego and Tampa plus its Singapore announcement (2925-2929). Every pin carries the tag
`Alphabet` and its unit (`Google`, `Waymo`).

* **Learned - an earnings date called "confirmed" by a calendar is usually its own estimate.**
  TipRanks and search summaries said Alphabet reports 27 October; Alphabet had announced nothing,
  the day is a Tuesday, and it has reported on a Wednesday for five quarters. Check the company's
  own IR news list (abc.xyz reads through `/api/scrape`, not curl), then compare Wall Street
  Horizon with Nasdaq's `api.nasdaq.com/api/analyst/<SYM>/earnings-date` (Zacks); here they said
  28 October and 4 November. Broker "expectations" pages carry stale guidance: take capex
  guidance from same-day earnings coverage (Alphabet's is $195-205B, not the $180B in the brief).
* **Learned - read the order, not the paraphrase.** The press said both sides file proposed final
  judgments; Brinkema's order (ECF 1857) asks for one joint filing within 30 days. CourtListener's
  search API reads a whole docket keyless
  (`api/rest/v4/search/?type=r&q=docketNumber:"1:23-cv-00108" court_id:vaed`), its docket page
  shows every entry's text, and PDFs from storage.courtlistener.com read with `pdftotext`. Date a
  ruling from its "Signed by ... on M/D/YYYY" line.
* **Learned - a US company's announcement about Asia carries the US date.** Waymo's Singapore
  post says 17 September; the LTA release and local coverage say the 18th, which is also the UTC
  day. Waymo's own launches are dated on `waymo.com/updates` (curl reads it); local TV and papers
  carry the service-area boundaries its posts leave out.
* **Learned - an incident disclosure may be only a statement to the press** (Google's Gemini
  intrusion: a quote from its VP of security engineering to the WSJ and others). Use the fullest
  outlet quoting it as the source and say so in the date reasoning.
* **Learned - Nominatim throttles the shared IP** when several agents geocode at once (429s for
  about ten minutes). Retry with a 60-second back-off, or have one agent geocode for all.
* **Fixed - WebP and AVIF pictures failed the save** ("Mime type image/webp does not support
  decoding"), which blog.google and most CDNs now serve. `shrinkImage` converts them with sharp
  (JPEG, or PNG when the picture has transparency) before Jimp reads them.
* **Still open - a create that fails part way leaves a half-saved pin.** The pin row and its
  references are written before its media, so a failing picture left pins 2834 and 2837 without
  media, tags or stocks, and a retry was refused as a duplicate source. After any `POST` error,
  search for the pin and repair it with a whole-pin `PUT` rather than posting again.
* **Learned - related and supplier tickers are written after the save**; read the pin back about
  ten seconds later before checking them.


## 2026-09-22 - Babcock & Wilcox news, twenty pins (@EnergyDesk)

Ian asked to "pin Babcock & Wilcox news events". Four agents posted pins 2930-2949 through
`POST /api/pins` without API credit and wrote every link wiki by hand (`wiki:export` at 0 jobs on
all twenty). Every pin carries the tag `B&W` and `Energy` first, so the batch went to @EnergyDesk.
Chains, oldest first: the Applied Digital / Base Electron project (2941 LNTP -> 2944 Siemens
Energy turbines -> 2946 $2.4B full notice to proceed -> 2948 the 20-turbine FastPower order ->
2949 the plant going online, `delayed` from 2028 to 2030) and the earnings calls (2942 Q4 2025 ->
2943 Q1 -> 2945 Q2 -> 2947 Q3, `estimated` 9 November 5 pm ET). Standalone: the Allen-Sherman-Hoff
sale (2930), the $67.5M ATM raise (2931), the $40M Canadian refinery scrubber (2932), the $230M
stock offering (2933), the $50M buyback (2934), the 2026 notes paid off (2935), Denham Capital
(2936), Cache Power's Alberta study (2937), a SolveBright carbon-capture LNTP (2938), TerraSpark's
West Virginia coal plant (2939) and a $130M air-quality project (2940).

* **Learned - the lead's newsroom dates were wrong six times.** Pairing each release link with
  the nearest date on B&W's list page gave neighbours' dates (Denham 10 Sep not 29 Sep, TerraSpark
  8 Jun not July, the ATM 7 Nov not 20 Nov, the notes 14 Aug not 10 Sep, the 20-turbine order
  11 Aug not 17 Aug). Every agent re-dated from the release's own "Posted" line and EDGAR; a
  brief's dates are candidates, never facts. EDGAR's `data.sec.gov/submissions/CIK0001630805.json`
  lists every 8-K with its items and acceptance time.
* **Learned - a completion can precede its release.** The A-S-H 8-K dates the sale's close
  31 October; the release says "has sold" on 4 November. The pin takes the close.
* **Learned - timing a release with no time.** B&W releases carry a date only. Business Wire's
  copy on Yahoo Finance gives it (`datePublished`; the URL suffix `-103000775.html` is 10:30:00Z),
  and the Item 2.02 8-K's EDGAR acceptance stamp is a citable time for earnings. Morningstar's
  Business Wire timestamps disagree with EDGAR - do not use them. B&W's results release is not
  always on the call day: Q3 and Q4 2025 went out 6 and 12 days early, bundled with a project.
* **Learned - the site lives in the investor deck.** No release names where the Base Electron
  plant is; B&W's August 2026 investor overview (8-K Ex 99.2, slide 10) says near Center, North
  Dakota. The design-build agreement is on EDGAR (Q1 10-Q Ex 10.3) with the schedule redacted, so
  the in-service date came from Base Electron quoted in the Bismarck Tribune ("operational in
  2030") against B&W's own "end of 2028".
* **Learned - TownNews sites ROT47-encode their paragraphs** (Bismarck Tribune; lines starting
  `kAm` in the raw HTML). The app's stored source text keeps the encoded form, so a credit-funded
  wiki job would read gibberish; decode before writing the wiki.
* **Learned - B&W pictures.** Release `og:image`s are the logo. The real picture is the card
  image on B&W's topic and product pages (`/assets/...__FillWzQwMCwyMjZd.jpg`; drop the `__Fill`
  or `__ResizedImage` suffix for the original), and `investors.babcock.com` hosts the current
  investor deck as 3000px slides. SEC-hosted images 403 the app's downloader. The only HQ picture
  is `babcock.com/assets/Nav/Exterior-view-of-Babcock-Wilcox-Akron-HQ.jpg` (400px).
* **Learned - B&W video is one clip.** The B&W YouTube channel (`UC1gHvDVeecSAnqHMKOHEU0w`, 24
  uploads) has the CNBC Mad Money CEO interview (aired 15 May 2026, the offering's pricing day)
  and an NYSE Live clip; seven of the twenty pins have no video. The YouTube Data API search
  quota ran out on the first query - `channels?forUsername=` plus `playlistItems` still work.
* **Trap - a syndicated transcript under the wrong company.** fool.com's "Babcock & Wilcox (BW)
  Q4 2025 Earnings Transcript" and Yahoo's call summary are Aurora Mobile's call; WebSearch's
  summary repeated Aurora's RMB figures as B&W's. Check the speakers before citing one.
* **Learned - the wiki reader cannot read JSON** (`api.nasdaq.com` ended `failed`); cite a
  readable page for an earnings-date estimate. Long SEC filings export as 3-5 parts; one
  background agent per filing wrote them in parallel, and `wiki:apply` skips a source another
  agent already wrote.
* **Blocked:** datacenterdynamics, benzinga, tipranks, investing.com (curl; the app's scraper
  reads it, but its title was wrong), marketscreener, stockhouse, equibles, power-technology,
  carbonherald and gascompressionmagazine (challenge pages). power-eng.com reads through WebFetch.
* **Worked:** the brief's company-wide stock `note` was adopted as `Company.tickerNote` on the
  first post, so no `stocks:sync --about` pass was needed. Nominatim gave no 429s with the HQ
  geocoded once by the lead; Overpass found the Marguerite Lake 826S substation Nominatim lacks.
* **Open:** 2948 (the FastPower turbine order) sits in the Applied Digital chain though it is
  for a second, unnamed data-centre project; 2942 and 2947 carry one picture each.
* **Feedback**: none yet.
* **Changed**: [Vertical recipes](verticals.md) - an energy company news row; [Sources](sources.md)
  - babcock.com, investors.babcock.com, Yahoo's Business Wire copies, TownNews sites.

## 2026-09-22 - NVIDIA news, fourteen pins (@TechDesk)

Ian asked to "pin nvidia news events". Four agents posted pins 2952-2959, 2961, 2967-2969, 2971
and 2972 through `POST /api/pins` without API credit, and wrote every link wiki by hand
(`wiki:export` at 0 jobs on all fourteen): the Hugging Face deal (2967, $12.93B) and its
`estimated` H1 2027 close (2968, answering 2967); the PORTS-Pike campus with SB Energy and OpenAI
(2969); the Palantir supply-chain stack at AIPCon 11 (2972); Q2 FY27 results (2956) and the Q3
call (2957, answering 2956); the AI Energy Management Alliance with Emerald AI and Google (2958);
DSX Ready (2961); Vera Rubin NVL72's MLPerf Inference v6.1 debut (2955, answering 1857); CUDA-Q
Logical at IEEE Quantum Week in Toronto (2959); Isaac ROS 5.0 at ROSCon (2971); and GTC Berlin
2026, Washington D.C. 2026 and San Jose 2027 (2952-2954). Every pin carries the tag `Nvidia`, and
the eight earlier @TechDesk NVIDIA pins (1834-1839, 1857, 2329) were given it by whole-pin `PUT`.

* **Learned - NVIDIA's newsroom list is the discovery source:** `nvidianews.nvidia.com/news?page=N`
  reads with `curl`, and `nvidianews.nvidia.com/rss.xml` gives every item's exact GMT time (the
  list and the release pages show only a date). Many "news" items are blog posts on
  blogs.nvidia.com (the Hugging Face deal, MLPerf, Isaac ROS, AEMA, DSX Ready), whose
  `article:published_time` is the announcement time. Release `og:image`s are often a logo lockup.
* **Learned - NVIDIA names its next earnings day at the end of each call,** in the IR head's closing
  remarks ("... is scheduled for November 17"), weeks before any calendar lists it. So Q3 FY27 is
  `scheduled` for a **Tuesday** although every 2.02 8-K since 2024 fell on a Wednesday - the
  company's own word beats the pattern. investor.nvidia.com 403s to `curl`, but its Q4 feed API
  reads keyless (`/feed/FinancialReport.svc/GetFinancialReportList?reportTypes=Quarterly%20Report&year=2027`,
  `/feed/Event.svc/GetEventList?eventSelection=1&pageSize=-1&sortOperator=1`) and the q4cdn
  transcript PDFs read with `pdftotext`.
* **Learned - NVIDIA's releases carry no dateline and rarely name the venue.** The CUDA-Q release
  never says IEEE Quantum Week; SiliconANGLE and Quantum Computing Report did. Check the trade
  press for the venue before defaulting a product pin to the HQ.
* **Learned - EDGAR 8-Ks found two events the newsroom list buried:** the PORTS-Pike residual value
  guaranties (item 1.01, $105B cap) and the Hugging Face signing (item 8.01, signed 2 September,
  announced the 3rd - the pin takes the announcement). The press release is filed as Ex 99.1 under
  its own name; list the filing's `index.json` to find it.
* **Mistake (the lead's) - the brief overrode the trade-show rule.** It told the GTC agent to use the
  previous edition's keynote as each edition's video, which [Vertical recipes](verticals.md#trade-shows-and-annual-festivals)
  rule 6 forbids. The agent flagged it; the keynotes were swapped for NVIDIA's own GTC Berlin 2026
  promo (found in the channel's uploads playlist, not embedded on any event page), and DC 2026 and
  San Jose 2027 were left with no video since none exists yet. San Jose starts 14 March (the poster
  call's "between Sunday, March 14 and Thursday, March 18") under rule 4, not the headline 15th.
  Check a brief against the vertical's recipe before launch.
* **Learned - NVIDIA's GTC sub-pages are part-stale:** `/gtc/dc/travel-and-venue/` and
  `/gtc/dc/keynote/` still showed 2025. Take the venue from the edition's main page or FAQ and check
  each page's `<title>` year; the FAQs give the day-by-day schedule and keynote time.
* **Learned - the duplicate checker paired two pairs that are distinct events** (1838 fiscal-2028
  guide vs 2956 Q2 results, both 26 August; 2967 deal vs 2968 close). Both were rejected through
  `PUT /api/pins/:id/duplicates/:otherId {status: "rejected"}` as the author.
* **Fixed - pin 1838 carried Wikimedia's `Crab_Nebula.jpg`** (a title-word image match); removed by
  whole-pin `PUT`.
* **Learned - fetch notes:** globenewswire.com hangs for `curl` (financialcontent.com's GNW mirror and
  stocktitan.net with `curl -k --compressed` carry the same text and timestamp); roscon.ros.org sits
  behind an Anubis proof-of-work wall (NVIDIA's own `/events/roscon/` page gives venue and dates);
  palantir.com is a JS shell; Photon reverse fails with `&lang=en` and returns empty bodies under
  load (retry after 5 s). The YouTube Data API search quota was spent at the start again;
  `channels?forHandle=` + `playlistItems` and a `ytInitialData` parse of a results page still work.
* **Open**: 2959's video is an older NVIDIA Developer CUDA-Q video (the platform, not this launch);
  2972 sits at Miami city level because AIPCon 11's venue is unpublished; 2957's 2 p.m. PT call time
  is NVIDIA's standing time, to firm up when the IR calendar lists it.
* **Feedback**: none yet.
* **Changed**: [Vertical recipes](verticals.md) - an NVIDIA row; [Sources](sources.md) - an NVIDIA row.

## 2026-09-22 - TSMC news, fourteen pins (@TechDesk, three @LawDesk)

Ian asked to "pin TSMC news events". Four agents posted, without API credit, through `POST /api/pins`:
Q2 2026 results (2950) and the 15 October Q3 call (2951, `scheduled`, answering 2950); N2 volume
production at Kaohsiung Fab 22 (2962) and A16 volume production, `delayed` to 2027 (2963, answering
2962); the 2026 Technology Symposium (2964) and OIP Ecosystem Forum (2965) in Santa Clara; ESMC
Dresden's topping-out (2960) and production start (2973, answering 2960); JASM Kumamoto Fab 2, `delayed`
to 2028 (2966); Arizona Fab 3 (2970); the US-Taiwan $250B chip investment MOU (2977); and the 2nm
trade-secret case as one @LawDesk chain, indictment (2974) -> sentence (2975) -> final (2976). Every pin
carries the tag `TSMC`, and pin 2205 (@BuildDesk's Arizona Fab 2) gained TSMC's Arizona page and a CNA
report as references. The lead set TSMC's company line and relations (AAPL, NVDA related; ASML
supplier) with `stocks:sync --about/--relate` *before* the first post, so no pin's note became the line.

* **Mistake (an agent's) - four pins posted with no `company`.** The technology agent left `company`
  out of its bodies, so 2962-2965 had no `companyId`, and without it `syncPinStocks` adds no company
  ticker and no relations (only the article's own TSM). The agent read the pins back, saw the relations
  missing and reported it, but did not notice the company was null. A whole-pin `PUT` with
  `company: "TSMC"` fixed all four. After a batch, check `companyId` on every pin, not only its tickers.
* **Learned - TSMC's own sites are Cloudflare 403 to `curl`** (pr.tsmc.com, investor.tsmc.com,
  tsmc.com, esmc.eu, including PDFs and images) but read through the app's scraper and WebFetch. Their
  pictures cannot be media, and the scrape's top-up offered Apple's A16 Bionic for the A16 node and a
  GTX 1070 for ESMC. EDGAR 6-Ks (CIK 1046179) hold the official copy of every release.
* **Learned - investor.tsmc.com's teleconference page always shows the *next* call** and named 15
  October 14:00-15:30 Taiwan before TSMC's financial calendar or any filing did. The in-person venue is
  filed with the exchange 2-3 weeks ahead (Q2: the Mandarin Oriental Taipei, filed 29 June); a venue
  remembered from earlier years (the Shangri-La) was wrong.
* **Learned - the brief's premise was stale.** TSMC's A16 page still says "production-ready in 2H26",
  but its symposium roadmap moved volume production to 2027 (Kevin Zhang to Tom's Hardware). The
  company's latest spoken word beat its own static page, and the pin carries the slip as a stated delay.
* **Learned - Taiwan's court sites (judicial.gov.tw) answer `curl` with a CAPTCHA;** the prosecutors'
  site does not, and its "今（N）日" wording dates each step. CNA/Focus Taiwan covers the rulings; search
  summaries blurred the two Tokyo Electron indictments and called the April verdict final (it became
  final on 30 July, and only for two of the three).
* **Learned - a US-Asia deal carries the US date.** Taiwan-side reports put the MOU on "Friday" 16
  January; it was signed on the 15th in Washington (the Waymo Singapore trap again).
* **Decision - a pledge is not a price.** 2977 went up with `price` 250000000000 for the $250B
  investment pledge; the lead cleared it, following the funding-round rule (the amount is what the
  event *is*, not what it cost). A fab's own investment figure stays a price (ESMC EUR 10B).
* **Learned - a market-cap milestone needs a settled close.** TSMC's $2T in February 2026 held only
  on the NYSE ADR price (the Taiwan listing gave about $1.66T), and Nasdaq's history returned no TSM
  rows, so it was skipped.
* **Learned - Photon answered every geocode this time** (named OSM features down to "TSMC Fab22 P1"
  and Arizona's "P3"), and its forward search works in Chinese; its reverse lookups returned empty
  bodies on and off, and `lang=en` broke them. The YouTube Data API search quota ran out again;
  `youtube.com/results` (`ytInitialData`, verified badge) plus oEmbed replaced it.
* **Learned - `wiki:export` deletes its `--out` folder on each run;** keep `results/` for
  `wiki:apply` somewhere else.
* **Not pinned:** N2P, A14 (in the symposium summary), BIS revoking TSMC Nanjing's VEU status (a good
  next pin), the Lo Wei-jen search and the July 2026 leak indictment, Taichung Fab 25.
* **Feedback**: none yet.
* **Changed**: [Vertical recipes](verticals.md) - a TSMC row; [Sources](sources.md) - TSMC's sites,
  CNA/Focus Taiwan, Taiwan prosecutors and courts, commerce.gov.

## 2026-09-23 - Daily job news, run 5 (session)

* **Learned** (Wikimedia media top-up mismatches) Pin 501 (Jakarta giant sea wall) carried two Wikimedia Commons pictures of unrelated subjects - "Soviet Invasion of Czechoslovakia" and "Baltský řetěz" (Baltic Way) - both with the ?utm_source=en.wikipedia.org&utm_campaign=imageinfo suffix that the Wikipedia image top-up adds. pin_health_scan only flagged one as 'blocked' (429), not as wrong. When a scan or review surfaces an upload.wikimedia.org picture, read its filename against the pin's subject; a filename about another subject is a wrong picture to remove, whatever its HTTP state. Worth a one-off sweep of utm_campaign=imageinfo pictures by an admin session.
* **Learned** (Morocco time zone change) Morocco moved permanently from GMT+1 to GMT at 02:00 on Sunday 20 September 2026 (le360.ma, 24 Aug 2026). Any Moroccan local time from that day on is the same as UTC. Earlier research briefs assumed +1 and would have put the 23 Sep election an hour early. Check this before converting times on Moroccan pins, and check older pins whose dates fall after 20 Sep 2026 that were converted at +1.
* **Learned** (Launch pins: where to verify dates) For weekReview of launch pins, spacex.com/launches pages come back empty to fetch, and rocketlabcorp.com and nasaspaceflight.com return 403. Spaceflight Now's launch schedule (spaceflightnow.com/launch-schedule/) and its per-mission pages (spaceflightnow.com/launch/<vehicle>-<mission>/) are readable and current, so use them first to check a date and as a reference. They caught Starlink 15-25 slipping from 30 Sep to 10 Oct (pin 1946), which Launch Library had not yet reflected. A launch slipping past its chain parent breaks the newest-first schedule chain; mark it for a `spacex:launches` re-run rather than re-threading by hand.

## 2026-09-23 - Sable Offshore news, ten pins (@EnergyDesk, @LawDesk), and the keyed pipeline repaired

Ian asked to "pin SABLE OFFSHORE news events using claude key credit and verify everything works",
then, part way through, "switch to using session credits now". Pins 2984-2993: the Santa Ynez
restart fight as one oldest-first chain - Judge Anderle's Coastal Commission ruling (2984), PHMSA's
emergency special permit (2985), the Ninth Circuit's refusal to block it (2986), Judge Geck upholding
the injunction (2987), the restart under the Energy Secretary's Defense Production Act order (2988),
Geck's noncompliance ruling (2989), Judge Wilson's ruling that the DPA order preempts California
(2990) and Platform Hondo's restart (2991, `delayed` June -> September) - and Q1 -> Q2 2026 results
(2992-2993). Every pin carries `Sable` and `Santa Ynez`; rulings are @LawDesk's with `company:
Sable Offshore` so they sit in the company's sentiment graph.

* **Fixed - the extraction had been failing on every keyed call.** The schema had grown to 20
  nullable (`['string','null']`) fields; structured output allows 16 and rejects the whole schema
  ("too many parameters with union types"), so `extractPinFields` returned null and every scrape
  quietly handed the work to a session - invisible while the key had no credit. Six rarely-set
  fields (`originalStartDate`, `delayReasoning`, `workTitle`, `episodeStatus`, `amazonUrl`,
  `bestBuyUrl`) are now plain strings, empty when unknown, read back as null by `emptyAsNull`; a
  test holds the count at 16 or fewer. **Adding a nullable field to `SCHEMA` needs another one
  turned into a plain string.**
* **Fixed - the reference search always timed out.** It allowed 90s a turn; Opus with up to ten
  searches and fetches took 166s on a real page, so every keyed search returned nothing. Now 300s a
  turn, and `/api/scrape`'s `maxDuration` is 360. A keyed scrape takes 2-4 minutes.
* **Learned - keyed drafts still need a curator's review.** The extraction dated the DPA pin to the
  expected first sale rather than the restart (a note fixed it), called the DOJ the company of a
  ruling about Sable, dated a ruling to the DOJ's release two days later, and the page's images
  included ad GIFs, logos, a 2015 Kamala Harris photo, protest photos on an earnings pin, a Thomas
  Nast cartoon and three North Sea rigs on the Hondo pin. The references and summaries were good.
* **Learned - a shell heredoc eats dollar amounts.** Writing a pin body in an unquoted `<<EOF`
  turned "$137.1 million" into ".1 million" (`$1` expanded); pin 2993 was repaired by a whole-pin
  PUT. Write bodies from a quoted heredoc (`<<'EOF'`) or a file.
* **Learned - switching the app to session mode** without touching `.env.local`: start the dev server
  with `ANTHROPIC_API_KEY=REPLACE_WITH_ANTHROPIC_API_KEY` in its environment (process env wins over
  `.env.local`, and that value is the "no key" sentinel `getClient` checks), and prefix every
  script the same way. Scrapes then return `llm: "session"` in seconds, save listeners skip their
  Claude steps, and daily jobs on `auto` use the Claude Code session.
* **Learned - sableoffshore.com 403s `curl`** but the app's headless scraper reads its releases;
  EDGAR (CIK 1831481) has every release as an 8-K exhibit, and `data.sec.gov/submissions` gives
  each 8-K's acceptance time. Sable has no Wikipedia article: its logo came only after
  `websiteUrl` was set by hand.
* **Learned - Las Flores Canyon and Pentland are not in OpenStreetMap;** Platform Hondo, Harmony
  and Heritage are (`man_made=offshore_platform`), and Commons has CC photos of all three.
* **Fixed - a hydration mismatch on every pin whose references disagree on a date.** The
  "possible Mar 13 - 14, 2026" range came from `Intl.DateTimeFormat.formatRange`, which in Node puts
  thin spaces (U+2009) around the dash and in Chrome plain ones; `formatDayRange` now normalises
  them (DateRanges.test.ts).
* **Open - translations are a site-wide backlog:** 2,669 pins have none (only 15 do), since
  translating needs the key. The Sable pins were translated by hand with `translations:sync
  --export/--apply`.
* **Changed**: [Sources](sources.md) - sableoffshore.com; this entry.

## 2026-09-23 - Broadcom news, twenty-five pins straight to prod (@TechDesk, four @LawDesk)

Ian asked to "pin Broadcom news events on prod" - the first batch posted to www.chronopin.com rather than
the local database. Four agents drafted bodies only; the lead validated each and posted them through prod's
`POST /api/pins` with prod-issued curator tokens. Chains, oldest first: results Q1 FY26 (3044) -> Q2 (3045)
-> Q3 (3046) -> Q4, `scheduled` Wed 9 Dec 2026 (3047); OpenAI's 10 GW deal (3035) -> the Jalapeno chip unveiled
(3036) -> first deployment, `estimated` end of 2026 (3037); VMware Explore Las Vegas (3027) -> Explore on Tour
Mumbai, Singapore, Frankfurt, Tokyo, London, Washington D.C. and Sydney 2027 (3028-3034); @LawDesk's EU case,
the Commission's information demand (3041) -> Broadcom's action T-280/26 (3042) -> interim relief refused
(3043). Standalone: Tomahawk 6 in volume (2994), Wi-Fi 8 SoCs (2995), VCF 9.1 (2997), the Meta MTIA
partnership (3038), the $35B AI XPV Platform with Apollo and Blackstone (3039), CISPE's suit against the
VMware merger approval (3040) and Hock Tan's Mad Money reply to Anthropic's slowdown call (3048). Every pin
carries the tag `Broadcom`; the law pins keep `company: Broadcom`, as the Sable rulings did.

* **Learned - posting to prod overloads it.** Three POSTs in a row took the B2s VM to a load of 59 (116
  Chromium processes, swapping, the homepage at 24s): every save's source-wiki listener opens headless
  Chromium per reference. Prod's Anthropic key also had no credit, so the wikis, company relations and
  sentiment all failed after the browsers ran. The rest went one at a time, each only once
  `/proc/loadavg` read under 3, with 90s between posts - no further trouble.
* **Learned - a 500 can leave a pin.** The VCF post answered 500 "fetch failed" (prod timed out on
  blogs.vmware.com's images) but the pin row was saved as 2997 without media; create is not transactional.
  Look for the pin before re-posting, then repair it with a whole-pin `PUT`.
* **Learned - broadcom.com and vmware.com are JS shells, but their own JSON API reads with plain `curl`:**
  `https://www.broadcom.com/api/getjson?url=company/news/product-releases/<id>&locale=en-us` (also
  `financial-releases/<id>`, `products/...`, and `vmware.com/api/getjson?url=explore`); the whole newsroom
  list is `/api/news/productnews?id=bltce3a61fa876974ff&type=news_category&locale=en-us&years=10&microsite=broadcom`.
  investors.broadcom.com is 403 (Akamai) to `curl` and times out in WebFetch.
* **Learned - broadcom.com's times are wrong.** The page's `publish_date` is ET labelled Z and the list
  disagrees with it by hours. Take the GlobeNewswire (product and partnership releases) or PR Newswire
  (results, the XPV financing) stamp, Yahoo's `datePublished` (URL suffix `-201500781` is 20:15:00Z), or
  the EDGAR acceptance time (CIK 1730168).
* **Learned - Broadcom names its next results day at the end of each call,** as NVIDIA does (the Q3 call:
  "Wednesday, December 9, 2026"), about 30 days before the formal notice. Results go out at 4:15 pm ET.
* **Learned - deals without 8-Ks.** OpenAI, Meta and XPV had none; the XPV backstop ($29B maximum) is in
  the Q2 FY26 10-Q, Item 5, and the Q3 10-Q adds up to $42B of customer convertible notes.
* **Learned - EUR-Lex has General Court interim orders in full** before the press: a President's order is
  CELEX `6YYYYTO<case>(01)` (`62026TO0280(01)`), and the OJ "Action brought on" PDFs read with `pdftotext`.
  InfoCuria and competition-cases.ec.europa.eu are JS shells; concurrences.com is 403.
* **Learned - Benzinga's verified YouTube channel streams Broadcom's calls,** a usable results video where
  the company posts none. CNBC's image CDN is 403 to `curl`, and its older Broadcom stories now share one
  current og:image. Motley Fool transcripts garble the new CFO's name (Amie Thuener).
* **Learned - Nominatim puts 3421 Hillview Avenue in 94306;** Broadcom's filings say 94304. The pins carry
  Nominatim's label. The forward search matches a bus stop 150 m away - use the address node.
* **Open:** 3037 (Jalapeno deployment) to re-date when OpenAI or Microsoft reports it; 3047 to firm up when
  the formal Q4 notice lands in November; 2994, 3034, 3035, 3038, 3039 and 3047 carry two media; no pin has a
  source wiki, company relations or translation (prod's key had no credit) - rerun once it does. Not
  pinned: the Google TPU/Anthropic (6 Apr) and Apple ASIC (6 Jul) 8-K agreements, VMware Explore 2027 (Resorts
  World, 3-6 May), the 22 May temporary suspension in T-280/26.
* **Feedback**: Ian - this draft-then-post-one-at-a-time route is the way to post pins directly to prod.
* **Changed**: [Vertical recipes](verticals.md) - a Broadcom row; [Sources](sources.md) - broadcom.com.
