// The award catalogue: every win and nomination the award bodies' Wikipedia
// pages list (src/lib/awards.ts parses them), fetched once a day and shared.
//
// Wikipedia's API, keyless; a failed page leaves its body out of that day's
// catalogue rather than failing the rest.

import {
  crunchyrollYear,
  parseCrunchyrollEdition,
  parseJapanAcademyAnimation,
  parseTokyoAnimeAward,
  type AwardEntry,
} from '@/lib/awards';
import log from './util/log';

const API = 'https://en.wikipedia.org/w/api.php';
const USER_AGENT = 'Chronopin/1.0 (https://chronopin.com; award lookup)';
const TIMEOUT_MS = 15_000;
const CATALOGUE_MS = 24 * 3_600_000;
// Crunchyroll editions are numbered pages; stop at the first that is missing.
const MAX_CRUNCHYROLL_EDITIONS = 40;

const pageUrl = (title: string) => `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;

const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;

// A page's HTML, or null when there is no such page.
async function page(title: string): Promise<string | null> {
  const res = await fetch(`${API}?action=parse&format=json&formatversion=2&prop=text&redirects=1&page=${encodeURIComponent(title)}`, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`wikipedia ${res.status} for ${title}`);
  const json = (await res.json()) as { parse?: { text: string }; error?: { code: string } };
  if (json.error?.code === 'missingtitle') return null;
  if (!json.parse) throw new Error(`wikipedia: no page text for ${title}`);
  return json.parse.text;
}

async function crunchyroll(): Promise<AwardEntry[]> {
  const all: AwardEntry[] = [];
  for (let n = 1; n <= MAX_CRUNCHYROLL_EDITIONS; n++) {
    const title = `${ordinal(n)} Crunchyroll Anime Awards`;
    const html = await page(title);
    if (!html) break;
    all.push(...parseCrunchyrollEdition(html, crunchyrollYear(n), pageUrl(title)));
  }
  return all;
}

async function one(title: string, parse: (html: string, url: string) => AwardEntry[]): Promise<AwardEntry[]> {
  const html = await page(title);
  return html ? parse(html, pageUrl(title)) : [];
}

const SOURCES: { name: string; load: () => Promise<AwardEntry[]> }[] = [
  { name: 'Crunchyroll Anime Awards', load: crunchyroll },
  { name: 'Tokyo Anime Award Festival', load: () => one('Tokyo Anime Award', parseTokyoAnimeAward) },
  { name: 'Japan Academy Film Prize', load: () => one('Japan Academy Film Prize for Animation of the Year', parseJapanAcademyAnimation) },
];

type Catalogue = { at: number; entries: Promise<AwardEntry[]> };
const state = ((globalThis as any).__chronopinAwards ??= { catalogue: null }) as { catalogue: Catalogue | null };

// Every award entry, from a day-old copy at most.
export function awardCatalogue(): Promise<AwardEntry[]> {
  const current = state.catalogue;
  if (current && Date.now() - current.at < CATALOGUE_MS) return current.entries;
  const entries = Promise.all(
    SOURCES.map((s) =>
      s.load().catch((err) => {
        log.warn(`awards: ${s.name} failed:`, (err as Error).message);
        return [] as AwardEntry[];
      }),
    ),
  ).then((lists) => lists.flat());
  state.catalogue = { at: Date.now(), entries };
  // An empty catalogue (Wikipedia down) is not kept for the day.
  entries.then((list) => {
    if (!list.length && state.catalogue?.entries === entries) state.catalogue = null;
  });
  return entries;
}
