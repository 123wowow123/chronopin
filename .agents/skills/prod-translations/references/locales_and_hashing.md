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

### 2. Escaping Literal `<` and `>` Inside Text Nodes
- Because HTML tags are split out via `re.split(r'(<[^>]*>)', src)` before translation, any `<` or `>` appearing inside a translated text node (such as `<3` in song titles like Olivia Rodrigo *U + Me = <3*, or `< 5%` / `> 100`) is literal text, not an HTML tag.
- Always escape `<` as `&lt;` and `>` as `&gt;` on translated text fragments before rejoining with the HTML tag tokens.

### 3. Thai (`th`) Buddhist Era Year Normalization
- Translation engines (e.g. Google Translate) automatically convert 4-digit Gregorian years (e.g., 2026) to the Thai Buddhist Era (`2569`, which is year + 543) and prepend `พ.ศ.`.
- Chronopin requires consistent Gregorian calendar dates across all locales.
- The post-processor must replace `str(year + 543)` back with `str(year)`, and replace `พ.ศ.` with `ค.ศ.`.

