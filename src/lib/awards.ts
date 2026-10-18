// Awards a film, series or anime won or was nominated for, read off the award
// bodies' own Wikipedia pages (src/server/awards.ts fetches them) and matched
// to pins by the work's name. Pure: parsing and matching only.
//
// Anime bodies so far:
//   Crunchyroll Anime Awards         "Nth Crunchyroll Anime Awards" edition pages
//   Tokyo Anime Award Festival       "Tokyo Anime Award"
//   Japan Academy Film Prize         "Japan Academy Film Prize for Animation of the Year"

export type AwardResult = 'won' | 'nominated';

export type AwardEntry = {
  body: string;
  award: string;
  year: number;
  // The work as the page names it, and its Wikipedia article (when linked).
  work: string;
  workArticle: string | null;
  result: AwardResult;
  sourceUrl: string;
};

// What a pin shows (and PinAward stores).
export type PinAwardJson = Omit<AwardEntry, 'workArticle'>;

/* HTML scraps */

const decode = (text: string) =>
  text
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'");

const text = (html: string) =>
  decode(html.replace(/<sup[\s\S]*?<\/sup>/g, '').replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();

// The italic links in a scrap of HTML: works are set in italics.
function works(html: string): { work: string; workArticle: string | null }[] {
  const found: { work: string; workArticle: string | null }[] = [];
  for (const [, inner] of html.matchAll(/<i>([\s\S]*?)<\/i>/g)) {
    const link = /<a\b[^>]*?title="([^"]*)"[^>]*>([\s\S]*?)<\/a>/.exec(inner);
    const work = text(link ? link[2] : inner);
    if (work) found.push({ work, workArticle: link ? decode(link[1]) : null });
  }
  return found;
}

// Each heading's text and where its section starts.
function sections(html: string): { heading: string; start: number; end: number }[] {
  const heads = [...html.matchAll(/<h([234])[^>]*>([\s\S]*?)<\/h\1>/g)].map((m) => ({ heading: text(m[2]), start: m.index! }));
  return heads.map((h, i) => ({ ...h, end: heads[i + 1]?.start ?? html.length }));
}

/* Crunchyroll Anime Awards */

export const CRUNCHYROLL = 'Crunchyroll Anime Awards';

// The 1st edition was held in 2017 and one has been held every year since.
export const crunchyrollYear = (edition: number) => 2016 + edition;

// An edition page: one cell per category, its name in a header, the winner in
// bold marked ‡, the nominees in a list under it.
export function parseCrunchyrollEdition(html: string, year: number, sourceUrl: string): AwardEntry[] {
  const entries: AwardEntry[] = [];
  for (const [, cell] of html.matchAll(/<td style="vertical-align:top[^"]*">([\s\S]*?)<\/td>/g)) {
    const head = /<div[^>]*>\s*<b>([\s\S]*?)<\/b>\s*<\/div>/.exec(cell);
    if (!head) continue;
    const award = text(head[1]);
    const list = cell.slice(head.index + head[0].length);
    // The winner: the bold part of the first item, before its nominee list.
    const winner = /<li>\s*<b>([\s\S]*?)<\/b>\s*‡/.exec(list);
    const won = winner ? works(winner[1]) : [];
    won.slice(0, 1).forEach((w) => entries.push({ body: CRUNCHYROLL, award, year, ...w, result: 'won', sourceUrl }));
    const nested = /<ul>\s*<li>([\s\S]*)<\/ul>/.exec(winner ? list.slice(winner.index + winner[0].length) : list);
    for (const [, item] of (nested ? `<li>${nested[1]}` : '').matchAll(/<li>([\s\S]*?)(?=<li>|<\/ul>|$)/g)) {
      const [w] = works(item);
      if (w) entries.push({ body: CRUNCHYROLL, award, year, ...w, result: 'nominated', sourceUrl });
    }
  }
  return entries;
}

/* Tokyo Anime Award Festival */

export const TOKYO_ANIME_AWARD = 'Tokyo Anime Award Festival';

// Tables of year rows under each award's heading; a winner may span years.
export function parseTokyoAnimeAward(html: string, sourceUrl: string): AwardEntry[] {
  const entries: AwardEntry[] = [];
  for (const { heading, start, end } of sections(html)) {
    if (/see also|references|external links|notes/i.test(heading)) continue;
    const body = html.slice(start, end);
    for (const [, table] of body.matchAll(/<table class="wikitable[^>]*>([\s\S]*?)<\/table>/g)) {
      let carried: { work: string; workArticle: string | null }[] = [];
      let span = 0;
      for (const [, row] of table.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
        const year = /<th[^>]*>\s*((?:19|20)\d\d)\s*<\/th>/.exec(row);
        if (!year) continue;
        const cell = /<td(?:\s+rowspan="(\d+)")?[^>]*>([\s\S]*?)<\/td>/.exec(row);
        if (cell) {
          carried = works(cell[2]).slice(0, 1);
          span = Number(cell[1] || 1);
        } else if (span <= 0) {
          // A year row the winner above does not reach.
          continue;
        }
        span--;
        carried.forEach((w) => entries.push({ body: TOKYO_ANIME_AWARD, award: heading, year: Number(year[1]), ...w, result: 'won', sourceUrl }));
      }
    }
  }
  return entries;
}

/* Japan Academy Film Prize for Animation of the Year */

export const JAPAN_ACADEMY = 'Japan Academy Film Prize';
const JAPAN_ACADEMY_AWARD = 'Animation of the Year';

// Year, the winner, then the other nominees ("Excellent Animation of the Year").
export function parseJapanAcademyAnimation(html: string, sourceUrl: string): AwardEntry[] {
  const entries: AwardEntry[] = [];
  for (const [, row] of html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
    const year = cells[0] && /^\s*((?:19|20)\d\d)\s*$/.exec(text(cells[0]));
    if (!year) continue;
    works(cells[1] ?? '')
      .slice(0, 1)
      .forEach((w) => entries.push({ body: JAPAN_ACADEMY, award: JAPAN_ACADEMY_AWARD, year: Number(year[1]), ...w, result: 'won', sourceUrl }));
    works(cells[2] ?? '').forEach((w) =>
      entries.push({ body: JAPAN_ACADEMY, award: JAPAN_ACADEMY_AWARD, year: Number(year[1]), ...w, result: 'nominated', sourceUrl }),
    );
  }
  return entries;
}

/* Matching */

// A title as words: no accents, punctuation or case; "&" as "and".
export function titleKey(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Too short or too plain to find in a pin's title without matching strangers.
const MIN_KEY_LENGTH = 5;

// The key a work is known by: its name as the award names it. Not its
// Wikipedia article's, which is the franchise's: "Mob Psycho 100" would give
// the first season the award "Mob Psycho 100 II" won, and every JoJo part
// Golden Wind's.
export function workKeys(entry: Pick<AwardEntry, 'work'>): string[] {
  const key = titleKey(entry.work);
  return key.length >= MIN_KEY_LENGTH ? [key] : [];
}

// What a pin title may say after the work's name and still be about the work
// itself: news of its release, in so many words.
const RELEASE_WORDS = new Set(
  (
    'premieres premiere premiered releases release released announced announces announcement returns return debuts debut airs ' +
    'airing opens arrives launches launch streams streaming in on at to for the a an of and new date set gets exact finally ' +
    'trailer teaser visual key japanese japan theaters theatres cinemas worldwide us north america tv broadcast ' +
    'netflix crunchyroll hulu disney prime video amazon hidive max'
  ).split(' '),
);

// Or it goes on with a season of it ("Season 2", "2nd Season", "Part 2",
// "Final Season", "II", Code Geass's "R2", Dragon Maid's "S"), which may carry
// a subtitle of its own.
const SEASON = /^(?:(?:the )?final season|season (?:\d+|[ivx]+)|\d+(?:st|nd|rd|th) season|part (?:\d+|[ivx]+)|cour \d+|(?:ii|iii|iv|v|vi|r\d|s)(?: |$)|\d+(?: |$))/;

// Whether a pin's title (keyed) is about this work (keyed): the work itself or
// a season of it, not a spin-off or a named arc that shares its name ("One
// Piece: Episode of Sabo" is not One Piece; "Jujutsu Kaisen Season 2" is).
export function titleIsWork(title: string, work: string): boolean {
  if (title === work) return true;
  if (!title.startsWith(`${work} `)) return false;
  const rest = title.slice(work.length + 1);
  return SEASON.test(rest) || rest.split(' ').every((w) => RELEASE_WORDS.has(w));
}

// The entries about a pin: its work, or a season of it, by name.
export function matchAwards(entries: AwardEntry[], titles: string[]): AwardEntry[] {
  const keys = titles.map(titleKey).filter(Boolean);
  const matched = entries.filter((e) => workKeys(e).some((k) => keys.some((t) => titleIsWork(t, k))));
  // A work can win a category it was also listed under: the win is enough.
  const seen = new Set<string>();
  return matched
    .sort((a, b) => (a.result === b.result ? 0 : a.result === 'won' ? -1 : 1))
    .filter((e) => {
      const key = `${e.body}|${e.award}|${e.year}|${titleKey(e.work)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (a.result === b.result ? b.year - a.year : a.result === 'won' ? -1 : 1));
}
