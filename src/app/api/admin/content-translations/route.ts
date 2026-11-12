import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { TARGET_LOCALES } from '@/server/extract/translate';
import { HttpError, json, readJson, route } from '@/server/http';
import { CONTENT_TRANSLATIONS, applyContentTranslations, contentCoverage, contentDue, type ContentTranslationInput } from '@/server/model/contentTranslations';

// Translations of the secondary content tables (0265), made by the translation
// agent in the same run as the pin translations. One endpoint, one `table` per call:
//
//   GET  (no params)                          the tables, their fields and a coverage count
//   GET  ?table=company-wiki&locale=zh[,ja]&limit=100&after=<next>
//        source rows lacking a current translation: { key, sourceHash, fields, locales }
//   POST { table, translations: [{ key, locale, sourceHash, fields }] }
//        saves them; a row whose source changed since the GET is skipped
const MAX_ROWS = 300;

const tableParam = (name: string | null) => {
  if (!name || !Object.hasOwn(CONTENT_TRANSLATIONS, name)) throw new HttpError(400, '', { message: `table takes ${Object.keys(CONTENT_TRANSLATIONS).join(', ')}` });
  return name;
};

export const GET = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  const params = request.nextUrl.searchParams;
  if (!params.get('table')) {
    const coverage = await contentCoverage(TARGET_LOCALES);
    return json({
      locales: TARGET_LOCALES,
      tables: Object.entries(CONTENT_TRANSLATIONS).map(([name, d]) => ({ name, source: d.source, translation: d.table, fields: d.fields.map((f) => ({ name: f.name, kind: f.kind })), note: d.note, ...coverage[name] })),
    });
  }
  const name = tableParam(params.get('table'));
  const asked = (params.get('locale') ?? '').split(',').filter(Boolean);
  if (asked.some((l) => !(TARGET_LOCALES as readonly string[]).includes(l))) throw new HttpError(400, '', { message: `locale takes ${TARGET_LOCALES.join(', ')}` });
  const locales = asked.length ? TARGET_LOCALES.filter((l) => asked.includes(l)) : [...TARGET_LOCALES];
  const limit = Math.min(Math.max(Number(params.get('limit')) || 100, 1), 500);
  const after = Math.max(Number(params.get('after')) || 0, 0);
  const { rows, next } = await contentDue(name, locales, limit, after);
  return json({ table: name, locales, note: CONTENT_TRANSLATIONS[name].note, next, rows });
});

export const POST = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  const body = await readJson<{ table?: string; translations?: ContentTranslationInput[] }>(request);
  const name = tableParam(body.table ?? null);
  const { translations } = body;
  if (!Array.isArray(translations) || !translations.length) throw new HttpError(400, '', { message: 'Expected { table, translations: [...] }' });
  if (translations.length > MAX_ROWS) throw new HttpError(400, '', { message: `At most ${MAX_ROWS} translations per request` });
  return json(await applyContentTranslations(name, translations));
});
