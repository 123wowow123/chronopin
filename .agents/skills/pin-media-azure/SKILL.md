---
name: pin-media-azure
description: >-
  Use this skill when sourcing, downloading, uploading or swapping pictures and media for Chronopin pins.
  Covers Azure Blob storage, credits, fallback sources when a site blocks downloads, and verifying public blobs.
---

# Pin media storage

## Rules
- Pin images go in **Azure Blob Storage**. Never add pin photos or generated thumbnails to Git. Keep blob URLs,
  source URLs, credits and metadata in the repo. UI icons and logos may stay in Git.
- Use ignored temp files while sourcing/uploading. **Verify the public blob downloads** (plain curl) before
  removing a local file or switching a live pin reference.
- Credit the source page, photographer or operator, and keep captions accurate. `Medium` stores attribution in
  `authorName` / `authorUrl`; `credit` / `creditUrl` are ignored by the native model. New-image thumbnail
  processing may clear attribution during `addThumb()`: verify the native readback, and when necessary patch
  only those two fields through the authenticated audited `/api/admin/db/Medium?id=...` API. Read them back
  on the pin, then round-trip the pin through its native API to refresh its page and feed.
- Never skip a picture over unclear licensing: credit and store it. Don't restrict to Wikimedia Commons; try the
  brand newsroom or press kit first.
- **Media need not come from Wikimedia Commons** (owner instruction, 2026-10-30). A scrape of a Wikipedia source
  returns only that page's Commons images, which are often off-subject (a different SKU, a Xeon, a facility, a
  diagram, a video screenshot). Treat them as the last resort: look first for the maker's newsroom or press kit
  release for the exact product or event (Intel's scene7 images, for example), then review and launch coverage,
  and only then Commons. Replace a stand-in that does not show the subject, and credit whichever source is used.
- Aim for three media per scraped pin. No picture twice (CDN size suffixes + difference hash dedupe).
- Age-gated YouTube videos are refused; a second video can come from Dailymotion/Vimeo.

## When a site blocks the download (403, Cloudflare, magazine CDNs)
Don't hold the pin or settle for an off-subject stand-in. Search Google Images, Booking.com, Tripadvisor,
Expedia and Trip.com galleries, travel/design press and blogs. Confirm the file downloads with plain curl and
actually shows the property. An unreadable Amazon listing can be read in Chrome.

## Galleries
Check official galleries and linked photo pages, including restaurant sites. Add verified relevant photos to the
pin details and use a representative one on the landing card. Distinguish venue photos from collaboration or
other-branch photos. Record inaccessible galleries and remaining gaps in the research notes.

## After uploading
Read the pin back, confirm each media URL loads, and note undownloadable images (the apply script drops them).
