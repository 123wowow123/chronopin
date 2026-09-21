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

The image is the Next.js standalone server on port 9000 with Chromium for the scraper. Add `SESSION_SECRET` to the Kubernetes `env-file` ConfigMap before deploying.

## Upload Docker Image

Run `docker login`

Or

Run `docker login -u 123wowow123 -p <my secret password>`

Run `docker tag chronopin 123wowow123/chronopin:latest`

Run `docker push 123wowow123/chronopin:latest`

## Download Docker Image

Run `docker image pull docker.io/library/123wowow123/chronopin:latest`

## Run Docker Service

Run `docker-compose up` to build and serve site on `localhost:9000`

Run `docker-compose down` to shut it down

## Deploy to cloud

Open shell that's logged in to the manager node

Run `docker stack deploy -c docker-compose.yml chronopin`

To remove run `docker stack rm chronopin`

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

## Kubernetes Docker Hub Password Set Up

Run `kubectl create secret docker-registry regcred --docker-server=https://index.docker.io/v1/ --docker-username=123wowow123 --docker-password=<password> --docker-email=flynni2008@gmail.com` to create a regcred as a Kubernetes cluster uses the Secret of docker-registry type to authenticate with a container registry to pull a private image.

Run `kubectl get secret regcred --output=yaml` to inspect the Secret regcred

Run `kubectl get secret regcred --output="jsonpath={.data.\.dockerconfigjson}" | base64 -D` to convert .dockerconfigjson field to a readable format and view credetials

## Kubernetes 

### VM

Run `minikube start` 

### ConfigMap

Run -`kubectl create configmap env-config --from-file=kube/`-

Run `kubectl create configmap env-file --from-env-file=Docker/env.dev.list`

Run `kubectl get configmaps env-file -o yaml`

---

Run `kubectl delete configmap env-config`

Run `kubectl delete configmap env-file`

### Pod

Run `kubectl create -f pod.yaml` to create a pod

Run `kubectl logs -f chronopin-pod` to see logs

Run `kubectl get pods` to check if pods have been created

---

Run `kubectl delete po/chronopin-pod` to delete created pod

### Pod Utility

Run `kubectl exec -it chronopin-pod -c chronopin /bin/sh`

Run `kubectl exec -it chronopin-pod -- /bin/bash`

Run `wget -qO - localhost:9000`

Run `node` 
    `process.env` to get env variables

Run `kubectl get pods`
    `kubectl exec -it chronopin-pod<guid> -- /bin/sh`
    `nslookup chronopin-pod<guid>`

### Deploy All

Run `kubectl create -f kube/deployment.yaml` to deploy all

Run `kubectl describe deployment`

---

Run `kubectl delete deployment chronopin-dep`

### Deploy/Clean All

First time run `chmod +x ./kube/deploy.sh` & `chmod +x ./kube/clean.sh` to set execute permission

Run `./kube/deploy.sh` to deploy deployment and services

Run `./kube/clean.sh` to clean deployment and services

### Rolling Update

Run to start rolling update
```sh
kubectl set image deployment/chronopin-dep \
    chronopin=123wowow123/chronopin:latest
```

Run to check rollout status
`kubectl rollout status deploy/chronopin-dep`

Run `rollout undo` to undo rollout

### Service

Run `kubectl create -f web-service.yaml`

Run `minikube service chronopin-lb --url` to check url

Run `minikube service chronopin-lb` to open in browser

Run `kubectl get services`
Run `IP=$(minikube ip)`
Run `curl -4 $IP:<port>/` port is equal to NodePort value

---

Run `kubectl delete svc/chronopin-web`

### Proxy

Run `kubectl proxy`

Run 

```sh
export POD_NAME=$(kubectl get pods -o go-template --template '{{range .items}}{{.metadata.name}}{{"\n"}}{{end}}')
echo Name of the Pod: $POD_NAME
```

Run 
```sh
curl http://localhost:8001/api/v1/namespaces/default/pods/$POD_NAME/proxy/
```

## VirtualBox 

Run `rm -rf ~/.minikube`
    `minikube start` to reinstall minikube

Run `minikube dashboard` to open the Kubernetes dashboard in a browser

## Remote SSH to VM

Run `ssh -p 50000 wowow@20.190.57.28`

Run `ssh -p 50000 -i chronopin_docker.pub -v wowow@20.190.57.28`

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

## External API

[Public holidays](http://kayaposoft.com/enrico/) eg: <http://kayaposoft.com/enrico/json/v1.0/?action=getPublicHolidaysForYear&year=2020&country=usa>
[Rise & set times for the Sun and the Moon, twilight start & end, day length, moon phases, and more.](https://www.timeanddate.com/services/api/) eg: <https://www.timeanddate.com/services/api/>

## ICO Images

[Calendar Clock Icon](http://www.iconarchive.com/show/small-n-flat-icons-by-paomedia/calendar-clock-icon.html)
[Clock-icon](http://www.iconarchive.com/show/childish-icons-by-double-j-design/Clock-icon.html)
[Blue clock Icon](http://www.iconarchive.com/show/origami-colored-pencil-icons-by-double-j-design/blue-clock-icon.html)

## Cool Things

### Loaders Animations

<https://codepen.io/collection/HtAne/>
<https://codepen.io/ChainsawBaby/pen/xbogNZ>
<https://codepen.io/hexagonest/pen/waaGqj>
<https://codepen.io/jonitrythall/pen/dNJRRK>

## Good Design

<https://www.anker.com/>
<https://images.template.net/wp-content/uploads/2015/07/Timeline-Web-Element-Template-PSD.jpg>
<http://www.grubstreet.com/>
<https://flipboard.com/>
<https://news360.com/home>
Use of top banner news feed: <http://www.latimes.com/entertainment/arts/la-et-cm-hammer-made-paggett-wiegmann-20180606-story.html>

## Practical Design

<https://www.msn.com/en-us/health/wellness/10-minute-moves-for-strength-speed-and-agility/ss-AAzWFok?OCID=ansmsnnews11>

## Email Templates

<https://elements.envato.com/web-templates/email-templates>

### API Endpoints used

Equinoxes, Solstices, Perihelion, and Aphelion:
<http://aa.usno.navy.mil/data/docs/EarthSeasons.php>
<https://github.com/barrycarter/bcapps/blob/master/ASTRO/solstices-and-equinoxes.txt.bz2>

### DB data needed

https://nationaldaycalendar.com/march/

## To Do

### High Priority



  - Historically happens on date

- Google Map
  - Localize pins in area
  - Show distance
  - https://sandiego.eater.com/2017/12/11/16761732/menya-ultra-ramen-japanese-restaurant-mira-mesa

- Filter by like threashold  

- Stacking/grouping of related pins

- Amazon/Ebay product cross referencing

- Reminder Aside Menu by date sections
  - Sectional grouping on the bottom
  https://www.bing.com/images/search?view=detailV2&ccid=Qz5ylXJX&id=DE79D5F3DD2FE17F2542FE2F74C1163AC546B6F2&thid=OIP.Qz5ylXJX6FmKOGL7rsaBzwAAAA&mediaurl=http%3a%2f%2forgjunkie.com%2fwp-content%2fuploads%2f2016%2f04%2fReminders-app.png&exph=650&expw=366&q=reminder+app&simid=608026157405111055&selectedIndex=225&ajaxhist=0
  https://www.bing.com/images/search?view=detailV2&ccid=Qz5ylXJX&id=DE79D5F3DD2FE17F2542FE2F74C1163AC546B6F2&thid=OIP.Qz5ylXJX6FmKOGL7rsaBzwAAAA&mediaurl=http%3a%2f%2forgjunkie.com%2fwp-content%2fuploads%2f2016%2f04%2fReminders-app.png&exph=650&expw=366&q=reminder+app&simid=608026157405111055&selectedIndex=225&ajaxhist=0
  https://www.bing.com/images/search?view=detailV2&ccid=K4SNUA5w&id=EB2F67702626BA4754DEBE73062FF73D98C88888&thid=OIP.K4SNUA5wdr1AIr8Ac4LfaAAAAA&mediaurl=http%3a%2f%2fa3.mzstatic.com%2fus%2fr30%2fPurple71%2fv4%2f4f%2f10%2faf%2f4f10af0e-ec9e-210e-f53c-62c42d63c45b%2fscreen696x696.jpeg&exph=696&expw=392&q=reminder+app&simid=607992622330676635&selectedIndex=770&ajaxhist=0
  https://www.bing.com/images/search?view=detailV2&ccid=C3mXxt8Q&id=0AE073778932A6B23CA9542B7B24A2796CD57848&thid=OIP.C3mXxt8QSMmBHdR8S4TSuQHaMW&mediaurl=https%3a%2f%2flh3.googleusercontent.com%2fTK2tG4ci4kbOy9BPz8o88ohQDOUR2Cpo07bk05MERRhw8jgC95F5KXXZF-O3-yo7WEs%3dh900&exph=900&expw=540&q=reminder+app&simid=608050170612222716&selectedIndex=93
  https://www.bing.com/images/search?view=detailV2&ccid=02xN%2bVaI&id=A3188565487997B0E1AFB447FC0156441FECBB42&thid=OIP.02xN-VaISVatDExN5BiimgAAAA&mediaurl=http%3a%2f%2fa1.mzstatic.com%2fus%2fr30%2fPurple127%2fv4%2f52%2ffa%2fdf%2f52fadfe0-04de-8924-9178-b8920102e7b7%2fscreen696x696.jpeg&exph=696&expw=392&q=reminder+app&simid=608011172316253708&selectedIndex=249
  https://www.bing.com/images/search?view=detailV2&ccid=Puea8PZt&id=7EC1A129853AB342972F331E720A8F140ECDC010&thid=OIP.Puea8PZtmHSKlBaLFVd-1QHaNL&mediaurl=https%3a%2f%2flh4.ggpht.com%2fkSVYScpGNgwoH2vsTKla23eN4jnjT_kkZS3kxe6KYQE-hMgjI6doZxLDYojQ1Fph_38j%3dh900&exph=900&expw=506&q=reminder+app&simid=607993687487089105&selectedIndex=340


### Search

- Faceted Navigation that slides in one by one from the left in bubble blocks (https://alistapart.com/article/design-patterns-faceted-navigation)(https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-post-filter.html)


### Map

- Plot pins on map relative to a specified date time and draw drill map time arrow indicating possible itinerary
- Save and share itinerary (https://travefy.com/pro?km_marketing=homepage)
  - Serve ads for hotels to flights to cruise
  - See who else is going in your network
  - If flight information is entered or flight booked through site then delays and be tracked and shared



### Misc

- Pin feed needs to include if user have clicked on watch/like per min exclude deleted

- General Sentiment Graph for a Company or Product

- Search (Amazon) to buy product to support our website
```
This is a promotional article about one of the company partners with Interesting Engineering. By shopping with us, you not only get the materials you need, but you’re also supporting our website.
```
- Add pin group and can see iteniary map view and invite people for each location (support open invitation where anyone can join and buy tickets).

### Google Analytics:

- Activated Google Analytics / Facebook upgrade to non development mode

- Setup Google Analytics to this site. 
GA: Outbound link / non-interaction events / Social Interactions tracking / User Timings / set clientId on tracker creation


- Add FB privacy policy page
- https://gist.github.com/muddylemon/2671176
- https://developers.facebook.com/apps/560731380662615/settings/basic/

- facebook comment jumps @ pin page

## Architecture
- Externalize image processing to AWS Lamda
- [Use Firebase DB for denormalized push notification of app data] <https://www.youtube.com/watch?v=LAWjdZYrUgI>


## Before Usable

### Before release

- Use this AI to do this job: Localization is in: the site now works in English, Spanish, French, German, Japanese and Simplified Chinese. The app's own text is translated in all six, but pin text stays in English for now because the Anthropic key has no credit. 

# Monitization

- amazon & bestbuy referral links to product should be created if its something purchasable 

# Testing 

- add e2e tests

# Grouping

- Favorite needs to be grouped in folders and make public/private and shareable

- Add product Accessory section feature listing below detailed pin

# Horoscope

- provides horoscope info for sun signs such as Lucky Number, Lucky Color, Mood, Color, Compatibility with other sun signs, description of a sign for that day etc. <https://aztro.readthedocs.io/en/latest>
- Check out upcoming side calendar with astrology horrospoce <https://cafeastrology.com/astrologyof2017horoscopes.html>
- add holiday and perforated placeholder block for holiday and special events


# Injestion Methodology

major local events by major city scrape and more targetted by your location

- Add api key for Amazon & eBay Price Scrape


# Daily Jobs

- build list for daily scraper and add search engine trending search in the job too

- need job to scrape and update pin, any visit will trigger a scheduled update scape that night, along to new reference

- create job to check health of pins like broken videos, image, etc and new pin connection and references might be able to add

- nightly job should be guided by LLM reasoning and guidance so it's flexible like running in current sessions 

daily morning job to add an verify this weeks pins are up to date.

daily google trend scrape and updats previous pins
https://trends.google.com/explore

Create LLM Orchistration pipeline and add it to a daily job to scrape and update pins

# OKF

# Other

- should have small display that 3 pins are happing within next 7 days on botton and top of timeline. Clicking on it will scroll you to it one after another

# Scraping

add slider to search by how late project is

Add suggestion to this pin:
info icon:
Like request to add additonal reference URL
Suggest start and end date with with reason and reference
Suggest missing or correcting information


Product pins should have notible features in long form summary
http://localhost:3000/pin/2346/the-airbus-a350f-makes-its-first-flight



Fix: The data-quality findings — wrong references on pins 72, 202, 377, 806, 808; stale odds in the market pin descriptions; MMOExp as a primary source 


7 ratings applied across 156 pins. 149 still have none, 95 of which have already aired, so a score exists and the lookup simply failed — 251 Jikan 504s, identical in both runs. Jikan serves cached titles and 504s the rest; One Piece answers, Mushoku Tensei doesn't. Re-run later with scratchpad/ids.txt; it's insert-or-refresh so it's free to repeat.

Open
Kaiju No. 8 Season 1 (MAL 52588) and Mission Recon (59489) aren't pinned — that's why 2316 heads its chain instead of sitting under Season 1.
Aggregator channels outrank official ones in trailer search — hit twice today (AnimeSelect, Anime World), both skipped by hand. Worth scoring the studio's own channel above search rank.
Offered, not started: tagging anime pins by AniList's source field (MANGA, LIGHT_NOVEL, ORIGINAL…).