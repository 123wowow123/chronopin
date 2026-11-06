# Curated landing-page media backfill — 2026-11-05

Scope: curated restaurant, product, car, travel, activity and music landing pages. Company/tag inventory is deferred per the owner's selection.

The initial inventory covered 3,922 curated pins; 1,600 had fewer than two effective media after including restaurant profile photos and music artwork/videos. Cars and music already met that threshold. Restaurants and activities accounted for most gaps.

Photos are downloaded to ignored working files, checked visually for subject and branch identity, checked for duplicate images, uploaded to Azure, and publicly downloaded again before use. Credits and source pages are saved in native `Medium.authorName` and `authorUrl`. New associations are appended through audited admin APIs, followed by cache expiry and pin readback. Readbacks check the new media, credits, existing media, title, author and date. Production and local saves are checked separately.

Primary operator/product galleries are preferred. Exact-branch Trip.com galleries can be read through `us.trip.com` when `www.trip.com` is blocked; the numeric place identity and gallery's branch name must agree. Nearby recommendations must be excluded. The guide's recorded operator websites provide alternatives when the original pin source is a news article. Galleries with other branches, generic stock, unrelated news, logos, placeholders or repeated covers are excluded. Different restaurant outlets within the same hotel are distinct venues.

The ignored `.scrape/landing-media-fill/` directory contains the baseline inventory, source fetches, review sheets, explicit selections, approved manifests, Azure verification, per-environment readbacks and a resumable result log. No image binaries are committed. No pin facts, dates, authors, menus or translations are changed. No deployment is performed.

The final machine-readable report records verified additions, current coverage and specific outstanding source gaps. Remaining gaps must not be filled with invented or off-subject media.


## Verified result

Added **1,136 media on 1,080 pins** in each of production and local. All **2,160 final pin readbacks passed**, including source credits and unchanged title, author and date. Four generic resort stock covers and one wrong-park photo were removed after verified replacements were saved.

| Curated selection | Pins audited | Below two before | Below two after |
| --- | ---: | ---: | ---: |
| Products | 120 | 41 | 17 |
| Cars | 288 | 0 | 0 |
| Travel | 40 | 11 | 0 |
| Activities | 657 | 652 | 225 |
| Music | 586 | 0 | 0 |
| Restaurants | 2,231 | 896 | 287 |
| Total | 3,922 | 1,600 | 529 |

This is a substantial backfill, **not complete coverage of every card**. The remaining 529 entries have specific checked sources and gaps in the [machine-readable report](landing-media-backfill-2026-11-05.json). Some sources fail to load or lack usable additional photos; others offer only unrelated branches, news images, logos, stock, placeholders or duplicate covers. These require further subject-specific source research.

Browser verification passed mouse swiping on products, cars, travel, music and restaurant cards, plus finger swiping on products, travel, activity day trips and a restaurant guide. No browser errors were observed. The all-cities activity default currently contains one seasonal item; its populated day-trip tab was used for swipe verification.

Content saves are live and mirrored locally. This run did not deploy code or translate pins.

Follow-up: [the remaining-529 audit](landing-media-remaining-529-2026-11-05.md) added 537 verified images to 408 more pins and reduced the outstanding list to 121 restaurant pins. All product and activity gaps from this report are now closed. The figures above preserve the first pass's results.
