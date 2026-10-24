# U.S. factory buildout pins — October 24, 2026

Added **six researched milestones** on local and production through authenticated admin APIs. Verified saved text, dates, authors, costs/currencies, references, tags, media and native pages. No deployment or application-code changes. This is a gap-filling batch, not an exhaustive national factory inventory.

| Project | Milestone | Project investment | Production / local IDs |
|---|---|---|---|
| [Bayer Announces a $2.2 Billion Pharmaceutical Campus in New Albany](https://www.chronopin.com/pin/19702/bayer-announces-a-2-2-billion-pharmaceutical-campus-in-new-albany) | 2026-10-02 | USD 2,200,000,000 | 19702 / 19643 |
| [SK hynix Breaks Ground on Its Over-$4 Billion Indiana HBM Packaging Plant](https://www.chronopin.com/pin/19703/sk-hynix-breaks-ground-on-its-over-4-billion-indiana-hbm-packaging-plant) | 2026-08-27 | Over USD 4,000,000,000 | 19703 / 19644 |
| [Avio Breaks Ground on Its $500 Million Virginia Rocket-Motor Plant](https://www.chronopin.com/pin/19704/avio-breaks-ground-on-its-500-million-virginia-rocket-motor-plant) | 2026-09-29 | USD 500,000,000 | 19704 / 19645 |
| [U.S. Steel Breaks Ground on Fairfield’s $475 Million Quench-and-Tempering Facility](https://www.chronopin.com/pin/19705/u-s-steel-breaks-ground-on-fairfield-s-475-million-quench-and-tempering-facility) | 2026-09-21 | USD 475,000,000 | 19705 / 19646 |
| [L3Harris Opens Camden’s Arsenal of Freedom Rocket-Motor Factory](https://www.chronopin.com/pin/19706/l3harris-opens-camden-s-arsenal-of-freedom-rocket-motor-factory) | 2026-10-20 | Unpublished; null | 19706 / 19647 |
| [Novelis Produces the First Coil at Its $5 Billion Bay Minette Aluminum Plant](https://www.chronopin.com/pin/19707/novelis-produces-the-first-coil-at-its-5-billion-bay-minette-aluminum-plant) | 2026-10-07 | USD 5,000,000,000 | 19707 / 19648 |

## Evidence and media

Five pins carry sourced investment figures in USD without FX conversion. Cost quotes and scope explanations are saved in native references and summaries. The SK hynix numeric price is the published USD4B floor. Camden stays null because its USD216M agreement spans multiple sites. These are announced project investments, not independently audited final construction bills.

Eight relevant images were downloaded with plain curl, visually inspected, uploaded to Azure Blob Storage and publicly byte-verified before saving live references. Captions and credits distinguish Bayer’s rendering, SK hynix/Avio/Fairfield groundbreaking photos, Camden’s ribbon cutting and Novelis’s commissioning photos. No images were added to Git. Source URLs, source-page URLs, credits, captions and hashes are retained in the research JSON.

All 15 cited source wikis per environment saved successfully. Six native pin pages per environment returned HTTP200. All six are tagged **U.S. factory buildout**, **Manufacturing** and **Factory construction**, with their state tag.

## Existing coverage preserved

Skipped duplicate milestones already represented by Lilly Houston2903, Lilly Richmond19423, GlobalFoundries Malta15638, Lockheed Martin Grand Prairie16354 and Carrier Fort Worth19422. Their authors and content were left unchanged. No inappropriate product-event parents were assigned.

## Research gaps and precision

- Bayer: exact factory parcel/coordinates and construction start day not established; announcement date is confirmed, 2031/2034 module dates are targets. Operator HTML403; city page and Manufacturing Dive rendering independently checked.
- SK hynix: intersection marker is site-area context, not surveyed centroid. Homepage H2 2028 operations conflicts with newer August28 release specifying October2028 cleanroom and H2 2029 mass production. Project/construction galleries checked; maintenance image and stale schedule not used as fresh proof. Further permit/litigation audit remains outside this milestone batch.
- Avio: exact plant parcel point not verified. Use September operator900000sqft/1500jobs projections rather than older February860000sqft/1000jobs. Completion late2028 and production early2029 are targets.
- Fairfield: existing works coordinates only, not new building centroid; $475M Q&T excludes $75M Premium Thread Line. Ceremony photograph, not a completed-plant photograph.
- L3Harris: exact new-building footprint and standalone budget unpublished. $216M covers three locations; not attributed to one factory. Investor mirror403/plain BusinessWire media download failed; direct operator photo downloaded with plain curl.
- Novelis: first cold-mill coil is a commissioning milestone, not full commercial opening. Latest Oct7 release targets Q2 2027 shipments. Old homepage H2 2026 commissioning and17B cans differ in scope/timing from latest release; not silently treated as current shipment capacity. Address point is site context.

## Sources

- **bayer**: [Bayer to invest 2.2 billion U.S. dollars in new manufacturing site in the United States](https://www.bayer.com/en-us/united-states/news-and-stories/2026/new-pharmas-manufacturing-site), [Bayer Announces $2.2B Life Sciences Investment in the New Albany International Business Park](https://newalbanybusiness.org/news/2026/10/bayer-announces-life-sciences-investment-in-the-new-albany-international-business-park/), [Bayer to invest $2.2B in Ohio pharmaceutical facility](https://www.manufacturingdive.com/news/bayer-to-invest-2b-ohio-pharmaceutical-facility-new-albany/832237/)
- **skhynix**: [SK hynix Holds Groundbreaking Ceremony for HBM Production Base in Indiana, “Beginning a New Future for US-Korea AI”](https://news.skhynix.com/en/groundbreaking-ceremony-in-indiana/), [SK hynix West Lafayette](https://www.skhynix.com/westlafayette.IN/), [Lane Closure – Yeager Road](https://wlmoves.com/project/lane-closure-yeager-road/)
- **avio**: [Governor Spanberger, Avio USA Break Ground on $500 Million Manufacturing Facility in Pittsylvania Creating 1,500 Jobs](https://www.governor.virginia.gov/newsroom/news-releases/2026/september-releases/name-1124207-en.html), [AVIO USA BREAKS GROUND IN VIRGINIA ON FIRST U.S. SOLID ROCKET MOTOR FACILITY, STRENGTHENING DEFENSE SUPPLY CHAIN AND CREATING OVER 1,000 JOBS](https://aviousa.com/groundbreaking)
- **fairfield**: [U. S. Steel Breaks Ground on $475 Million Quench and Tempering Facility at Fairfield Tubular Operations](https://www.ussteel.com/es/media/newsroom-details/-/blogs/u-s-steel-breaks-ground-on-475-million-quench-and-tempering-facility-at-fairfield-tubular-operations), [U. S. Steel Breaks Ground On Its New $475M Fairfield Tubular Facility](https://www.constructionequipmentguide.com/u-s-steel-breaks-ground-on-its-new-475m-fairfield-tubular-facility/72469), [U.S. Steel Fairfield plant](https://www.gem.wiki/U.S._Steel_Fairfield_plant)
- **l3harris**: [L3Harris Opens Next‑Generation Solid Rocket Motor Facility to Boost Production Capacity](https://www.l3harris.com/newsroom/press-release/2026/10/l3harris-opens-next-generation-solid-rocket-motor-facility-boost), [L3Harris Opens Next‑Generation Solid Rocket Motor Facility to Boost Production Capacity](https://investors.l3harris.com/news/news-details/2026/L3Harris-Opens-NextGeneration-Solid-Rocket-Motor-Facility-to-Boost-Production-Capacity/default.aspx)
- **novelis**: [Novelis Produces First Coil at Greenfield Aluminum Rolling and Recycling Plant in Alabama](https://investors.novelis.com/news-events/press-releases/detail/1427/novelis-produces-first-coil-at-greenfield-aluminum-rolling-and-recycling-plant-in-alabama), [Bay Minette, Alabama, USA](https://novelis.com/locations/bay-minette/)

Full payloads, cost evidence, environment mappings and media metadata: [research JSON](research/us-factory-buildout-2026-10-24.json).
