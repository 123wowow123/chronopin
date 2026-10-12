# Electricity generation project pins — research started October 11, 2026

**Import in progress.** 5,942 of 33,124 prepared new inventory pins have been published through the production admin pin API as @EnergyDesk. 3 operator-sourced additions and 7 new standby-generation sites are also saved. Existing project pins are linked to the collection, and confirmed EIA/GEM overlaps are consolidated. Live new inventory/supplement/standby count: **5,952**.

Browse the [worldwide collection](https://www.chronopin.com/map?q=tag%3A%22Electric%20Generation%20Projects%22) or [United States collection](https://www.chronopin.com/map?q=tag%3A%22Electric%20Generation%20Projects%22%20place%3A%22United%20States%22). Use `tag:"Operator researched" place:"United States"` to find individually researched U.S. entries. Multiple values of the same search field are alternatives, so two `tag:` terms do not intersect their collections. Snapshot status tags describe the source inventory month; dated operator evidence is shown separately where reviewed.

## Inventory sources and scope

- [EIA preliminary monthly generator inventory](https://www.eia.gov/electricity/data/eia860m/), [August 2026 workbook](https://www.eia.gov/electricity/data/eia860m/xls/august_generator2026.xlsx): planned generating units and 2025–2026 operating additions, with unit IDs, technology, fuel, plant coordinates, nameplate/seasonal ratings, status and operation month/year. Puerto Rico and recent standby units are included. EIA’s survey covers plants with at least 1 MW combined nameplate capacity; individual included units can be smaller.
- [Global Energy Monitor integrated tracker](https://globalenergymonitor.org/projects/global-integrated-power-tracker), [August 2026 workbook from GEM’s public dashboard repository](https://github.com/GlobalEnergyMonitor/gipt-dashboard/blob/main/Global%20Integrated%20Power%20August%202026.xlsx): active announced, pre-construction and construction phases, plus phases reported operating in 2025–2026. Data adapted from Global Energy Monitor under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/). The website advertises a newer September release; the fully available, inspected unit-level file used here is explicitly August 2026.
- Technologies cover solar, onshore/offshore wind, gas/oil, nuclear, conventional hydropower, geothermal and bioenergy; selected operator research also covers experimental fusion. Existing-site additions, repowers, replacements and restarts are distinguished from new greenfield plants where evidence allows.
- Battery-only and pumped-storage rows are excluded from the generation inventory. Hybrid plants retain their generating component; battery MW/MWh are not added to generating capacity. The preprocessing excluded 639 GEM pumped-storage rows and 818 EIA storage rows.
- The combined research universe contains 33,184 raw project/profile groups across 208 source country/area labels, including 3,151 U.S. groups before final overlap consolidation. These are country/area labels, not a count of sovereign states.

This is broad coverage within the named datasets’ thresholds, not every new generator on Earth. GEM’s thresholds vary by technology (including approximately 20 MW for proposed solar, 10 MW wind, 30 MW hydro/coal, and 50 MW oil/gas outside Europe). Small/distributed, unreported and newly announced projects can be missing. Operator additions were researched where discovered.

## Dates, status and capacity

Inventory pins state **Aug 2026 inventory** in their titles and descriptions. They must not be interpreted as fresh October confirmations. Announced/pre-construction projects remain proposals; no financing, construction start or opening is inferred merely from a target date. Cancelled, shelved, mothballed and retired phases are excluded.

Year/month-only commissioning values use estimated period-end boundaries, explained on each pin. Undated proposals use August 31 only as an inventory-month milestone, with an explicit statement that no commissioning date was verified. Elapsed targets do not prove operation. Multi-phase pins display each included phase’s status and date precision.

EIA nameplate and net-summer ratings are retained separately. GEM solar AC/DC/unknown rating labels remain at phase level. The metadata `capacityMW` is a sum of reported source ratings within that view; it is not a comparable AC fleet total, guaranteed delivered output or annual energy. EIA and GEM views for the same project must not be added together. Operator figures and first-power versus commercial-operation milestones are distinguished in researched entries.

Coordinates are source plant points, with GEM exact/approximate labels attributed to GEM. They are not surveyed entrances or proof of a final parcel. Operator supplements without verified parcels use explicitly qualified county/locality points. No source photos or thumbnails are added to Git.

## Deeper U.S. work

Saved 37 detailed operator/regulator updates, checked against 55 distinct linked pages, plus dedicated operator additions for Rabbit’s Foot, Crooked Creek (Oklahoma) and T.H. Wharton. Major checks include:

- SunZia fully operational announcement; Cape Station’s first 33 MW GeoBlock commercial operation on September 30; Quantum operations in June.
- Legend and Lone Star groundbreaking; Delta Blues/Vicksburg/Traceview construction and distinct delivery dates; Cumberland first-fire/grid synchronization; Mill Creek 5 and Cedar/Greens Bayou rating differences.
- Clinch River’s September 28 construction permit, separate from later announcements; Kemmerer construction; Hermes 2 electric output versus Hermes 1 test-reactor thermal ratings; Long Mott/Cascade licensing; Aurora-INL versus the separate Groves research reactor.
- Crane and Duane Arnold restarts; CVOW, Revolution Wind, Sunrise Wind and Empire Wind partial operation/construction; Orion and ARC remain experimental fusion developments with conditional targets.
- Project Matador’s gas/nuclear source scopes and October 9 draft-EIS notice; Cheyenne Phase 1 turbine allocation versus full-campus scope; Kingston new gas versus continued older fossil operation; Plant Yates new units versus existing converted units.

The [U.S. research and photo metadata](electric-generation-usa-research-2026-10-11.json) preserve facts, links, dates, credits and applied pin IDs. The [project records](electric-generation-pins-2026-10-11.jsonl) preserve inventory phase/unit evidence and publication IDs. Multiple source views can point to the same consolidated pin; do not count JSONL rows as distinct live pins.

## Photos and unresolved research gaps

Eight visually reviewed project images from five operator project sites are stored in verified public Azure blobs. Mill Creek’s rendering is labelled as an illustration. Cape Station’s image covers phase I; Hermes 2 and CCSM images document groundbreaking/infrastructure work; Empire Wind’s linked construction images show offshore installation. Original URLs, page URLs and operator/photographer credits are retained in the research metadata and pin descriptions. An operator logo encountered during sourcing was excluded from pin photography.

Some operator/regulator pages returned 403 to ordinary fetches; readable web-source evidence was retained instead of treating blocked fetches as facts. RWE’s linked Canto library returned a JavaScript gallery shell, with no project-specific photograph verified. Bulk inventory entries do not have individually audited operator galleries; photo coverage remains a documented gap rather than substituting unrelated facility images. Exact parcels remain unresolved for selected early proposals. Crooked Creek’s release has conflicting site-start wording; that conflict is retained. Natrium’s current EPC arrangement and schedule implications need a further sourced revisit.

## Verification

U.S. verification: {"verifiedUSPinIds": 3114, "USnewInventoryPins": 3096, "USpublicMapPins": 3114, "operatorUpdates": 37, "checkedAtUTC": "2026-10-12T00:11:01Z"}. The U.S. collection filter uses the generation-project tag plus the United States address filter.

The live import is still running. Final read-back, collection membership and public pin/image verification will be recorded here when every prepared record has been processed.

No production VM deployment, build or restart is required or performed. Content saves use the management APIs.
