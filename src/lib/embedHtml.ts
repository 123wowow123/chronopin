// The players a medium's stored embed draws, rebuilt rather than sanitised: a
// YouTube player from its video id and a tweet from its link and text, with
// every value escaped, so none of the stored html reaches the page as markup.
// Cards render these on the server and in the browser alike, and sanitize-html
// (with the postcss it pulls in) had been most of a 285KB chunk that every
// timeline, search and pin page loaded for it.

import { youtubeVideoId } from './videoEmbed';

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', hellip: '…' };

function decodeEntities(text: string): string {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (whole, name: string) => {
    if (name[0] !== '#') return ENTITIES[name.toLowerCase()] ?? whole;
    const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
  });
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// The text of a stretch of markup: tags dropped, entities read.
function textOf(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
}

// The first value of an attribute in the html, entities read.
function attribute(html: string, name: string): string | undefined {
  const value = html.match(new RegExp(`\\s${name}\\s*=\\s*"([^"]*)"`, 'i'))?.[1];
  return value === undefined ? undefined : decodeEntities(value);
}

// The player's address: the stored iframe's own, when it is a YouTube embed
// (keeping its start time and other parameters), else one built from the
// medium's URL. enablejsapi=1 lets the page pause it (see YouTubeEmbed).
function playerSrc(html: string | null | undefined, originalUrl: string | null | undefined): string | undefined {
  const stored = html ? attribute(html, 'src') : undefined;
  if (stored) {
    try {
      const url = new URL(stored, 'https://www.youtube.com');
      if (/^(www\.)?youtube(-nocookie)?\.com$/.test(url.hostname) && /^\/embed\/[\w-]+$/.test(url.pathname)) {
        url.protocol = 'https:';
        url.searchParams.set('enablejsapi', '1');
        return url.toString();
      }
    } catch {
      // Not a URL; fall back to the medium's own.
    }
  }
  const id = youtubeVideoId(originalUrl);
  return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}?enablejsapi=1` : undefined;
}

// A YouTube medium's player, or undefined when it names no YouTube video. An
// iframe needs a title to be named for screen readers; the YouTube API's
// embedHtml has none (oEmbed's does), so frameTitle fills it in.
export function youtubePlayerHtml(
  medium: { html?: string | null; originalUrl?: string | null },
  frameTitle?: string,
): string | undefined {
  const src = playerSrc(medium.html, medium.originalUrl);
  if (!src) return undefined;
  const html = medium.html ?? '';
  const size = (name: string, fallback: number) => (/^\d{1,4}$/.test(attribute(html, name) ?? '') ? attribute(html, name)! : String(fallback));
  const title = attribute(html, 'title')?.trim() || frameTitle;
  return (
    `<iframe width="${size('width', 480)}" height="${size('height', 270)}" src="${escapeHtml(src)}"` +
    (title ? ` title="${escapeHtml(title)}"` : '') +
    ' frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"' +
    ' referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'
  );
}

const TWEET_URL = /^https:\/\/(www\.)?(twitter|x)\.com\/\w+\/status\/\d+/;

// A tweet as the blockquote Twitter's widgets script turns into the full
// tweet: its text, its byline and a link to it, or undefined without a link.
export function tweetHtml(medium: { html?: string | null; originalUrl?: string | null }): string | undefined {
  const html = medium.html ?? '';
  const links = [...html.matchAll(/<a\s[^>]*href\s*=\s*"([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)];
  const link = links.findLast(([, href]) => TWEET_URL.test(decodeEntities(href)));
  const url = (medium.originalUrl && TWEET_URL.test(medium.originalUrl) ? medium.originalUrl : link && decodeEntities(link[1]))?.match(TWEET_URL)?.[0];
  if (!url) return undefined;
  const text = textOf(html.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? '');
  const afterText = html.replace(/^[\s\S]*<\/p>/i, '');
  const byline = textOf(link ? afterText.slice(0, Math.max(0, afterText.indexOf(link[0]))) : '');
  const date = link ? textOf(link[2]) : '';
  return (
    '<blockquote class="twitter-tweet">' +
    (text ? `<p>${escapeHtml(text)}</p>` : '') +
    (byline ? `${escapeHtml(byline)} ` : '') +
    `<a href="${escapeHtml(url)}">${escapeHtml(date || url)}</a></blockquote>`
  );
}
