---
type: Postgres Table
title: PinProTip
description: Short, practical, sourced advice on a pin, shown as a "Pro tips" panel on the pin page when the pin has any.
resource: ../../../scripts/db/schema/0256_pin_pro_tip.sql
tags: [table, schema, pin]
---

# Schema
Many rows per pin (`pinId`, cascade delete): `tip` (required, 500 chars), `sourceUrl`, `position`. `Pin#update()` never touches it. At most 6 per pin.

# Where it is used
* **Pin page:** `data-pro-tip-panel`, above the title; absent when the pin has no rows.
* **API:** `GET|PUT|DELETE /api/pins/:id/pro-tips` (author or admin). `PUT {tips:[{tip, sourceUrl?}]}` replaces the whole list.

# Rules
Only advice a source gives for that pin or its kind of thing; never invent a tip. Leave the pin without rows rather than guess. Strings are in every messages/*.ts locale (pin.proTip, pin.proTips, pin.proTipSource); the tip text itself is stored in English, with translations in `PinProTipTranslation` (below).

# Translations
`PinProTipTranslation` (`scripts/db/schema/0264_pin_pro_tip_translation.sql`): one row per (`proTipId`, `locale`) with `tip` and `sourceHash` (sha1 of the English tip). The pin page shows a translation only while its hash matches the tip; otherwise English. `PUT /api/pins/:id/pro-tips` makes new tip ids, so a replaced list loses its translations and needs them again.
* **Admin API:** `GET /api/admin/pro-tip-translations?locale=zh,ja&limit=200&after=<tip id>` lists tips lacking a current translation (with `sourceHash`); `POST {translations:[{proTipId, pinId, locale, sourceHash, tip}]}` saves them (max 500) and refreshes the pin's cache.
* Translations are made by the translation agent, not in pin research sessions.
