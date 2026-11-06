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
