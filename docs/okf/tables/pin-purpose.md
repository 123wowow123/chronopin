---
type: Postgres Table
title: PinPurpose
description: Why a project exists - the problem it solves, how, and for whom - shown as a "Problem it solves" widget on the pin page of anything built or proposed.
resource: ../../../scripts/db/schema/0255_pin_purpose.sql
tags: [table, schema, construction]
---

# Schema
One row per pin (`pinId`, cascade delete): `problem` (required), `solution`, `beneficiaries`, `sourceUrl`, `checkedAt`. `Pin#update()` never touches it.

# Where it is used
* **Pin page:** `data-purpose-panel` above the project/dam specs.
* **API:** `GET|PUT|DELETE /api/pins/:id/purpose` (author or admin). `PUT` replaces the row.

# Rules
State only a rationale a source gives for that project; never invent one. Leave the pin without a row rather than guess.
