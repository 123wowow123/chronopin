# Electricity generation projects — cost and output qualification in progress

**Import and scope cleanup in progress.** Published 4,957 of 11,018 eligible new inventory pins, plus 9 operator/standby additions. 6,061 eligible inventory entries remain to save. The collection contains 4,966 new live pins and 7 retained existing construction/commissioning pins. The prepared inventory covers 176 source country/area labels; these are not a count of sovereign states.

Browse the [worldwide collection](https://www.chronopin.com/map?q=tag%3A%22Electric%20Generation%20Projects%22) or [U.S. collection](https://www.chronopin.com/map?q=tag%3A%22Electric%20Generation%20Projects%22%20place%3A%22United%20States%22). Two `tag:` values are alternatives, so the U.S. link uses the project tag plus the address filter. For detailed U.S. entries use `tag:"Operator researched" place:"United States"`.

## Included work

The collection keeps physical construction, completed construction/commissioning and units reported operating in **2025–2026**. Announcements, licence applications, permitting, approved-but-unbuilt proposals and pre-construction phases are excluded unless a primary operator source verifies actual construction. Secured equipment, a PPA, a permit, financing or a target date alone does not establish physical construction. Experimental fusion proposals are excluded. Existing-site additions, repowers and physically progressing reactor refurbishments are identified separately from new greenfield plants.

Mixed-site pins include only qualifying generating units/phases. Excluded future expansions no longer contribute to included capacity. Matching EIA/GEM source views are non-additive. Documented physical construction can take several years; speculative later phases are not kept merely because a site's first unit is being built. This scope uses evidence of work rather than treating an estimated date as low project confidence.

The stricter review excludes 22,106 prepared proposal records. 669 previously saved task-created pins have been soft-deleted during cleanup. Pre-existing historical proposal records are preserved, with their collection tag removed. Crooked Creek's conflicting construction wording was insufficient for this scope and its new pin is removed. Raw excluded research is retained only in ignored local checkpoints, not the public collection catalog.

## Sources and limits

- [EIA preliminary monthly generator inventory](https://www.eia.gov/electricity/data/eia860m/), [August 2026 workbook](https://www.eia.gov/electricity/data/eia860m/xls/august_generator2026.xlsx). Retained statuses are U/V construction, TS completed construction/commissioning and recent OP operation. Puerto Rico and separately researched recent standby units are included. EIA covers plants with at least 1 MW combined nameplate capacity; individual units can be smaller.
- [GEM integrated tracker](https://globalenergymonitor.org/projects/global-integrated-power-tracker), [inspected August 2026 workbook](https://github.com/GlobalEnergyMonitor/gipt-dashboard/blob/main/Global%20Integrated%20Power%20August%202026.xlsx). Retained construction and 2025–2026 operating phases. Data adapted from Global Energy Monitor under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). GEM advertises a September release; the fully inspected unit-level mirror used here is August.
- Generation technologies include solar, wind, gas/oil, conventional hydro, coal, bioenergy, geothermal and qualifying nuclear construction. Batteries and pumped storage are excluded; their MW/MWh are not added to generation. Solar AC/DC, net and nameplate rating conventions remain explicit.

These are explicitly labelled August snapshots, supplemented by dated primary evidence where researched. They do not establish fresh October status for every site. Dataset thresholds and reporting gaps mean this is not every small or unreported generator on Earth. GEM thresholds vary by technology, including roughly 20 MW proposed solar, 10 MW wind, 30 MW hydro/coal and 50 MW oil/gas outside Europe. Coordinates are reported plant points, sometimes approximate, not surveyed entrances. Workbook URL fragments are logical record identifiers, not workbook row-jump controls.

Year/month-only dates use estimated period-end boundaries. Undated construction uses August 31 solely as an inventory-month marker. Past targets do not prove operation. Operator-groundbreaking pins date the actual milestone rather than inventing a commissioning day.

## U.S. research and selected scope decisions

23 retained individually researched updates and two operator additions (Rabbit's Foot construction and T.H. Wharton recent operation) supplement the inventory. The current saved U.S. new-pin count is 1,881. [Research and photo metadata](electric-generation-usa-research-2026-10-11.json) and [eligible project records](electric-generation-pins-2026-10-11.jsonl) preserve evidence, unit ratings and pin IDs.

The research distinguishes SunZia's full-operation announcement, Cape Station's first 33 MW GeoBlock, Quantum solar versus battery energy capacity, first fire versus commercial operation, partial offshore-wind generation versus complete construction, and operator outputs versus EIA nameplate sums. Legend/Lone Star have verified physical groundbreaking. Matador includes only its qualifying construction units, not the full advertised campus or proposed nuclear fleet. Hermes 2's permitted electricity-producing construction is separate from Hermes 1's thermal test reactor. Natrium's 345 MW reactor rating is separate from storage-assisted peak output. Palisades has documented physical refurbishment/testing; proposed new SMRs are excluded. Darlington includes Unit 1 construction, not three unapproved future units.

Clinch River's permit, Long Mott/Cascade licensing and site characterization, future geothermal agreements, equipment-only Cheyenne plans, and unverified restart proposals no longer qualify for the collection. Their primary evidence was useful to make the exclusion decisions; they are not counted as live construction entries.

## Photos and remaining gaps

Eight visually reviewed operator project images are stored in verified public Azure blobs, with original URLs, captions and credits retained. Mill Creek's rendering is labelled as an illustration. Photographs cover Mill Creek, Cape Station, Hermes 2, Empire Wind and CCSM construction activity. An operator logo was excluded. No source image bytes or generated thumbnails are added to Git.

Bulk inventory sites do not have individually audited operator galleries. Some official pages returned 403; RWE's linked Canto gallery returned a JavaScript shell, and no relevant photograph was verified there. No enabled browser was available for gallery UI inspection. These photo gaps are recorded rather than filled with unrelated facility pictures. Exact parcels and current post-August status remain gaps for some inventory entries. Current Natrium EPC/schedule changes need further primary-source review.

## Verification

Final collection read-back and exclusion checks will be recorded after cleanup and the remaining eligible batches finish. Earlier broad-scope verification is superseded by this narrower scope.

No production VM deploy, build or restart was requested or performed. Content is saved through the production management APIs.
