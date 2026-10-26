---
type: Reference
title: "Michael Burry rubric update — 2026-10-25"
description: "Saved and verified through authenticated PUT /api/people/1310/wiki on localhost and production."
tags: [scraping]
---

# Michael Burry rubric update — 2026-10-25

Saved and verified through authenticated `PUT /api/people/1310/wiki` on localhost and production. Both compiled wikis contain the two sourced axes. Existing earnings, contributions, matters, properties and trips were preserved.

- Education remains **4/5**, with high confidence and a direct university source for his MD, class of 1997.
- Position adds **3/5**, the senior-manager anchor, for documented historical leadership of Scion Capital and Scion Asset Management. This does not assert that either fund operates today.
- Other axes remain unscored: no sufficiently dated personal wealth assessment, verified population poll, current functional-health assessment, comprehensive legal review or causal social/economic assessment was established.

Opened source: [These Doctors Mean Business](https://news.vumc.org/medicine/these-doctors-mean-business/), Vanderbilt Health News, August 21, 2014. It identifies “Michael Burry, M.D.,’97” and states: “In September 2013, he started another hedge fund—Scion Asset Management.”

Replay patch: `scripts/people/data/michael-burry-rubric.json`. Apply through the wiki update endpoint only after checking the current identity and preserving any newer researched phases. Research notes were appended separately to each environment's existing notes. Ignored before/after snapshots and compiled wikis are in `.scrape/michael-burry-rubric-2026-10-25/`.

This is a runtime content update; no application deployment was needed.
