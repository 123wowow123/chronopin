# October 27 morning news research

See [run report](../../../../docs/okf/scraping/news-run-2026-10-27-6am.md).

These are selective research/replay records, not a full database snapshot. Match target pins by exact `sourceUrl` before saving; local and production IDs differ. `new-pin-id-map.json` records the current mappings: Microsoft production20088/local20089; Terra production20089/local20090. Do not replay stored numeric IDs blindly.

- `pin-edits.json`: researched patches with reasons and target-environment flag. Preserve the existing author, references, tags and event details. Re-read before merging; never use an old full pin body to overwrite newer work.
- `event-info.json`: 40 verified production event readings. Empty new source fields never authorize clearing earlier details; investigate dated evidence before reusing prices.
- `muse-rubric-replay.json` and `muse-final-True.json`: original launch rubric/basis and final reviews with tones. `terra-llm-performance-verified.json` and `terra-competitors-verified.json`: native panels. Replay through the corresponding `/api/pins/:id/...` APIs after resolving pin IDs and linked competitor IDs.
- `competitors-replay.json`: FiiO cassette alternatives with opened sources.
- `taste-review-replay.json`: three taste-review enrichments; full profiles are synchronized in `scripts/products/taste.json`.
- `idc-forecast.json`: separate global non-service-provider infrastructure scope; synchronized in `scripts/industry/forecasts.json`.
- `burry-replay.json`: original short factual disclosure summaries. October11 is publication/disclosure date, not a claimed execution timestamp. No full paid article text.
- `microsoft-create.json` / `terra-create.json`: original creation payloads. Microsoft’s draft parent was removed after detecting an unrelated search match; this payload now records the verified final null parent. Terra parent15142 is the prior Terra release. Check for source duplicates before creating.
- Media JSON records public Azure URLs, original sources and credits; no image bytes in this directory.
- `research-gaps.json`: unresolved evidence, verified queued in both environments.
- `sentiment-verified-True.json`: scores with exact current hashes; re-hash current text before any replay.
- `replay-results.json`: verified advertisement metadata replay counts and recent person-filing replay results. No new advertisement inferred from an unreadable page.

All content was verified via authenticated APIs. No deployment or production VM operation occurred. Credentials and temporary authenticated transport files remain excluded.
