---
type: Reference
title: "Seventh large production boundary review — 2026-10-25"
description: "No new production layers were verified."
tags: [scraping, maps, boundaries, production]
---

# Seventh large production boundary review — 2026-10-25

**No new production layers were verified. Coverage remains 74 mapped pins and 10,245 default features, with five country geometry gaps.** Both the broad discovery pass and the extended title/description pass found no additional candidates beyond the 592 already audited. All 74 saved production maps still match their reviewed geometry and credits. No production data, content, dates, authors or coordinates were written; no deployment, build, restart or VM operation occurred.

This round adds a useful research artifact: **IEC's official Gambia constituency/ward roster**, covering all 53 named constituencies. It is a membership reference, not an importable map.

## Gambia: official membership, geometry still missing

The [IEC download page](https://iec.gm/download/) links its [Wards document page](https://iec.gm/ova_doc/21246/), with both PDF and DOCX attachments. The DOCX is available at `https://iec.gm/wp-content/uploads/2026/03/Wards.docx`. Its internal metadata records creation on March 9, 2023 and modification on March 24, 2026; that metadata is not a claim that every entry has been updated for the final 2027 election plan.

`scripts/boundaries/research-gambia-wards.py` parses the source's actual table cells, checks every nonblank row and produces `scripts/boundaries/research-gambia-wards-2026-10-25.json`. It requires:

- Exactly **53 constituency names**, each associated with one region and one distinct three-digit polling-code prefix. Prefixes are derived grouping aids, not asserted official constituency identifiers.
- **1,555 source data rows and 1,554 distinct polling codes**. The repeated code, 608061, occurs twice in identical Upper Saloum / Njau rows and is recorded explicitly.
- **121 constituency/ward labels after trimming whitespace**. These are not 121 verified wards: Tallinding Kunjang contains both `TALLINDING NORTH` and `TALLINDING NOUTH`, plus `TALLINDING SOUTH`. The apparent spelling variant is retained and flagged rather than silently merged.

The catalog contains the source URL, source SHA-256, document dates, constituency/region membership, ward labels, row counts, duplicated-code evidence and remaining research requirements. It explicitly sets `usableForBoundaryImport: false`. It does not manufacture geographic rings, infer street boundaries from polling sites, or assert a current electoral plan from names alone. Matching polygon data and current-plan validation are still required.

A fresh ArcGIS search found the same two Gambia 2026 result services. Their actual layer metadata was checked again: both use `esriGeometryPoint`. Narrow Russia and Morocco electoral-boundary queries found no additional service to inspect; that search result is not a claim that no such data exists elsewhere.

## Other source leads

[Bharat Survey's constituency map](https://bharatsurvey.org/constituency-mapping) explicitly labels its public Lok Sabha map as **2019 boundaries**, with Assam and J&K pending new open boundaries. It therefore does not resolve India's current national geometry gap.

[Stears' own methodology](https://www.stears.co/article/where-is-my-constituency-stears-journey-to-mapping-nigerias-boundaries/) documents approximated Nigerian House boundaries, specifically Port Harcourt 1/2, and a non-commercial-only restriction. No suitable production reuse authorization or fully verified replacement geometry was established. [OurNigeria's roadmap](https://ournigeria.ng/roadmap), directory and source pages describe broad constituency coverage, but this review did not obtain a complete verified reusable 360-district polygon set from them. No restricted or approximated data was silently imported.

Russia, Morocco and the other existing gaps retain their specific earlier evidence. Existing coverage and the 11 comparison groups, including Angola's 18-to-21 control, were preserved. There are still 401 alternate-plan features.

## Verification and evidence

Authenticated read-back checks passed for all 74 stored maps and their alternate geometry/source credits. The complete replay manifest remains unchanged because there are no newly approved import entries. The research extractor ran successfully, and audit/catalog counts and whitespace checks passed. No application runtime code changed.

During the extended discovery refresh, an older helper overwrote a local research-evidence JSON file. Its 80 historical candidate IDs, titles and descriptions were recovered from the preserved sixth-run text output, with uniqueness and count checks. The latest empty result was saved separately as `large7-extra-candidates.json`; a separate seventh-run helper now uses distinct filenames. Production was unaffected.

Ignored evidence under `.scrape/boundaries/` includes the raw IEC document, extracted table cells, `large7-discovery.txt`, `large7-extra-discovery.txt`, the new source-query results and `large7-all-saved-verified.json`. The tracked roster contains factual membership evidence only; raw documents and credentials remain outside Git.
