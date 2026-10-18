// The awards a product or game won or was nominated for, from its Wikidata
// item: "award received" (P166) and "nominated for" (P1411), each dated (P585)
// and sometimes with the edition as its category (P805). Keyless, and it
// covers what the award catalogue (./awards.ts, anime and film bodies) does
// not: a game's Golden Joysticks and BAFTAs, a gadget's design awards, a car's
// Car of the Year.
//
// A work counts as found only when an item's label matches exactly, it is not
// plainly a person or an organisation, and its year fits the pin's.
// A lookup that could not be made throws, so a caller that replaces a pin's
// stored awards never mistakes a Wikidata outage for "no awards".

import type { AwardEntry } from '@/lib/awards';
import { normalizeTitle, yearFits } from './scrape/screen';
import log from './util/log';

const TIMEOUT_MS = 15_000;
const USER_AGENT = 'ChronopinBot/1.0 (+https://chronopin.com; award lookup)';
const MAX_TITLES = 3;

// Items that carry awards but are not the thing a pin is about.
const NOT_A_PRODUCT = /\b(?:company|corporation|person|born|actor|actress|singer|rapper|band|politician|footballer|athlete|manufacturer|brand|organi[sz]ation|record label|studio|publisher|film|movie|television|tv series|album|song|anime|manga|novel|book)\b/i;
const A_GAME = /\bvideo game\b/i;

export type WikidataAwardRow = { aw?: string; awLabel?: string; catLabel?: string; date?: string; res?: string; [column: string]: string | undefined };

// "British Academy Games Award for Best Game" -> body and category, and
// "Golden Joystick Awards − Ultimate Game of the Year" the same. A label that
// names no category is its own, with the statement's own category if it has one.
export function splitAward(label: string, category?: string): { body: string; award: string } {
  const dash = label.match(/^(.+?)\s+[−–—-]\s+(.+)$/);
  if (dash) return { body: dash[1], award: dash[2] };
  const forCat = label.match(/^(.+?\b(?:Awards?|Prize|Trophy|Festival|Honou?rs?|Medal|Cup))\s+for\s+(.+)$/i);
  if (forCat) return { body: forCat[1], award: forCat[2] };
  return { body: label, award: category && category !== label ? category : label };
}

// The rows of one item as award entries. A statement with no date is left out
// (an award with no year cannot be listed), and a nomination is left out
// where the same award that year was won.
export function awardEntries(rows: WikidataAwardRow[], work: string, sourceUrl: string): AwardEntry[] {
  const entries = new Map<string, AwardEntry>();
  for (const r of rows) {
    const year = Number(r.date?.slice(0, 4));
    if (!r.awLabel || !Number.isInteger(year) || year < 1900 || /^Q\d+$/.test(r.awLabel)) continue;
    const { body, award } = splitAward(r.awLabel, r.catLabel && !/^Q\d+$/.test(r.catLabel) ? r.catLabel : undefined);
    const result = r.res === 'won' ? 'won' : 'nominated';
    const key = `${body}|${award}|${year}`;
    const have = entries.get(key);
    if (have && (have.result === 'won' || result === 'nominated')) continue;
    entries.set(key, { body: body.slice(0, 120), award: award.slice(0, 200), year, work, workArticle: null, result, sourceUrl });
  }
  return [...entries.values()].sort((a, b) => a.year - b.year || a.body.localeCompare(b.body));
}

async function getJson(url: string, headers: Record<string, string> = {}, retry = true): Promise<any> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, ...headers }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) {
      // Wikidata's query service answers 429 or 5xx when busy; one pause and
      // one more try is usually enough.
      if (retry && (res.status === 429 || res.status >= 500)) {
        const wait = Number(res.headers.get('retry-after'));
        await new Promise((resolve) => setTimeout(resolve, Math.min(Number.isFinite(wait) && wait > 0 ? wait : 5, 30) * 1000));
        return await getJson(url, headers, false);
      }
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    const reason = (err as Error).message.replace(/^Wikidata lookup failed: /, '');
    log.warn('work awards lookup failed:', reason);
    throw new Error(`Wikidata lookup failed: ${reason}`);
  }
}

export type WorkAwardsQuery = { titles: string[]; year?: number; game?: boolean };

export async function findWorkAwards({ titles, year, game = false }: WorkAwardsQuery): Promise<AwardEntry[]> {
  for (const title of titles.slice(0, MAX_TITLES)) {
    const search = await getJson(`https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&uselang=en&type=item&limit=10&search=${encodeURIComponent(title)}`);
    const work = normalizeTitle(title);
    const ids: string[] = (search?.search ?? [])
      .filter((s: any) => /^Q\d+$/.test(s.id) && normalizeTitle(s.label ?? '') === work && (game ? A_GAME.test(s.description ?? '') : !NOT_A_PRODUCT.test(s.description ?? '')))
      .map((s: any) => s.id);
    if (!ids.length) continue;
    const sparql = `SELECT ?item ?year ?aw ?awLabel ?catLabel ?date ?res WHERE {
      VALUES ?item { ${ids.map((id) => `wd:${id}`).join(' ')} }
      OPTIONAL { ?item wdt:P577|wdt:P571 ?published BIND(YEAR(?published) AS ?year) }
      { ?item p:P166 ?st . ?st ps:P166 ?aw . BIND("won" AS ?res) } UNION { ?item p:P1411 ?st . ?st ps:P1411 ?aw . BIND("nominated" AS ?res) }
      OPTIONAL { ?st pq:P585 ?date } OPTIONAL { ?st pq:P805 ?cat }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }`;
    const res = await getJson(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`, { Accept: 'application/sparql-results+json' });
    const rows: any[] = (res?.results?.bindings ?? []).map((b: any) => Object.fromEntries(Object.entries(b).map(([k, v]: [string, any]) => [k, v.value])));
    // The search's relevance order; the first item with awards whose year fits.
    for (const id of ids) {
      const own = rows.filter((r) => r.item.endsWith(`/${id}`));
      const years = own.map((r) => Number(r.year)).filter(Number.isFinite);
      if (!own.length || !yearFits(years.length ? Math.min(...years) : undefined, year, true)) continue;
      const entries = awardEntries(own, title, `https://www.wikidata.org/wiki/${id}`);
      if (entries.length) return entries;
    }
  }
  return [];
}
