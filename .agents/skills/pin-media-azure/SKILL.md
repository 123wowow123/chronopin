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

## Source link is a PDF (fact sheets, site information sheets)
Check the `sourceUrl` before concluding a pin has no media: Meta's data-center pages
(`datacenters.atmeta.com/asset/<site>/`) are PDFs, so scraping HTML finds nothing. `curl -sL` it, confirm it starts
with `%PDF`, then `pdfimages -list` and `pdfimages -all file.pdf out/p` (poppler) and view the candidates. Drop
logos, icons and soft masks (the `smask` rows); keep real photos, rotating any that are sideways. Credit "<operator>
site information sheet" with the PDF as `authorUrl`. Template: `scripts/construction/meta-los-lunas-media-2026-10-31.mjs`
(Azure upload, PUT with media, restore credits, expire, readback).

## After uploading
Read the pin back, confirm each media URL loads, and note undownloadable images (the apply script drops them).

## Near-duplicates and variety (Canon FPA-1200NZ2C shipment pin, 2026-11-02)
- `check_image` only catches the same file at another size. Two press shots of the same machine from different
  outlets (Canon's product photo, The Register's composite, eeNews Europe, Bits&Chips) pass it but look alike to a
  reader, and Ian rejected them. **View every candidate and keep one picture per subject.**
- Aim for different subjects across the three: the product or site in use (Canon's release photo of the tool in a
  cleanroom), a press image of the product, and an explainer (Canon's process diagram, `.../interview/nanoimprint/img/img3.png`).
  Read the release's own image list first (Canon: `/en/news/img/<year>/p<date>a.jpg`, `b.jpg`); outlets mostly repeat the
  `a` shot.
- Swap with `update_pin {removeMediumIds, addMedia}`. `addMedia` drops `authorName` / `authorUrl`, so after every
  add `PATCH /api/admin/db/Medium?id=<id>` with both (admin token), then expire the pin and read it back.
- When no photo of a place or institution turns up (the Texas Institute for Electronics), record the gap rather than
  using a look-alike.

## Curated landing-page backfills
- Count effective card media first: native photos/videos plus curated profile galleries, menu images and existing music artwork/videos. Do not backfill cars/music merely because native-image counts omit valid video or profile media.
- Consult the restaurant guide's recorded exact-branch operator website when a pin's news source contains only one photo. Do not treat another dining outlet in the same hotel as the same venue.
- When `www.trip.com` blocks an exact-branch restaurant gallery, try `us.trip.com` with the same path/place ID. Verify the numeric identity and branch name; retain that branch's gallery images only, excluding nearby restaurant recommendations.
- Check lazy `data-image`/background attributes and operator press pages when ordinary `<img>` scraping finds only logos. Visual review remains mandatory.
- Append native `Medium` and `PinMedium` rows through the audited admin API, expire each pin, and verify media URLs, attribution, preserved existing media and unchanged title/author/date in each environment. Remove a wrong stock/other-venue cover only after verified replacement media are saved.
- Keep a per-pin source-gap report and resumable manifests. See `docs/landing-media-backfill-2026-11-05.md` for the curated backfill method.
