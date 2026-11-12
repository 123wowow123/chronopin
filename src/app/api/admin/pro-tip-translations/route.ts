import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { TARGET_LOCALES } from '@/server/extract/translate';
import { HttpError, json, readJson, route } from '@/server/http';
import { applyProTipTranslations, proTipsToTranslate, type ProTipTranslationInput } from '@/server/model/pinProTip';
import { invalidatePin } from '@/server/services/cache';

// Pro tip translations (PinProTipTranslation, 0264), made by the translation agent.
//
//   GET  ?locale=zh[,ja]&limit=200&after=<tip id>  tips lacking a current translation, with
//        the sourceHash to send back and the languages still missing
//   POST { translations: [{ proTipId, locale, sourceHash, tip }] }  saves them; one whose
//        tip changed since the GET is skipped
const MAX_ROWS = 500;

export const GET = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  const params = request.nextUrl.searchParams;
  const asked = (params.get('locale') ?? '').split(',').filter(Boolean);
  if (asked.some((l) => !(TARGET_LOCALES as readonly string[]).includes(l))) {
    throw new HttpError(400, '', { message: `locale takes ${TARGET_LOCALES.join(', ')}` });
  }
  const locales = asked.length ? TARGET_LOCALES.filter((l) => asked.includes(l)) : [...TARGET_LOCALES];
  const limit = Math.min(Math.max(Number(params.get('limit')) || 200, 1), 1000);
  const after = Math.max(Number(params.get('after')) || 0, 0);
  return json({ locales, tips: await proTipsToTranslate(locales, limit, after) });
});

export const POST = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  const { translations } = await readJson<{ translations?: (ProTipTranslationInput & { pinId?: number })[] }>(request);
  if (!Array.isArray(translations) || !translations.length) throw new HttpError(400, '', { message: 'Expected { translations: [...] }' });
  if (translations.length > MAX_ROWS) throw new HttpError(400, '', { message: `At most ${MAX_ROWS} translations per request` });
  const result = await applyProTipTranslations(translations);
  for (const id of new Set(translations.map((t) => Number(t.pinId)).filter(Number.isInteger))) invalidatePin(id);
  return json(result);
});
