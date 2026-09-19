---
type: Postgres Table
title: PinTag
description: A pin's tags - its categories, those typed in the form, or awards its own text names - plus PinTagView, which adds a tag for every award body and year its work won, and a Nominee tag where it was only nominated.
resource: ../../../scripts/db/schema/0038_pin_tag.sql
tags: [table, schema, tags, categories, awards, search]
generated: { by: claude-code/claude-opus-5, at: 2026-09-19T14:00:00Z }
---

# Schema

| Column | Type | Description |
| --- | --- | --- |
| `id` | integer | Identity primary key |
| `pinId` | integer | FK to Pin, cascade delete |
| `name` | citext | 1-80 characters, unique per pin whatever the case |
| `kind` | varchar(10) | `category` (a name on the list in src/lib/categories.ts), `award`, `nomination` (a name ending in Nominee) or `topic`, from the name (`tagKind` in src/lib/tags.ts) |
| `source` | varchar(10) | `user` (the form, or a scrape's extracted tags) or `auto` (awards the description and summary name) |
| `utcCreatedDateTime` | timestamptz | When it was added |

`PinTagView` is every tag a pin has: these rows plus one `award` row per body and year its work **won** in PinAward (0036), named like `Tokyo Anime Award Festival 2024`. A body and year the work was only nominated in gets its own tag, e.g. `Crunchyroll Anime Awards 2024 Nominee`, of kind `nomination`, shown with a muted trophy (0039, 0040). The catalogue outranks the pin's prose: an `auto` tag that calls a year a win is dropped when PinAward lists only nominations there (0041). Vinland Saga's description claims the 2020 Anime of the Year, which it was only nominated for. It keeps one row per pin and name, and the user's spelling wins. `PinBaseView` carries them as the `tags` json column, awards first, and the category tags on their own as the `categories` text array, the main one first.

# Categories are tags

Since 0043 there is no `Pin.category` column. Each pin's category became a `category`-kind tag, and a pin may have any number of them, the first added being its main one (the card shows it; the pin page shows them all). `POST /api/pins` and `PUT /api/pins/:id` take `categories` as an array or comma-separated string (the old single `category` field still works), and a category's name typed among the `tags` counts as one. Only names on the list count; anything else is dropped. A body without them leaves an edited pin's categories alone. The extractor returns `categories`, the best fit first. Code that asks what kind of pin it is (anime, a film, a game) takes the whole list: `isScreenCategory`, `isStudioCategory` and `scoreSiteFor` accept one category or several.

`tag:Anime` searches for a category like any tag, and the old `category:Anime` still means the same. The tag cloud's grouped mode puts categories at the top, with every other tag (or award body's group) under the category most of its pins carry: `tag-counts` answers each tag's `category`. The separate category filter and `/api/pins/category-counts` are gone; the map keeps a category picker of its own (src/components/map/MapCategoryFilter.tsx) that writes `tag:` terms.

# Where tags come from

- **The form.** `POST /api/pins` and `PUT /api/pins/:id` take `tags` as an array or one comma-separated string. On a PUT, the list replaces the pin's `user` tags. A body without `tags` leaves them alone, so other edit paths cannot wipe them.
- **The pin's own text.** After every save and update, `PinTag.syncAutoTags` (listener in src/server/events.ts) runs `awardTagsInText` over the description and summary. It rewrites the `auto` rows. It only tags an award with a year or a numbered edition, and yearly bodies' editions become years (the 8th Crunchyroll Anime Awards is 2024). `npm run tags:sync` is the backfill (`--pin N`, `--dry-run`).
- **The award catalogue.** Derived in the view, so they follow `npm run media:awards` and each save's award sync with nothing extra to keep in step.
- **Extraction.** The Claude extraction schema has a `tags` field whose rule is to tag every award as body plus year. `GET /api/scrape` returns the tags and the form fills its empty tags field with them.

# Search and the cloud

`tag:"Tokyo Anime Award Festival 2024"` is a search term (src/server/util/searchQuery.ts), matched case-insensitively against PinTagView. Repeated, it widens (any of the tags), like the other fields. `GET /api/pins/tag-counts` gives the tag cloud its 60 busiest tags (`limit=N` asks for up to 200). With no `q` it counts the timeline under its posted-within span. With `q` it counts that search's results, leaving out the search's own `tag:` terms. The Tags panel (src/components/timeline/TagCloud.tsx) is the first of the floating controls. It folds to a row saying what is picked. Unfolded, it takes height from the Trending and New pins panels under it, which drop out when there is no room, and its tags toggle `tag:` terms. Below xl, it sits in the same fold as the posted-within slider. Its expand button opens a large WordArt-style cloud over the page (src/components/timeline/WordCloud.tsx), reading up to 200 tags (`limit=`, capped at 200). `src/lib/wordCloud.ts` packs the words by the cells their glyphs actually ink, drawn on a canvas, along a spiral into a cloud silhouette, or a rounded blob in a tall box. It uses a bitset board and starts from a scale guessed from the words' area. About a quarter of the words run upward, and colours come from a WordArt palette with a lighter set for dark mode. Near the pointer, words swell and part, the word under it lifts while the rest dim, and the cloud drifts slightly. What is under the pointer is judged against each word's resting box, so a word never slides away from a pointer heading for it. Every word is reachable by Tab and picked with Enter or Space, and focus stays on it through the search that starts. Picks made there work as in the panel, and the view stays open between them. Pin pages show a pin's tags as chips that search for them, and the tags are the Article JSON-LD's `keywords`.

# In OKF

`okf:export` writes a pin's tags into its concept's `tags` (lowercased, after its categories and company) and a `# Tags` section. Each tag gets its own concept, `tags/<slug>.md`, typed `Award` or `Tag`, listing the pins that carry it, with a `tags/index.md`. The backup keeps the rows in `seedTags.json`. Derived award tags are not stored.
