// A film pin's buy buttons: tickets while it is in theaters (or coming), the
// disc once it is out. Both are exact pages, never searches:
//
// - Fandango's search page lists movie pages as /<title>-<year>-<id>/movie-
//   overview; the one whose slug is the film's own title and year is it.
// - Amazon's search results give the disc's ASIN (amazon.com/dp/<ASIN>), taken
//   only from a Blu-ray/DVD listing that carries the film's whole title.
//
// No link at all beats a link to the wrong film. Nothing here throws.

import { siteUrl } from '@/lib/appConfig';
import { normalizeTitle, titleCandidates } from './scrape/screen';
import { searchAmazon } from './amazonSearch';
import log from './util/log';

const DAY_MS = 86_400_000;
// A film plays in theaters for about this long after it opens.
const THEATER_DAYS = 75;
const USER_AGENT = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 ChronopinBot/1.0 (+${siteUrl})`;

export type MovieListing = { label: string; url: string; price?: number };

export type MovieQuery = {
  workTitle?: string | null;
  pinTitle?: string | null;
  // The film's release (or announced) date.
  releaseDate: Date;
  now?: Date;
};

// Fandango's slug words: "Lilo & Stitch" -> "lilo-and-stitch".
const slugOf = (title: string) =>
  title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// The movie pages a Fandango search page links.
export function fandangoPages(html: string): { slug: string; year: number; url: string }[] {
  return [...html.matchAll(/href="(\/([a-z0-9-]+)-(\d{4})-\d+\/movie-overview)"/g)].map((m) => ({
    slug: m[2],
    year: Number(m[3]),
    url: `https://www.fandango.com${m[1]}`,
  }));
}

export async function findFandangoTickets(titles: string[], year: number): Promise<MovieListing | undefined> {
  for (const title of titles.slice(0, 2)) {
    try {
      const res = await fetch(`https://www.fandango.com/search?q=${encodeURIComponent(title)}&mode=general`, {
        headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en-US,en;q=0.9' },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) continue;
      const wanted = slugOf(title);
      const page = fandangoPages(await res.text()).find((p) => p.slug === wanted && Math.abs(p.year - year) <= 1);
      if (page) return { label: 'Fandango', url: page.url };
    } catch (err) {
      log.warn('Fandango lookup failed:', (err as Error).message);
    }
  }
  return undefined;
}

// A disc listing is the film's own: its title has the film's name and says
// Blu-ray or DVD, and is not a box set, a digital code or a different film
// ("Lilo & Stitch 2: Stitch Has a Glitch").
const DISC = /\b(blu-?ray|dvd|4k)\b/i;
const NOT_THE_FILM = /\b(collection|box set|trilogy|double feature|digital|steelbook only)\b/i;

export async function findDiscListing(titles: string[], year: number): Promise<MovieListing | undefined> {
  for (const title of titles.slice(0, 2)) {
    const hits = await searchAmazon(`${title} ${year} Blu-ray DVD`);
    if ('unknown' in hits) continue;
    const wanted = normalizeTitle(title);
    const hit = hits.find((h) => {
      if (h.sponsored || !DISC.test(h.title) || NOT_THE_FILM.test(h.title)) return false;
      // The title up to the first format word or bracket is the film's name,
      // with the year a listing may add.
      const name = normalizeTitle(h.title.split(/[([]|\b(?:blu-?ray|dvd|4k)\b/i)[0].replace(/\b(?:19|20)\d{2}\b/g, ''));
      return name === wanted;
    });
    if (hit) return { label: 'Amazon', url: `https://www.amazon.com/dp/${hit.asin}`, ...(hit.price ? { price: hit.price } : {}) };
  }
  return undefined;
}

// In theaters now or coming, so tickets are on sale; a film that has been out
// longer is on disc.
export async function findMovieListings(query: MovieQuery): Promise<MovieListing[]> {
  const titles = titleCandidates(query);
  if (!titles.length) return [];
  const now = query.now ?? new Date();
  const year = query.releaseDate.getUTCFullYear();
  const days = (now.getTime() - query.releaseDate.getTime()) / DAY_MS;
  const [tickets, disc] = await Promise.all([
    days <= THEATER_DAYS ? findFandangoTickets(titles, year) : undefined,
    days > 0 ? findDiscListing(titles, year) : undefined,
  ]);
  return [tickets, disc].filter((l): l is MovieListing => !!l);
}
