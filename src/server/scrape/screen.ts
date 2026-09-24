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
 *   anime. Looking MAL up by id avoids a second fuzzy title search. Both also
 *   say how many episodes the work has, as does Wikidata (P1113).
 * - Wikidata's review-score statements for IMDb, Rotten Tomatoes and
 *   Metacritic. imdb.com itself answers scripts with a bot challenge.
 * - Where to watch it (Netflix, Crunchyroll, HBO Max...): AniList's streaming
 *   links for anime, and the services' identifier properties on the Wikidata
 *   item for everything. Neither says which country a title streams in.
 *
 * A work only counts as found when one of its titles matches exactly (after
 * normalising case, punctuation and "2nd Season"/"Season 2") and its year
 * fits the pin's, so a pin about a reboot never gets the original's scores.
 * Any source that fails or finds nothing is skipped; nothing here throws.
 */

import { mediumID, siteUrl } from '@/lib/appConfig';
import { categoryList, firstCategoryOf, hasCategory } from '@/lib/categories';
import { streamingMerchants } from '@/lib/streaming';
import type { EpisodeStatus, MediumJson, MerchantJson, PinRatingJson } from '@/lib/types';
import log from '../util/log';

export const SCREEN_CATEGORIES = ['Anime', 'Movie', 'TV'];

// The ones released in episodes, so the only ones an episode count belongs to:
// a film has none, and a title search that lands on the series of the same
// name ("Supergirl", "Masters of the Universe") would otherwise give the film
// pin the series' episodes.
const EPISODIC_CATEGORIES = ['Anime', 'TV'];

// One category or a pin's list of them.
export function isScreenCategory(categories: string | readonly (string | null | undefined)[] | null | undefined): boolean {
  return hasCategory(categoryList(categories), SCREEN_CATEGORIES);
}

// The one category a lookup goes by, of the ones a pin carries: an anime film
// is Anime and Movie both, and it is the film that says how the work is looked
// up (no episodes, Rotten Tomatoes over a season), so Movie wins. `also` adds
// the non-screen categories a caller looks up too, e.g. a game's.
export function workCategory(
  categories: string | readonly (string | null | undefined)[] | null | undefined,
  also: readonly string[] = [],
): string | undefined {
  return firstCategoryOf(categories, ['Movie']) ?? firstCategoryOf(categories, [...SCREEN_CATEGORIES, ...also]);
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
  // The work's MyAnimeList id, when a link on the pin gives one: the episode
  // count is then looked up by id rather than by title.
  malId?: number;
  // Who made or licensed the work, when the pin names one: the studio's own
  // channel is what a trailer search should be picking out of its results.
  company?: string | null;
};

export type ScreenEpisodes = { episodeCount: number; episodeStatus: EpisodeStatus };

export type ScreenDetails = {
  workTitle?: string;
  trailer?: MediumJson & { videoTitle?: string };
  ratings: PinRatingJson[];
  // How many episodes the matched work has, for a series or anime; absent for
  // a film and for anything whose count no source gives.
  episodes?: ScreenEpisodes;
  // What the work was adapted from, as a tag ("Manga", "Light Novel",
  // "Original"), from AniList's source field. Absent when AniList has no
  // entry, says nothing, or says something that tags a pin with nothing
  // worth searching (see adaptationTag).
  adaptedFrom?: string;
  // Streaming services carrying the work, as merchants labelled with the
  // service (src/lib/streaming.ts), one per service.
  streaming: MerchantJson[];
};

const REQUEST_TIMEOUT_MS = 8000;
// How long a 429's Retry-After may ask for before the lookup gives up.
const MAX_RETRY_WAIT_S = 70;
const MAX_TRAILER_SEARCHES = 3;
// The scrape route has 120s in all, shared with the browser and references.
const DEFAULT_BUDGET_MS = 30000;
const USER_AGENT = `ChronopinBot/1.0 (+${siteUrl})`;

export async function findScreenDetails(query: ScreenQuery, budgetMs = DEFAULT_BUDGET_MS): Promise<ScreenDetails> {
  const signal = AbortSignal.timeout(budgetMs);
  const titles = titleCandidates(query);
  const details: ScreenDetails = { ratings: [], streaming: [] };
  if (!titles.length) return details;

  const isAnime = query.category?.toLowerCase() === 'anime';
  // No category at all still counts as episodic: only a stated film is not.
  const isEpisodic = !query.category || hasCategory([query.category], EPISODIC_CATEGORIES);
  // A cited MyAnimeList id names the work outright, so it is settled first,
  // in one request: the score, the episode count and what the work was adapted
  // from, all without a title match. Before the title searches and not after,
  // because a pin that cites an id is usually a pin whose title matches
  // nothing - a season, an arc, a recap, a donghua - so those searches are
  // going to fail *and* spend the budget. Pin 1241's by-id lookup used to run
  // last and was aborted mid-flight after Wikidata had eaten its 60 seconds,
  // leaving a pin with no score that AniList could answer for in one call.
  const cited = query.malId ? await aniListByMalId(query.malId, signal).catch(() => undefined) : undefined;
  // AniList knows nearly every MAL id, so Jikan is the fallback for a show it
  // leaves open rather than for a missing entry.
  if (isEpisodic && query.malId) {
    details.episodes = cited?.episodes ?? (await findMyAnimeList(query.malId, signal).catch(() => undefined))?.episodes;
  }
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
    details.adaptedFrom = anime.source;
    const mal = anime.idMal ? await findMyAnimeList(anime.idMal, signal) : undefined;
    if (mal?.rating) details.ratings.push(mal.rating);
    // AniList first: its counts are the better kept-up ones, and Jikan often
    // times out. Wikidata only for what neither knew (a long-running series
    // whose total AniList leaves open).
    if (isEpisodic) details.episodes ??= anime.episodes ?? mal?.episodes ?? undefined;
  }
  // What the cited id already answered, for the pins no title search could
  // place: their score and their adaptation source come from it rather than
  // from a match. Only when the title search found neither, so a work matched
  // by name keeps the entry that was matched.
  if (!details.ratings.some((r) => r.source === 'AniList') && cited?.averageScore != null) {
    details.ratings.push({ source: 'AniList', score: cited.averageScore, scoreMax: 100, url: cited.siteUrl });
  }
  details.adaptedFrom ??= cited?.source;
  if (isEpisodic) details.episodes ??= cited?.episodes;
  // AniList does not list every work MyAnimeList does - doujin productions
  // above all ("Gensou Mangekyou", which 404s there by id and by title), so
  // without this a pin citing its own MyAnimeList page gets no score at all
  // when AniList has no entry to match.
  if (query.malId && !details.ratings.some((r) => r.source === 'MyAnimeList')) {
    const cited = await findMyAnimeList(query.malId, signal).catch(() => undefined);
    if (cited?.rating) details.ratings.push(cited.rating);
    if (isEpisodic) details.episodes ??= cited?.episodes;
  }
  // AniList's links first (they carry the title's page, slug and all), then
  // whatever services only Wikidata knows. A cited id's links only when no
  // title matched, as with its score above.
  // Wikidata's title search is loose about kind: the 2026 Supergirl film
  // matched the 2015 series and would have linked to its Netflix page. Its
  // links count only when the item is not plainly the other kind of work: a
  // series for a Movie pin, or a film for a TV one. Anime is either, so an
  // Anime pin takes both (Your Name. is an Anime pin and a film).
  const isFilmItem = /\b(?:film|movie)\b/i.test(wikidata?.description ?? '');
  const category = query.category?.toLowerCase();
  const wrongKind = (category === 'movie' && !isFilmItem) || (category === 'tv' && isFilmItem);
  const wikidataLinks = wrongKind ? [] : (wikidata?.streamingUrls ?? []);
  details.streaming = streamingMerchants([...(anime ?? cited)?.streamingUrls ?? [], ...wikidataLinks]);
  // A season is watched on the show's own page, and Wikidata's season items
  // (where there is one to match) carry no streaming ids: "Yellowjackets
  // Season 4" is streamed as Yellowjackets. Only the links come from the
  // show's item - its scores and episode count are not the season's.
  if (!details.streaming.length && !anime && !cited && isEpisodic) {
    const show = titles.map((t) => withoutSeason(t)).find((t): t is string => !!t);
    const series = show ? await findWikidata(show, undefined, signal, { series: true }) : undefined;
    details.streaming = streamingMerchants(series?.streamingUrls ?? []);
  }
  if (wikidata) {
    details.ratings.push(...wikidata.ratings);
    // Wikidata's search is the loosest of the three, so its count is only
    // taken when the item it matched is not described as a film.
    if (isEpisodic && !/\b(?:film|movie)\b/i.test(wikidata.description ?? '')) details.episodes ??= wikidata.episodes;
  }

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

// The show a season title names: "Yellowjackets Season 4" -> "Yellowjackets",
// "Frieren 2nd Season" -> "Frieren". Undefined for a title with no season.
export function withoutSeason(title: string): string | undefined {
  const show = title
    .replace(/[\s:,-]*\b(?:season|series|part) \d+\b.*$/i, '')
    .replace(/[\s:,-]*\b\d+(?:st|nd|rd|th) (?:season|part)\b.*$/i, '')
    .trim();
  return show && show !== title.trim() ? show : undefined;
}

/* YouTube */

export type VideoCandidate = { videoId: string; title: string; channel?: string; verified?: boolean };

const TRAILER_WORDS = /\b(?:trailer|teaser|pv|promo|preview|announcement)\b/;
// Somebody talking about the work rather than the work's own video: out of
// both searches below.
const COMMENTARY =
  /\b(?:reaction|reacts?|review|breakdown|explained|recap|fan ?made|fanmade|concept|parody|easter eggs|everything we know|analysis|amv|tutorial|walkthrough|lets play|speedrun|news update|cup|tournament|championship|esports|livestream|highlights|grand final|and more|looking back|rewind|retrospective|years later|history of)\b/;
// A film or show's trailer is never a game video, but a game's own
// announcement almost always is ("Season of Hell's Legacy | Gameplay
// Trailer"), so only the screen search rules these out. Ruling them out of the
// product search as well left every game pin with no video at all.
const A_GAME_VIDEO = /\b(?:gameplay|game)\b/;
const NOT_A_TRAILER = (title: string) => COMMENTARY.test(title) || A_GAME_VIDEO.test(title);
const ROMAN_OR_NUMBER = /^(?:\d+|i|ii|iii|iv|v|vi|vii|viii|ix|x)$/;

// The generic words a channel that carries everybody's trailers is named out
// of. Whoever actually made the work is named after itself instead - "TOHO
// animation", "Crunchyroll", "Muse Asia", "ONE PIECE Official" - so a channel
// name built from nothing but these is a re-upload feed. Written without word
// boundaries because the names run together ("AnimeSelect").
const CHANNEL_FILLER =
  /(?:anime|animation|cartoons?|movies?|films?|cinemas?|trailers?|teasers?|clips?|videos?|tv|hd|4k|world|select|selection|hub|zone|central|daily|network|media|channel|studios?|official|best|top|new|all|fan|fans|otaku|plus|and|the|of)/;
const AGGREGATOR_CHANNEL = new RegExp(`^(?:${CHANNEL_FILLER.source} ?)+$`);
// Enough to beat the whole rank spread below, so who published a video
// outranks where YouTube put it: an aggregator's upload is verified too, and
// took the pick twice in one day (AnimeSelect, Anime World) from the studio
// channel a few results further down.
const OWN_CHANNEL = 3;

// +3 for the work's own, its studio's or its licensor's channel, -3 for an
// aggregator, 0 for a channel this cannot tell apart. The aggregator test
// comes first because a filler word is sometimes the work's as well ("World
// Trigger" against "Anime World"), and the channel is an aggregator either
// way.
function channelScore(channel: string | undefined, workWords: string[], company?: string | null): number {
  const name = normalizeTitle(channel ?? '', { keepThe: true });
  if (!name) return 0;
  if (AGGREGATOR_CHANNEL.test(name)) return -OWN_CHANNEL;
  const firm = company ? normalizeTitle(company, { keepThe: true }).split(' ')[0] : '';
  const names = workWords.some((w) => w.length > 2 && name.includes(w)) || (firm.length > 2 && name.includes(firm));
  return names ? OWN_CHANNEL : 0;
}

// The search result most likely to be the work's own trailer, if any is.
export function pickTrailer(candidates: VideoCandidate[], workTitle: string, company?: string | null): VideoCandidate | undefined {
  // "The One Piece" is not "One Piece", whatever the rating sites allow.
  const work = normalizeTitle(workTitle, { keepThe: true });
  const workSeason = seasonOf(work);
  const workWords = distinctiveWords(workTitle);
  let best: { candidate: VideoCandidate; score: number } | undefined;

  candidates.forEach((candidate, rank) => {
    const title = normalizeTitle(candidate.title, { keepThe: true });
    const at = ` ${title} `.indexOf(` ${work} `);
    if (at < 0) return;
    // Judged on the rest of the video title, so "Coyote vs. Acme" can still
    // have a trailer.
    const rest = `${title.slice(0, at)} ${title.slice(at + work.length)}`;
    if (!TRAILER_WORDS.test(rest) || NOT_A_TRAILER(rest)) return;
    // "Scream 6 Trailer" is not Scream 7's, and "Street Fighter 6" is a game.
    // Nor is "Violet Evergarden: the Movie" the series' trailer.
    const [next = '', afterNext = ''] = title.slice(at + work.length).trim().split(' ');
    if (ROMAN_OR_NUMBER.test(next) || /^(?:movie|film)$/.test(next) || (next === 'the' && /^(?:movie|film)$/.test(afterNext))) return;
    const season = seasonOf(workSeason ? title : rest);
    if (workSeason ? season !== workSeason : season && season !== '1') return;

    // Unverified channels are mostly re-uploads, which get taken down.
    if (!candidate.verified) return;
    const score =
      (/\bofficial\b/.test(title) ? 2 : 0)
      + (/\btrailer\b/.test(title) ? 1 : 0)
      + channelScore(candidate.channel, workWords, company)
      - rank * 0.25;
    if (!best || score > best.score) best = { candidate, score };
  });
  return best?.candidate;
}

// Words that are the headline's furniture rather than the thing's name, so
// that the overlap below is measured on what the pin is about. Half of these
// pins are titled "<Game> Review - IGN", and counting "review" and "ign" as
// words the video has to carry put a real trailer at 3/5 - the same score a
// sibling product's trailer gets.
const VIDEO_STOPWORDS = new Set(
  ('a an and at for from in is of on the to with begin begins shipping launch launches launched opens opened release released reveal keynote first new next now on sale gets approved by'
    + ' review reviews preview previews hands news update report ign gamespot coming arrive arrives will confirmed announced').split(' '),
);
// A one-character word is noise ("a", "x") except when it is which one this
// is: dropping the V of "Diablo V Launches" left "diablo" as the whole of the
// pin's name, and Diablo III's trailer matched it in full.
const distinctiveWords = (text: string) =>
  normalizeTitle(text, { keepThe: true })
    .split(' ')
    .filter((w) => (w.length > 1 || /^[0-9ivx]$/.test(w)) && !VIDEO_STOPWORDS.has(w));

// What a product's own video calls itself. Narrower than TRAILER_WORDS, which
// the screen search uses: a film's "preview" is its trailer, but a game's is
// the press playing it early ("The Final Preview", "Exclusive Hands-On
// Preview - IGN First"), which is somebody's coverage, not the announcement.
const ANNOUNCES = /\b(?:trailer|teaser|promo|announce|announces|announcement|reveal|reveals|unveil|unveils)\b/;

// How much of the pin's distinctive title a candidate must carry. At 0.6 a
// sibling product gets in on the shared part of the name: the Spiritborn class
// trailer carries three of the five words of "Diablo IV Amazon Class Pack
// Launches", and is a different class pack.
const MIN_TITLE_OVERLAP = 0.7;

// A year in the video's title that is not the pin's year: the pin about the
// 2017 StarCraft Remastered launch was offered "BlizzCon 2026 | Classic Cup:
// StarCraft Remastered", which carries both its words and is an esports match
// nine years later. A title naming no year says nothing either way.
// A re-release is its own product: the pin about Elden Ring's 2022 launch was
// offered the "Elden Ring: Tarnished Edition - Official Story Trailer", four
// years later. Only one way round - a pin that says "Remastered" is entitled to
// the remaster's trailer.
const EDITION =
  /\b(?:edition|remaster|remastered|remake|definitive|complete|goty|anniversary|deluxe|ultimate|collection)\b/;

function wrongYear(title: string, year?: number): boolean {
  if (!year) return false;
  const years = [...title.matchAll(/\b(19|20)\d{2}\b/g)].map((m) => Number(m[0]));
  return years.length > 0 && !years.some((y) => Math.abs(y - year) <= 1);
}

// The search result most likely to be an official or press video of a product
// or announcement that is not a screen work: from a verified channel, most of
// the pin's distinctive words in its title, and not a reaction, review or
// "everything we know" video. A channel named after the company wins.
export function pickProductVideo(
  candidates: VideoCandidate[],
  subject: { title: string; company?: string | null; year?: number },
): VideoCandidate | undefined {
  const words = distinctiveWords(subject.title);
  if (!words.length) return undefined;
  const company = subject.company ? normalizeTitle(subject.company).split(' ')[0] : '';
  let best: { candidate: VideoCandidate; score: number } | undefined;
  candidates.forEach((candidate, rank) => {
    if (!candidate.verified) return;
    const title = ` ${normalizeTitle(candidate.title, { keepThe: true })} `;
    if (COMMENTARY.test(title) || /\b(?:leak|leaked|rumou?rs?|vs)\b/.test(title)) return;
    const overlap = words.filter((w) => title.includes(` ${w} `)).length / words.length;
    // Half the words is too little: "Diablo III: Gameplay Trailer" shares
    // exactly half of "Diablo III Reaper of Souls Launches" and is the base
    // game's trailer, not the expansion's.
    if (overlap < MIN_TITLE_OVERLAP) return;
    // The pin's leading distinctive word is what the thing is called, and a
    // video that never says it is about something else: pin 384, "Razer x Xbox
    // 25th Anniversary Collection", carries three of its five words into "Xbox
    // 25th Anniversary Console - Official Pre-Order Trailer", a different
    // product. The cost is an abbreviated name ("PlayStation 5" against a video
    // that says PS5), which loses a video rather than hanging a wrong one.
    if (!title.includes(` ${words[0]} `)) return;
    const ownChannel = company && normalizeTitle(candidate.channel ?? '').includes(company) ? 1 : 0;
    // Either the video announces the thing, or it comes from whoever makes it.
    // Anything else that survives the filters above is a channel covering the
    // news ("Xbox One Japan Release Date Finally Revealed") rather than the
    // announcement itself.
    if (!ownChannel && !ANNOUNCES.test(title)) return;
    if (wrongYear(title, subject.year)) return;
    if (EDITION.test(title) && !EDITION.test(` ${normalizeTitle(subject.title, { keepThe: true })} `)) return;
    const score = overlap + ownChannel - rank * 0.05;
    if (!best || score > best.score) best = { candidate, score };
  });
  return best?.candidate;
}

// A video for a pin that is not a screen work (a product, a launch, an
// announcement): YouTube search, then oEmbed so a video that cannot be
// embedded is skipped. Undefined when nothing passes.
export async function findProductVideo(
  subject: { title: string; company?: string | null; year?: number },
  signal: AbortSignal = AbortSignal.timeout(15000),
) {
  try {
    const query = [subject.company, subject.title].filter(Boolean).join(' ');
    const picked = pickProductVideo(await searchYouTube(query, signal), subject);
    return picked ? await youtubeEmbed(picked.videoId, signal, picked.title) : undefined;
  } catch (err) {
    log.warn('product video lookup failed:', (err as Error).message);
    return undefined;
  }
}

async function findTrailer(workTitle: string, query: ScreenQuery, signal: AbortSignal) {
  // The year tells a reboot's trailer from the original's.
  const withYear = query.year && query.category?.toLowerCase() !== 'anime' ? ` ${query.year}` : '';
  const candidates = await searchYouTube(`${workTitle} official trailer${withYear}`, signal);
  const picked = pickTrailer(candidates, workTitle, query.company);
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

type AniListMatch = {
  averageScore?: number;
  siteUrl?: string;
  idMal?: number;
  trailerId?: string;
  episodes?: ScreenEpisodes;
  source?: string;
  streamingUrls?: string[];
};

// AniList's links of type STREAMING that are still up, e.g. the work's
// Crunchyroll series page. Which of them are shown is src/lib/streaming.ts's call.
export function aniListStreamingUrls(links: unknown): string[] {
  if (!Array.isArray(links)) return [];
  return links.filter((l) => l?.type === 'STREAMING' && !l.isDisabled && typeof l.url === 'string').map((l) => l.url as string);
}


const ANILIST_QUERY = `query ($search: String) {
  Page(perPage: 10) {
    media(search: $search, type: ANIME) {
      title { romaji english }
      synonyms
      format
      status
      episodes
      nextAiringEpisode { episode }
      startDate { year }
      averageScore
      siteUrl
      idMal
      source
      trailer { id site }
      externalLinks { url type isDisabled }
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
    episodes: aniListEpisodes(match),
    source: adaptationTag(match.source),
    streamingUrls: aniListStreamingUrls(match.externalLinks),
  };
}

// AniList's `source` as a tag a reader would search: what the anime was made
// out of. The enum carries three values worth no tag - ANIME (an anime made
// from an anime says nothing a pin does not already say), OTHER (which is the
// category this project never files anything under) and a value added to the
// enum since - so those are left off rather than guessed at.
//
// Each name carries "Adaptation" rather than standing as the bare medium,
// because `Manga` is a category name (src/lib/categories.ts) and `tagKind`
// files any tag by that name as a category: the bare tag was dropped on save,
// silently, for the commonest source of the lot. Naming the whole family the
// same way keeps the cloud consistent and leaves the `Manga` category meaning
// a pin about manga rather than the several hundred anime made from one.
const ADAPTATION_TAGS: Record<string, string> = {
  ORIGINAL: 'Original Work',
  MANGA: 'Manga Adaptation',
  LIGHT_NOVEL: 'Light Novel Adaptation',
  VISUAL_NOVEL: 'Visual Novel Adaptation',
  NOVEL: 'Novel Adaptation',
  WEB_NOVEL: 'Web Novel Adaptation',
  VIDEO_GAME: 'Game Adaptation',
  GAME: 'Game Adaptation',
  DOUJINSHI: 'Doujinshi Adaptation',
  COMIC: 'Comic Adaptation',
  LIVE_ACTION: 'Live Action Adaptation',
  PICTURE_BOOK: 'Picture Book Adaptation',
  MULTIMEDIA_PROJECT: 'Multimedia Adaptation',
};

export function adaptationTag(source: unknown): string | undefined {
  return typeof source === 'string' ? ADAPTATION_TAGS[source.toUpperCase()] : undefined;
}

// AniList's count for an entry: its announced total (still "planned" while the
// show is airing or yet to air), else how many have gone out, which is one
// before the episode it says airs next. A film is one "episode" and a work
// with a single episode has no count worth showing, so both are left out.
export function aniListEpisodes(media: {
  format?: string | null;
  status?: string | null;
  episodes?: number | null;
  nextAiringEpisode?: { episode?: number | null } | null;
}): ScreenEpisodes | undefined {
  if (media.format === 'MOVIE') return undefined;
  const total = Number(media.episodes);
  if (Number.isInteger(total) && total > 1) {
    return { episodeCount: total, episodeStatus: media.status === 'FINISHED' ? 'complete' : 'planned' };
  }
  const next = Number(media.nextAiringEpisode?.episode);
  if (Number.isInteger(next) && next > 2) return { episodeCount: next - 1, episodeStatus: 'ongoing' };
  return undefined;
}

// The MyAnimeList id a pin's links carry, from the first myanimelist.net
// link among them.
export function malIdOf(urls: (string | null | undefined)[]): number | undefined {
  for (const url of urls) {
    const id = url?.match(/myanimelist\.net\/anime\/(\d+)/)?.[1];
    if (id) return Number(id);
  }
  return undefined;
}

const ANILIST_BY_MAL_QUERY = `query ($idMal: Int) {
  Media(idMal: $idMal, type: ANIME) {
    format
    status
    episodes
    nextAiringEpisode { episode }
    averageScore
    siteUrl
    source
    externalLinks { url type isDisabled }
  }
}`;

// AniList's entry for a MyAnimeList id: the score, the link, what the work was
// adapted from and how many episodes it has, with **no title match involved**.
// This is the route for a pin whose title no catalogue search can find - a
// Chinese donghua ("Tunshi Xingkong 4th Season"), an arc or a recap film - and
// it is the only one left when Jikan is down, which it routinely is (1,036
// 504s in one 943-pin run). AniList carries most MAL ids but not all, so an
// empty answer is an absent entry rather than an error.
async function aniListByMalId(idMal: number, signal: AbortSignal): Promise<AniListMatch | undefined> {
  const res = await getJson<any>('https://graphql.anilist.co', signal, {}, { query: ANILIST_BY_MAL_QUERY, variables: { idMal } });
  const media = res?.data?.Media;
  if (!media) return undefined;
  return {
    averageScore: media.averageScore ?? undefined,
    siteUrl: media.siteUrl,
    idMal,
    episodes: aniListEpisodes(media),
    source: adaptationTag(media.source),
    streamingUrls: aniListStreamingUrls(media.externalLinks),
  };
}

async function findMyAnimeList(idMal: number, signal: AbortSignal): Promise<{ rating?: PinRatingJson; episodes?: ScreenEpisodes } | undefined> {
  const res = await getJson<any>(`https://api.jikan.moe/v4/anime/${idMal}`, signal);
  if (!res?.data) return undefined;
  const score = res.data.score;
  return {
    rating: typeof score === 'number' ? { source: 'MyAnimeList', score, scoreMax: 10, url: res.data.url || `https://myanimelist.net/anime/${idMal}` } : undefined,
    episodes: malEpisodes(res.data),
  };
}

// MyAnimeList's count, the same reading as AniList's: "Finished Airing" is the
// whole run, anything else is the total announced so far.
export function malEpisodes(data: { type?: string | null; status?: string | null; episodes?: number | null }): ScreenEpisodes | undefined {
  if (/movie/i.test(data.type ?? '')) return undefined;
  const total = Number(data.episodes);
  if (!Number.isInteger(total) || total < 2) return undefined;
  return { episodeCount: total, episodeStatus: /finished/i.test(data.status ?? '') ? 'complete' : 'planned' };
}

/* Wikidata */

type WikidataMatch = { description?: string; ratings: PinRatingJson[]; episodes?: ScreenEpisodes; streamingUrls: string[] };

// Streaming services' identifier properties and the title page each id opens
// (the property's own formatter URL, P1630). Paramount+ has only a per-video
// id (P13147), which is an episode rather than the work, so it is not here;
// Crunchyroll's older P4110 is deprecated in favour of the series id.
const STREAMING_PROPERTIES: Record<string, (id: string) => string> = {
  P1874: (id) => `https://www.netflix.com/title/${id}`,
  P11330: (id) => `https://www.crunchyroll.com/series/${id}`,
  // The formatter's play.hbomax.com redirects here, the public title page.
  P8298: (id) => `https://www.hbomax.com/${id}`,
  P7595: (id) => `https://www.disneyplus.com/movies/wd/${id}`,
  P7596: (id) => `https://www.disneyplus.com/series/wp/${id}`,
  P6466: (id) => `https://www.hulu.com/movie/${id}`,
  P6467: (id) => `https://www.hulu.com/series/${id}`,
  P14440: (id) => `https://www.primevideo.com/detail/${id}`,
  P8055: (id) => `https://www.amazon.com/gp/video/detail/${id}`,
  P9586: (id) => `https://tv.apple.com/movie/${id}`,
  P9751: (id) => `https://tv.apple.com/show/${id}`,
  P11815: (id) => `https://www.peacocktv.com/stream-${id}`,
};

// Prime Video's ids are an ASIN ("B0B8TR8Y2K") or a title id
// ("0FCJEHY4FXTDVCLZ5NR9A0N42N"). Wikidata has others that 404 - Grey's
// Anatomy's P8055 was "1636211884", a book's ISBN.
const PRIME_VIDEO_ID = /^(?:B0[A-Z0-9]{8}|[A-Z0-9]{20,})$/;
const ID_CHECKS: Record<string, RegExp> = { P8055: PRIME_VIDEO_ID, P14440: PRIME_VIDEO_ID };

// The title pages an item's streaming ids open, in the order above, from the
// item's claims as wbgetentities gives them (deprecated statements left out).
export function wikidataStreamingUrls(claims: Record<string, any[]> | undefined): string[] {
  return Object.entries(STREAMING_PROPERTIES).flatMap(([property, url]) =>
    (claims?.[property] ?? [])
      .map((c) => (c?.rank !== 'deprecated' ? c?.mainsnak?.datavalue?.value : undefined))
      .filter((id): id is string => typeof id === 'string' && (!ID_CHECKS[property] || ID_CHECKS[property].test(id)))
      .map((id) => url(encodeURI(id))),
  );
}

// The entity API rather than SPARQL: one item's claims come back at once, and
// the query service times out on a busy day where this does not.
async function findWikidataStreaming(id: string, signal: AbortSignal): Promise<string[]> {
  const res = await getJson<any>(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims&ids=${id}`, signal);
  return wikidataStreamingUrls(res?.entities?.[id]?.claims);
}

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
const SERIES_DESCRIPTION = /\b(?:television|tv|web|anime|streaming) series\b/i;

// series: only an item described as a series, for the show a season belongs to.
async function findWikidata(title: string, year: number | undefined, signal: AbortSignal, { series = false } = {}): Promise<WikidataMatch | undefined> {
  const search = await getJson<any>(
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&uselang=en&type=item&limit=10&search=${encodeURIComponent(title)}`,
    signal,
  );
  const work = normalizeTitle(title);
  const ids: string[] = (search?.search ?? [])
    .filter((s: any) => (series ? SERIES_DESCRIPTION : SCREEN_DESCRIPTION).test(s.description ?? '') && [s.label, s.match?.text].some((t) => t && normalizeTitle(t) === work))
    .map((s: any) => s.id)
    .filter((id: string) => /^Q\d+$/.test(id));
  if (!ids.length) return undefined;

  const sparql = `SELECT ?item ?description ?year ?score ?by ?methodLabel ?date ?rank ?imdb ?rt ?mc ?episodes ?ended WHERE {
    VALUES ?item { ${ids.map((id) => `wd:${id}`).join(' ')} }
    OPTIONAL { ?item schema:description ?description FILTER(LANG(?description) = "en") }
    OPTIONAL { ?item wdt:P577 ?published BIND(YEAR(?published) AS ?year) }
    OPTIONAL { ?item wdt:P1113 ?episodes }
    OPTIONAL { ?item wdt:P582 ?ended }
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
    // A second request rather than a dozen more OPTIONALs above, each of
    // which would multiply the review-score rows.
    const streamingUrls = await findWikidataStreaming(id, signal);
    return { description, ratings: wikidataRatings(itemRows), episodes: wikidataEpisodes(itemRows), streamingUrls };
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

// The work's episode count (P1113), the largest where the item states several
// (a season count beside the series' own). A series with an end time (P582)
// has finished, so its count is the whole run; one still running has only put
// out that many so far.
export function wikidataEpisodes(rows: WikidataRow[]): ScreenEpisodes | undefined {
  const counts = rows.map((r) => Number(r.episodes)).filter((n) => Number.isInteger(n) && n > 1);
  if (!counts.length) return undefined;
  return { episodeCount: Math.max(...counts), episodeStatus: rows.some((r) => r.ended) ? 'complete' : 'ongoing' };
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

async function getText(url: string, budget: AbortSignal, headers: Record<string, string> = {}, body?: unknown, retry = true): Promise<string | undefined> {
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
      // AniList answers 429 with the seconds to wait; one wait and one retry
      // is worth it, because a rate-limited lookup otherwise silently gives
      // the pin no ratings and no episode count at all.
      const retryAfter = res.status === 429 ? Number(res.headers.get('retry-after')) : NaN;
      if (retry && Number.isFinite(retryAfter) && retryAfter > 0 && retryAfter <= MAX_RETRY_WAIT_S) {
        await new Promise((resolve) => setTimeout(resolve, (retryAfter + 1) * 1000));
        return getText(url, budget, headers, body, false);
      }
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
