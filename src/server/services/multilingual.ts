// Which of the site's other languages are offered (src/lib/multilingual.ts),
// for pages and their metadata. Cached and expired with the timeline, as the
// other admin settings pages read are (services/pages.ts), so a prerender
// reads no clock: offeredLocales (services/cache.ts) times its own copy
// with Date.now(), which Cache Components refuses while prerendering, and a
// build with no database stopped on the pin page. The proxy and the event
// handlers, which never prerender, keep using that one.

import { cacheLife, cacheTag } from 'next/cache';
import { DEFAULT_MULTILINGUAL, type OtherLocale } from '@/lib/multilingual';
import { getMultilingual } from '../model/appSetting';
import { TAGS } from './cache';

export async function localesOffered(): Promise<OtherLocale[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag(TAGS.timeline);
  return getMultilingual().then(
    (s) => s.locales,
    () => DEFAULT_MULTILINGUAL.locales,
  );
}
