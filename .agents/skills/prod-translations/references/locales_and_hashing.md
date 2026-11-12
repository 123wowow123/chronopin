# Locales and Hashing Reference

## Supported Locales

Chronopin translates all English pin content into 15 non-English target languages (defined in `src/server/extract/translate.ts` as `TARGET_LOCALES`):

| Locale | Language | Native Name | Direction | Special Notes |
|:---|:---|:---|:---:|:---|
| `es` | Spanish | Español | LTR | Standard |
| `fr` | French | Français | LTR | Standard |
| `de` | German | Deutsch | LTR | Standard |
| `ja` | Japanese | 日本語 | LTR | No word spaces |
| `zh` | Simplified Chinese | 简体中文 | LTR | No word spaces |
| `ko` | Korean | 한국어 | LTR | Standard |
| `hi` | Hindi | हिन्दी | LTR | Devanagari script |
| `ar` | Arabic | العربية | RTL | Handled by `dir="rtl"` in UI |
| `th` | Thai | ไทย | LTR | Buddhist calendar conversion required (see below) |
| `it` | Italian | Italiano | LTR | Standard |
| `ru` | Russian | Русский | LTR | Cyrillic script |
| `pt` | Portuguese | Português | LTR | Brazilian / European standard |
| `ms` | Malay | Bahasa Melayu | LTR | Standard |
| `vi` | Vietnamese | Tiếng Việt | LTR | Diacritics preserved |
| `id` | Indonesian | Bahasa Indonesia | LTR | Standard |

English (`en`) is the default authoring language and has no rows in `PinTranslation`.

---

## Translated Fields

Translations cover the 5 text fields defined by `TRANSLATED_FIELDS` in `src/server/model/pinTranslation.ts`:
1. `title` (required, string up to 500 characters)
2. `description` (optional HTML string)
3. `longFormSummary` (optional HTML string with `<cite data-ref="...">` tags)
4. `dateConfidenceReasoning` (optional plain text)
5. `delayReasoning` (optional plain text)

---

## Hashing Algorithms

### 1. `sourceHash` (Whole Pin Fingerprint)
`sourceHash` is a 40-character lowercase hexadecimal SHA-1 digest calculated from the 5 fields joined with `\n--\n`:

```typescript
const textOf = (value: unknown) => (typeof value === 'string' ? value : '');
const sourceHash = sha1(
  [pin.title, pin.description, pin.longFormSummary, pin.dateConfidenceReasoning, pin.delayReasoning]
    .map(textOf)
    .join('\n--\n')
);
```

In PostgreSQL:
```sql
encode(digest(
  COALESCE(p."title", '') || E'\n--\n' ||
  COALESCE(p."description", '') || E'\n--\n' ||
  COALESCE(p."longFormSummary", '') || E'\n--\n' ||
  COALESCE(p."dateConfidenceReasoning", '') || E'\n--\n' ||
  COALESCE(p."delayReasoning", ''),
  'sha1'
), 'hex')
```

### 2. `fieldHashes` (Per-Field Edit Fingerprints)
`fieldHashes` is a JSONB map containing individual SHA-1 digests for each of the 5 fields:
```json
{
  "title": "...",
  "description": "...",
  "longFormSummary": "...",
  "dateConfidenceReasoning": "...",
  "delayReasoning": "..."
}
```

---

## Translation State Lifecycle

For each active pin (`utcDeletedDateTime IS NULL`) and each of the 15 locales:
- **`missing`**: No row exists in `PinTranslation` for `(pinId, locale)`.
- **`outdated`**: A row exists, but `row.sourceHash.trim() !== currentHash`. (The English pin was edited after the translation was generated).
- **`incomplete`**: `sourceHash` matches, but the translation is cut short or has mismatched HTML `<li>` or `<cite>` counts (`translatesAll` fails).
- **`current`**: Up to date, complete, and valid. Only `current` translations are served to site visitors.

---

## Critical Edge Cases & Formatting Rules

### 1. HTML Tag, Whitespace, and Citation Preservation
- The translated string must have the exact same list of HTML tags as the source string (`re.findall(r'<[^>]*>', src) == re.findall(r'<[^>]*>', tr)`).
- Preserve leading and trailing whitespace (`leading_ws` / `trailing_ws`) on text nodes between HTML tags so inline elements (`<strong>`, `<em>`, `<a>`, `<cite>`) never lose surrounding spaces.
- All `<cite data-ref="...">` attributes must match the source verbatim. Do not translate URLs or citation IDs.

### 2. Plain-Text Fields vs. HTML Fields & Entity Handling
- **HTML Fields (`description`, `longFormSummary`):**
  - Split out HTML tags via `re.split(r'(<[^>]*>)', src)` before translation.
  - Always decode HTML entities (`html.unescape()`) on text fragments **before** sending them to the translator. Sending raw `&amp;` or `&#39;` causes translation models to treat `;` as a clause terminator, producing artifacts like ` और amp;` (`hi`), ` et amp;` (`fr`), `＆amp;` (`ja`), or mid-sentence clause inversions.
  - After translation, unescape any entities returned by the translator (`html.unescape()`) and re-escape `&` as `&amp;`, `<` as `&lt;`, and `>` as `&gt;` strictly on HTML-field text nodes before rejoining with the HTML tag tokens.
  - When checking whether an HTML field has prose length (`> 40` or `> 60` chars), strip `<[^>]*>` tags first so media-only fields (`<figure><img ...></figure>`) are not mistaken for untranslated English prose.
- **Plain-Text Fields (`title`, `dateConfidenceReasoning`, `delayReasoning`):**
  - Rendered directly as React text nodes (not HTML).
  - Never split plain-text fields on `<[^>]*>` and never HTML-escape `&`, `<`, or `>` on output (otherwise `&amp;` or `&#x27;` renders literally on the page).

### 3. Untranslated-English Detection Rules
- **Identical-to-English output** (`pt.field = p.field`, prose longer than 40/60 chars after stripping tags) is flagged only when the English text itself looks like English: it contains common function words (`the, and, of, to, is, in, for, on, with, by, that, was, are, from, has, have, not, this, be, it`). A pin that quotes a non-English source (for example an Indonesian headline in `dateConfidenceReasoning`) legitimately stays identical in every locale. This rule is shared by `check_translations.py` (SQL `~*` stopword test) and `sync_translations.py` (`looks_english()`); never hardcode a per-pin or per-language exception.
- **Non-Latin pure-ASCII fragments & titles (`> 40` chars):** in `ja`, `zh`, `ko`, `ru`, `ar`, `hi`, `th` any fragment or `title` longer than 40 characters containing English function words that comes back as pure ASCII was left in English (for example when a Title-Case headline causes NMT to treat a sentence as a proper noun). `acceptable()` rejects pure-ASCII outputs `> 40` chars in non-Latin locales, `call_single()` retries with lowercased Title-Case words after the first word, and `check_translations.py` + `prepare_mangled_rows_for_repair()` flag them automatically.
- **Identical English bullets (any locale):** a `longFormSummary` `<li>` of 60+ characters that is byte-identical to the English bullet, is pure ASCII, and contains English function words was left untranslated (a whole-summary comparison misses this when only some bullets fail). `check_translations.py` pairs English and translated bullets by position and counts these in `identical_english_bullet_rows` (added to `untranslated_or_mangled_rows`); `prepare_mangled_rows_for_repair()` marks them for repair; `acceptable()` rejects an identical ASCII English fragment from the translator or cache in every locale. Bullets with non-ASCII English (e.g. dish names with Chinese) are exempt because they legitimately stay identical.
- **Delimiter leaks:** any `⟦` or `⟧` in a translated field is a batch-delimiter leak and is repaired the same way.

### 4. Thai (`th`) Buddhist Era Year Normalization
- Translation engines (e.g. Google Translate) automatically convert 4-digit Gregorian years (e.g., 2026) to the Thai Buddhist Era (`2569`, which is year + 543) and prepend `พ.ศ.`.
- Chronopin requires consistent Gregorian calendar dates across all locales.
- `fix_thai_years(src, tr)` handles all four Buddhist Era edge cases:
  1. ISO `YYYY-MM` strings where `-MM` was mistranslated as `-(2000 + MM + 543)` (e.g. `2026-10` -> `2026-2553`, `2025-11` -> `2025-2554`) are restored to `YYYY-MM`.
  2. Any 4-digit Gregorian year in `src` (matched with `(?<!\d)((?:1[5-9]|20)\d{2})(?!\d)` so `2030s`, `September2024`, and `10-10-2017` are caught without matching 6+ digit numbers) has `year + 543` replaced with `year`.
  3. Any standalone Buddhist year `(?<!\d)(25[5-8]\d)(?!\d)` in `tr` not present in `src.replace(',', '')` (such as when NMT infers `พ.ศ. 2569` from `"7 October"`) is converted to `year - 543`.
  4. Any `พ.ศ.` in `tr` (when not in `src`) is replaced with `ค.ศ.`.
- `acceptable()`, `_panel_text_translated_ok()`, `prepare_mangled_rows_for_repair()`, and `check_translations.py` all reject or flag `th` rows/panels that still contain `พ.ศ.` or unconverted `2550..2589` years.

### 5. `PinPerf` Panels (`charts` & `tables` `i18n` at `/api/pins/:id/performance`)
- Every chart (`PerfChart`) and table (`PerfTable`) in `"PinPerf"` (`src/lib/pinPerf.ts`) carries an `i18n` dictionary mapping each of the 15 target locales (`es, fr, de, ja, zh, ko, hi, ar, th, it, ru, pt, ms, vi, id`) to its localized text:
  - **Chart (`PerfChartText`):** `{ title: string (<= 120), unit: string (<= 40), note?: string (<= 500) }`. Bar `label`s (product/model names) are kept on the base chart and not duplicated per locale. If `chart.note` is present on the English chart, `i18n[loc].note` is required.
  - **Table (`PerfTableText`):** `{ title: string (<= 120), columns: string[] (same count, each <= 80), rows: string[][] (same shape, each cell <= 200), note?: string (<= 500), stages?: string[] (same count when display === 'timeline', each <= 40) }`. Any `<cite data-ref="..."></cite>` tags inside table cells must be preserved verbatim.
- **Length Fitting (`_fit_panel_text`):** When a translated panel `title` (`<= 120`), `note` (`<= 500`), or table `cell` (`<= 200`) exceeds its `src/lib/pinPerf.ts` character limit in a verbose language (`es`, `fr`, `de`, `ru`, `vi`, `id`, etc.), `_fit_panel_text()` must ALWAYS truncate the **translated** string cleanly (`val[:max_len - 1].rstrip() + '…'`, preserving `<cite...>` tags if present) and NEVER fall back to the untranslated English `src`.
- During every translation job, `check_translations.py` verifies `panels_incomplete == 0` (`pins_with_incomplete_panels == 0`) — including verifying that `title`s, `note`s, and table `rows` cells (`> 40` chars with English stopwords) are translated and free of Thai Buddhist years — and `sync_translations.py` (with `--panels` or default sync) translates any incomplete panels and saves them via `PUT /api/pins/:id/performance`.

### 6. `PinProTip` Pro Tips (`PinProTipTranslation` at `/api/admin/pro-tip-translations`)
- Every pro tip row (`PinProTip`, schema `0256`, up to `MAX_PRO_TIPS = 6` per pin) has translations stored in `"PinProTipTranslation"` (schema `0264`, `src/server/model/pinProTip.ts`):
  - **Primary key:** `("proTipId", "locale")` for the 15 target locales (`es, fr, de, ja, zh, ko, hi, ar, th, it, ru, pt, ms, vi, id`).
  - **Source Hash:** `proTipHash(tip) = sha1(tip)` (`encode(digest(t.tip, 'sha1'), 'hex')`). When `PUT /api/pins/:id/pro-tips` replaces a pin's tips, old rows cascade away (`ON DELETE CASCADE`) and new tips receive fresh IDs.
  - **Length & Format:** Plain-text string (`PRO_TIP_TRANSLATION_MAX = 1500` characters), rendered directly inside `<span className="min-w-0 flex-1">{tip.tip}</span>`. Never HTML-escape `&`, `<`, or `>` on output.
- During every translation job, `check_translations.py` verifies `pro_tips_incomplete == 0` (`pins_with_incomplete_pro_tips == 0`), and `sync_translations.py` (with `--pro-tips` or default sync) translates all missing/outdated pro tips, records attribution strictly in `SourceWiki`, and saves them via `POST /api/admin/pro-tip-translations`.

