import getVideoId from 'get-video-id';
import { urlKey } from '@/lib/citations';

// The links someone pinning a page puts in their note (the quick form,
// src/components/forms/QuickPinForm.tsx), sorted into what the scrape does
// with each: media go through the same steps as the page's own (./index.ts,
// addNoteMedia); every other link is left in the note for the reference
// search, which fetches it and keeps it if it backs the event up.

// More than this many links in a note are ignored.
const MAX_LINKS = 10;
const PROBE_MS = 5000;
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';

export type NoteLink = { url: string; kind: 'youtube' | 'tweet' | 'image' | 'page' };

// Each http(s) link in the note once, in order, leaving out the page itself.
// Prose can trail punctuation onto a link; it is not part of it.
export function linksInNote(note: string | undefined, pageUrl: string): string[] {
  const seen = new Set([urlKey(pageUrl)]);
  const links: string[] = [];
  for (const match of (note || '').match(/https?:\/\/[^\s<>"'`]+/gi) || []) {
    const url = match.replace(/[.,;:!?)\]}]+$/, '');
    const key = urlKey(url);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    links.push(url);
    if (links.length === MAX_LINKS) break;
  }
  return links;
}

// Which kind a link is by its address alone, or undefined when only asking
// the server can tell (a picture need not end in .jpg).
export function kindByAddress(url: string): NoteLink['kind'] | undefined {
  let host: string;
  try {
    host = new URL(url).hostname.replace(/^(www|m|mobile)\./, '');
  } catch {
    return 'page';
  }
  if (/^(youtube\.com|youtu\.be)$/.test(host)) return getVideoId(url).id ? 'youtube' : 'page';
  if (/^(twitter\.com|x\.com)$/.test(host)) return /\/status(?:es)?\/\d+/.test(url) ? 'tweet' : 'page';
  return undefined;
}

// Whether the link answers with a picture. Unreachable reads as not.
async function isImage(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'image/*,*/*;q=0.8' }, signal: AbortSignal.timeout(PROBE_MS) });
    await res.body?.cancel().catch(() => undefined);
    return res.ok && /^image\//i.test(res.headers.get('content-type') || '');
  } catch {
    return false;
  }
}

export async function noteLinks(note: string | undefined, pageUrl: string): Promise<NoteLink[]> {
  return Promise.all(
    linksInNote(note, pageUrl).map(async (url): Promise<NoteLink> => ({ url, kind: kindByAddress(url) ?? ((await isImage(url)) ? 'image' : 'page') })),
  );
}
