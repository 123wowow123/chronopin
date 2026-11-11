# Music contenders backfill: leftover work (2026-11-11)

What was built: the pin page's **Contenders** panel now lists playable songs for prediction-market pins, using the
album tracklist's play control (`EntryTracklist`, `AlbumTracklist`, global music player). Skill:
`.agents/skills/prediction-market-pins/SKILL.md` (sections "Music-contest pins", "Setlist markets", "Artist-ranking
markets").

## State

| Pin | Category | Local | Prod |
|---|---|---|---|
| 20928 Eurovision Asia winner | `entry` (11) + 3 media | done | done |
| 20934 Jay-Z halftime setlist | `setlist` (25) + 2 media | done | done |
| 1965 Spotify top artist 2026 | `ranking` (10) + 1 media | done | **not run** (needs 0259 + code deployed) |

## To do

1. **Commit and push** everything below (nothing from this work is committed):
   - migrations `0257_pin_candidate_entry`, `0258_pin_candidate_setlist`, `0259_pin_candidate_ranking`
   - `src/components/pin/EntryTracklist.tsx`, `PinCandidates.tsx`, `AlbumTracklist.tsx` (label prop, per-track artist),
     `src/lib/candidates.ts`, `src/lib/music.ts`, `src/server/model/pinCandidate.ts`, the pin page prop
   - the 16 locale files (`candidateEntry`, `candidateSetlist`, `candidatePlayed`, `candidateRanking`)
   - `scripts/markets/*.mjs` (three backfill scripts) and the skill edit
2. **Deploy 0259 + the `ranking` code, then run** `node scripts/markets/spotify-top-artist-backfill-2026-11-11.mjs --apply`
   (writes to production by default; `--local` for localhost). Deploys need the owner's ask in that conversation.
3. **Look at the three pins in a browser** (Chrome was not connected, so only API and HTML were checked): play and
   pause, player bar, next/previous across rows, the full-width card on mobile.
4. **Refresh prices before each event** by re-running the scripts: Eurovision Asia final 14 Nov 2026, Spotify Wrapped
   about 3 Dec 2026, Super Bowl LXI 14 Feb 2027. After the result, write it into the pin text (the Eurovision and
   Spotify pin texts still quote older prices: 9 Nov and 20 Sep).
5. **Translations** of the three pins and of any new strings' display are left to the translation agent.

## Open items and doubts

- **Pin 1965 text** quotes the 20 September prices (Bad Bunny 86%, Drake 7%, Swift 3%); the market now shows 96/3/1.
  Update the pin's description and summary when the pin is next edited (not done: out of scope here).
- **Laos "BAE"**: preview matched to the iTunes artist "Thinlamphone", assumed to be Thinla. Unconfirmed.
- **Spotify previews** are one hand-picked well-known track per artist, not the most-streamed one.
- **Eurovision media**: a portrait on the organiser's site (`S04_819.jpg`) was skipped because it could not be tied
  to a named entry.
- **Eurovision odds** use the Yes price in cents; Vietnam's page showed 10.3¢ against a displayed 6%. The Jay-Z and
  Spotify scripts use the displayed percentage instead (see the skill). Consider re-running Eurovision with the
  displayed percentages for consistency.
- **Style noise**: `PinCandidates.tsx` was run through Prettier with default settings, reformatting the whole file
  (double quotes, wrapped JSX). Restore the original style if a smaller diff is wanted.
- **Not backfilled**: 1963 (Super Bowl headliner, effectively resolved by the 26 Oct announcement; 20934 covers it)
  and 1961 (The Game Awards Game of the Year: not music, needs a plain contenders list with covers). The search only
  covered `@OddsDesk` pins tagged Music or Award; other categories were not scanned.

## Traps

- `PinCandidate.category` is `varchar(8)`: new category names must fit (`setlist` 7, `ranking` 7).
- `oddsLabel` values: `nominee`, `winner`, `played`. Adding one needs the CHECK constraint, `candidatesProblem`, the
  type in `src/lib/candidates.ts` and the subtitle in `PinCandidates`.
- iTunes search returns look-alike songs: accept a match only when title and artist both agree (Thailand's "Aroma").
- Illiquid Polymarket outcomes show stale cent prices; use the displayed percentage.
- `addMedia` through `PUT` drops credits: the scripts PATCH `/api/admin/db/Medium` afterwards and read back.
