/**
 * Gameplay for a pin about a game (or anything else Twitch has a category for):
 * the category's most-watched clip of the past year, as a video medium and as
 * a reference. Twitch's Helix API needs an app token, made from the client
 * credentials of a developer app (config.twitch); without them nothing here
 * runs. Only clips, which stay up and always embed - a VOD is deleted after
 * weeks and a stream ends.
 */

import { mediumID } from '@/lib/appConfig';
import { embedUrl, videoSource } from '@/lib/videoEmbed';
import type { MediumJson, PinReferenceJson } from '@/lib/types';
import config from '../config';
import log from '../util/log';
import { normalizeTitle } from './screen';

const HELIX = 'https://api.twitch.tv/helix';
const LONGEST_CLIP_SECONDS = 90;
const CLIP_SEARCH_DAYS = 365;

export const twitchConfigured = () => !!(config.twitch.clientId && config.twitch.clientSecret);

let token: { value: string; expires: number } | undefined;

async function appToken(signal: AbortSignal): Promise<string | undefined> {
  if (!twitchConfigured()) return undefined;
  if (token && token.expires > Date.now() + 60_000) return token.value;
  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(config.twitch.clientId!)}&client_secret=${encodeURIComponent(config.twitch.clientSecret!)}&grant_type=client_credentials`,
    { method: 'POST', signal },
  );
  if (!res.ok) {
    log.warn(`twitch token failed: HTTP ${res.status}`);
    return undefined;
  }
  const body = (await res.json()) as { access_token: string; expires_in: number };
  token = { value: body.access_token, expires: Date.now() + body.expires_in * 1000 };
  return token.value;
}

async function helix<T>(path: string, signal: AbortSignal): Promise<T[] | undefined> {
  const bearer = await appToken(signal);
  if (!bearer) return undefined;
  const res = await fetch(`${HELIX}${path}`, { headers: { Authorization: `Bearer ${bearer}`, 'Client-Id': config.twitch.clientId! }, signal });
  if (res.status === 401) token = undefined;
  if (!res.ok) return undefined;
  return ((await res.json()) as { data: T[] }).data;
}

export type TwitchClip = {
  id: string;
  url: string;
  broadcaster_name: string;
  title: string;
  view_count: number;
  created_at: string;
  thumbnail_url: string;
  duration: number;
  language: string;
};

// One clip by its slug, or undefined when it is gone (or Twitch is not set up).
export async function getClip(slug: string, signal: AbortSignal = AbortSignal.timeout(10000)): Promise<TwitchClip | undefined> {
  return (await helix<TwitchClip>(`/clips?id=${encodeURIComponent(slug)}`, signal))?.[0];
}

// A sequel marker after a name: "Grand Theft Auto" is not "Grand Theft Auto VI".
const SEQUEL = /^(?:[ivx]+|\d+)$/;

// The category the pin is about, of the ones Twitch's search offers. The work's
// own title (or product name) must be the category's name; the pin's title,
// which carries more words ("Elden Ring Shadow of the Erdtree Release"), must
// start with it and not go on to a sequel number, so a game with no category of
// its own (an unreleased one) is not given its predecessor's clips.
async function categoryOf(subject: ClipSubject, signal: AbortSignal): Promise<{ id: string; name: string } | undefined> {
  const named = [subject.workTitle, subject.productName].filter((n): n is string => !!n?.trim());
  const candidates = [...named.map((name) => ({ name, exact: true })), { name: subject.title, exact: false }];
  for (const { name, exact } of candidates) {
    const found = await helix<{ id: string; name: string }>(`/search/categories?query=${encodeURIComponent(name)}&first=10`, signal);
    const text = normalizeTitle(name, { keepThe: true });
    const match = (found ?? [])
      .filter((c) => {
        const category = normalizeTitle(c.name, { keepThe: true });
        if (category.length <= 3) return false;
        if (exact) return category === text;
        return text.startsWith(`${category} `) && !SEQUEL.test(text.slice(category.length + 1).split(' ')[0]);
      })
      .sort((a, b) => b.name.length - a.name.length)[0];
    if (match) return match;
  }
  return undefined;
}

const slugOf = (url: string) => url.match(/\/clip\/([\w-]+)/)?.[1] ?? url.split('/').pop()!;

export function clipMedium(clip: TwitchClip): MediumJson {
  const login = clip.url.match(/twitch\.tv\/(\w+)\/clip\//)?.[1];
  return {
    type: mediumID.youtube,
    originalUrl: embedUrl('twitch', slugOf(clip.url)),
    authorName: clip.broadcaster_name,
    authorUrl: login ? `https://www.twitch.tv/${login}` : undefined,
  };
}

export function clipReference(clip: TwitchClip, category: string): PinReferenceJson {
  return {
    url: clip.url,
    title: `${clip.title} - ${clip.broadcaster_name} playing ${category} (Twitch clip)`,
    // Gameplay shows the game is out and played; it says nothing of the date.
    confidence: 40,
    publishedDate: clip.created_at.slice(0, 10),
    reasoning: `A ${clip.view_count.toLocaleString('en-US')}-view Twitch clip of ${category} gameplay: evidence that the game is playable, not a source for the event or its date.`,
  };
}

export type ClipSubject = { title: string; workTitle?: string | null; productName?: string | null };

export async function findGameClip(
  subject: ClipSubject,
  signal: AbortSignal = AbortSignal.timeout(15000),
): Promise<{ medium: MediumJson; reference: PinReferenceJson } | undefined> {
  if (!twitchConfigured()) return undefined;
  try {
    const category = await categoryOf(subject, signal);
    if (!category) return undefined;
    const since = new Date(Date.now() - CLIP_SEARCH_DAYS * 864e5);
    // ended_at is needed alongside started_at, or Twitch looks one week ahead.
    const window = `&started_at=${since.toISOString()}&ended_at=${new Date().toISOString()}`;
    const best = async (extra: string) =>
      ((await helix<TwitchClip>(`/clips?game_id=${category.id}&first=50${extra}`, signal)) ?? [])
        .filter((c) => c.duration <= LONGEST_CLIP_SECONDS)
        .sort((a, b) => b.view_count - a.view_count)[0];
    // A game with no clip this year (an older one) falls back to its all-time best.
    const clip = (await best(window)) ?? (await best(''));
    return clip ? { medium: clipMedium(clip), reference: clipReference(clip, category.name) } : undefined;
  } catch (err) {
    log.warn('twitch clip lookup failed:', (err as Error).message);
    return undefined;
  }
}

export const isTwitchClipUrl = (url: string | undefined | null) => videoSource(url)?.provider === 'twitch';
