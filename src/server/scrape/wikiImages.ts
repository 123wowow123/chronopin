import log from '../util/log';

export type WikiImage = { originalUrl: string; width: number; height: number };

const MIN_SIDE = 300;
// Wikimedia asks API clients to identify themselves.
const HEADERS = { 'User-Agent': 'ChronoPin/1.0 (pin image lookup)' };
const SKIP = /logo|icon|flag|symbol|commons-logo|wiki(?:pedia|media)|disambig|padlock|edit-|question_book|ambox|stub/i;

async function api(params: Record<string, string>) {
  const url = `https://en.wikipedia.org/w/api.php?${new URLSearchParams({ format: 'json', origin: '*', ...params })}`;
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`wikipedia ${res.status}`);
  return res.json() as Promise<any>;
}

// The article title behind a Wikipedia URL, or a search for a plain name.
async function articleTitle(subject: string): Promise<string | undefined> {
  const fromUrl = subject.match(/wikipedia\.org\/wiki\/([^#?]+)/)?.[1];
  if (fromUrl) return decodeURIComponent(fromUrl).replace(/_/g, ' ');
  const res = await api({ action: 'query', list: 'search', srsearch: subject, srlimit: '1' });
  return res?.query?.search?.[0]?.title;
}

// Photos from the Wikipedia article for a company, work or place - the photo
// formats only (logos are SVG), large enough to be worth a card, largest
// first. Empty on any failure: this only tops up a scrape.
export async function wikiImages(subject: string | null | undefined, limit: number): Promise<WikiImage[]> {
  if (!subject || limit <= 0) return [];
  try {
    const title = await articleTitle(subject);
    if (!title) return [];
    const res = await api({
      action: 'query',
      generator: 'images',
      titles: title,
      gimlimit: '30',
      prop: 'imageinfo',
      iiprop: 'url|size|mime',
    });
    const pages: any[] = Object.values(res?.query?.pages || {});
    return pages
      .map((p) => ({ title: String(p.title || ''), info: p.imageinfo?.[0] }))
      .filter(
        ({ title, info }) =>
          info && /^image\/(jpeg|png|webp)$/.test(info.mime) && info.width >= MIN_SIDE && info.height >= MIN_SIDE && !SKIP.test(title),
      )
      .map(({ info }) => ({ originalUrl: info.url as string, width: info.width as number, height: info.height as number }))
      .sort((a, b) => b.width * b.height - a.width * a.height)
      .slice(0, limit);
  } catch (err) {
    log.warn('wikipedia image lookup failed:', (err as Error).message);
    return [];
  }
}
