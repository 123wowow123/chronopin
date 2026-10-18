---
type: API Endpoint
title: Pin OKF bundle
description: GET a pin and the wikis of its links as an OKF v0.2 bundle, or one file of it. Admin only.
resource: "../../../src/app/api/pins/[id]/okf/route.ts"
tags: [api, admin, okf]
generated: { by: claude-code/claude-opus-5, at: 2026-09-19T02:00:00Z }
---

# GET /api/pins/:id/okf

Returns `{ okf_version: "0.2", files: { "<path>": "<markdown>" } }`, the same files [Export an OKF bundle](../playbooks/export-a-bundle.md) writes for one pin.

# GET /api/pins/:id/okf?path=log.md

Returns that one file as `text/markdown`, or 404. A pin with no synced links has no bundle and also answers 404.
