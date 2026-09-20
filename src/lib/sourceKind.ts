// What kind of link a URL is, which decides how its text is fetched
// (src/server/scrape/sourceText.ts) and how its wiki names it.

export type SourceKind = 'web' | 'youtube' | 'tweet' | 'podcast' | 'pdf';

const PODCAST_HOSTS = /(^|\.)(podcasts\.apple\.com|overcast\.fm|pocketcasts\.com|castbox\.fm|podbean\.com|buzzsprout\.com|simplecast\.com|transistor\.fm|megaphone\.fm|podcasts\.google\.com|pod\.link)$/;
export const AUDIO_PATH = /\.(mp3|m4a|aac|ogg|opus|wav)$/i;
// A filing, docket or agency report. Only the path is checked: plenty of PDFs
// are served without the extension, and those are caught by content type when
// the page is fetched (scrape/sourceText.ts).
export const PDF_PATH = /\.pdf$/i;

export function sourceKind(url: string): SourceKind {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return 'web';
  }
  const host = u.hostname.toLowerCase().replace(/^www\.|^m\./, '');
  if (host === 'youtube.com' || host === 'youtu.be' || host === 'music.youtube.com') return 'youtube';
  if (host === 'twitter.com' || host === 'x.com') return 'tweet';
  if (PODCAST_HOSTS.test(host) || AUDIO_PATH.test(u.pathname)) return 'podcast';
  if (PDF_PATH.test(u.pathname)) return 'pdf';
  if (host === 'open.spotify.com' && /^\/(episode|show)\//.test(u.pathname)) return 'podcast';
  return 'web';
}
