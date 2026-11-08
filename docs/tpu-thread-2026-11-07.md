# Google TPU generation thread — 2026-11-07

Published under `@ChipDesk` after duplicate searches of production Pin titles and exact source URLs. Main chain contains chip generations / named variants only, oldest first; TPU 8t and 8i share the April 22, 2026 reveal date.

| Product | Production pin | Parent | Media | Native panels |
|---|---|---|---:|---|
| v1 | [20863](https://www.chronopin.com/pin/20863/tpu) | root | 2 | specs, timeline, alternatives, commentary |
| v2 | [20864](https://www.chronopin.com/pin/20864/tpu) | 20863 | 2 | specs, timeline, alternatives, commentary |
| v3 | [20865](https://www.chronopin.com/pin/20865/tpu) | 20864 | 1 | specs, timeline, alternatives, commentary |
| v4 | [20866](https://www.chronopin.com/pin/20866/tpu) | 20865 | 3 | specs, timeline, alternatives, commentary |
| v5e | [20867](https://www.chronopin.com/pin/20867/tpu) | 20866 | 3 | specs, timeline, alternatives, commentary |
| v5p | [20868](https://www.chronopin.com/pin/20868/tpu) | 20867 | 3 | specs, timeline, alternatives, commentary |
| v6 | [20869](https://www.chronopin.com/pin/20869/tpu) | 20868 | 3 | specs, timeline, alternatives, commentary |
| v7 | [20870](https://www.chronopin.com/pin/20870/tpu) | 20869 | 3 | specs, timeline, alternatives, commentary |
| v8t | [20871](https://www.chronopin.com/pin/20871/tpu) | 20870 | 3 | specs, timeline, alternatives, commentary |
| v8i | [20872](https://www.chronopin.com/pin/20872/tpu) | 20871 | 3 | specs, timeline, alternatives, commentary |

## Evidence and verification

### Media readback audit (2026-11-07)

The TPU thread has **26 native image media items across all 10 pins** (product photos, architecture diagrams and published benchmark graphics); every pin has at least one. These are saved in the pins’ `media` collections, not merely linked in article text or spec tables. No video is currently attached.

A fresh production API readback and download of every saved original confirmed HTTP 200, JPEG content, matching SHA-256 hashes and nonempty `authorName` / `authorUrl` credits. All originals are public Azure blobs. Counts: v1 2, v2 2, v3 1, v4 3, v5e 3, v5p 3, Trillium 3, Ironwood 3, TPU 8t 3, TPU 8i 3. The three-item media target remains short by four items across v1–v3; see the specific source gaps below.

Audit evidence: `.scrape/tpu-thread-2026-11-07/media-audit-readback.json`; replay metadata: `scripts/hardware/tpu-thread.json`.

- All ten API readbacks confirm title, author, chronological parent, performance tables, sourced competitors, commentary and credited media. All 26 original media blobs were downloaded publicly and hash-verified before pin creation. Each candidate was visually reviewed; unrelated article recommendations and a repeated board angle were excluded.
- Native validators accepted all performance and commentary payloads. After a final expiration of all ten pages, the final pin HTML links all ten members; the root initially shows eight per `ThreadList` pagination. Root, Ironwood and TPU 8i server-rendered HTML contain the native specification and timeline panels; the root contains the generation guide.
- All ten source URLs were queried on the local admin API: no active local pin matches, so no local content was overwritten or created.
- `scripts/hardware/tpu-thread.json` preserves pin drafts, production IDs, media attribution, competitors, commentary and gaps. All ten performance entries are synchronized in `scripts/hardware/perf.json`.
- Current official TPU product page lists TPU 8t and TPU 8i as coming soon. Their later-2026 availability stays Planned. Ironwood timeline uses release-note preview (2025-11-24) and GA (2026-03-31), separately from the April 2025 reveal. Trillium records the December 11 blog and December 16 release-note GA entries separately.
- Per-chip, per-device and per-pod scopes and source GB/GiB units are preserved. No cross-generation mixed-precision compute chart. The two native charts are maker-stated, workload-specific or explicitly scoped predecessor comparisons.
- Headquarters map points are labeled company headquarters, not manufacturing sites.
- No deployment was performed. Translations are left to the translation agent, per owner instructions.

## Remaining research gaps

- v1: two distinct exact-generation images from the 2016 release; no verified third photo/video from the opened source.
- v2: board and pod retained; a second view of the same board was excluded.
- v3: one verified exact-generation architecture diagram. The direct announcement fetch exposes unrelated recommendations, and the historical pod article exposes no relevant image; these were not attached. The May 8 reveal date was verified in the opened 9to5Google article; specs come from Google documentation.
- Commentary excerpts are manufacturer statements, labeled as such in their basis; no independent review scores are asserted. Rivals are sourced alternatives, not a benchmark ranking. Older generations have fewer than three meaningful sourced rivals rather than padded entries.
- No general-availability confirmation for TPU 8t/8i on the opened current product page.
- TPU v4 timeline ends at the sourced May 2022 public-preview milestone; an exact GA date was not established in this pass.

Resumable source captures, drafts, media audit, posting ledger and readbacks: gitignored `.scrape/tpu-thread-2026-11-07/`.
