import getVideoId from 'get-video-id';
import { HttpError } from '../util/httpError';

// A YouTube video's captions as plain text. The Data API's captions.download
// only serves videos the caller owns (OAuth), so this reads the caption
// tracks the player itself gets. The ANDROID client still hands those out
// without a proof-of-origin token; the WEB client no longer does.
const PLAYER_URL = 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false';
const PLAYER_CLIENT = { clientName: 'ANDROID', clientVersion: '20.10.38', androidSdkVersion: 30 };
const FETCH_TIMEOUT_MS = 15000;

export interface TranscriptTrack {
  languageCode: string;
  name: string;
  // Speech recognition rather than captions someone wrote.
  isGenerated: boolean;
}

export interface TranscriptSegment {
  start: number; // seconds
  duration: number; // seconds
  text: string;
}

export interface Transcript {
  videoId: string;
  title?: string;
  channel?: string;
  lengthSeconds?: number;
  track: TranscriptTrack;
  tracks: TranscriptTrack[];
  segments: TranscriptSegment[];
  text: string;
}

interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  kind?: string;
  name?: { runs?: { text: string }[]; simpleText?: string };
}

export async function fetchTranscript(videoUrlOrId: string, lang?: string): Promise<Transcript> {
  const videoId = videoIdOf(videoUrlOrId);
  if (!videoId) {
    throw new HttpError(400, `No YouTube video id in ${videoUrlOrId}`);
  }
  const player = await postPlayer(videoId);
  const status = player?.playabilityStatus?.status;
  if (status && status !== 'OK') {
    throw new HttpError(404, `Video ${videoId} is not available (${player.playabilityStatus.reason || status})`);
  }
  const captionTracks: CaptionTrack[] = player?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  const chosen = pickTrack(captionTracks, lang);
  if (!chosen) {
    throw new HttpError(404, `Video ${videoId} has no ${captionTracks.length ? `"${lang}" ` : ''}captions`);
  }
  const res = await fetch(withFormat(chosen.baseUrl, 'srv3'), { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) {
    throw new Error(`Caption track for ${videoId} failed with ${res.status}`);
  }
  const segments = parseTimedText(await res.text());
  const details = player.videoDetails ?? {};
  return {
    videoId,
    title: details.title,
    channel: details.author,
    lengthSeconds: details.lengthSeconds ? Number(details.lengthSeconds) : undefined,
    track: toTrack(chosen),
    tracks: captionTracks.map(toTrack),
    segments,
    text: segments.map((s) => s.text).join(' '),
  };
}

// Accepts a bare 11-character id as well as any URL form get-video-id knows.
export function videoIdOf(value: string): string | undefined {
  const trimmed = value.trim();
  if (/^[\w-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const { id, service } = getVideoId(trimmed);
  return service === 'youtube' && id ? id : undefined;
}

// The requested language (exact, then its base language), else English, else
// the first track; within a language a written track beats speech recognition.
export function pickTrack<T extends Pick<CaptionTrack, 'languageCode' | 'kind'>>(tracks: T[], lang?: string): T | undefined {
  const byWritten = (list: T[]) => list.find((t) => t.kind !== 'asr') ?? list[0];
  const inLanguage = (code: string) => {
    const base = code.toLowerCase().split('-')[0];
    const exact = tracks.filter((t) => t.languageCode.toLowerCase() === code.toLowerCase());
    return byWritten(exact.length ? exact : tracks.filter((t) => t.languageCode.toLowerCase().split('-')[0] === base));
  };
  if (lang) {
    return inLanguage(lang);
  }
  return inLanguage('en') ?? byWritten(tracks);
}

// srv3 timed text: <p t="ms" d="ms">…</p>, where speech-recognition tracks
// split each line into <s> word spans and add empty <p> line breaks.
export function parseTimedText(xml: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  for (const [, attrs, body] of xml.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/g)) {
    const text = decodeEntities(body.replace(/<[^>]+>/g, ''))
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) {
      continue;
    }
    const start = Number(/\bt="(\d+)"/.exec(attrs)?.[1] ?? 0);
    const duration = Number(/\bd="(\d+)"/.exec(attrs)?.[1] ?? 0);
    segments.push({ start: start / 1000, duration: duration / 1000, text });
  }
  return segments;
}

function decodeEntities(value: string): string {
  const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return value.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (entity, code: string) => {
    if (code[0] === '#') {
      const point = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      return Number.isFinite(point) ? String.fromCodePoint(point) : entity;
    }
    return named[code.toLowerCase()] ?? entity;
  });
}

function withFormat(baseUrl: string, fmt: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set('fmt', fmt);
  return url.toString();
}

function toTrack(track: CaptionTrack): TranscriptTrack {
  const name = track.name?.simpleText ?? track.name?.runs?.map((r) => r.text).join('') ?? track.languageCode;
  return { languageCode: track.languageCode, name, isGenerated: track.kind === 'asr' };
}

async function postPlayer(videoId: string): Promise<any> {
  const res = await fetch(PLAYER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context: { client: { ...PLAYER_CLIENT, hl: 'en' } }, videoId }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`YouTube player lookup for ${videoId} failed with ${res.status}`);
  }
  return res.json();
}
