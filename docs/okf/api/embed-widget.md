---
type: API Endpoint
title: Embeddable pin widget
description: A countdown or thread for any pin that blogs embed with one snippet, linking back to the pin page.
resource: "../../../src/app/embed/pin/[id]/route.ts"
tags: [api, embed, seo, backlinks]
generated: { by: claude-code/claude-sonnet-5-5, at: 2026-10-29T00:00:00Z }
---

# Embeddable pin widget

Public, no sign-in. Guide for bloggers: `/embed` (linked from the site footer,
in the sitemap). Code: `src/lib/widget.ts` (options, snippets, HTML, loader),
`src/app/embed/pin/[id]/route.ts`, `src/app/embed/widget.js/route.ts`.

## Endpoints

- `GET /embed/pin/:id` - a small self-contained HTML page for an iframe.
  Query: `view=countdown|thread` (default countdown), `theme=auto|light|dark`
  (default auto), `lang=<locale>` (default en; translates the title and date).
  Unknown values fall back to the defaults. 404 page for a missing pin.
- `GET /embed/widget.js` - the loader. Turns every
  `<div class="chronopin-embed" data-pin="123" data-view data-theme data-lang>`
  into the iframe, and resizes it from the height the page posts to its parent.

## Design notes

- **Outside src/proxy.ts.** `embed/` is excluded in the proxy matcher: a
  third-party iframe keeps no cookies, so the pin cookie gate and the locale
  redirects would break it. The page is `Content-Security-Policy:
  frame-ancestors *`, cached 5-10 minutes (`pinById` / `threadPins` are tagged
  caches, so pin edits show within that window), `noindex`.
- **Backlinks.** Every link carries `?utm_source=embed&utm_medium=widget`, so
  landing referrals can be told apart. The iframe's links bring referral
  traffic; the script snippet also keeps a plain `<a href>` to the pin inside
  the blogger's own div, which is the followed link on their page.
- **Countdown** ticks on the reader's clock; an all-day pin counts to local
  midnight of its UTC date (see project all-day rule).
- **Thread** uses `threadPins`, first 8 entries, current pin always kept; a pin
  with no thread falls back to the countdown.
- No cookies, ads or trackers in the widget. Labels (Days, Hours, ...) are
  English; the title and date follow `lang`.

Tests: `src/lib/widget.test.ts`.
