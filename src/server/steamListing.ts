// A game pin's Steam store page, for its buy button ("Steam" next to the
// store searches, src/lib/shopping.ts). Steam's storefront endpoints need no
// key: storesearch finds an app by name, appdetails names it, types it and
// dates it.
//
// A page that links its own Steam page ("Wishlist on Steam") names the app
// outright; otherwise the pin's title candidates are searched. Either way an
// app counts only when it is a game whose name is the title (a demo, a
// soundtrack, a DLC or a sequel is a different name), and whose release year
// fits the pin's - no link at all beats a link to the wrong game. An
// unreleased game's page is real, so "Wishlist" pages count as buy pages.
// Nothing here throws: a failed lookup is just no link.

import { siteUrl } from '@/lib/appConfig';
import { normalizeTitle, titleCandidates, yearFits } from './scrape/screen';
import log from './util/log';

const STORE = 'https://store.steampowered.com';
const TIMEOUT_MS = 8000;
const USER_AGENT = `ChronopinBot/1.0 (+${siteUrl})`;
// Apps looked at per pin: the page's own links, then the searches' hits.
const MOST_CHECKED = 5;
const MOST_SEARCHED = 3;

export type SteamListing = { label: 'Steam'; url: string; price?: number };

export type SteamQuery = {
  workTitle?: string | null;
  pinTitle?: string | null;
  // The pin's start year: the game's release (or announced) year.
  year?: number;
  // More names to try after the ones read out of the titles, e.g. the first
  // words of a pin title that does not quote the game.
  moreTitles?: string[];
  // The links of the page being pinned.
  links?: readonly string[];
};

type AppDetails = { id: number; name: string; type: string; releaseYear?: number; price?: number };

// The app id of a Steam store link (store.steampowered.com/app/3669200/Guildrun/).
export function steamAppId(url: string | null | undefined): number | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (!/^(?:store\.)?steampowered\.com$/i.test(parsed.hostname.replace(/^www\./, ''))) return undefined;
    const id = parsed.pathname.match(/^\/app\/(\d+)(?:\/|$)/)?.[1];
    return id ? Number(id) : undefined;
  } catch {
    return undefined;
  }
}

// The page as the pin links it: the canonical store URL, no tracking.
export const steamUrl = (appId: number) => `${STORE}/app/${appId}/`;

async function getJson(url: string): Promise<any> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en-US,en;q=0.9' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    return res.ok ? await res.json() : undefined;
  } catch (err) {
    log.warn('Steam lookup failed:', (err as Error).message);
    return undefined;
  }
}

async function details(appId: number): Promise<AppDetails | undefined> {
  const body = await getJson(`${STORE}/api/appdetails?appids=${appId}&cc=us&l=en`);
  const data = body?.[appId]?.success ? body[appId].data : undefined;
  if (!data || typeof data.name !== 'string') return undefined;
  const year = Number(String(data.release_date?.date ?? '').match(/\b(19|20)\d{2}\b/)?.[0]);
  const final = data.price_overview?.currency === 'USD' ? Number(data.price_overview.final) / 100 : undefined;
  return { id: appId, name: data.name, type: String(data.type), releaseYear: year || undefined, price: final && final > 0 ? final : data.is_free === true ? 0 : undefined };
}

async function searchIds(title: string): Promise<{ id: number; name: string }[]> {
  const body = await getJson(`${STORE}/api/storesearch/?term=${encodeURIComponent(title)}&cc=us&l=en`);
  const items: { type?: string; id?: number; name?: string }[] = Array.isArray(body?.items) ? body.items : [];
  return items.filter((i) => i.type === 'app' && Number.isInteger(i.id) && typeof i.name === 'string').map((i) => ({ id: i.id!, name: i.name! }));
}

// normalizeTitle keeps only a-z and 0-9, so a name in another script ("2027
// 毕业生工作") would read as its digits alone and match a title that is only
// that. A name has to be in the same script as the title it matches.
const hasNonLatin = (text: string) => /[^\p{Script=Latin}\p{N}\p{P}\p{S}\p{Z}]/u.test(text);

// Whether an app is the game the pin is about: a game, named as the title is,
// released around the pin's year.
export function isTheGame(app: Pick<AppDetails, 'name' | 'type' | 'releaseYear'>, titles: string[], year?: number): boolean {
  if (app.type !== 'game') return false;
  const name = normalizeTitle(app.name);
  return titles.some((t) => normalizeTitle(t) === name && hasNonLatin(t) === hasNonLatin(app.name)) && yearFits(app.releaseYear, year);
}

// A date word read out of a title ("October release date announced for ...")
// is no game's name, though "October" is a Steam game.
const CALENDAR_WORD = /^(january|february|march|april|may|june|july|august|september|october|november|december|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i;

export async function findSteamListing(query: SteamQuery): Promise<SteamListing | undefined> {
  const titles = [...titleCandidates(query), ...(query.moreTitles ?? [])].filter((t) => !CALENDAR_WORD.test(t.trim()));
  if (!titles.length) return undefined;
  try {
    const ids = new Set<number>();
    for (const link of query.links ?? []) {
      const id = steamAppId(link);
      if (id) ids.add(id);
    }
    // Searched only when the page named no app of its own that is the game.
    const checked = new Set<number>();
    const check = async (id: number) => {
      if (checked.has(id) || checked.size >= MOST_CHECKED) return undefined;
      checked.add(id);
      const app = await details(id);
      return app && isTheGame(app, titles, query.year) ? app : undefined;
    };
    let found: AppDetails | undefined;
    for (const id of ids) if ((found = await check(id))) break;
    for (const title of titles.slice(0, query.moreTitles ? MOST_SEARCHED + query.moreTitles.length : MOST_SEARCHED)) {
      if (found) break;
      // Only the exact name is worth a details call: the rest of the hits are
      // other games, demos and soundtracks.
      for (const hit of await searchIds(title)) {
        if (normalizeTitle(hit.name) === normalizeTitle(title) && hasNonLatin(hit.name) === hasNonLatin(title) && (found = await check(hit.id))) break;
      }
    }
    return found ? { label: 'Steam', url: steamUrl(found.id), ...(found.price !== undefined ? { price: found.price } : {}) } : undefined;
  } catch (err) {
    log.warn('Steam listing lookup failed:', (err as Error).message);
    return undefined;
  }
}
