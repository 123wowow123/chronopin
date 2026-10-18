/**
 * A pin's second video, from a source that plays where YouTube may not: an
 * age-restricted trailer shows "Sorry, this content is age-restricted" in an
 * embed, and some countries and networks block YouTube altogether. Searched on
 * Dailymotion (its API needs no key) and, with VIMEO_ACCESS_TOKEN, on Vimeo,
 * then judged by the same pickers as the YouTube search (screen.ts): a
 * verified channel, the pin's own title words, no reactions or reviews.
 * Best effort: a pin that finds none keeps the one video it has.
 */

import { mediumID } from '@/lib/appConfig';
import { embedUrl } from '@/lib/videoEmbed';
import type { MediumJson } from '@/lib/types';
import config from '../config';
import log from '../util/log';
import { pickProductVideo, pickTrailer, type VideoCandidate } from './screen';

const LONGEST_SECONDS = 15 * 60;
const HEADERS = { 'User-Agent': 'ChronoPin/1.0 (https://chronopin.com) video lookup', Accept: 'application/json' };

type Found = VideoCandidate & { medium: MediumJson };

async function getJson<T>(url: string, signal: AbortSignal, headers: Record<string, string> = {}): Promise<T | undefined> {
  const res = await fetch(url, { headers: { ...HEADERS, ...headers }, signal });
  return res.ok ? ((await res.json()) as T) : undefined;
}

type DailymotionVideo = {
  id: string;
  title?: string;
  'owner.screenname'?: string;
  'owner.username'?: string;
  'owner.verified'?: boolean;
  allow_embed?: boolean;
  private?: boolean;
  explicit?: boolean;
  duration?: number;
};

async function searchDailymotion(query: string, signal: AbortSignal): Promise<Found[]> {
  const fields = 'id,title,owner.screenname,owner.username,owner.verified,allow_embed,private,explicit,duration';
  const res = await getJson<{ list?: DailymotionVideo[] }>(
    `https://api.dailymotion.com/videos?search=${encodeURIComponent(query)}&fields=${fields}&limit=15&sort=relevance`,
    signal,
  );
  return (res?.list ?? [])
    // An explicit video is age-gated there too.
    .filter((v) => v.id && v.allow_embed && !v.private && !v.explicit && (v.duration ?? 0) <= LONGEST_SECONDS)
    .map((v) => ({
      videoId: v.id,
      title: v.title ?? '',
      channel: v['owner.screenname'],
      verified: !!v['owner.verified'],
      medium: {
        type: mediumID.youtube,
        originalUrl: embedUrl('dailymotion', v.id),
        authorName: v['owner.screenname'],
        authorUrl: v['owner.username'] ? `https://www.dailymotion.com/${v['owner.username']}` : undefined,
      },
    }));
}

type VimeoVideo = {
  uri: string;
  name?: string;
  duration?: number;
  content_rating?: string[];
  privacy?: { embed?: string; view?: string };
  user?: { name?: string; link?: string; account?: string };
};

// Vimeo has no verified badge; a paid account (not a free one) stands in.
const PAID_VIMEO = /^(?:pro|business|premium|producer|enterprise|live_)/;

async function searchVimeo(query: string, signal: AbortSignal): Promise<Found[]> {
  if (!config.vimeo.accessToken) return [];
  const fields = 'uri,name,duration,content_rating,privacy.embed,privacy.view,user.name,user.link,user.account';
  const res = await getJson<{ data?: VimeoVideo[] }>(
    `https://api.vimeo.com/videos?query=${encodeURIComponent(query)}&per_page=15&fields=${fields}`,
    signal,
    { Authorization: `Bearer ${config.vimeo.accessToken}` },
  );
  return (res?.data ?? []).flatMap((v) => {
    const id = v.uri.match(/\/videos\/(\d+)/)?.[1];
    const safe = !v.content_rating?.length || v.content_rating.includes('safe');
    if (!id || !safe || v.privacy?.embed !== 'public' || v.privacy?.view !== 'anybody' || (v.duration ?? 0) > LONGEST_SECONDS) return [];
    return {
      videoId: id,
      title: v.name ?? '',
      channel: v.user?.name,
      verified: PAID_VIMEO.test(v.user?.account ?? ''),
      medium: { type: mediumID.youtube, originalUrl: embedUrl('vimeo', id), authorName: v.user?.name, authorUrl: v.user?.link },
    };
  });
}

// What the pin is about: a screen work is judged as a trailer (its own title,
// the year telling a reboot from the original), anything else as a product
// or announcement video.
export type AlternateVideoSubject = { title: string; workTitle?: string | null; company?: string | null; year?: number };

function pick(found: Found[], subject: AlternateVideoSubject): Found | undefined {
  const picked = subject.workTitle ? pickTrailer(found, subject.workTitle, subject.company) : pickProductVideo(found, subject);
  return picked && found.find((f) => f.videoId === picked.videoId);
}

export async function findAlternateVideo(
  subject: AlternateVideoSubject,
  signal: AbortSignal = AbortSignal.timeout(15000),
): Promise<MediumJson | undefined> {
  try {
    const query = subject.workTitle
      ? `${subject.workTitle} official trailer${subject.year ? ` ${subject.year}` : ''}`
      : [subject.company, subject.title].filter(Boolean).join(' ');
    // Each source is judged on its own results, Dailymotion first.
    for (const search of [searchDailymotion, searchVimeo]) {
      const picked = pick(await search(query, signal).catch(() => []), subject);
      if (picked) return picked.medium;
    }
  } catch (err) {
    log.warn('alternate video lookup failed:', (err as Error).message);
  }
  return undefined;
}
