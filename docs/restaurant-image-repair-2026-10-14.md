# Production restaurant image repair — October 14, 2026

MYPLACE café & bar at Hilton Osaka (pin 15610) and Essex at Kyoto Century Hotel (pin 15609) had credited public Azure photos in their restaurant-specials profiles but no Medium/PinMedium records. Their supplemental import entries had empty photo lists and their local gallery snapshots also contained no media links, so the publisher copied no pin images. This was missing database content, not a failed Azure download.

Attached each existing, branch-specific promotion photo through the authenticated admin Medium and PinMedium APIs, preserving its operator credit and source page. Downloaded and decoded both public blobs, visually checked their contents, and read back both saved pin-media links. No deployment was needed. Browser visual verification was denied; the rendered live pages were not visually checked.

The broader audit checked 2,593 enabled restaurant profiles with credited guide photos, matched 1,506 live pins, and found only these two pins without image media. This checks attachment presence, not every existing image's network availability. Separately, 21 pins in the recent Japan import have no saved guide/gallery photo and remain photo research gaps; their IDs and sources are recorded in the companion JSON. Existing research notes remain the authority for sources already checked.

For future publication, an empty imported/local gallery is not sufficient proof that a pin needs no image: compare the restaurant-specials profile photo and ordinary guide tile image against the destination pin's media. Attach verified photos independently of whether the local pin already has a gallery. Record genuine photo research gaps separately.

See [repair evidence](restaurant-image-repair-2026-10-14.json) for audited counts, source credits, saved records and unresolved Japan photo gaps. Temporary downloads and the repair script are kept under the ignored `.scrape/restaurant-missing-images-2026-10-14/` directory.

## Follow-up publication

[The subsequent photo research and production publication](restaurant-photo-fill-2026-10-14.md) added 22 verified images to 10 of the 21 Japan pins and their landing cards. Eleven specific publication gaps remain documented with sources and exclusions. The importer now recovers saved guide/specials images even when explicit galleries are empty.
