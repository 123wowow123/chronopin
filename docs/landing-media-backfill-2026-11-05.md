# Curated landing-page media backfill — 2026-11-05

Scope: curated restaurant, product, car, travel, activity and music landing pages. Company/tag inventory is deferred per the owner's selection.

The initial inventory covered 3,922 curated pins; 1,600 had fewer than two effective media after including restaurant profile photos and music artwork/videos. Cars and music already met that threshold. Restaurants and activities accounted for most gaps.

Photos are downloaded to ignored working files, checked visually for subject and branch identity, checked for duplicate images, uploaded to Azure, and publicly downloaded again before use. Credits and source pages are saved in native `Medium.authorName` and `authorUrl`. New associations are appended through audited admin APIs, followed by cache expiry and pin readback. Readbacks check the new media, credits, existing media, title, author and date. Production and local saves are checked separately.

Primary operator/product galleries are preferred. Exact-branch Trip.com galleries can be read through `us.trip.com` when `www.trip.com` is blocked; the numeric place identity and gallery's branch name must agree. Nearby recommendations must be excluded. The guide's recorded operator websites provide alternatives when the original pin source is a news article. Galleries with other branches, generic stock, unrelated news, logos, placeholders or repeated covers are excluded. Different restaurant outlets within the same hotel are distinct venues.

The ignored `.scrape/landing-media-fill/` directory contains the baseline inventory, source fetches, review sheets, explicit selections, approved manifests, Azure verification, per-environment readbacks and a resumable result log. No image binaries are committed. No pin facts, dates, authors, menus or translations are changed. No deployment is performed.

The final machine-readable report records verified additions, current coverage and specific outstanding source gaps. Remaining gaps must not be filled with invented or off-subject media.
