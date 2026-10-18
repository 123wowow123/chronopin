import type { NextRequest } from 'next/server';
import { intParam, json, route } from '@/server/http';
import { localeOr } from '@/lib/i18n/config';
import { toCardPins } from '@/lib/sanitize';
import { relatedPins } from '@/server/services/pages';

// The pins most like this one (the pin page's "More like this"), as cards,
// in the page's language. Fetched by the page once the section is scrolled to.
export const GET = route(async (request: NextRequest, ctx: RouteContext<'/api/pins/[id]/related'>) => {
  const id = intParam((await ctx.params).id);
  const locale = localeOr(request.nextUrl.searchParams.get('lang'));
  return json(toCardPins(await relatedPins(id, locale)), 200, { 'Cache-Control': 'public, max-age=300' });
});
