import type { MerchantJson } from './types';

// The streaming services a film, series or anime pin links out to ("Watch on
// Netflix"). They are stored as Merchant rows, labelled with the service's name
// here, and told apart from purchase links by their URL, so a hand-entered
// link to a service gets the same button as a scraped one.
//
// Colours are each service's own brand colour, with the text colour that reads
// on it. Only services with title pages a reader can open are listed; anything
// else a source names (YouTube playlists, regional sites) is left off.
export type StreamingService = { label: string; background: string; text: string; matches: (url: URL) => boolean };

const host = (...names: string[]) => (url: URL) => {
  const h = url.hostname.toLowerCase();
  return names.some((name) => h === name || h.endsWith(`.${name}`));
};

export const STREAMING_SERVICES: StreamingService[] = [
  { label: 'Netflix', background: '#e50914', text: '#ffffff', matches: host('netflix.com') },
  { label: 'Crunchyroll', background: '#f47521', text: '#000000', matches: host('crunchyroll.com') },
  { label: 'HBO Max', background: '#002be7', text: '#ffffff', matches: host('hbomax.com', 'max.com') },
  { label: 'Disney+', background: '#113ccf', text: '#ffffff', matches: host('disneyplus.com') },
  { label: 'Hulu', background: '#1ce783', text: '#000000', matches: host('hulu.com') },
  {
    label: 'Prime Video',
    background: '#1a98ff',
    text: '#000000',
    // Prime Video's own site, or its pages on the amazon.com store.
    matches: (url) => host('primevideo.com')(url) || (host('amazon.com')(url) && url.pathname.startsWith('/gp/video/')),
  },
  { label: 'Apple TV', background: '#000000', text: '#ffffff', matches: host('tv.apple.com') },
  { label: 'Peacock', background: '#000000', text: '#ffffff', matches: host('peacocktv.com') },
  { label: 'Paramount+', background: '#0064ff', text: '#ffffff', matches: host('paramountplus.com') },
  { label: 'HIDIVE', background: '#00aeef', text: '#000000', matches: host('hidive.com') },
];

export function streamingService(url: string | null | undefined): StreamingService | undefined {
  if (!url) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  return STREAMING_SERVICES.find((service) => service.matches(parsed));
}

// Watch links as merchants, one per service (the first link for each wins),
// in the order given, skipping any URL that is not one of the services above.
// AniList still lists some links from before the services went https-only
// ("http://www.hulu.com/one-piece"), which all redirect, so they are upgraded.
export function streamingMerchants(urls: (string | null | undefined)[]): MerchantJson[] {
  const out: MerchantJson[] = [];
  for (const url of urls) {
    const service = streamingService(url);
    if (service && !out.some((m) => m.label === service.label)) out.push({ label: service.label, url: url!.replace(/^http:/i, 'https:') });
  }
  return out;
}

// The order the watch buttons are shown in: Prime Video first (its link earns,
// through the Amazon tag - see affiliateUrl), then the rest as they were saved.
const FIRST = 'Prime Video';

export function watchOrder<T extends { url?: string | null }>(links: T[]): T[] {
  const first = (link: T) => Number(streamingService(link.url)?.label === FIRST);
  return [...links].sort((a, b) => first(b) - first(a));
}
