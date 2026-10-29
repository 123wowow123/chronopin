<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Daily job updates

Owner instruction, 2026-10-13: apply routine, researched daily-job pin updates without asking for confirmation again. This includes sentiment scores, event/ticket readings and verified factual or date corrections, including pins whose authors are outside the job's hardcoded curator allowlist. Use the authenticated admin APIs when the curator helper refuses; preserve the original author. Verify current text hashes before scoring, preserve existing event details when a fresh reading supplies none, and resolve review marks only after verifying the saved changes. Queue genuine research gaps or conflicting evidence with a specific reason, not merely an allowlist mismatch. See docs/okf/scraping/daily-jobs.md. This standing authorization concerns content maintenance; production deployment still requires the explicit request below.

Owner instruction, 2026-10-28: the 06:00 and 18:00 news jobs must repair discovered content/identity mismatches during the run, including previously queued resort/data-center collisions, rather than repeatedly leaving them pending. Work the revisit queue, research both subjects and existing canonical pins, fix supported company links and inherited metadata through authenticated APIs in both environments, preserve authors, verify readbacks and pending queues, then resolve review marks. Do not score unrelated text for a company. Queue only specific unresolved evidence, API failures or work beyond run limits, never an allowlist mismatch alone. See docs/okf/scraping/daily-jobs.md#keep-pins-right.

## Construction and energy project costs

Owner instruction, 2026-10-24: pins about something built (pipelines, power plants, dams, bridges, tunnels, railways, terminals, towers, stadiums, data centres and other construction or energy projects) should carry a `price` and `priceCurrency`. Research a sourced figure (opened HTTPS source, verbatim quote) in the currency the source states, with no FX conversion; match the figure to the pin's own event (a phase takes the phase cost) and take the most recent estimate. Collapses, demolitions, rescues, approvals with no budget and anything with no published cost stay null; never invent one. Save through the admin API and record the source in the pin's references or wiki. The extraction prompt in `src/server/extract/systemPrompt.ts` carries the same rule.

## Construction project status tags

Owner instruction, 2026-10-24: construction and energy-project pins should carry one sourced status tag: `Proposed`, `In Progress` or `Completed`. Match the pin's unit/phase and milestone: plans and approvals before verified physical work are Proposed; construction/refurbishment/testing/commissioning underway is In Progress; explicitly finished/opened/commercially operating scope is Completed. Completing an announcement, loan or approval does not complete construction. A first coil, reactor criticality or grid test does not alone prove full completion. Never infer completion from an elapsed target date. Preserve other tags and authors. Exclude non-construction accidents, closures, sales and monitored storage; document unsupported, cancelled or halted status rather than forcing a tag. Apply through authenticated admin APIs in both environments and synchronize research/replay catalogs.

## Power plant generation information

Owner reminder, 2026-10-24: power plant pins must include sourced generation information in the native `PinPower` fields (`kind: 'generation'`), saved and verified through `PUT /api/pins/:id/power` locally and in production. Match capacity to the unit, phase and historical period; distinguish net/gross electrical MW from thermal MW and annual energy in MWh/GWh. Include published annual output when available. Explain whether capacity is historical, operating or proposed, especially on accident, shutdown, storage and restart pins; a retired unit's rating must not imply current generation. Preserve sources in references/wiki and keep replay scripts synchronized.

## Factory buildout profiles

Owner instruction, 2026-10-27: every pin about a plant, factory or fab being built or opened (tagged `Manufacturing` or `Factory`, with a construction price or a `Proposed` / `In Progress` / `Completed` tag) carries a `PinFactory` buildout profile: sourced metric cards (investment, jobs, floor area, capacity, timeline, products) and a dated project timeline. The scraper does this automatically: the `factoryProfiles` daily task (news job) finds plant pins without one, researches it from opened pages with verbatim quotes and saves it through `save_factory_profile` (`PUT /api/pins/:id/factory`), locally and on production. A pin covering several plants (e.g. a three-plant investment) is split: each plant gets its own pin threaded under it (`parentId`), dated to that plant's own milestone, with its own profile (owner instruction, 2026-10-27). Radar scores stay null unless a peer cohort or named capability is published. Owner instruction, 2026-10-29: every construction pin (power plants, pipelines, dams, data centres, rail and other projects, not only plants and factories) gets the same buildout/timeline panel where sourced data allows; `factoryProfiles` covers any priced pin with a status tag. See docs/okf/scraping/daily-jobs.md#factoryprofiles and docs/okf/api/factory-capability.md.

## AI model spec graphs and media

Owner instruction, 2026-10-28: automatically enrich every AI language/video model release or announcement pin with its sourced six-axis rubric, published specification/benchmark graphs and tables, and relevant credited media. Do this during creation/research and repair existing gaps in every 06:00/18:00 news run, including pins that already have a rubric and authors outside the curator allowlist. Open the exact model's launch announcement, docs, independent benchmarks and official galleries; never inherit sibling specs or graph incomparable evaluations. Store images in Azure, verify public blobs and saved native panels, preserve authors and existing graphs/tables/media, and synchronize research/replay catalogs. Record specific unpublished figures, unavailable reviews or inaccessible media as research gaps; never invent them to fill a chart. See docs/okf/scraping/daily-jobs.md#modelrubrics.

## Product competitors

Owner instruction, 2026-10-26: every product pin (a purchasable good or named product: vehicles, aircraft, snacks and drinks, sneakers, watches, electronics, games, software, AI models) lists its main competing products in `PinCompetitor` (2-5 rows, rank 1 = closest rival). Pick rivals that compete in the same segment and market at the pin's own time; name the product and its maker; link `competitorPinId` when we have a pin for it; add a one-line `summary` of how it competes and an opened HTTPS `sourceUrl` (a comparison, review or spec page). Save via `PUT /api/pins/:id/competitors` locally and on production (match prod pins by sourceUrl; ids differ). Never invent a rival; queue the pin with a reason when no sourced rival exists. Not for restaurants, films, events or projects. Extraction (`src/server/extract/index.ts`) names the rivals when it reads a product page and the pin save stores them unsourced; the `productCompetitors` daily task then sources or replaces them.

## Deploying to production

Never deploy, restart, resize or build on the production VM (20.109.175.187) unless the user has asked for that deploy in this conversation, in words. Editing code, committing and pushing are not a request to deploy, and approval for one deploy does not cover the next.

`npm run deploy` is the only deploy: GitHub builds the image and the VM pulls it (scripts/deploy-image.sh). Never build on the VM - `next build` beside the live site swaps the 2-vCPU box and the site returns 502s for the length of the build (2026-10-10). `npm run deploy:vm` exists only as a fallback and needs `DEPLOY_ON_VM=1`; use it only when the user explicitly asks for a VM build. The deploy scripts refuse a non-interactive shell unless `DEPLOY_CONFIRMED=1`; set that only after the user has asked for this deploy, and never to get around a refusal. If a deploy or build is already running on the VM (`pgrep -f next-build`), wait; do not start another.

## Pin media storage

Store pin images in Azure Blob Storage. Do not add pin photos or generated thumbnails to Git. Keep blob URLs, source URLs, credits and other metadata in the repository. Use ignored temporary files while sourcing or uploading; verify the public blob before removing a local file or switching a live pin reference. Application icons, logos and other UI assets may remain in Git.

When an operator or brand site blocks the download (403, Cloudflare, magazine-only CDNs), do not hold the pin or settle for an off-subject stand-in: search Google Images, the Booking.com, Tripadvisor, Expedia and Trip.com galleries, travel and design press and blogs, and credit the source page. Verify the file downloads with plain curl and shows the property itself.

Always check official galleries and linked photo pages when researching pins, including restaurant websites. Add verified, relevant gallery photos to pin details and use a representative photo on the corresponding landing-page card. Preserve source URLs, photographer/operator credits and accurate captions. Distinguish the venue’s own photos from collaboration or other-branch photos; do not infer dish names or current menu availability from an unlabelled photograph. Record inaccessible galleries and remaining photo gaps in the research notes.

## Restaurant guide navigation

Keep both country and city navigation menus sorted from west to east, not alphabetically. Order cities by city-center longitude; order countries by their westernmost supported guide city. Preserve this ordering when adding or updating guides.

Every restaurant landing page, including Japan's city guides, should support the same four sections as San Diego: Coming soon, Just opened, Top restaurants, and Specials. Hide tabs with no eligible content, and fall back to a populated view for links to empty tabs. Keep Specials visible whenever verified active or upcoming offers exist, even outside service hours and without a published rating. Show each upcoming offer's next local start time on its card; show active offers as available now. Expired offers do not keep a tab visible. Make a thorough research effort to populate every section before accepting incomplete coverage: search operator announcements, local reporting, branch-specific menus and verified promotions. Add sourced content whenever possible; never invent opening dates, discounts, ratings or menu items merely to make a tab appear. Record the sources checked and unresolved coverage gaps in the guide notes.

For every China city guide, aim for at least **35 distinct restaurants in each tab**: Coming soon, Just opened, Top restaurants, and Specials. This is a research/replenishment target, not a display cap or a reason to relax eligibility. Count each restaurant once per tab, including restaurants with multiple specials. Keep verified content below the target when necessary and record the shortage and sources checked.

For every Japan city guide, aim for at least **30 distinct restaurants in each tab**: Coming soon, Just opened, Top restaurants, and Specials. This is a research/replenishment target, not a display cap or a reason to relax eligibility. Count each restaurant once per tab, including restaurants with multiple specials. Continue researching and replenishing sections below 30; record each shortage, sources checked and specific unresolved research gaps in the guide notes.

All landing page cards across every tab (Coming soon, Just opened, Top restaurants, Specials) must have a backing pin detail page pin. Clicking on the title and image must always take the user to the native pin detail page (`/pin/[id]/[slug]`), never directly to an external website. Always seed or link corresponding database `Pin` records for all venues and specials.

## Restaurant menu research

Restaurant pins must use the exact branch's opening date as `utcStartDateTime`, including established restaurants added for Top restaurants or Specials. Never use a research/check date, menu publication date, or promotion start as the restaurant's opening date. Keep research dates in content `checkedAt` and offer dates in Specials. Research the opening before creating a pin; if only a year/month is supported, mark the date estimated and explain its precision and any timeline anchor. Do not infer a branch date from the parent brand's founding or the host building's opening without branch-specific evidence. Queue missing opening-date evidence for research.

Save ongoing menu, visit-detail and landing-page tile edits through the database management APIs: `/api/admin/restaurant-content` for ordinary content and `/api/admin/restaurant-specials` for offers and their menus. Bundled JSON catalogs are import/research snapshots; do not require a deployment for content updates once the runtime content API is installed. Preserve source evidence and photo credits, and verify the affected pin and landing page after saving. See docs/okf/api/restaurant-content.md.

Always make a thorough effort to find and display actual menu items, including happy-hour and other specials, on restaurant cards and pin details. Search beyond the first link: check branch-specific operator pages, linked PDFs, menu images, ordering menus and credible branch-specific sources. Transcribe verified dishes and drinks with published prices, currency and conditions. If items are published without prices, include the items with “Price not published”; missing prices are not a reason to leave the menu empty. Never borrow another branch's menu or infer that regular-menu items participate in a special. Use link-only coverage only after a deep search fails to find verifiable items, and document the sources checked and the remaining gap.

## Food and beverage taste rubrics and reviews

For every consumable food, snack, or beverage product pin (including regional snack awards, ciders, beers, confectionery, and new food launches), always generate both its full 7-axis taste rubric (Aroma 香り, Bitterness 苦味, Sweetness 甘味, Astringency 渋味, Umami うま味, Pungent 辛味, Coolness 清涼感; each 0-5 in half steps) and at least one verified firsthand tasting review (`PinTaste.reviews` array with `url`, `title`, `publishedDate`, `quote`). Save them through `PUT /api/pins/:id/taste` across both local and production environments, and keep `scripts/products/taste.json` synchronized. Never leave food or beverage pins without a native taste radar and review citations.

## Vehicle and car performance rubrics and reviews

For vehicle performance rubric pins (both electric and gasoline car performance radars: `PinCarPerf` and `PinGasCarPerf`), always aim to have at least **3 verified independent reviews** (up to 6, from credible road testers such as Car and Driver, MotorTrend, Top Gear, Evo, Autocar, etc.). Each review must have an opened HTTPS URL, exact article title, ISO publishedDate (`YYYY-MM-DD`), and a verbatim quote (up to 300 characters) describing the vehicle's driving dynamics, steering, acceleration, or handling. Save updates across both local and production environments via their respective API endpoints (`/api/pins/:id/car-performance` and `/api/pins/:id/gas-car-performance`), and keep scripts and JSON catalogs synchronized.

## Restaurant dining rubrics and reviews

For every restaurant dining rubric pin (`PinDining`), always generate its full 5-axis dining rubric (Food, Service, Ambience, Value, Critic acclaim; each 0-5 in half steps or null when unpublished) and at least **3 verified independent reviews** (up to 6, from credible dining critics, guides, or local publications such as Gourmet Traveller, Broadsheet, Time Out, The Infatuation, MICHELIN Guide, The New York Times, Eater, etc.). Each review must have an opened HTTPS URL, exact article title, ISO publishedDate (`YYYY-MM-DD` or null), and a verbatim quote (up to 300 characters) describing the cooking, service, or dining room atmosphere. Save updates across both local and production environments via `PUT /api/pins/:id/dining`, back each cited scoring source with references and source wikis, and keep `scripts/restaurants/diningRubric.json` synchronized.

## Prediction market predicted pins

For the 6am and 6pm job (06:00 and 18:00 America/Los_Angeles news job), scrape for interesting events that prediction markets (Polymarket, Kalshi) have and create predicted pins out of them (owner instruction, 2026-10-15). Cover top interesting and high-volume prediction market events across politics, technology/AI, space, macroeconomics, sports championships and culture, in addition to immediate weekly resolutions. Tag every created pin with `Predicted`, set `dateConfidence: 'estimated'` dated to the predicted event onset (never the market closing/settlement buffer), quote the dollar volume and odds with the observation date, and thread to candidate parent pins (`parentId`) whenever an earlier event in the series, flight test program, election cycle or franchise exists.

## Monthly Brent and WTI commodity prediction market pins

For the 6am and 6pm job (06:00 and 18:00 America/Los_Angeles news job), scrape prediction markets (Kalshi, Polymarket) to add Brent and WTI crude oil commodity prices every month, create pins and make them into threads (owner instruction, 2026-10-15). Mark each pin as predicted (tag `Predicted`, `dateConfidence: 'estimated'` dated to the month's settlement date, quoting modal strike distribution and dollar volume under `@EnergyDesk` or `@EconDesk`), and thread to the prior month's pin in that commodity's thread (`parentId`). After price realization, update the pin with the final realized settlement value, set `dateConfidence: 'confirmed'`, and add reasoning explaining why the prediction was missed or on point against actual market drivers (OPEC+ quota compliance, geopolitical risk premia around Hormuz, commercial/SPR inventory changes, and global refinery demand).



