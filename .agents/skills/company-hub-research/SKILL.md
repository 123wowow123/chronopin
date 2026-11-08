---
name: company-hub-research
description: >-
  Use when building a company landing (hub) page like /company/tesla for another company: pick companies,
  draft the product tree from its pins, then write sourced overviews, facts, milestones and segment revenue.
---

# Company hub pages

API and tables: `docs/okf/api/company-hub.md`. Tesla (hub pin 20728) is the template. Local only until the owner asks to deploy.

1. **Pick:** about 10+ dated pins across 3+ products (`companies:marketcap` for order). Most of the queue is in `ToDo.md`.
2. **Draft the tree:** write a rules file `{ "Product": ["keyword"] }` and run
   `npx tsx scripts/company/hubDraft.ts "<Company>" rules.json`. It prints groups and a coverage line and writes nothing.
   Place or drop the "Other" pins by hand; one data-centre pin per site is usually a "Data centres" product, not a milestone.
3. **Hub pin:** create it through the normal pin API (company set, kept off the timeline by the hub row).
4. **PUT** the reviewed tree to `/api/admin/company-hub` with 3 to 6 `milestones` per product, then `overview` and `facts` written only from the product's pins and their sources (`[pin:ID]` citations, never invented).
5. **Segments:** `PUT /api/admin/company-segments` from results pins that state every segment; leave a quarter out otherwise.
6. Translations are left to the translation agent; no deploy without the owner's ask.

## Traps found building Apple, Microsoft, Google, Nike, Salesforce and Boeing (2026-11-05)

- **`create_pin` writes to PRODUCTION**, not the local database, but it checks duplicate `sourceUrl`s against the LOCAL one. A hub pin made with it exists on prod immediately and is public. Create the hub locally first with `POST /api/pins` (admin token, `.scrape/admin-local.token`), then create the prod hub with `create_pin` using a different valid address for the same Wikipedia page (for example `Google_LLC`, `Nike_(company)`, `Boeing#Boeing_Commercial_Airplanes`) so the local dedupe does not refuse it. Local and prod hub ids differ; local ids also collide with unrelated prod ids, so never copy a hub id across.
- **Pin ids in the tree are the same on both sides** (local is a prod pull), but verify every id by title and company before the prod PUT (`GET /api/pins/:id` on both) and stop on a mismatch.
- **Companies can be split**: Boeing's airliner pins sit under "Boeing Commercial Airplanes" (76), not "Boeing" (11). Check `Company` names first; the hub belongs to the company that owns the pins.
- Overviews cite only what the pins' descriptions say; reports and rumours are labelled as reports. Counts of sites or items come from pin titles and are computed, not typed.
- A tree pin lists its whole same-author thread, so the page shows more pins than were listed.
- Prod pushes: the prod admin token is `.scrape/admin.token`; a one-off network timeout happens, retry with a timeout.

- **Chained catalogues cannot be split into products.** A listed pin expands to its whole same-author thread (`Pins.threadIds`), so when a company's pins are one chain (Disney Animation, Pixar, Marvel Studios) every product would show every pin. Build one product and put the franchise or era breakdown in its overview, facts and milestones, or re-thread the pins (not done). Check thread structure first: count pins whose `parentId` is null or outside the company.
- Catalogue overviews can be generated from pin titles and dates (`scratchpad` helper pattern: past-tense the title verb, add the pin date when the title has no month, cite `[pin:ID]`); keep each product's overview under 8,000 characters (the PUT limit) and never cut mid-sentence.

## Hub pin picture: founding site, else the logo (Ian, 2026-11-08)
- A hub pin's picture is the company's founding site (the garage, first office, first studio or fab) when a photo exists; otherwise the company logo is fine. Never a look-alike or a current-HQ photo passed off as the founding.
- Lists (New pins, Trending) fall back to `Company.logoUrl` for a pin with no medium (`PinView.pictures(ids, { companyLogo: true })`, `logo: true`, shown whole on a white tile by `PinThumb`). A real picture always wins, so adding a founding photo replaces the logo automatically.
- Find photos with the Commons search API (`generator=search&gsrnamespace=6`, generic User-Agent), download `Special:FilePath/<file>?width=1200`, view each, and read the file's licence and author. Record gaps (Lululemon, Xiaomi 2026-11-08: no founding photo found) rather than use a stand-in.
- Hub pins exist only locally until the owner asks for prod, and prod ids differ. Attach with `scripts/company/founding-media-2026-11-08.mjs` (Azure upload under `company-founding/`, PUT with media, credits restored, expire, readback); copy it and change the jobs list. Credit the author and licence in `authorName`/`authorUrl`.
