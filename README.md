# Chronopin

Discover and track upcoming release dates, events and other important dates.

Built with [Next.js](https://nextjs.org) 16 (App Router, Cache Components), React 19, TypeScript and Tailwind CSS 4 on Node.js 24 LTS, backed by PostgreSQL + PostGIS and a FAISS search service. Pages render on the server for search engines; the JSON API lives in the same app under `/api`.

## Getting started

1. `nvm use` (Node 24, see `.nvmrc`), then `npm ci`.
2. Start the local services: `docker compose -f Docker/docker-compose.dev.yml up -d` (PostgreSQL + PostGIS, FAISS). Thumbnails use the Azurite emulator on `127.0.0.1:10000`.
3. Create `.env.local` (never committed):

   ```sh
   DATABASE_URL=postgres://chronopin:chronopin@localhost:5432/chronopin
   FAISS_URL=http://localhost:5050
   AZURE_STORAGE_CONNECTION_STRING=...
   ANTHROPIC_API_KEY=...      # page scraping extraction; optional
   SESSION_SECRET=...         # JWT signing secret; required for npm start / production
   KALSHI_API_KEY_ID=...      # Kalshi API key id; optional, streams Kalshi odds live
   KALSHI_PRIVATE_KEY=...     # that key's RSA private key PEM (newlines may be escaped)
   POLYMARKET_API_KEY_ID=...  # Polymarket US API key id; optional, streams polymarket.us odds live
   POLYMARKET_SECRET_KEY=...  # that key's base64 secret key
   ```

4. `npm run db:refresh` (schema + seed data), `npm run search:refresh` (search index).
5. `npm run dev` and open http://localhost:3000.

## Sign-in providers

Email and password, plus Google, Facebook and Apple through the OAuth 2.0
authorization-code flow in `src/server/oauth.ts`. Each provider has a pair of
routes under `src/app/auth/<provider>/`, and the callback paths are the ones
the old Express app used, so the registered apps need no changes.

```sh
GOOGLE_ID=...         GOOGLE_SECRET=...
FACEBOOK_ID=...       FACEBOOK_SECRET=...
APPLE_ID=...          # the Services ID, e.g. com.chronopin.web
APPLE_TEAM_ID=...     # the 10-character team id
APPLE_KEY_ID=...      # the key id of the .p8 signing key
APPLE_KEY=...         # that .p8 file's PEM text (newlines may be escaped)
```

Apple has no static client secret: the server signs a ten-minute ES256 JWT with
the `.p8` key on each sign-in. It also refuses `http` and `localhost` redirect
URLs, so Apple sign-in only works against a real domain or an https tunnel -
Google and Facebook are the ones to test against `next dev`. Asking Apple for a
name and an email forces `response_mode=form_post`, so its callback arrives as a
cross-site POST; the `oauth_state` and `handle` cookies go out
`SameSite=None; Secure` for Apple alone so they survive it. The name comes only
in that first POST and never again, so a returning user is just the id_token's
`sub` and email - a "Hide My Email" relay address, if they chose one, which is
why Apple accounts are looked up by `appleId` before email.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js development server, production build, production server |
| `npm run typecheck` / `lint` / `test` | TypeScript, ESLint, Vitest unit tests |
| `npm run test:e2e` | Playwright end-to-end tests against a running server (`BASE_URL`, default `http://localhost:3000`); removes the accounts and pins it made when it finishes |
| `npm run clean:e2e` | Remove that test residue by hand (`-- --dry-run` to only list it) |
| `npm run create:db` / `db:reset` | Apply pending schema files in `scripts/db/schema` / drop everything and reapply |
| `npm run create:data` / `backup:data` | Seed the database from / back it up to `scripts/backup/*.json` |
| `npm run search:refresh` | Empty and refill the FAISS index |
| `npm run companies:logos` | Look up missing company logos |
| `npm run specialty-days:build` | Rebuild `src/server/data/specialtyDays.json` |
| `npm run wiki:sync` | Write OKF wikis for pins' links, retry failed ones, rebuild stale summaries ([docs/okf](docs/okf/playbooks/catch-up-and-retry.md)) |
| `npm run okf:export` | Write pins and their link wikis out as an OKF bundle in `./okf-bundle/` (`--pin N`, `--out DIR`) |
| `npm run okf:lint` | Check and maintain the wikis: OKF conformance, stale links, orphans, quality, contradictions between a pin's links (`--fix`; [docs/okf](docs/okf/playbooks/lint-the-wikis.md)) |
| `npm run media:awards` | Match film, series and anime pins to the awards their work won or was nominated for, from the award bodies' Wikipedia pages (`--pin N`, `--dry-run`) |
| `npm run tags:sync` | Tag pins with the awards their descriptions and summaries name, e.g. "Crunchyroll Anime Awards 2024" (`--pin N`, `--dry-run`); award bodies' own tags follow `media:awards` ([docs/okf](docs/okf/tables/pin-tag.md)) |
| `npm run stocks:sync` | Look up pins' companies' US tickers and related/supplier tickers, and price the snapshots that are due (`--pin N`, `--dry-run`, `--company NAME --relate SYMBOL:related|supplier:note` to set relations by hand) |
| `npm run user-wiki:build` | Rebuild signed-in users' preference wikis (`--user N`), `--out DIR` to also write them as an OKF bundle (private: users' pin history) |
| `npm run wiki:export` / `wiki:apply` | With no Anthropic credit, write out the Claude jobs, do them in a Claude Code session, save the answers ([docs/okf](docs/okf/playbooks/without-api-credit.md)) |

## Layout

- `src/app` — pages, `api/**/route.ts` JSON endpoints, `auth/**` sign-in (Google, Facebook, email), `sitemap.ts`, `robots.ts`
- `src/components` — React components (server by default, client islands where interactive)
- `src/server` — database, models, auth, scraping, weather, search; server-only code
- `src/lib` — code shared by server and browser: SEO helpers, formatting, types
- `src/proxy.ts` — canonical pin URLs (308) and real 404s before rendering
- `scripts` — data, schema and maintenance scripts (run with `tsx`)
- `docs/okf` — how link wikis and pin summaries work, written as an [Open Knowledge Format](https://github.com/GoogleCloudPlatform/open-knowledge-format) bundle ([start here](docs/okf/README.md))

## SEO

- Every pin has a canonical URL `/pin/:id/:slug`; `/pin/:id` and stale slugs redirect permanently.
- Pages carry titles, descriptions, canonical links, Open Graph/Twitter cards (a generated card at `/og/pin/:id` when a pin has no image) and JSON-LD (`Article`, `Event` for pins with a place, `BreadcrumbList`, `WebSite` search action).
- `/sitemap.xml` lists every live pin; `/robots.txt` keeps crawlers out of the API and account pages; search and account pages are `noindex`.
- Pin edits expire their cached page at once; timeline and sitemap refresh in the background.

## Docker

Build: `docker build -f Docker/Dockerfile -t chronopin .` (no database needed at build time)

Run: `docker run --rm -p 9000:9000 --env-file Docker/env.prod.list chronopin`

The image is the Next.js standalone server on port 9000 with Chromium for the scraper. Production runs it on an Azure VM with Docker Compose and Caddy: see [docs/deploy-azure.md](docs/deploy-azure.md).

## Deploy to cloud

See [docs/deploy-azure.md](docs/deploy-azure.md).

## Docker Utility Commands

Run `docker container rm -f $(docker container ls -a -q)` to stop and remove all docker containers

Run `docker rmi $(docker images -q)` to remove all docker images

Run `docker container exec -i -t chronopin /bin/sh` to open shell inside of running container

Run `exit` after `exec -i -t` to exit TTY

Run `docker rmi <IMAGE ID>` to remove image from local system

Run `docker container attach quotes` to attach our Terminal's standard input, output, and error 

To quit the container without stopping or killing it, we can press the key combination `Ctrl+P Ctrl+Q`. This detaches us from the container while leaving it running in the background. On the other hand, if we want to detach and stop the container at the same time, we can just press `Ctrl+C`.

Run `docker system df` to see docker disk space usage

Run `docker image prune --force --all` to remove all images that are not currently in use on our system

## DB Management

The database is PostgreSQL with PostGIS. Locally it runs in Docker (native on
both Apple Silicon and Intel):

Run `docker compose -f Docker/docker-compose.dev.yml up -d` to start it on `localhost:5432`

The app and scripts connect with `DATABASE_URL` (`config.database.url`), e.g.
`postgres://chronopin:chronopin@localhost:5432/chronopin`; add `?sslmode=require` for a hosted database.

Run `npm run create:db` to apply pending schema files from `scripts/db/schema` (safe to re-run; never drops data)

Run `npm run db:reset` to drop everything and rebuild the schema (development only)

Run `npm run create:data` for adding data

Run `npm run backup:data` for backing up data

A schema change is a new numbered file in `scripts/db/schema` (e.g. `0002_add_pin_foo.sql`); never edit one that has been applied.

## Debug Node

Use the VS Code launch configurations in `.vscode/launch.json` (dev server, create DB, create/save data), or run `NODE_OPTIONS=--inspect npm run dev`.

Scripts run on `tsx`, e.g. `npx tsx --inspect-brk scripts/data/index.ts --save` for debugging `backup:data`.

## Update Node packages

Node is pinned by `.nvmrc` (`nvm use`). Run `npm outdated` to list what packages are out of date, then `npx npm-check-updates -u && npm install`. Keep ESLint on 9 until eslint-plugin-react supports 10.

## Testing

Run `npm test` for the Vitest unit tests and `npm run test:e2e` for the Playwright tests against a running app (`npm run build && npm start`, or `npm run dev`; `BASE_URL` picks the server). The e2e specs sign up throwaway accounts and post pins as them; the run removes both when it ends (`KEEP_E2E_DATA=1` keeps them for a look at a failure, and `npm run clean:e2e` removes them later). A run against a `BASE_URL` elsewhere leaves its own database alone.



### Loaders Animations

<https://codepen.io/collection/HtAne/>
<https://codepen.io/ChainsawBaby/pen/xbogNZ>
<https://codepen.io/hexagonest/pen/waaGqj>
<https://codepen.io/jonitrythall/pen/dNJRRK>


## To Do

### High Priority


- Filter by like threshold  

- Amazon/Ebay product price check and show deals

- Movie pins with no ticket or disc link (about 254 on prod as of 2026-10-05): hand-pick the real Fandango/Amazon page for the recent and upcoming films (about 60 days either side of today), then post with `POST /api/pins/:id/merchants`

- Review sentiment graph — remaining work ([verified batches and current inventory, 2026-10-27](docs/okf/scraping/review-verification-2026-10-27.md)):
  - Expand Movie/TV, Music albums, Computing and Fashion critic coverage; screen category leads for actual reviewable products/works.
  - Research the 54 rubric rows below three reviews: EV 31, gas cars 8, aircraft 12, dining 1 and video models 2. Verify independent sources and the exact variant/branch.
  - Resolve the 37 remaining publication/source checks in the research queue. Another 97 entries are verified as undated and retain null dates. Verify actual firsthand comments separately from merchant copy; undated guide extracts stay off the graph.
  - Complete scheduled production review-tool verification. Retry #28 on 2026-10-27 was claimed but skipped: scheduler reported no API client although the admin endpoint reported one available. The same message also covers credit cooldown; key absence is not established. Investigate worker/client availability and verify a successful model/tool run. Temporary schedule removed; all four original schedules remain disabled and unchanged.


### Map

- Plot pins on map relative to a specified date time and draw drill map time arrow indicating possible itinerary
- Save and share itinerary (https://travefy.com/pro?km_marketing=homepage)
  - Serve ads for hotels to flights to cruise
  - See who else is going in your network
  - If flight information is entered or flight booked through site then delays and be tracked and shared

### Misc


- Add pin group and can see iteniary map view and invite people for each location (support open invitation where anyone can join and buy tickets).




## Before Usable

- create mobile app

# Monitization



# Testing 

- add e2e tests

# Grouping

- Favorite needs to be grouped in folders and make public/private and shareable

- Add product Accessory section feature listing below detailed pin



# Injestion Methodology

- Add api key for Amazon & eBay Price Scrape

- Add
GOOGLE_PLACES_API_KEY
yelp key



# Others:


- add Nike affiliate program

- ticketmaster Affiliate
https://developer.ticketmaster.com/partners/distribution-partners/affiliate-sign-up/


- post site description on many wiki's an link back

- upgrade user to promoter and sell tickets to local events like eventbrite. will have management portal that will have dashboard to sales and impressions, and pin click, and purchases, etc. integrade with payment company - stripe 


- can pay to become promoted pin and need management page for user. Also need payment page. it's $1 per pin per day for 100 showings. Admin can change this rate.


- set up google/facebook/apple login flow

sync prod db to local and backup json

run full run job in this session

run 6am job here in this session



- add private sellers and add payment setup



- sell something and pay to notify item to all watchers for the pin


- create crypto payment for views and clicks

- golden cross indicator?

- cross post with facebook marketplace?

- add ads on mapped marketplace pin like logging, also auto show related item in area



- ability to pay subscription and not display ads on their own pins

- add Amazon Product Advertising API (PA API) key

- update all ticket master button link to use referal link





programatic seo

https://www.fooddive.com/

https://www.eventbrite.com/e/sneaker-con-los-angeles-october-17-18-2026-tickets-2000208801369?aff=erelpanelorg



organize admin pages to more intuitive layout and groupings


Build KG with people, companies, properties, vacations, products / shows



- add restaurant reservation and ordering adamin portal in bunsiness account

- need restaurant button to find current special discounts available



- Grammy needs nomination and related music
https://www.chronopin.com/es/pin/4861/the-2027-grammy-nominations-set-the-song-of-the-year-field


https://help.opentable.com/s/article/OpenTable-Affiliate-Program-1505261059868?language=en_US
https://www.temu.com/affiliate_recruit.html?_x_ads_csite=affiliate_seo&aff_sub_csite=https%3A%2F%2Fwww.google.com%2F&aff_disable_switch_flow=1




Should show top competition and and benchmarks
https://www.chronopin.com/pin/4802/gpt-6-astra-released




https://www.maranellosd.com/menu
https://www.telefericbarcelona.com/the-social-hour




add button on landing page to suggest a product or restaurant to add to list. should have community voted section. create admin section to manage suggestons and to approave them



add restaurant landing page for all major cities around the world






tenmu ads






are there any other pin categories that can display a rubric for the pins


open the browser and walk me through signing up aliyun.com



WeChat Pay
Alipay





add AI buildout on map
https://cleanview.co/
signed tenent



add popular tags on map like 
under construction + data centers
plannned + data centers


clicking on group wrapper will post those tags
tesla + batteries storage


best of 2027 desert per brand per category




apple program resources for apple music referal program

political figure in other countries


do 6am/6pm job on prod using this session



https://www.chronopin.com/pin/19327/lehigh-county-data-center-150-mw-facility-with-356-diesel-backup-generators-in-l
are their additional keywards in Datacenter & Infrastructure Telemetry that can be used for search pills?





check to see if anything can be improved and increase organic visits
https://search.google.com/search-console/performance/search-analytics?resource_id=sc-domain%3Achronopin.com







create product production knowlege graph what supliers good coming in and output of company going out and consumed





gemini:
do deep research on review for all categoris that supports reviews and compute sentiment on them
generate wiki backing on research to gound work


ask for redesign of pin detail page to look nicer
ask for anything more to add to pin detail page




new pins were updated and added on prod. do translation on them



Yes, several categories have no scraped reviews at all. The numbers are local pins that have at least one review in the eight rubric tables; production should be similar.

Category	Pins	With reviews
Anime	1,020	1
Music	899	0
Computing	573	3
Fashion	515	0
Movie	424	0
TV	324	0
Retail	267	18
Software	190	2
Gaming	166	0
For comparison, Food has 265 of 2,655 covered, Automotive 131 of 485, Aerospace 150 of 306, and AI 150 of 756. Infrastructure and Energy have almost none, but they aren't products you'd review. Finance, Health, Economy, Geopolitics and Conference don't fit reviews either.

These categories aren't blank. Movies, TV, anime and games already carry aggregate scores (Rotten Tomatoes, OpenCritic, manga scores). What's missing is the dated critic quotes the sentiment graph plots. There's also no rubric table to store them in, since the graph reads the eight rubric tables. So this needs a place to keep reviews on those pins first, which is a schema change, or the review list would have to hang off something else.

My ranking by value for effort:

Gaming (166): critic reviews are plentiful and dated, and the pins are few.
Movie and TV (748): critic reviews are easy to find and long-lived, so the graph would be rich.
Music (899), if they are albums: Metacritic and Pitchfork-style reviews.
Computing and Fashion (about 1,090): hardware and product reviews exist, but matching them to the right variant is harder.
Anime is already covered by MAL scores, and I'd skip it.

Do you want me to build the storage and the scraping for Gaming first? That would be a schema change plus review adds for roughly 20 to 30 games as a sample, as I did for cars.

yes do all these



create a thread story for each year and add supporting or disproving reference as time goes on
https://hub.tslombard.com/the-perkini-report



How can Chronopin improve organic search growth. Use my broswer to check if needed
https://search.google.com/search-console?utm_source=about-page&resource_id=sc-domain:chronopin.com


are all landing pages translated besides the pins?


build span chart display for construction pins with a timeline and show


earthquakes should have running thread per year.
use main thread for each year and have sub thread to link all pins in the year.
https://www.chronopin.com/pin/20607/m6-4-earthquake-strikes-southeast-of-easter-island-on-october-29
