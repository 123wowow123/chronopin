---
name: special-day-freebies
description: >-
  Use this skill when creating or updating a special-day freebies pin (Veterans Day free meals, free cone day,
  Military Appreciation deals) in the 06:00/18:00 news job: finding the day, sourcing each chain's offer, linking
  each chain to its own offer page, and tagging the pin so the timeline weighs it up.
---

# Special-day freebies pins

Docs: `docs/okf/scraping/daily-jobs.md#specialdayfreebies`. Task id `specialDayFreebies` (group "Find new events",
in the news job's default tasks and required list in `src/lib/dailyJobs.ts`). First pin: Veterans Day 2026, id 20936.
Owner instruction 2026-11-10.

## When
- Look 10 days ahead for a US special day with a freebie round-up: Veterans Day (Nov 11), Military Appreciation
  Month (May), National Ice Cream/Cone/Donut/Coffee days, Free Cone Day, Teacher/Nurse Appreciation weeks, Pi Day,
  Taco Tuesday-style annual events. The `specialDays` catalog and `server/api/specialtyDay` list the dates.
- `find_pins` first (title words, `around` the date). If a pin exists, update it; never create a second.
- One pin per special day and year, dated all-day to the day (`utcStartDateTime` = 00:00Z, `allDay: true`,
  `dateConfidence: 'confirmed'` once a round-up lists the date). Author `@FoodDesk`; add `Retail` when stores are in.
- Tags: `Freebies` (**required**: `freebiesWeight` in `src/lib/bagSample.ts` triples the pin on a crowded day),
  the day's name, and a topic tag such as `Military discounts`. Categories `Food`, `Retail`.

## Sourcing
- Main source: a news round-up (Fox TV stations' deals guide, Hip2Save, Newsweek, VA News, Military Times). Open it;
  never work from search snippets. Two independent round-ups before calling a chain's terms settled.
- **Link every chain to its own offer page** and add that page as a reference (confidence 90 for an official 2026
  page, 80 when its terms are unclear). Find it with `WebSearch` limited to the chain's domain, or from links in the
  round-up article's body. A homepage, a third-party "near me" site or a page for another year is **not** an offer
  page: leave that chain unlinked and cited to the round-up only.
- Check the year on each page (release date, "2026", valid-through). Walgreens-style pages with no year, and
  last year's press releases (Winn-Dixie's 11% was a 2022 release), are not proof. Drop a line that cannot be
  verified for this year rather than keep it on the round-up's word.
- A PDF or flyer linked from the article can be the offer (Bob Evans' printed Veterans Day menu): download and read it.

## Pin body
- `longFormSummary`: `<h3>` groups (Free meals, Free appetizers and sides, Free coffee and quick bites, Other
  freebies, Discounts, Before you go), one `<li>` per chain: `<strong>` name (an `<a>` to its offer page when it has
  one), the offer with date, hours, dine-in and proof of service, then `<cite data-ref="URL"></cite>` for each source
  that lists it (the round-up plus the chain's own page). Never bracket text like `[1]`: the site numbers `cite` itself.
- Description: one sentence with the date and the "proof of service, often dine-in" caveat.
- Media: 3 or more pictures from the round-up (`check_image` each: 400px or wider, no repeat), credited by the
  reference. No pin photos in Git.
- Do not run translations; the translation agent does (AGENTS.md, 2026-10-30).

## Daily upkeep
- Each run before the day: re-open the sources, add chains announced since, update or drop changed terms.
- On the day: confirm the pin is live and cited; afterwards leave it (no stale "today" wording).
- Report in the run note: chains linked, chains left unlinked and why, lines dropped.
