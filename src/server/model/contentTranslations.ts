// Translations of the secondary content tables (0265): one "<Source>Translation"
// table per source, all with the same shape as PinProTipTranslation (0264), so
// one registry drives the translation agent's GET (what is due) and POST (save).
//
// A translation row is made from the English fields as they were; "sourceHash"
// is the sha1 of those fields, and a row whose hash no longer matches is due
// again. Saving content never writes these rows - the translation agent does,
// in its own phase (.agents/skills/prod-translations).
import { createHash } from 'node:crypto';
import { isLocale, type Locale } from '@/lib/i18n/config';
import * as db from '../db';

type Field = { name: string; kind: 'text' | 'json'; nullable?: boolean; max?: number };
type Key = { name: string; type: 'integer' | 'text' | 'date' | 'varchar' };
type Def = {
  table: string; // translation table
  source: string; // source table
  keys: Key[]; // primary key of the source (and of the translation, before "locale")
  fields: Field[]; // what gets translated
  live: string; // SQL over alias s: rows worth translating
  join?: string; // extra join so `live` can look at the pin
  note: string; // instruction for the translator
};

const PIN_LIVE = (via: string) => `JOIN "Pin" p ON p."id" = ${via} AND p."utcDeletedDateTime" IS NULL`;

export const CONTENT_TRANSLATIONS: Record<string, Def> = {
  'company-product': { table: 'CompanyProductTranslation', source: 'CompanyProduct', keys: [{ name: 'id', type: 'integer' }], fields: [{ name: 'name', kind: 'text', max: 200 }, { name: 'summary', kind: 'text', nullable: true, max: 400 }], live: 'true', note: 'Product names stay as the brand writes them unless the company has a local name; translate the summary.' },
  'product-blurb': { table: 'ProductBlurbTranslation', source: 'ProductBlurb', keys: [{ name: 'pinId', type: 'integer' }], fields: [{ name: 'blurb', kind: 'text', max: 400 }], live: 'true', join: PIN_LIVE('s."pinId"'), note: 'One sentence; keep product names.' },
  'pin-review': { table: 'PinReviewTranslation', source: 'PinReview', keys: [{ name: 'id', type: 'integer' }], fields: [{ name: 'comment', kind: 'text' }], live: `s."utcDeletedDateTime" IS NULL AND s."comment" IS NOT NULL AND btrim(s."comment") <> ''`, note: "A member's own words: translate faithfully, keep the tone, add nothing." },
  'pin-critic-review': { table: 'PinCriticReviewTranslation', source: 'PinCriticReview', keys: [{ name: 'pinId', type: 'integer' }], fields: [{ name: 'reviews', kind: 'json' }, { name: 'basis', kind: 'text', nullable: true, max: 1000 }], live: 'true', join: PIN_LIVE('s."pinId"'), note: 'Return the reviews array with identical structure; translate only quotes/summaries, never outlets, scores, URLs or dates.' },
  'restaurant-content': { table: 'RestaurantContentTranslation', source: 'RestaurantContent', keys: [{ name: 'id', type: 'integer' }], fields: [{ name: 'profile', kind: 'json' }], live: 's."enabled"', note: 'Same JSON, same keys; translate prose only (descriptions, notes, headlines). Dish and venue names, prices, dates, addresses and URLs stay as they are.' },
  'restaurant-special-venue': { table: 'RestaurantSpecialVenueTranslation', source: 'RestaurantSpecialVenue', keys: [{ name: 'id', type: 'integer' }], fields: [{ name: 'profile', kind: 'json' }], live: 's."enabled"', note: 'As restaurant-content.' },
  'person-wiki': { table: 'PersonWikiTranslation', source: 'PersonWiki', keys: [{ name: 'personId', type: 'integer' }], fields: [{ name: 'page', kind: 'text' }, { name: 'profile', kind: 'json' }], live: 'true', note: 'Keep Markdown, [ref] markers and links; the profile JSON keeps its keys, translate prose values only.' },
  'person-research-note': { table: 'PersonResearchNoteTranslation', source: 'PersonResearchNote', keys: [{ name: 'id', type: 'integer' }], fields: [{ name: 'note', kind: 'text' }], live: 'true', note: 'Plain prose.' },
  'company-wiki': { table: 'CompanyWikiTranslation', source: 'CompanyWiki', keys: [{ name: 'companyId', type: 'integer' }], fields: [{ name: 'page', kind: 'text' }], live: 'true', note: 'Keep Markdown, [ref] markers and links.' },
  'industry-forecast': { table: 'IndustryForecastTranslation', source: 'IndustryForecast', keys: [{ name: 'id', type: 'integer' }], fields: [{ name: 'title', kind: 'text', max: 200 }, { name: 'note', kind: 'text', nullable: true }], live: 'true', note: 'Keep figures and units as written.' },
  'daily-horoscope': { table: 'DailyHoroscopeTranslation', source: 'DailyHoroscope', keys: [{ name: 'sign', type: 'varchar' }, { name: 'day', type: 'date' }], fields: [{ name: 'text', kind: 'text' }], live: `s."day" >= current_date - 2`, note: 'Only the last days are due; older horoscopes are not translated.' },
  'transit-horoscope': { table: 'TransitHoroscopeTranslation', source: 'TransitHoroscope', keys: [{ name: 'transits', type: 'text' }, { name: 'day', type: 'date' }], fields: [{ name: 'text', kind: 'text' }], live: `s."day" >= current_date - 2`, note: 'As daily-horoscope.' },
  'pin-project': { table: 'PinProjectTranslation', source: 'PinProject', keys: [{ name: 'pinId', type: 'integer' }], fields: [{ name: 'note', kind: 'text', max: 500 }], live: `s."note" IS NOT NULL`, join: PIN_LIVE('s."pinId"'), note: 'Keep figures as written.' },
  'pin-candidate': { table: 'PinCandidateTranslation', source: 'PinCandidate', keys: [{ name: 'id', type: 'integer' }], fields: [{ name: 'name', kind: 'text', max: 200 }, { name: 'artist', kind: 'text', nullable: true, max: 200 }], live: 'true', join: PIN_LIVE('s."pinId"'), note: 'Titles and artists are proper names: transliterate or give the official local title only when one exists, else copy unchanged.' },
  'pin-taste': { table: 'PinTasteTranslation', source: 'PinTaste', keys: [{ name: 'pinId', type: 'integer' }], fields: [{ name: 'basis', kind: 'text', max: 1000 }], live: `s."basis" IS NOT NULL`, join: PIN_LIVE('s."pinId"'), note: 'Plain prose.' },
};

type Values = Record<string, unknown>;

const stable = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(stable) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v as Values).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, x]) => [k, stable(x)])) : v;
export const contentHash = (def: Def, values: Values) =>
  createHash('sha1').update(JSON.stringify(def.fields.map((f) => stable(values[f.name] ?? null)))).digest('hex');

const keyCols = (def: Def, alias = 's') => def.keys.map((k) => `${alias}."${k.name}"`).join(', ');
const keyTexts = (def: Def) => def.keys.map((k, i) => `s."${k.name}"::text AS "k${i}"`).join(', ');
const fieldCols = (def: Def) => def.fields.map((f) => `s."${f.name}"`).join(', ');

export type ContentDue = { key: Values; sourceHash: string; fields: Values; locales: string[] };

// Source rows with a language lacking a current translation. `after` is a
// position in key order (pass the previous page's `next`).
export async function contentDue(name: string, locales: readonly string[], limit = 100, after = 0) {
  const def = CONTENT_TRANSLATIONS[name];
  const rows = await db.query<Values>(
    `SELECT ${keyTexts(def)}, ${fieldCols(def)} FROM "${def.source}" s ${def.join ?? ''} WHERE ${def.live} ORDER BY ${keyCols(def)} LIMIT $1 OFFSET $2`,
    [limit, after],
  );
  if (!rows.length) return { rows: [] as ContentDue[], next: null as number | null };
  const keyOf = (r: Values) => def.keys.map((_, i) => String(r[`k${i}`])).join('|');
  const tCols = def.keys.length === 1 ? [translationKey(def)] : def.keys.map((k) => k.name);
  const have = await db.query<{ k: string; locale: string; sourceHash: string }>(
    `SELECT concat_ws('|', ${tCols.map((c) => `t."${c}"::text`).join(', ')}) AS k, t."locale", t."sourceHash" FROM "${def.table}" t
      WHERE concat_ws('|', ${tCols.map((c) => `t."${c}"::text`).join(', ')}) = ANY($1::text[])`,
    [rows.map(keyOf)],
  );
  const current = new Set(have.map((h) => `${h.k}:${h.locale}:${h.sourceHash.trim()}`));
  const out: ContentDue[] = [];
  for (const r of rows) {
    const fields = Object.fromEntries(def.fields.map((f) => [f.name, r[f.name] ?? null]));
    const hash = contentHash(def, fields);
    const k = keyOf(r);
    const missing = locales.filter((l) => !current.has(`${k}:${l}:${hash}`));
    if (missing.length) out.push({ key: Object.fromEntries(def.keys.map((key, i) => [key.name, def.keys[i].type === 'integer' ? Number(r[`k${i}`]) : String(r[`k${i}`])])), sourceHash: hash, fields, locales: missing });
  }
  return { rows: out, next: rows.length === limit ? after + limit : null };
}

// The translation table's name for the (single) key column of the source.
const translationKey = (def: Def) => {
  const k = def.keys[0].name;
  if (k !== 'id') return k;
  // "id" sources: CompanyProduct -> productId, PinReview -> reviewId, ...
  return { CompanyProduct: 'productId', PinReview: 'reviewId', RestaurantContent: 'contentId', RestaurantSpecialVenue: 'venueId', PersonResearchNote: 'noteId', IndustryForecast: 'forecastId', PinCandidate: 'candidateId' }[def.source]!;
};

const sameShape = (a: unknown, b: unknown): boolean => {
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => sameShape(x, b[i]));
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a as Values).sort();
    const kb = Object.keys(b as Values).sort();
    return ka.length === kb.length && ka.every((k, i) => k === kb[i] && sameShape((a as Values)[k], (b as Values)[k]));
  }
  return typeof a === 'string' ? typeof b === 'string' : a === b;
};

export type ContentTranslationInput = { key: Values; locale: string; sourceHash: string; fields: Values };

// Saves translations, skipping a row for a source that is gone or changed since
// the hash was taken, or whose words are empty, too long or reshaped (JSON).
export async function applyContentTranslations(name: string, rows: ContentTranslationInput[]) {
  const def = CONTENT_TRANSLATIONS[name];
  const skipped: { key: Values; locale: string; reason: string }[] = [];
  let saved = 0;
  const tCols = def.keys.length === 1 ? [translationKey(def)] : def.keys.map((k) => k.name);
  for (const row of rows) {
    const skip = (reason: string) => skipped.push({ key: row.key, locale: row.locale, reason });
    const keyVals = def.keys.map((k) => row.key?.[k.name]);
    if (!isLocale(row.locale) || row.locale === 'en') { skip('not a language the site translates into'); continue; }
    if (keyVals.some((v) => v === undefined || v === null || v === '')) { skip('key incomplete'); continue; }
    const src = await db.query<Values>(
      `SELECT ${fieldCols(def)} FROM "${def.source}" s WHERE ${def.keys.map((k, i) => `s."${k.name}" = $${i + 1}`).join(' AND ')}`,
      keyVals,
    );
    if (!src[0]) { skip('no such source row'); continue; }
    const english = Object.fromEntries(def.fields.map((f) => [f.name, src[0][f.name] ?? null]));
    if (contentHash(def, english) !== row.sourceHash) { skip('the source changed since'); continue; }
    const words: Values = {};
    let problem = '';
    for (const f of def.fields) {
      let v = row.fields?.[f.name] ?? null;
      if (english[f.name] === null) v = null; // nothing to translate stays NULL
      else if (f.kind === 'text') {
        v = typeof v === 'string' ? v.trim() : '';
        if (!/[\p{L}\p{N}]/u.test(v as string)) problem = `${f.name} empty`;
        else if (f.max && (v as string).length > f.max) problem = `${f.name} too long`;
      } else if (!sameShape(english[f.name], v)) problem = `${f.name} changed shape`;
      words[f.name] = v;
    }
    if (problem) { skip(problem); continue; }
    const cols = [...tCols, 'locale', ...def.fields.map((f) => f.name), 'sourceHash'];
    const params = [...keyVals, row.locale, ...def.fields.map((f) => (f.kind === 'json' ? JSON.stringify(words[f.name]) : words[f.name])), row.sourceHash];
    await db.query(
      `INSERT INTO "${def.table}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${params.map((_, i) => `$${i + 1}${cols[i] !== 'locale' && def.fields.find((f) => f.name === cols[i])?.kind === 'json' ? '::jsonb' : ''}`).join(', ')})
       ON CONFLICT (${[...tCols, 'locale'].map((c) => `"${c}"`).join(', ')}) DO UPDATE SET ${[...def.fields.map((f) => f.name), 'sourceHash'].map((c) => `"${c}" = EXCLUDED."${c}"`).join(', ')}, "utcUpdatedDateTime" = now()`,
      params,
    );
    saved++;
  }
  return { saved, skipped };
}

// Coverage for the health check: per table, source rows and rows with every
// language current.
export async function contentCoverage(locales: readonly string[]) {
  const out: Record<string, { sources: number; complete: number; due: number }> = {};
  for (const name of Object.keys(CONTENT_TRANSLATIONS)) {
    let due = 0, after = 0;
    for (;;) {
      const page = await contentDue(name, locales, 500, after);
      due += page.rows.length;
      if (page.next === null) break;
      after = page.next;
    }
    const def = CONTENT_TRANSLATIONS[name];
    const [{ n }] = await db.query<{ n: string }>(`SELECT count(*) AS n FROM "${def.source}" s ${def.join ?? ''} WHERE ${def.live}`);
    const sources = Number(n);
    out[name] = { sources, complete: sources - due, due };
  }
  return out;
}

// For readers: the translated fields of one source row in a language, or null
// when there is none made from the English as it is now.
export async function contentTranslation(name: string, locale: Locale, key: unknown[]): Promise<Values | null> {
  if (locale === 'en') return null;
  const def = CONTENT_TRANSLATIONS[name];
  const tCols = def.keys.length === 1 ? [translationKey(def)] : def.keys.map((k) => k.name);
  const [t] = await db.query<Values>(
    `SELECT ${def.fields.map((f) => `t."${f.name}"`).join(', ')}, t."sourceHash" FROM "${def.table}" t
      WHERE ${tCols.map((c, i) => `t."${c}" = $${i + 1}`).join(' AND ')} AND t."locale" = $${tCols.length + 1}`,
    [...key, locale],
  );
  if (!t) return null;
  const [s] = await db.query<Values>(`SELECT ${fieldCols(def)} FROM "${def.source}" s WHERE ${def.keys.map((k, i) => `s."${k.name}" = $${i + 1}`).join(' AND ')}`, key);
  if (!s || contentHash(def, Object.fromEntries(def.fields.map((f) => [f.name, s[f.name] ?? null]))) !== String(t.sourceHash).trim()) return null;
  return Object.fromEntries(def.fields.map((f) => [f.name, t[f.name]]));
}
