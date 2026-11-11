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
Only advice a source gives for that pin or its kind of thing; never invent a tip. Leave the pin without rows rather than guess. Strings are in every messages/*.ts locale (pin.proTip, pin.proTips, pin.proTipSource); the tip text itself is stored in one language.
