import { describe, expect, it } from 'vitest';
import { daysAway, formatDayKey, formatPosted, formatStart, timespan } from '../format';
import { spanLabel } from '../postedSpan';
import { languageAlternates, localizePath, negotiateLocale, splitLocale, LOCALES } from './config';
import de from './messages/de';
import en from './messages/en';
import es from './messages/es';
import fr from './messages/fr';
import ja from './messages/ja';
import zh from './messages/zh';
import { CATEGORIES, slugify } from '../categories';
import { createTranslator, type Messages } from './translate';

describe('splitLocale', () => {
  it('reads the language prefix off a path', () => {
    expect(splitLocale('/es/map')).toEqual({ locale: 'es', path: '/map' });
    expect(splitLocale('/ja')).toEqual({ locale: 'ja', path: '/' });
    expect(splitLocale('/map')).toEqual({ locale: null, path: '/map' });
    // Two letters that are not a language, and a longer first segment.
    expect(splitLocale('/xx/map')).toEqual({ locale: null, path: '/xx/map' });
    expect(splitLocale('/english')).toEqual({ locale: null, path: '/english' });
  });
});

describe('localizePath', () => {
  it('prefixes app pages outside English', () => {
    expect(localizePath('/map', 'es')).toBe('/es/map');
    expect(localizePath('/', 'fr')).toBe('/fr');
    expect(localizePath('/?pin=3', 'de')).toBe('/de?pin=3');
    expect(localizePath('/search?q=a', 'ja')).toBe('/ja/search?q=a');
  });

  it('leaves English, other sites, routes and prefixed paths alone', () => {
    expect(localizePath('/map', 'en')).toBe('/map');
    expect(localizePath('https://example.com/x', 'es')).toBe('https://example.com/x');
    expect(localizePath('//example.com/x', 'es')).toBe('//example.com/x');
    expect(localizePath('/api/pins', 'es')).toBe('/api/pins');
    expect(localizePath('/logout?referrer=/', 'es')).toBe('/logout?referrer=/');
    expect(localizePath('/zh/map', 'es')).toBe('/zh/map');
    expect(localizePath('#comments', 'es')).toBe('#comments');
  });
});

describe('negotiateLocale', () => {
  it('picks the best supported language by quality', () => {
    expect(negotiateLocale('fr-CA,fr;q=0.9,en;q=0.8')).toBe('fr');
    expect(negotiateLocale('pt-BR,es;q=0.5')).toBe('es');
    expect(negotiateLocale('en;q=0.4,ja;q=0.9')).toBe('ja');
    expect(negotiateLocale('zh-Hans-CN')).toBe('zh');
  });

  it('answers null for nothing supported, or no header', () => {
    expect(negotiateLocale('pt-BR,ko')).toBeNull();
    expect(negotiateLocale('de;q=0')).toBeNull();
    expect(negotiateLocale(null)).toBeNull();
  });
});

describe('languageAlternates', () => {
  it('gives the canonical path in the language and every hreflang', () => {
    const links = languageAlternates('/pin/1/x', 'es');
    expect(links.canonical).toBe('/es/pin/1/x');
    expect(links.languages?.['en-US']).toBe('/pin/1/x');
    expect(links.languages?.['zh-CN']).toBe('/zh/pin/1/x');
    expect(links.languages?.['x-default']).toBe('/pin/1/x');
  });

  it('lists no other languages while they are switched off', () => {
    expect(languageAlternates('/pin/1/x', 'en', false)).toEqual({ canonical: '/pin/1/x' });
  });
});

describe('createTranslator', () => {
  it('fills slots and formats numbers in the language', () => {
    expect(createTranslator(en, 'en')('pin.views', { count: 1234 })).toBe('1,234 views');
    expect(createTranslator(de, 'de')('pin.views', { count: 1234 })).toBe('1.234 Aufrufe');
  });

  it('picks plural forms by the language rules', () => {
    const t = createTranslator(en, 'en');
    expect(t('pin.views', { count: 1 })).toBe('1 view');
    expect(t('pin.views', { count: 0 })).toBe('0 views');
    // French counts 0 as singular.
    expect(createTranslator(fr, 'fr')('pin.views', { count: 0 })).toBe('0 vue');
    // Japanese has one form, written as a plain string.
    expect(createTranslator(ja, 'ja')('pin.views', { count: 3 })).toBe('3 回表示');
  });

  it('answers the key for a missing message, and a fallback for a dynamic one', () => {
    const t = createTranslator(en, 'en');
    expect(t.dynamic('categories.astronomy', 'x')).toBe('Astronomy');
    expect(t.dynamic('categories.not-a-category', 'Custom tag')).toBe('Custom tag');
    // A namespace of labels is not a plural message.
    expect(t.has('categories')).toBe(false);
  });
});

describe('formatting in other languages', () => {
  it('orders numeric dates the language way', () => {
    expect(formatDayKey('2026-09-14', 'en')).toBe('09/14/2026');
    expect(formatDayKey('2026-09-14', 'es')).toBe('14/09/2026');
    expect(formatDayKey('2026-09-14', 'de')).toBe('14.09.2026');
    expect(formatDayKey('2026-09-14', 'ja')).toBe('2026/09/14');
    expect(formatDayKey('-2560-01-01', 'fr')).toBe('01/01/2561 av. J.-C.');
  });

  it('words start dates and countdowns', () => {
    const pin = { utcStartDateTime: '2026-09-14T00:00:00.000Z', allDay: true };
    expect(formatStart({ ...pin, allDayStated: true }, 'UTC', { allDaySuffix: true }, 'es')).toBe('Empieza el 14/09/2026 - Todo el día');
    // Without the source's word for it the label is left off, in every language.
    expect(formatStart(pin, 'UTC', { allDaySuffix: true }, 'es')).toBe('Empieza el 14/09/2026');
    expect(formatStart(pin, 'UTC', {}, 'zh')).toBe('开始于 2026/09/14');
    // A run of days is worded as a span, not as a start.
    const span = { ...pin, utcEndDateTime: '2026-09-17T00:00:00.000Z' };
    expect(formatStart(span, 'UTC', {}, 'fr')).toBe('Du 14/09/2026 au 16/09/2026');
    expect(formatStart(span, 'UTC', {}, 'ja')).toBe('2026/09/14〜2026/09/16');
    expect(timespan('2026-09-14', '2026-09-14', 'd', 'de')).toBe('Heute');
    expect(timespan('2026-09-14', '2026-09-19', 'd', 'es')).toBe('5 días');
    expect(daysAway('2026-09-14', '2026-09-11', 'fr')).toBe('il y a 3 jours');
    expect(formatPosted('2026-09-12T21:02:00.000Z', 'UTC', {}, 'de')).toBe('12.09.2026 um 21:02');
    expect(spanLabel(null, 'ja')).toBe('すべて');
    expect(spanLabel('5d', 'es')).toBe('5 días');
  });
});

// Every translation keeps the English message's {slots} and <tags>: a slot
// lost or renamed prints as its braces, and a lost tag loses its link.
describe('dictionaries', () => {
  const others: Record<string, Messages> = { es, fr, de, ja, zh };

  function leaves(node: unknown, prefix = ''): [string, string][] {
    if (typeof node === 'string') return [[prefix, node]];
    return Object.entries(node as Record<string, unknown>).flatMap(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k));
  }
  const tokens = (text: string) => [...new Set([...text.matchAll(/\{(\w+)\}|<(\w+)>/g)].map((m) => m[0]))].sort();

  // A plural message's forms may differ (French "Dernier jour" drops {count}), so
  // slots are compared message by message, by the union of each side's forms.
  function messages(tree: unknown): Map<string, string> {
    const out = new Map<string, string>();
    for (const [key, text] of leaves(tree)) {
      const message = key.replace(/\.(zero|one|two|few|many|other)$/, '');
      out.set(message, `${out.get(message) ?? ''} ${text}`);
    }
    return out;
  }

  const english = messages(en);
  it.each(Object.keys(others))('%s keeps the slots and tags of every English message', (locale) => {
    const translated = messages(others[locale]);
    const problems: string[] = [];
    for (const [key, text] of english) {
      const theirs = translated.get(key);
      if (theirs === undefined) {
        problems.push(`${key}: missing`);
        continue;
      }
      // {count} may be left out of a singular or a counter word; tags and other slots may not.
      const want = tokens(text).filter((t) => t !== '{count}');
      const have = tokens(theirs).filter((t) => t !== '{count}');
      if (want.join() !== have.join()) problems.push(`${key}: ${want.join(' ')} != ${have.join(' ')}`);
    }
    expect(problems).toEqual([]);
  });

  it('covers every supported language', () => {
    expect(Object.keys(others).sort()).toEqual(LOCALES.filter((l) => l !== 'en').sort());
  });
});

// The category list and the dictionaries are two lists that have to agree, and
// the type system only half-checks it: Shape<typeof en> requires of the other
// languages whatever en declares, so a category added to categories.ts and to
// no dictionary at all is required of nobody. It would render as its raw
// English name in every language, silently. A rename is worse: the old key
// stays behind in all six files, tsc stays happy, and every language falls back
// to English. These assertions are what actually holds the two lists together.
describe('category labels', () => {
  const dictionaries: Record<string, Messages> = { en, es, fr, de, ja, zh };
  const labels = (m: Messages) => (m as unknown as { categories: Record<string, string> }).categories;

  it.each(Object.keys(dictionaries))('%s names every category', (locale) => {
    const theirs = labels(dictionaries[locale]);
    const missing = CATEGORIES.filter((category) => typeof theirs[slugify(category)] !== 'string');
    expect(missing).toEqual([]);
  });

  it.each(Object.keys(dictionaries))('%s has no label for a category that no longer exists', (locale) => {
    const slugs = new Set(CATEGORIES.map(slugify));
    const stale = Object.keys(labels(dictionaries[locale])).filter((slug) => !slugs.has(slug));
    expect(stale).toEqual([]);
  });

  // English is the category's own name, so a renamed category cannot leave a
  // stale English label behind that quietly disagrees with the list.
  it('English repeats the category name exactly', () => {
    const theirs = labels(en);
    const wrong = CATEGORIES.filter((category) => theirs[slugify(category)] !== category);
    expect(wrong).toEqual([]);
  });
});
