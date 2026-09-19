/**
 * Extras for pins about a film, TV series or anime: a promotional video from
 * YouTube for the pin's media, and scores from review sites for its ratings.
 *
 * Every source here works without an API key, so scraping and the backfill
 * script (scripts/media/screenDetails.ts) behave the same everywhere:
 * - YouTube's own search results page for the trailer (an AniList entry's
 *   listed trailer is tried first for anime), checked through oEmbed, which
 *   also refuses videos whose owner has turned embedding off.
 * - AniList, and MyAnimeList through Jikan by the MAL id AniList gives, for
 *   anime. Looking MAL up by id avoids a second fuzzy title search.
 * - Wikidata's review-score statements for IMDb, Rotten Tomatoes and
 *   Metacritic. imdb.com itself answers scripts with a bot challenge.
 *
 * A work only counts as found when one of its titles matches exactly (after
 * normalising case, punctuation and "2nd Season"/"Season 2") and its year
 * fits the pin's, so a pin about a reboot never gets the original's scores.
 * Any source that fails or finds nothing is skipped; nothing here throws.
 */

import { mediumID, siteUrl } from '@/lib/appConfig';
import { categoryList, hasCategory } from '@/lib/categories';
import type { MediumJson, PinRatingJson } from '@/lib/types';
import log from '../util/log';

export const SCREEN_CATEGORIES = ['Anime', 'Anime Movie', 'Movies', 'TV Series'];

// One category or a pin's list of them.
export function isScreenCategory(categories: string | readonly (string | null | undefined)[] | null | undefined): boolean {
  return hasCategory(categoryList(categories), SCREEN_CATEGORIES);
}

export type ScreenQuery = {
  // The work's own title, e.g. "Jujutsu Kaisen Season 2" - tried first.
  workTitle?: string | null;
  // The pin's title, e.g. "Jujutsu Kaisen Season 2 Premieres", for the
  // titles that can be read out of it when workTitle is missing or unmatched.
  pinTitle?: string | null;
  category?: string | null;
  // The pin's start year: the release, premiere or season's year.
  year?: number;
  // Leave the trailer out, e.g. when the page already embedded a video.
  skipTrailer?: boolean;
};

export type ScreenDetails = {
  workTitle?: string;
  trailer?: MediumJson & { videoTitle?: string };
  ratings: PinRatingJson[];
};

const REQUEST_TIMEOUT_MS = 8000;
const MAX_TRAILER_SEARCHES = 3;
// The scrape route has 120s in all, shared with the browser and references.
const DEFAULT_BUDGET_MS = 30000;
const USER_AGENT = `ChronopinBot/1.0 (+${siteUrl})`;

export async function findScreenDetails(query: ScreenQuery, budgetMs = DEFAULT_BUDGET_MS): Promise<ScreenDetails> {
  const signal = AbortSignal.timeout(budgetMs);
  const titles = titleCandidates(query);
  const details: ScreenDetails = { ratings: [] };
  if (!titles.length) return details;

  const isAnime = query.category?.toLowerCase() === 'anime';
  let anime: AniListMatch | undefined;
  let wikidata: WikidataMatch | undefined;

  for (const title of titles) {
    if (!wikidata) wikidata = await findWikidata(title, query.year, signal);
    // Anime films are filed under Movies; Wikidata's description says so.
    if (!anime && (isAnime || /\banime\b/i.test(wikidata?.description ?? ''))) {
      anime = await findAniList(title, query.year, signal);
    }
    if (anime || wikidata) {
      details.workTitle = title;
      break;
    }
  }

  if (anime) {
    if (anime.averageScore != null) {
      details.ratings.push({ source: 'AniList', score: anime.averageScore, scoreMax: 100, url: anime.siteUrl });
    }
    const mal = anime.idMal ? await findMyAnimeList(anime.idMal, signal) : undefined;
    if (mal) details.ratings.push(mal);
  }
  if (wikidata) details.ratings.push(...wikidata.ratings);

  if (!query.skipTrailer) {
    // The matched title first, else each guess in turn. AniList's listed
    // trailer is only a fallback: for older shows it is often a disc ad.
    const searchTitles = details.workTitle ? [details.workTitle] : titles.slice(0, MAX_TRAILER_SEARCHES);
    for (const title of searchTitles) {
      details.trailer = await findTrailer(title, query, signal);
      if (details.trailer) break;
    }
    if (!details.trailer && anime?.trailerId) details.trailer = await youtubeEmbed(anime.trailerId, signal);
  }
  return details;
}

/* Titles */

// Lowercase, no accents or punctuation, "&" as "and", ordinal seasons and
// parts as "season 2", and no leading "the" unless keepThe.
export function normalizeTitle(value: string, { keepThe = false } = {}): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/&/g, ' and ')
    .replace(/\b(\d+)(?:st|nd|rd|th) (season|part|cour)\b/g, '$2 $1')
    .replace(/'s\b/g, 's')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(keepThe ? /^$/ : /^the /, '');
}

const EVENT_PHRASE =
  /\s+(?:(?:finally|officially)\s+)?(?:premieres?|releases?|is released|opens?|arrives?|launches?|debuts?|swings into|returns?|hits|comes to|streams|set for|gets|trailer|coming to|lands)\b/gi;

// The work titles a pin's title could be naming, most likely first: a quoted
// title ("Michael Jackson Biopic 'Michael' Opens"), then the words before the
// event phrase, then that without a possessive credit ("Christopher Nolan's
// The Odyssey") or a trailing "Reboot".
export function titleCandidates({ workTitle, pinTitle }: Pick<ScreenQuery, 'workTitle' | 'pinTitle'>): string[] {
  const out: string[] = [];
  const add = (value: string | undefined | null) => {
    const title = value?.replace(/\s+/g, ' ').trim();
    if (title && title.length > 1 && !out.some((t) => normalizeTitle(t) === normalizeTitle(title))) out.push(title);
  };
  add(workTitle);
  if (!pinTitle) return out;

  // A season named outside the quotes still belongs to the quoted title.
  const titleSeason = seasonOf(normalizeTitle(pinTitle));
  const quoted = pinTitle.match(/['‘"“]([^'’"”]{2,})['’"”]/)?.[1];
  if (quoted) add(titleSeason && !seasonOf(normalizeTitle(quoted)) ? `${quoted} Season ${titleSeason}` : quoted);

  // An event word can be part of the name ("...Assassin Gets Reincarnated...
  // Season 2 Premieres"), so cut at each one, the last first. A cut that
  // would drop the season is not a guess at this work.
  const cuts = [...pinTitle.matchAll(EVENT_PHRASE)].map((m) => m.index!).reverse();
  if (!cuts.length) add(pinTitle); // No event phrase: the pin may be titled by the work alone.
  for (const cut of cuts) {
    const head = pinTitle.slice(0, cut).trim();
    if (titleSeason && !seasonOf(normalizeTitle(head))) continue;
    add(head);
    const bare = head.replace(/\s+(?:reboot|remake|movie|film)$/i, '');
    add(bare);
    add(bare.replace(/^(?:[A-Z][\w.-]*\s+){0,3}[\w.-]+['’]s\s+(?:[Ll]ive-[Aa]ction\s+)?/, ''));
  }
  return out;
}

const seasonOf = (normalized: string) => normalized.match(/\b(?:season|part) (\d+)\b/)?.[1];

/* YouTube */

export type VideoCandidate = { videoId: string; title: string; channel?: string; verified?: boolean };

const TRAILER_WORDS = /\b(?:trailer|teaser|pv|promo|preview|announcement)\b/;
const NOT_A_TRAILER =
  /\b(?:reaction|reacts?|review|breakdown|explained|recap|fan ?made|fanmade|concept|parody|gameplay|game|easter eggs|everything we know|analysis|amv)\b/;
const ROMAN_OR_NUMBER = /^(?:\d+|i|ii|iii|iv|v|vi|vii|viii|ix|x)$/;

// The search result most likely to be the work's own trailer, if any is.
export function pickTrailer(candidates: VideoCandidate[], workTitle: string): VideoCandidate | undefined {
  // "The One Piece" is not "One Piece", whatever the rating sites allow.
  const work = normalizeTitle(workTitle, { keepThe: true });
  const workSeason = seasonOf(work);
  let best: { candidate: VideoCandidate; score: number } | undefined;

  candidates.forEach((candidate, rank) => {
    const title = normalizeTitle(candidate.title, { keepThe: true });
    const at = ` ${title} `.indexOf(` ${work} `);
    if (at < 0) return;
    // Judged on the rest of the video title, so "Coyote vs. Acme" can still
    // have a trailer.
    const rest = `${title.slice(0, at)} ${title.slice(at + work.length)}`;
    if (!TRAILER_WORDS.test(rest) || NOT_A_TRAILER.test(rest)) return;
    // "Scream 6 Trailer" is not Scream 7's, and "Street Fighter 6" is a game.
    // Nor is "Violet Evergarden: the Movie" the series' trailer.
    const [next = '', afterNext = ''] = title.slice(at + work.length).trim().split(' ');
    if (ROMAN_OR_NUMBER.test(next) || /^(?:movie|film)$/.test(next) || (next === 'the' && /^(?:movie|film)$/.test(afterNext))) return;
    const season = seasonOf(workSeason ? title : rest);
    if (workSeason ? season !== workSeason : season && season !== '1') return;

    // Unverified channels are mostly re-uploads, which get taken down.
    if (!candidate.verified) return;
    const score = (/\bofficial\b/.test(title) ? 2 : 0) + (/\btrailer\b/.test(title) ? 1 : 0) - rank * 0.25;
    if (!best || score > best.score) best = { candidate, score };
  });
  return best?.candidate;
}

async function findTrailer(workTitle: string, query: ScreenQuery, signal: AbortSignal) {
  // The year tells a reboot's trailer from the original's.
  const withYear = query.year && query.category?.toLowerCase() !== 'anime' ? ` ${query.year}` : '';
  const candidates = await searchYouTube(`${workTitle} official trailer${withYear}`, signal);
  const picked = pickTrailer(candidates, workTitle);
  return picked ? youtubeEmbed(picked.videoId, signal, picked.title) : undefined;
}

// Video results from YouTube's search page (videos only, via its sp filter).
async function searchYouTube(query: string, signal: AbortSignal): Promise<VideoCandidate[]> {
  const html = await getText(
    `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`,
    signal,
    { 'Accept-Language': 'en-US,en;q=0.9', Cookie: 'CONSENT=YES+1' },
  );
  const json = html?.match(/var ytInitialData = (\{.*?\});<\/script>/s)?.[1];
  if (!json) return [];
  const found: VideoCandidate[] = [];
  try {
    JSON.parse(json, (key, value) => {
      if (key === 'videoRenderer' && value?.videoId) {
        found.push({
          videoId: value.videoId,
          title: value.title?.runs?.map((r: { text: string }) => r.text).join('') ?? '',
          channel: value.ownerText?.runs?.[0]?.text,
          verified: (value.ownerBadges ?? []).some((b: any) => /VERIFIED/.test(b?.metadataBadgeRenderer?.style ?? '')),
        });
      }
      return value;
    });
  } catch {
    return [];
  }
  // Reviver order is innermost-first, which keeps the page order here.
  return found.slice(0, 12);
}

// A YouTube medium from oEmbed, or undefined when the video is gone or its
// owner does not allow embedding.
async function youtubeEmbed(videoId: string, signal: AbortSignal, videoTitle?: string) {
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  const res = await getJson<{ html?: string; title?: string; author_name?: string; author_url?: string }>(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json&maxwidth=800&maxheight=450`,
    signal,
  );
  const originalUrl = res?.html?.match(/src="([^"?]+)/)?.[1];
  if (!res?.html || !originalUrl) return undefined;
  return {
    type: mediumID.youtube,
    html: res.html,
    originalUrl,
    authorName: res.author_name,
    authorUrl: res.author_url,
    videoTitle: videoTitle ?? res.title,
  };
}

// A still of a YouTube embed as an image medium, for pins with no picture of
// their own: some owners block embedding on other sites even when oEmbed
// allows it, and the pin page drops a medium that fails to render.
export function youtubeStill(embedUrl: string): MediumJson | undefined {
  const id = embedUrl.match(/\/embed\/([\w-]{6,})/)?.[1];
  return id ? { type: mediumID.image, originalUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` } : undefined;
}

/* AniList and MyAnimeList */

type AniListMatch = { averageScore?: number; siteUrl?: string; idMal?: number; trailerId?: string };

const ANILIST_QUERY = `query ($search: String) {
  Page(perPage: 10) {
    media(search: $search, type: ANIME) {
      title { romaji english }
      synonyms
      format
      startDate { year }
      averageScore
      siteUrl
      idMal
      trailer { id site }
    }
  }
}`;

async function findAniList(title: string, year: number | undefined, signal: AbortSignal): Promise<AniListMatch | undefined> {
  const res = await getJson<any>('https://graphql.anilist.co', signal, {}, { query: ANILIST_QUERY, variables: { search: title } });
  const work = normalizeTitle(title);
  const media: any[] = res?.data?.Page?.media ?? [];
  const match = media.find((m) => {
    const names = [m.title?.english, m.title?.romaji, ...(m.synonyms ?? [])].filter(Boolean).map((name: string) => normalizeTitle(name));
    return names.includes(work) && yearFits(m.startDate?.year, year);
  });
  if (!match) return undefined;
  return {
    averageScore: match.averageScore ?? undefined,
    siteUrl: match.siteUrl,
    idMal: match.idMal ?? undefined,
    trailerId: match.trailer?.site === 'youtube' ? match.trailer.id : undefined,
  };
}

async function findMyAnimeList(idMal: number, signal: AbortSignal): Promise<PinRatingJson | undefined> {
  const res = await getJson<any>(`https://api.jikan.moe/v4/anime/${idMal}`, signal);
  const score = res?.data?.score;
  return typeof score === 'number' ? { source: 'MyAnimeList', score, scoreMax: 10, url: res.data.url || `https://myanimelist.net/anime/${idMal}` } : undefined;
}

/* Wikidata */

type WikidataMatch = { description?: string; ratings: PinRatingJson[] };

// Wikidata items for review sites (P447 "review score by"), and how to link
// to the work on each from its identifier property.
// idColumn is the query's variable for that identifier (IMDb P345, Rotten
// Tomatoes P1258, Metacritic P1712); method keeps the critics' score over an
// audience one when the statement says which it is.
const REVIEW_SITES: Record<string, { source: string; idColumn: string; url: (id: string) => string; method?: RegExp }> = {
  Q37312: { source: 'IMDb', idColumn: 'imdb', url: (id) => `https://www.imdb.com/title/${id}/` },
  Q105584: { source: 'Rotten Tomatoes', idColumn: 'rt', url: (id) => `https://www.rottentomatoes.com/${id}`, method: /tomatometer/i },
  Q150248: { source: 'Metacritic', idColumn: 'mc', url: (id) => `https://www.metacritic.com/${id}/`, method: /metascore/i },
};

const SCREEN_DESCRIPTION = /\b(?:film|movie|television|tv|series|anime|animated|miniseries|ova|season)\b/i;

async function findWikidata(title: string, year: number | undefined, signal: AbortSignal): Promise<WikidataMatch | undefined> {
  const search = await getJson<any>(
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&uselang=en&type=item&limit=10&search=${encodeURIComponent(title)}`,
    signal,
  );
  const work = normalizeTitle(title);
  const ids: string[] = (search?.search ?? [])
    .filter((s: any) => SCREEN_DESCRIPTION.test(s.description ?? '') && [s.label, s.match?.text].some((t) => t && normalizeTitle(t) === work))
    .map((s: any) => s.id)
    .filter((id: string) => /^Q\d+$/.test(id));
  if (!ids.length) return undefined;

  const sparql = `SELECT ?item ?description ?year ?score ?by ?methodLabel ?date ?rank ?imdb ?rt ?mc WHERE {
    VALUES ?item { ${ids.map((id) => `wd:${id}`).join(' ')} }
    OPTIONAL { ?item schema:description ?description FILTER(LANG(?description) = "en") }
    OPTIONAL { ?item wdt:P577 ?published BIND(YEAR(?published) AS ?year) }
    OPTIONAL { ?item wdt:P345 ?imdb } OPTIONAL { ?item wdt:P1258 ?rt } OPTIONAL { ?item wdt:P1712 ?mc }
    OPTIONAL {
      ?item p:P444 ?st . ?st ps:P444 ?score ; pq:P447 ?by ; wikibase:rank ?rank .
      FILTER(?rank != wikibase:DeprecatedRank)
      OPTIONAL { ?st pq:P459 ?method } OPTIONAL { ?st pq:P585 ?date }
    }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  }`;
  const res = await getJson<any>(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`, signal, {
    Accept: 'application/sparql-results+json',
  });
  const rows: any[] = (res?.results?.bindings ?? []).map((b: any) => Object.fromEntries(Object.entries(b).map(([k, v]: [string, any]) => [k, v.value])));

  // Search order is relevance order; the first item whose year fits wins.
  for (const id of ids) {
    const itemRows = rows.filter((r) => r.item.endsWith(`/${id}`));
    if (!itemRows.length) continue;
    const years = itemRows.map((r) => Number(r.year)).filter(Number.isFinite);
    const description = itemRows[0].description as string | undefined;
    if (!yearFits(years.length ? Math.min(...years) : undefined, year, /\b(?:series|anime|television)\b/i.test(description ?? ''))) continue;
    return { description, ratings: wikidataRatings(itemRows) };
  }
  return undefined;
}

type WikidataRow = { by?: string; score?: string; methodLabel?: string; rank?: string; date?: string; [column: string]: string | undefined };

export function wikidataRatings(rows: WikidataRow[]): PinRatingJson[] {
  const ratings: PinRatingJson[] = [];
  const preferred = (r: WikidataRow) => Number(!!r.rank?.endsWith('PreferredRank'));
  for (const [qid, site] of Object.entries(REVIEW_SITES)) {
    const statements = rows
      .filter((r) => r.by?.endsWith(`/${qid}`) && (!site.method || !r.methodLabel || site.method.test(r.methodLabel)))
      .map((r) => ({ row: r, parsed: parseScore(r.score ?? '') }))
      .filter((s) => s.parsed)
      // Preferred rank, then the newest.
      .sort((a, b) => preferred(b.row) - preferred(a.row) || (b.row.date ?? '').localeCompare(a.row.date ?? ''));
    const best = statements[0];
    if (!best?.parsed) continue;
    const id = rows.find((r) => r[site.idColumn])?.[site.idColumn];
    ratings.push({ source: site.source, ...best.parsed, ...(id ? { url: site.url(id) } : {}) });
  }
  return ratings;
}

// "93%" -> 93/100, "8.2/10", "90/100", "4.5/5".
export function parseScore(value: string): { score: number; scoreMax: number } | undefined {
  const percent = value.match(/^\s*(\d+(?:\.\d+)?)\s*%\s*$/);
  if (percent) return { score: Number(percent[1]), scoreMax: 100 };
  const outOf = value.match(/^\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*$/);
  if (outOf && Number(outOf[2]) > 0 && Number(outOf[1]) <= Number(outOf[2])) {
    return { score: Number(outOf[1]), scoreMax: Number(outOf[2]) };
  }
  return undefined;
}

// A film must come out within a year of the pin; a series may have started
// any time before (a pin about a later season), but not after.
export function yearFits(workYear: number | undefined, pinYear: number | undefined, isSeries = false): boolean {
  if (!workYear || !pinYear) return true;
  return isSeries ? workYear <= pinYear + 1 : Math.abs(workYear - pinYear) <= 1;
}

/* HTTP */

async function getText(url: string, budget: AbortSignal, headers: Record<string, string> = {}, body?: unknown) {
  try {
    const res = await fetch(url, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        'User-Agent': /youtube\.com/.test(url) ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' : USER_AGENT,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json', Accept: 'application/json' }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.any([budget, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]),
    });
    if (!res.ok) {
      if (res.status !== 404 && res.status !== 401) log.warn('screen lookup', res.status, url.slice(0, 120));
      return undefined;
    }
    return await res.text();
  } catch (err) {
    log.warn('screen lookup failed', url.slice(0, 120), (err as Error).message);
    return undefined;
  }
}

async function getJson<T>(url: string, budget: AbortSignal, headers: Record<string, string> = {}, body?: unknown): Promise<T | undefined> {
  const text = await getText(url, budget, headers, body);
  if (!text) return undefined;
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}
