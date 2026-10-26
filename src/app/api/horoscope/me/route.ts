import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { json, route } from '@/server/http';
import { personalSky } from '@/server/horoscope';
import DailyHoroscope from '@/server/model/dailyHoroscope';
import UserBirth from '@/server/model/userBirth';
import { loadUser } from '@/server/services/users';
import { dayKeyIn } from '@/lib/format';

// The signed-in user's reading for today (the UTC day): the one written for
// the transits to their own chart, else their sun sign's. Stored text only -
// the news job's horoscopes task writes it, nothing here calls an LLM.
export const GET = route(async (request: NextRequest) => {
  const signedIn = await requireUser(request);
  const user = await loadUser(signedIn.id);
  const day = dayKeyIn(Date.now(), 'UTC');
  const sky = personalSky(user.birthday, await UserBirth.get(user.id), day);
  if (!sky) return json({ day, sign: null, transits: [], text: null });
  const own = sky.key ? await DailyHoroscope.getTransit(sky.key, day) : null;
  const text = own ?? (await DailyHoroscope.get(sky.sign!, day));
  return json({ day, sign: sky.sign, transits: sky.transits, personal: !!own, text }, 200, { 'Cache-Control': 'private, max-age=600' });
});
