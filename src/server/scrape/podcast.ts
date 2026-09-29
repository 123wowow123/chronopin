import { HttpError } from '../util/httpError';
import { decodeEntities, htmlTitle, htmlToText } from './sourceText';
import { fetchTranscript } from './transcript';

// Podcast episodes through Apple Podcasts, the biggest directory: finding
// episodes (the keyless iTunes Search API) and reading what was said in one.
//
// Apple's own transcripts need a signed-in Apple ID, so a transcript comes
// from where the publisher puts one: a <podcast:transcript> tag in the show's
// RSS feed, else the full episode the show uploaded to YouTube (most big shows
// do), read through the YouTube caption reader.

const SEARCH_URL = 'https://itunes.apple.com/search';
const LOOKUP_URL = 'https://itunes.apple.com/lookup';
const YOUTUBE_SEARCH_URL = 'https://www.youtube.com/youtubei/v1/search?prettyPrint=false';
// Search as the web client, which needs no key or token for results; the
// filter param is "type: video".
const YOUTUBE_CLIENT = { clientName: 'WEB', clientVersion: '2.20250910.00.00', hl: 'en' };
const VIDEOS_ONLY = 'EgIQAQ%3D%3D';
const FETCH_TIMEOUT_MS = 15000;
// Feeds of long-running shows are several megabytes.
const FEED_TIMEOUT_MS = 25000;
// The lookup API returns at most this many of a show's newest episodes.
const LOOKUP_LIMIT = 200;

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';

export interface PodcastEpisode {
  id?: number; // Apple's episode (track) id
  title: string;
  show: string;
  showId?: number;
  releaseDate?: string; // ISO timestamp
  durationSeconds?: number;
  description?: string;
  url?: string; // the Apple Podcasts episode page
  audioUrl?: string;
  feedUrl?: string;
  guid?: string;
}

export interface PodcastSegment {
  start?: number; // seconds, when the transcript is timed
  duration?: number;
  speaker?: string;
  text: string;
}

export interface PodcastTranscript {
  episode: PodcastEpisode;
  // The publisher's own transcript from the feed, or the captions of the
  // episode's YouTube upload.
  source: 'feed' | 'youtube';
  transcriptUrl?: string;
  video?: { videoId: string; title: string; channel?: string; url: string; matchedBy: string };
  language?: string;
  isGenerated?: boolean;
  segments: PodcastSegment[];
  text: string;
}

// Episodes matching a search term, newest first as Apple ranks them.
export async function searchEpisodes(term: string, { limit = 25, country = 'us' }: { limit?: number; country?: string } = {}): Promise<PodcastEpisode[]> {
  const url = new URL(SEARCH_URL);
  url.search = new URLSearchParams({ media: 'podcast', entity: 'podcastEpisode', term, limit: String(limit), country }).toString();
  const { results } = await getJson<{ results: ItunesEpisode[] }>(url.toString());
  return results.filter((r) => r.wrapperType === 'podcastEpisode').map(toEpisode);
}

// Accepts an Apple Podcasts episode link (…/id<show>?i=<episode>) or any other
// episode page, which is matched to Apple's catalogue by its title.
export async function resolveEpisode(url: string): Promise<PodcastEpisode> {
  const apple = appleIds(url);
  if (apple) {
    if (!apple.episodeId) {
      throw new HttpError(400, 'That is a show, not an episode: link one episode (its URL has ?i=…)');
    }
    return appleEpisode(apple.showId, apple.episodeId, url);
  }
  const title = await pageTitle(url);
  if (!title) {
    throw new HttpError(404, `No episode title found at ${url}`);
  }
  const found = (await searchEpisodes(title, { limit: 10 })).find((e) => sameTitle(e.title, title) || sameTitle(`${e.show} ${e.title}`, title));
  if (!found) {
    throw new HttpError(404, `No Apple Podcasts episode matches "${title}"`);
  }
  return found;
}

export async function fetchPodcastTranscript(url: string, lang?: string): Promise<PodcastTranscript> {
  return episodeTranscript(await resolveEpisode(url), lang);
}

// For an episode already in hand, as searchEpisodes returns them.
export async function episodeTranscript(episode: PodcastEpisode, lang?: string): Promise<PodcastTranscript> {
  const fromFeed = await feedTranscript(episode, lang).catch(() => undefined);
  if (fromFeed) {
    return fromFeed;
  }
  const video = await findEpisodeVideo(episode);
  if (!video) {
    throw new HttpError(404, `No transcript for "${episode.title}": the feed has none and no YouTube upload of it was found`);
  }
  const captions = await fetchTranscript(video.videoId, lang);
  return {
    episode,
    source: 'youtube',
    video: { ...video, channel: video.channel || captions.channel, url: `https://www.youtube.com/watch?v=${video.videoId}` },
    language: captions.track.languageCode,
    isGenerated: captions.track.isGenerated,
    segments: captions.segments,
    text: captions.text,
  };
}

// --- Apple ---

interface ItunesEpisode {
  wrapperType: string;
  trackId: number;
  trackName: string;
  collectionId: number;
  collectionName: string;
  releaseDate?: string;
  trackTimeMillis?: number;
  description?: string;
  shortDescription?: string;
  trackViewUrl?: string;
  episodeUrl?: string;
  feedUrl?: string;
  episodeGuid?: string;
}

function toEpisode(r: ItunesEpisode): PodcastEpisode {
  return {
    id: r.trackId,
    title: r.trackName,
    show: r.collectionName,
    showId: r.collectionId,
    releaseDate: r.releaseDate,
    durationSeconds: r.trackTimeMillis ? Math.round(r.trackTimeMillis / 1000) : undefined,
    description: r.description || r.shortDescription || undefined,
    url: r.trackViewUrl ? cleanAppleUrl(r.trackViewUrl) : undefined,
    audioUrl: r.episodeUrl,
    feedUrl: r.feedUrl,
    guid: r.episodeGuid,
  };
}

// The episode link without the affiliate "uo" tracking parameter.
function cleanAppleUrl(url: string): string {
  const u = new URL(url);
  u.searchParams.delete('uo');
  return u.toString();
}

export function appleIds(url: string): { showId: number; episodeId?: number } | undefined {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return undefined;
  }
  if (!/(^|\.)(podcasts|itunes)\.apple\.com$/i.test(u.hostname)) return undefined;
  const show = /\/id(\d+)/.exec(u.pathname)?.[1];
  if (!show) return undefined;
  const episode = u.searchParams.get('i');
  return { showId: Number(show), episodeId: episode && /^\d+$/.test(episode) ? Number(episode) : undefined };
}

// Apple has no lookup by episode id, only a show's newest episodes; an older
// one is found in the show's feed by the title on its Apple page.
async function appleEpisode(showId: number, episodeId: number, url: string): Promise<PodcastEpisode> {
  const lookup = new URL(LOOKUP_URL);
  lookup.search = new URLSearchParams({ id: String(showId), entity: 'podcastEpisode', limit: String(LOOKUP_LIMIT) }).toString();
  const { results } = await getJson<{ results: (ItunesEpisode & { kind?: string })[] }>(lookup.toString());
  const show = results.find((r) => r.wrapperType === 'track' || r.kind === 'podcast');
  const found = results.find((r) => r.wrapperType === 'podcastEpisode' && r.trackId === episodeId);
  if (found) {
    return toEpisode(found);
  }
  if (!show) {
    throw new HttpError(404, `Apple Podcasts has no show ${showId}`);
  }
  const title = await pageTitle(url);
  const item = title && show.feedUrl ? findItem(await fetchText(show.feedUrl, FEED_TIMEOUT_MS), { title }) : undefined;
  if (!item) {
    throw new HttpError(404, `Episode ${episodeId} of ${show.collectionName} was not found`);
  }
  return { ...itemEpisode(item), id: episodeId, show: show.collectionName, showId, url: cleanAppleUrl(url), feedUrl: show.feedUrl };
}

async function pageTitle(url: string): Promise<string | undefined> {
  const html = await fetchText(url, FETCH_TIMEOUT_MS);
  // Apple cuts <title> short ("Why China bui… - Squiz Today - Apple
  // Podcasts"); og:title has it whole, with its attributes in either order.
  const title = ogTitle(html) ?? htmlTitle(html);
  return title?.replace(/\s+[-–|]\s+Apple Podcasts$/i, '').trim() || undefined;
}

export function ogTitle(html: string): string | undefined {
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (/\b(?:property|name)=["']og:title["']/i.test(tag)) {
      const content = /\bcontent=(?:"([^"]*)"|'([^']*)')/i.exec(tag);
      const title = content && decodeEntities(content[1] ?? content[2]).trim();
      if (title) return title;
    }
  }
  return undefined;
}

// --- The show's feed ---

export interface FeedTranscriptLink {
  url: string;
  type: string;
  language?: string;
}

// The <item> for an episode, by its guid, else its title.
export function findItem(feed: string, { guid, title }: { guid?: string; title?: string }): string | undefined {
  const items = feed.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];
  if (guid) {
    const byGuid = items.find((item) => tagText(item, 'guid') === guid);
    if (byGuid) return byGuid;
  }
  // A page title can carry the show's name after the episode's.
  return title ? items.find((item) => sameTitle(tagText(item, 'title') ?? '', title) || title.startsWith(tagText(item, 'title') ?? '\0')) : undefined;
}

function itemEpisode(item: string): Omit<PodcastEpisode, 'show'> {
  const pubDate = tagText(item, 'pubDate');
  return {
    title: tagText(item, 'title') ?? '',
    releaseDate: pubDate && !Number.isNaN(Date.parse(pubDate)) ? new Date(pubDate).toISOString() : undefined,
    durationSeconds: parseDuration(tagText(item, 'itunes:duration')),
    description: htmlToText(tagText(item, 'description') ?? tagText(item, 'itunes:summary') ?? '') || undefined,
    audioUrl: /<enclosure\b[^>]*\burl="([^"]+)"/i.exec(item)?.[1],
    guid: tagText(item, 'guid'),
  };
}

// Podcasting 2.0 transcript links in an item.
export function transcriptLinks(item: string): FeedTranscriptLink[] {
  return [...item.matchAll(/<podcast:transcript\b([^>]*)\/?>/gi)].flatMap(([, attrs]) => {
    const attr = (name: string) => new RegExp(`\\b${name}="([^"]*)"`, 'i').exec(attrs)?.[1];
    const url = attr('url');
    return url ? [{ url: decodeEntities(url), type: (attr('type') || '').toLowerCase(), language: attr('language') }] : [];
  });
}

// Timed formats first, and the asked-for (else English) language.
const TYPE_RANK = ['application/json', 'text/vtt', 'application/x-subrip', 'application/srt', 'text/srt', 'text/html', 'text/plain'];

export function pickTranscriptLink(links: FeedTranscriptLink[], lang = 'en'): FeedTranscriptLink | undefined {
  const base = (code?: string) => (code || '').toLowerCase().split('-')[0];
  const rank = (link: FeedTranscriptLink) => {
    const type = TYPE_RANK.indexOf(link.type);
    return (link.language && base(link.language) !== base(lang) ? 100 : 0) + (type < 0 ? TYPE_RANK.length : type);
  };
  return [...links].sort((a, b) => rank(a) - rank(b))[0];
}

async function feedTranscript(episode: PodcastEpisode, lang?: string): Promise<PodcastTranscript | undefined> {
  if (!episode.feedUrl) return undefined;
  const item = findItem(await fetchText(episode.feedUrl, FEED_TIMEOUT_MS), { guid: episode.guid, title: episode.title });
  const link = item && pickTranscriptLink(transcriptLinks(item), lang);
  if (!link) return undefined;
  const segments = parseTranscript(await fetchText(link.url, FETCH_TIMEOUT_MS), link.type || link.url);
  if (!segments.length) return undefined;
  return {
    episode,
    source: 'feed',
    transcriptUrl: link.url,
    language: link.language,
    segments,
    text: segments.map((s) => s.text).join(' '),
  };
}

// A transcript file in any of the formats Podcasting 2.0 allows. type is the
// declared media type, or the file's URL when the feed gave none.
export function parseTranscript(body: string, type: string): PodcastSegment[] {
  const trimmed = body.trim();
  if (/json/i.test(type) || /^\{/.test(trimmed)) {
    try {
      const parsed = JSON.parse(trimmed) as { segments?: { startTime?: number; endTime?: number; body?: string; speaker?: string }[] };
      return mergeSpeakerRuns(
        (parsed.segments ?? []).flatMap((s) =>
          s.body?.trim()
            ? [{ start: s.startTime, duration: s.endTime != null && s.startTime != null ? s.endTime - s.startTime : undefined, speaker: s.speaker, text: s.body.trim() }]
            : [],
        ),
      );
    } catch {
      // Not JSON after all; read it as text.
    }
  }
  if (/vtt|srt|subrip/i.test(type) || /^WEBVTT/.test(trimmed) || /^\d+\s*\n\d\d:\d\d/.test(trimmed)) {
    return parseCues(trimmed);
  }
  const text = /html/i.test(type) || /^<(!doctype|html)/i.test(trimmed) ? htmlToText(trimmed) : trimmed;
  return text
    .split(/\n\s*\n|\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map((line) => {
      // "Speaker Name: words" or "Speaker Name (00:01:02): words"
      const speaker = /^([A-Z][\w.' -]{1,40}?)(?:\s*\([\d:]+\))?:\s+(.+)$/.exec(line);
      return speaker ? { speaker: speaker[1], text: speaker[2] } : { text: line };
    });
}

// WebVTT or SRT cues. A "<v Speaker>" voice tag becomes the speaker.
function parseCues(body: string): PodcastSegment[] {
  const segments: PodcastSegment[] = [];
  for (const block of body.replace(/\r/g, '').split(/\n\s*\n/)) {
    const lines = block.split('\n');
    const timing = lines.findIndex((l) => l.includes('-->'));
    if (timing < 0) continue;
    const [from, to] = lines[timing].split('-->').map((t) => cueSeconds(t.trim().split(/\s+/)[0]));
    let raw = lines.slice(timing + 1).join(' ');
    const voice = /<v(?:\.[\w.]+)?\s+([^>]+)>/.exec(raw)?.[1]?.trim();
    raw = decodeEntities(raw.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
    if (!raw) continue;
    let speaker = voice;
    if (!speaker) {
      const named = /^([A-Z][\w.' -]{1,40}?):\s+(.+)$/.exec(raw);
      if (named) [, speaker, raw] = named;
    }
    segments.push({ start: from, duration: to != null && from != null ? to - from : undefined, ...(speaker ? { speaker } : {}), text: raw });
  }
  return mergeSpeakerRuns(segments);
}

function cueSeconds(stamp: string): number | undefined {
  const parts = stamp.replace(',', '.').split(':').map(Number);
  if (parts.some((p) => Number.isNaN(p))) return undefined;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

// Podcasting 2.0 JSON often has one segment per word; join a speaker's run.
function mergeSpeakerRuns(segments: PodcastSegment[]): PodcastSegment[] {
  if (segments.length < 2 || segments.filter((s) => !/\s/.test(s.text)).length < segments.length / 2) {
    return segments;
  }
  const merged: PodcastSegment[] = [];
  for (const s of segments) {
    const last = merged[merged.length - 1];
    if (last && last.speaker === s.speaker && /\w$/.test(last.text) === /^\w/.test(s.text) && !/[.?!]$/.test(last.text)) {
      last.text += ` ${s.text}`;
      if (last.start != null && s.start != null && s.duration != null) last.duration = s.start + s.duration - last.start;
    } else {
      merged.push({ ...s });
    }
  }
  return merged;
}

export function parseDuration(value?: string): number | undefined {
  if (!value) return undefined;
  if (/^\d+$/.test(value.trim())) return Number(value);
  const seconds = cueSeconds(value.trim());
  return seconds && Number.isFinite(seconds) ? Math.round(seconds) : undefined;
}

function tagText(xml: string, tag: string): string | undefined {
  const inner = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(xml)?.[1];
  if (inner == null) return undefined;
  const cdata = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(inner);
  return (cdata ? cdata[1] : decodeEntities(inner)).trim();
}

// --- The episode on YouTube ---

export interface VideoResult {
  videoId: string;
  title: string;
  channel?: string;
  lengthSeconds?: number;
  // How long ago YouTube says it went up, and how coarse that is.
  ageDays?: number;
  ageSlackDays?: number;
}

// The show's own upload of the episode. YouTube titles often differ from the
// feed's, so the channel must be the show's and either the title agrees or
// the length and upload day do.
async function findEpisodeVideo(episode: PodcastEpisode): Promise<(VideoResult & { matchedBy: string }) | undefined> {
  const results = await searchVideos(`${episode.show} ${episode.title}`);
  let best: (VideoResult & { matchedBy: string; score: number }) | undefined;
  for (const video of results) {
    const judged = matchVideo(episode, video);
    if (judged && (!best || judged.score > best.score)) best = { ...video, ...judged };
  }
  if (!best) return undefined;
  const { score: _score, ...video } = best;
  return video;
}

export function matchVideo(episode: PodcastEpisode, video: VideoResult, now = Date.now()): { matchedBy: string; score: number } | undefined {
  const channelMatch = !!video.channel && sameShow(episode.show, video.channel);
  const title = wordOverlap(episode.title, video.title);
  const length =
    episode.durationSeconds && video.lengthSeconds ? video.lengthSeconds / episode.durationSeconds : undefined;
  // Feeds carry ad breaks YouTube cuts, and YouTube adds the odd intro.
  const lengthMatch = length != null && length >= 0.8 && length <= 1.1;
  let dayMatch = false;
  if (episode.releaseDate && video.ageDays != null) {
    const releasedDaysAgo = (now - Date.parse(episode.releaseDate)) / 86400000;
    dayMatch = Math.abs(releasedDaysAgo - video.ageDays) <= Math.max(2, video.ageSlackDays ?? 0) && (video.ageSlackDays ?? 0) <= 7;
  }
  // Well short of the episode, it is a clip of one segment.
  if (length != null && length < 0.5) return undefined;
  // The whole episode beats a clip whose title happens to agree.
  const whole = lengthMatch ? 10 : 0;
  if (channelMatch && title >= 0.5) return { matchedBy: 'channel and title', score: whole + 2 + title };
  if (channelMatch && lengthMatch && dayMatch) return { matchedBy: 'channel, length and upload day', score: whole + 2 };
  if (title >= 0.8 && lengthMatch) return { matchedBy: 'title and length', score: whole + 1 + title };
  return undefined;
}

async function searchVideos(query: string): Promise<VideoResult[]> {
  const res = await fetch(YOUTUBE_SEARCH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'user-agent': USER_AGENT },
    body: JSON.stringify({ context: { client: YOUTUBE_CLIENT }, query, params: decodeURIComponent(VIDEOS_ONLY) }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`YouTube search failed with ${res.status}`);
  }
  return videoRenderers(await res.json()).slice(0, 10);
}

export function videoRenderers(data: unknown): VideoResult[] {
  const found: VideoResult[] = [];
  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(walk);
    } else if (node && typeof node === 'object') {
      const renderer = (node as Record<string, any>).videoRenderer;
      if (renderer?.videoId) {
        const runs = (value: any) => value?.simpleText ?? value?.runs?.map((r: { text: string }) => r.text).join('');
        const age = relativeAge(runs(renderer.publishedTimeText));
        found.push({
          videoId: renderer.videoId,
          title: runs(renderer.title) ?? '',
          channel: renderer.ownerText?.runs?.[0]?.text ?? renderer.longBylineText?.runs?.[0]?.text,
          lengthSeconds: parseDuration(runs(renderer.lengthText)),
          ageDays: age?.days,
          ageSlackDays: age?.slack,
        });
      }
      Object.values(node).forEach(walk);
    }
  };
  walk(data);
  return found;
}

const UNIT_DAYS: Record<string, number> = { second: 0, minute: 0, hour: 1 / 24, day: 1, week: 7, month: 30, year: 365 };

// "15 hours ago", "Streamed 3 weeks ago".
export function relativeAge(text?: string): { days: number; slack: number } | undefined {
  const m = /(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i.exec(text || '');
  if (!m) return undefined;
  const unit = UNIT_DAYS[m[2].toLowerCase()];
  return { days: Number(m[1]) * unit, slack: Math.max(unit, 1) };
}

// --- Matching words ---

const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'what', 'how', 'why', 'who', 'are', 'was', 'its', 'our', 'your', 'about', 'into', 'episode', 'ep', 'part', 'feat', 'ft']);
const GENERIC_SHOW = new Set(['podcast', 'show', 'pod', 'radio', 'official', 'the', 'with', 'and']);

export function words(text: string): string[] {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']s\b/g, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 1);
}

// Share of a's significant words that b has too.
export function wordOverlap(a: string, b: string): number {
  const want = [...new Set(words(a).filter((w) => !STOP.has(w)))];
  if (!want.length) return 0;
  const have = new Set(words(b));
  return want.filter((w) => have.has(w)).length / want.length;
}

function sameTitle(a: string, b: string): boolean {
  const norm = (s: string) => words(s).join(' ');
  return norm(a) === norm(b);
}

// "Lex Fridman Podcast" is the channel "Lex Fridman"; "Hard Fork" is "Hard
// Fork and 2 more" when several channels share an upload.
export function sameShow(show: string, channel: string): boolean {
  const core = (s: string) => words(s).filter((w) => !GENERIC_SHOW.has(w));
  const a = core(show);
  const b = new Set(core(channel.replace(/\s+and \d+ more$/i, '')));
  return a.length > 0 && b.size > 0 && (a.every((w) => b.has(w)) || [...b].every((w) => a.includes(w)));
}

// --- HTTP ---

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { 'user-agent': USER_AGENT }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) {
    throw new Error(`${new URL(url).hostname} answered ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function fetchText(url: string, timeoutMs: number): Promise<string> {
  const res = await fetch(url, { headers: { 'user-agent': USER_AGENT }, redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) {
    throw new HttpError(res.status === 404 ? 404 : 502, `${url} answered ${res.status}`);
  }
  return res.text();
}
