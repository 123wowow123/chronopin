# Data center trackers, air-permit generators & campus research — October 21, 2026

Verified October 21, 2026. Comprehensive infrastructure telemetry audit covering all **843 data center pins** across North America and global cloud regions. Ingested air-permit backup generator fleets and gas turbines across 32 facilities, seeded 170 new data center campuses with site boundary polygons, and linked **1743 citation bindings** to **1324 distinct backing OKF Source Wikis**.

Browse all facilities on the [Data Centers Map](https://www.chronopin.com/map?q=tag%3A%22Data%20Centres%22&past=all&future=all&posted=all&fit=results). Filter by telemetry queries such as `generators:>=50`, `chips:>=100k`, `water:>=1mgd`, or `acres:>=200`.

## Executive Summary & Telemetry Totals

| Metric | Verified Total | Description |
|---|---:|---|
| **Total Data Center Pins** | **843** | Hyperscale, enterprise, colocation, and frontier AI campuses |
| **Pins with Backup Generators / Turbines** | **106** | Facilities with explicit air-permit or utility fleet counts |
| **Tracked Generators & Turbines** | **6,445** | Sum of documented diesel generators and natural gas turbines |
| **Pins with Site Boundary Polygons** | **279** | Polygons drawn on Pin Detail Map (boundaries, buildings, chillers, generators, substations) |
| **Total Tracked Power Capacity** | **353,489 MW** | Facility nameplate load, utility interconnect, or planned IT power |
| **Estimated Cooling Water Use** | **441.6 M gal/d** | Modeled (0.45 L/kWh) and permit-published daily water consumption |
| **Frontier AI Accelerators** | **28,765,808** | H100, B200, TPU v4/v5p and GB200 GPU cluster deployments |
| **Distinct Backing Source Wikis** | **1324** | Open Knowledge Format (OKF v0.2) SourceWiki records |
| **Pin-to-Wiki Citation Bindings** | **1743** | Verified link connections across all data center pins |

## Highlights: Air-Permit Generator Fleets & Dedicated Turbines

| Facility | Location | Power | Backup Generators / Turbines | Backing Source Wiki |
|---|---|---:|---|---|
| [Starwood Project Washington](https://www.chronopin.com/pin/19318) | New Castle County, DE | 1,200 MW | **516 backup diesel generators** | [DE DNREC Air Permit](https://www.chronopin.com/pin/19318) |
| [QTS Henrico County](https://www.chronopin.com/pin/19319) | Henrico County, VA | 1,500 MW | **370 backup diesel generators** | [VA DEQ Emissions Permit](https://www.chronopin.com/pin/19319) |
| [Project Atlas / Lehigh County](https://www.chronopin.com/pin/19320) | South Whitehall, PA | 1,000 MW | **356 diesel backup generators** | [PA DEP Plan Approval](https://www.chronopin.com/pin/19320) |
| [Equus Virginia Technology Park](https://www.chronopin.com/pin/19321) | Frederick County, VA | 150 MW | **288 emergency backup generators** | [Filing Review](https://www.chronopin.com/pin/19321) |
| [Amazon Becker Campus](https://www.chronopin.com/pin/19315) | Sherburne County, MN | 1,000 MW | **250 diesel backup generators** | [MPCA Air Quality Permit](https://www.chronopin.com/pin/19315) |
| [Oppidan Hampton Campus](https://www.chronopin.com/pin/19316) | Dakota County, MN | 1,000 MW | **250 diesel backup generators** | [MPCA Air Quality Permit](https://www.chronopin.com/pin/19316) |
| [Google Project Zodiac](https://www.chronopin.com/pin/19317) | Fort Wayne, IN | 600 MW | **179 diesel generators** | [IDEM Air Construction Permit](https://www.chronopin.com/pin/19317) |
| [QTS Aurora Data Center](https://www.chronopin.com/pin/19323) | Adams County, CO | 160 MW | **138 diesel backup generators** | [CDPHE Air Permit](https://www.chronopin.com/pin/19323) |
| [Google Lima (Project Bistrozzi)](https://www.chronopin.com/pin/19314) | Allen County, OH | 1,000 MW | **115 diesel generators** | [Ohio EPA Permit-to-Install](https://www.chronopin.com/pin/19314) |
| [Meta El Paso Data Center](https://www.chronopin.com/pin/7248) | El Paso, TX | 1,000 MW | **813 small natural gas generators** | [TCEQ Standard Air Permit](https://www.chronopin.com/pin/7248) |
| [Crusoe Taylor County](https://www.chronopin.com/pin/19313) | Taylor County, TX | 1,200 MW | **62 diesel generators + 10 gas turbines** | [TCEQ Flexible Air Permit](https://www.chronopin.com/pin/19313) |
| [xAI Colossus 2](https://www.chronopin.com/pin/19311) | Southaven, MS | 1,000 MW | **87 natural gas turbines** | [MDEQ Air Quality Notice](https://www.chronopin.com/pin/19311) |
| [xAI Colossus 1 Boxtown](https://www.chronopin.com/pin/19312) | Memphis, TN | 150 MW | **15 permitted gas turbines (35 unpermitted)** | [Shelby County Health Dept / SELC](https://www.chronopin.com/pin/19312) |
| [Vantage Stargate](https://www.chronopin.com/pin/19310) | Port Washington, WI | 500 MW | **45 backup diesel generators** | [WDNR Air Management Permit](https://www.chronopin.com/pin/19310) |
| [Microsoft Mount Pleasant](https://www.chronopin.com/pin/19309) | Racine County, WI | 1,000 MW | **40 emergency diesel generators** | [WDNR Air Construction Permit](https://www.chronopin.com/pin/19309) |

## Backing Source Wikis & OKF Architecture

Every pin links to native Open Knowledge Format (OKF v0.2) `SourceWiki` records stored in PostgreSQL (`"Source"`, `"SourceWiki"`, and `"PinSource"`). When users inspect a pin on Chronopin, the telemetry panel cites the exact state permit docket or operator disclosure.

The complete machine-readable audit is preserved in [datacenter-stats-research-2026-10-21.json](datacenter-stats-research-2026-10-21.json), recording all **843 facilities**, their exact geographic coordinates, date confidence reasoning, generator fleet manifests, site outline feature counts, and backing wiki bindings.
