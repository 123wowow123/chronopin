import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { TARGET_LOCALES, type TargetLocale } from '@/server/extract/translate';
import { HttpError, json, readJson, route } from '@/server/http';
import { applyTranslations, pinsToTranslate, type TranslationInput } from '@/server/services/translations';

// Pin translations made by hand, for a server the session cannot run
// `npm run translations:sync -- --export/--apply` on (services/translations.ts).
//
//   GET  ?locale=zh[,ja]&limit=200&after=<pin id>  pins lacking a current
//        translation, with their words and the sourceHash to send back
//   POST { translations: [{ pinId, locale, sourceHash, title, ... }] }
//        saves them; one whose pin changed since the GET is skipped
const MAX_ROWS = 500;

export const GET = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  const params = request.nextUrl.searchParams;
  const asked = (params.get('locale') ?? '').split(',').filter(Boolean);
  if (asked.some((l) => !(TARGET_LOCALES as readonly string[]).includes(l))) {
    throw new HttpError(400, '', { message: `locale takes ${TARGET_LOCALES.join(', ')}` });
  }
  const locales: TargetLocale[] = asked.length ? TARGET_LOCALES.filter((l) => asked.includes(l)) : [...TARGET_LOCALES];
  const limit = Math.min(Math.max(Number(params.get('limit')) || 200, 1), 1000);
  const after = Math.max(Number(params.get('after')) || 0, 0);
  return json({ locales, pins: await pinsToTranslate(locales, { limit, after }) });
});

export const POST = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  const { translations } = await readJson<{ translations?: TranslationInput[] }>(request);
  if (!Array.isArray(translations) || !translations.length) {
    throw new HttpError(400, '', { message: 'Expected { translations: [...] }' });
  }
  if (translations.length > MAX_ROWS) {
    throw new HttpError(400, '', { message: `At most ${MAX_ROWS} translations per request` });
  }
  return json(await applyTranslations(translations));
});
