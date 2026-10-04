// A game's aggregated ratings, maturity rating and platforms, for the game
// info on a game pin (PinGameInfo, 0124).
//
// Steam's keyless storefront gives the PC platforms, the Metacritic score,
// the user-review summary and, for many games, the ESRB/PEGI label with its
// content descriptors. Steam lists only where it sells, so the consoles come
// from Wikidata (P1733 Steam app id -> P400 platform, P852 ESRB, P908 PEGI).
// Nothing here throws: a failed lookup is just a missing fact.

import { siteUrl } from '@/lib/appConfig';
import { esrbLabel, platformFromName, type GameInfoFields, type PlatformKey } from '@/lib/gameInfo';
import { steamUrl } from './steamListing';
import log from './util/log';

const STORE = 'https://store.steampowered.com';
const TIMEOUT_MS = 10000;
const USER_AGENT = `ChronopinBot/1.0 (+${siteUrl})`;

export type GameRating = { source: string; score: number; scoreMax: number; url?: string };
export type GameFacts = { info: GameInfoFields; ratings: GameRating[]; source: 'steam' | 'wikidata'; sourceUrl: string; name?: string };

async function getJson(url: string, headers: Record<string, string> = {}): Promise<any> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en-US,en;q=0.9', ...headers }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    return res.ok ? await res.json() : undefined;
  } catch (err) {
    log.warn('game facts lookup failed:', (err as Error).message);
    return undefined;
  }
}

// Steam prints descriptors as one string split by newlines or commas.
const splitDescriptors = (text: unknown): string[] =>
  typeof text === 'string' ? text.split(/\r?\n|,/).map((d) => d.trim()).filter((d) => d && d.length <= 80) : [];

// "m" -> "Mature 17+" for ESRB; PEGI's rating is its age ("18").
function maturityOf(ratings: any): Pick<GameInfoFields, 'maturityBoard' | 'maturityRating' | 'descriptors'> {
  const esrb = ratings?.esrb;
  const label = esrb?.rating ? esrbLabel(String(esrb.rating)) : undefined;
  if (label) return { maturityBoard: 'ESRB', maturityRating: label, descriptors: splitDescriptors(esrb.descriptors) };
  const pegi = ratings?.pegi;
  const age = String(pegi?.rating ?? '').match(/\d+/)?.[0];
  if (age) return { maturityBoard: 'PEGI', maturityRating: age, descriptors: splitDescriptors(pegi.descriptors) };
  return { maturityBoard: null, maturityRating: null, descriptors: [] };
}

async function steamFacts(appId: number): Promise<{ data: any; reviews: any } | undefined> {
  const [body, reviews] = await Promise.all([
    getJson(`${STORE}/api/appdetails?appids=${appId}&cc=us&l=en`),
    getJson(`${STORE}/appreviews/${appId}?json=1&language=all&purchase_type=all&num_per_page=0`),
  ]);
  const data = body?.[appId]?.success ? body[appId].data : undefined;
  return data ? { data, reviews: reviews?.query_summary } : undefined;
}

// Wikidata: platforms plus the board labels Steam did not print.
async function wikidataFacts(appId: number): Promise<{ platforms: PlatformKey[]; esrb?: string; pegi?: string; entity?: string }> {
  const sparql = `SELECT ?g ?plLabel ?esrbLabel ?pegiLabel WHERE { ?g wdt:P1733 "${appId}". OPTIONAL { ?g wdt:P400 ?pl } OPTIONAL { ?g wdt:P852 ?esrb } OPTIONAL { ?g wdt:P908 ?pegi } SERVICE wikibase:label { bd:serviceParam wikibase:language "en,mul". } }`;
  const body = await getJson(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`, { Accept: 'application/sparql-results+json' });
  const rows: any[] = body?.results?.bindings ?? [];
  const platforms = new Set<PlatformKey>();
  for (const row of rows) {
    const key = row.plLabel?.value ? platformFromName(row.plLabel.value) : undefined;
    if (key) platforms.add(key);
  }
  return { platforms: [...platforms], esrb: rows.find((r) => r.esrbLabel)?.esrbLabel.value, pegi: rows.find((r) => r.pegiLabel)?.pegiLabel.value, entity: rows[0]?.g?.value };
}

export async function findGameFacts(appId: number): Promise<GameFacts | undefined> {
  try {
    const steam = await steamFacts(appId);
    if (!steam) return undefined;
    const { data, reviews } = steam;
    const platforms = new Set<PlatformKey>();
    if (data.platforms?.windows) platforms.add('windows');
    if (data.platforms?.mac) platforms.add('macos');
    if (data.platforms?.linux) platforms.add('linux');
    const wiki = await wikidataFacts(appId);
    wiki.platforms.forEach((p) => platforms.add(p));

    let maturity = maturityOf(data.ratings);
    if (!maturity.maturityRating) {
      // Wikidata names the label but not the descriptors; Steam's own content
      // notes ("Intense Violence, Blood and Gore") fill those in.
      const label = wiki.esrb ? esrbLabel(wiki.esrb) : undefined;
      const age = wiki.pegi?.match(/\d+/)?.[0];
      const notes = splitDescriptors(data.content_descriptors?.notes);
      if (label) maturity = { maturityBoard: 'ESRB', maturityRating: label, descriptors: notes };
      else if (age) maturity = { maturityBoard: 'PEGI', maturityRating: age, descriptors: notes };
    }

    const ratings: GameRating[] = [];
    const meta = data.metacritic;
    if (Number.isFinite(meta?.score) && meta.score > 0) {
      ratings.push({ source: 'Metacritic', score: meta.score, scoreMax: 100, ...(typeof meta.url === 'string' && /^https?:\/\//.test(meta.url) ? { url: meta.url.split('?')[0] } : {}) });
    }
    const positive = Number(reviews?.total_positive);
    const total = positive + Number(reviews?.total_negative);
    // A handful of reviews is an anecdote, not a score.
    if (total >= 50) ratings.push({ source: 'Steam', score: Math.round((positive / total) * 100), scoreMax: 100, url: steamUrl(appId) });

    return { info: { ...maturity, platforms: [...platforms] }, ratings, source: 'steam', sourceUrl: steamUrl(appId), name: typeof data.name === 'string' ? data.name : undefined };
  } catch (err) {
    log.warn('game facts failed:', (err as Error).message);
    return undefined;
  }
}
