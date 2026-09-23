import { signToken } from '../auth';
import { curatorId, isCurator } from './curators';

// The daily jobs save through the app's own HTTP API, as a curator, because a
// save anywhere else skips the live feed, the search index, the duplicate
// checks, threading and tag sync (docs/okf/scraping/strategy.md, principle 7).
// The token is signed here for the curator, so no password is ever handled.

export function apiBase(): string {
  return (process.env.JOBS_API_BASE || `http://127.0.0.1:${process.env.PORT || 3000}`).replace(/\/$/, '');
}

export class ApiCallError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function call<T>(method: string, path: string, { token, body, timeoutMs = 180000 }: { token?: string; body?: unknown; timeoutMs?: number } = {}): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await response.text();
  if (!response.ok) throw new ApiCallError(response.status, `${method} ${path} answered ${response.status}: ${text.slice(0, 500)}`);
  return (text ? JSON.parse(text) : null) as T;
}

async function tokenFor(handle: string): Promise<string> {
  const id = await curatorId(handle);
  if (!id) throw new ApiCallError(400, `${handle} is not a curator account on this database`);
  return signToken(id);
}

export type PinJson = Record<string, any> & { id: number; title: string; user?: { id: number; userName: string } };

export function getPin(id: number): Promise<PinJson> {
  return call<PinJson>('GET', `/api/pins/${id}`);
}

// The app's whole scrape of a URL: headless Chrome, the page's own metadata,
// pictures and embeds, image top-up, screen extras, the extractor (or
// llmTasks when the key has no credit). Needs a signed-in user; the curator
// the pin would be posted as is the natural one.
export async function scrapeUrl(url: string, curator: string, note?: string) {
  return call<Record<string, any>>('POST', '/api/scrape', { token: await tokenFor(curator), body: { url, note }, timeoutMs: 240000 });
}

export async function createPin(curator: string, body: Record<string, unknown>): Promise<PinJson> {
  return call<PinJson>('POST', '/api/pins', { token: await tokenFor(curator), body });
}

export type PinPatch = Record<string, unknown> & {
  addReferences?: Record<string, unknown>[];
  addMedia?: Record<string, unknown>[];
  removeMediumIds?: number[];
};

// A pin's whole body with the patch applied, for PUT: the route re-saves
// media, merchants and references wholesale, so anything not sent back is
// lost (docs/okf/scraping/strategy.md, "Which pins respond to which").
// Only the pin's own user tags go back, since award tags are derived.
export function mergePatch(pin: PinJson, patch: PinPatch): Record<string, unknown> {
  const { addReferences, addMedia, removeMediumIds, ...fields } = patch;
  const body: Record<string, unknown> = { ...pin, ...fields };
  if (!('tags' in fields) && Array.isArray(pin.tags)) {
    body.tags = pin.tags.filter((t: { source?: string }) => t.source !== 'auto').map((t: { name: string }) => t.name);
  }
  if (addReferences?.length) {
    const known = new Set((pin.references ?? []).map((r: { url: string }) => r.url));
    body.references = [...(pin.references ?? []), ...addReferences.filter((r) => !known.has(String(r.url)))];
  }
  let media = (body.media as Record<string, unknown>[] | undefined) ?? [];
  if (removeMediumIds?.length) media = media.filter((m) => !removeMediumIds.includes(Number(m.id)));
  if (addMedia?.length) media = [...media, ...addMedia];
  body.media = media;
  return body;
}

// Edits a pin a curator posted, as that curator. Anyone else's pin is not the
// job's to change: the caller marks it for revisiting instead.
export async function updatePin(id: number, patch: PinPatch): Promise<PinJson> {
  const pin = await getPin(id);
  const author = pin.user?.userName;
  if (!isCurator(author)) {
    throw new ApiCallError(403, `Pin ${id} is by ${author ?? 'an unknown user'}, not a curator; mark it for revisiting instead of editing it.`);
  }
  return call<PinJson>('PUT', `/api/pins/${id}`, { token: await tokenFor(author!), body: mergePatch(pin, patch) });
}
