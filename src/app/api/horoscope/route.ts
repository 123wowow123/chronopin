import type { NextRequest } from 'next/server';
import { json, noContent, route } from '@/server/http';
import DailyHoroscope from '@/server/model/dailyHoroscope';
import { SUN_SIGN_SLUGS } from '@/lib/horoscope';
import { dayKeyIn } from '@/lib/format';

// Today's stored reading for ?sign=aries (UTC day, the same for every viewer),
// written by the news job's horoscopes task; nothing here calls an LLM.
export const GET = route(async (request: NextRequest) => {
  const sign = request.nextUrl.searchParams.get('sign') ?? '';
  if (!SUN_SIGN_SLUGS.includes(sign)) return new Response(null, { status: 400 });
  const day = dayKeyIn(Date.now(), 'UTC');
  const text = await DailyHoroscope.get(sign, day);
  return text ? json({ sign, day, text }, 200, { 'Cache-Control': 'public, max-age=600' }) : noContent();
});
