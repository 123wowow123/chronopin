import type { NextRequest } from 'next/server';
import { json, route } from '@/server/http';
import Company from '@/server/model/company';
import PinTag from '@/server/model/pinTag';
import { SearchPins } from '@/server/model/searchPin';
import { localizePins } from '@/server/services/translations';
import { CATEGORIES } from '@/lib/categories';
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/config';
import { categoryLabel } from '@/lib/i18n/labels';
import { getMessages } from '@/lib/i18n/messages';
import { requestLocale } from '@/lib/i18n/request';
import { createTranslator } from '@/lib/i18n/translate';
import { reservedSuggestions, type TagCount } from '@/lib/tags';
import { toJson, type PinJson } from '@/lib/types';

// What the navbar search suggests as you type: pins whose title or
// description starts with the text, and the companies and tags (categories
// among them, kind 'category') with a word starting with it. On a page in
// another language, pins whose title there starts with it and categories
// named so there too, each shown in that language.
//
// The site's own filters (RESERVED_TAGS) are offered among the tags: they
// read as tags, and someone typing "estimated" or "thread" is after those
// pins whether or not the site keeps the word as a tag. They are matched
// here rather than in the database - a date's confidence is a column and a
// pin's score is read off its references, neither of them a row in
// "PinTagView" - and carry no count: the row shows the term it writes.
export const GET = route(async (request: NextRequest) => {
  const q = request.nextUrl.searchParams.get('q') || '';
  if (!q.trim()) return json({ pins: [], queryCount: 0, tags: [], companies: [] });
  const locale = requestLocale(request);
  const [pins, tags, named, companies] = await Promise.all([
    SearchPins.querySearchPin(q, q, 10, locale),
    PinTag.suggest(q, 6),
    categoriesNamed(q, locale).then((names) => PinTag.counted(names)),
    Company.suggest(q, 4),
  ]);
  const body = toJson<{ pins: PinJson[]; queryCount: number }>(pins);
  await localizePins(body.pins, locale);
  const reserved: TagCount[] = reservedSuggestions(q).map((filter) => ({ name: filter.name, kind: 'reserved', count: 0 }));
  const seen = new Set(tags.map((tag) => tag.name.toLowerCase()));
  const translated = named.filter((tag) => !seen.has(tag.name.toLowerCase())).slice(0, 6);
  return json({ ...body, tags: [...reserved, ...translated, ...tags].slice(0, reserved.length + 6), companies });
});

// The categories whose name in the page's language has a word starting with
// the typed text - anywhere in it for Chinese and Japanese, which leave no
// space between words.
async function categoriesNamed(text: string, locale: Locale): Promise<string[]> {
  const typed = text.trim().toLowerCase();
  if (locale === DEFAULT_LOCALE || !typed) return [];
  const t = createTranslator(await getMessages(locale), locale);
  const anywhere = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(typed);
  return CATEGORIES.filter((name) => {
    const label = categoryLabel(t, name).toLowerCase();
    return anywhere ? label.includes(typed) : label.startsWith(typed) || label.split(/[\s-]+/).some((word) => word.startsWith(typed));
  });
}
