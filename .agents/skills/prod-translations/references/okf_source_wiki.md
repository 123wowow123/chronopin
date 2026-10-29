# OKF Source Wiki & Model Attribution Rule

## The Golden Rule

> [!IMPORTANT]
> **Translation model attribution (e.g. `Translations completed using Gemini 3.8 Flash.`) must NEVER appear in public pin article content (`Pin.longFormSummary`, `Pin.description`, or `PinTranslation.*`).**
> 
> **It belongs ONLY in the internal pin wiki (`SourceWiki`).**

Public pin content is customer-facing. Appending tracking paragraphs to `longFormSummary` causes text such as:
`<p>Translations completed using Gemini 3.8 Flash.</p>` or `<p>使用 Gemini 3.8 Flash 完成翻译。</p>`
to render directly in the main article body on `chronopin.com`.

---

## What is the "Pin Wiki"?

In Chronopin's architecture:
1. Every pin links to external sources via the `PinSource` join table (`pinId`, `sourceId`, `role`).
2. Each source row in `Source` has associated Open Knowledge Format (OKF) wiki pages in `SourceWiki`.
3. In the admin UI (`src/components/forms/PinSourceWikis.tsx`), administrators see the section:
   **"OKF wikis behind this pin (admin)"** by requesting `GET /api/pins/:id/sources`.
4. This backing `SourceWiki` table is where internal notes, research audit traces, and translation model tracking must be recorded.

---

## Schema of `SourceWiki`

Table `SourceWiki`:
- `id`: integer (primary key, generated identity)
- `sourceId`: integer (foreign key to `Source.id`)
- `parentId`: integer or null (null = root wiki page for that source; integer = child sub-page)
- `position`: smallint (ordering index, 0-indexed)
- `type`: varchar(64) (`'Web Page'`, `'Topic'`, `'Metadata'`, `'Translation'`)
- `title`: varchar(1024)
- `summary`: varchar(2000)
- `body`: text (Markdown or plain notes)
- `tags`: varchar(64)[]
- `utcCreatedDateTime`: timestamptz

Constraints:
- Unique constraint `UQ_SourceWiki_root`: only one row with `parentId IS NULL` per `sourceId`.

---

## How to Record Translation Tracking in `SourceWiki`

For each pin translated:

### 1. Pin with an Existing Root SourceWiki
If the primary source for the pin already has a root `SourceWiki` (`parentId IS NULL`), attach a child sub-page:
```sql
INSERT INTO "SourceWiki" ("sourceId", "parentId", "position", "type", "title", "summary", "body", "tags")
VALUES (
  root.sourceId,
  root.id,
  1 + COALESCE((SELECT max(position) FROM "SourceWiki" WHERE "parentId" = root.id), 0),
  'Metadata',
  'Translations',
  'Translations completed using Gemini 3.8 Flash.',
  'Translations completed using Gemini 3.8 Flash across 15 target locales (es, fr, de, ja, zh, ko, hi, ar, th, it, ru, pt, ms, vi, id).',
  ARRAY['translation'::varchar, 'gemini-3.8-flash'::varchar]
)
ON CONFLICT DO NOTHING;
```

### 2. Pin with a Source but No Root SourceWiki
If the source has no root `SourceWiki` yet, create the root page:
```sql
INSERT INTO "SourceWiki" ("sourceId", "parentId", "position", "type", "title", "summary", "body", "tags")
VALUES (
  source.id,
  NULL,
  0,
  'Web Page',
  COALESCE(source.title, pin.title, 'Source'),
  'Translations completed using Gemini 3.8 Flash.',
  'Translations completed using Gemini 3.8 Flash across 15 target locales (es, fr, de, ja, zh, ko, hi, ar, th, it, ru, pt, ms, vi, id).',
  ARRAY['translation'::varchar, 'gemini-3.8-flash'::varchar]
)
ON CONFLICT ("sourceId") WHERE "parentId" IS NULL DO NOTHING;
```

### 3. Pin with No Source Record
If a pin has a `sourceUrl` but no `PinSource` row yet (rare edge case):
1. Insert `Source` with `urlKey = sourceKey(sourceUrl)` and `wikiVersion = 1`.
2. Insert `PinSource` linking the `pinId` and `sourceId` with `role = 'source'`.
3. Insert the root `SourceWiki` as described in step 2.

### 4. Preventing Stale Summary Triggers
When adding or updating wikis, ensure `Source` and `PinSource` stay synchronized:
```sql
UPDATE "Source" SET "status" = 'ready', "wikiVersion" = GREATEST("wikiVersion", 1) WHERE id = sourceId;
UPDATE "PinSource" SET "summarizedWikiVersion" = s."wikiVersion" FROM "Source" s WHERE "PinSource"."sourceId" = s.id AND "PinSource"."pinId" = pinId;
```
This ensures `PinSource.summaryStale(pinId)` remains `false`, preventing background jobs from mistakenly re-generating the pin's summary.

