import * as db from '../db';
import { SignJWT } from 'jose';
import { signToken } from '../auth';
import { sentimentHash, type SentimentText } from '../model/pinSentiment';
import { REVIEW_TABLES, type PinReview, type ReviewTable } from '@/lib/pinReviews';
import { curatorId, isCurator } from './curators';
export { isCurator };
import { productionWrite } from './productionWrites';

// The daily jobs save through the app's own HTTP API, as a curator, because a
// save anywhere else skips the live feed, the search index, the duplicate
// checks, threading and tag sync (docs/okf/scraping/strategy.md, principle 7).
// The token is signed here for the curator, so no password is ever handled.

// The app on this machine: reads, scrapes (headless Chrome and the pipeline
// run here, never on the small production VM) and the signals all come from it.
export function apiBase(): string {
  return (process.env.JOBS_API_BASE || `http://127.0.0.1:${process.env.PORT || 3000}`).replace(/\/$/, '');
}

// Production, when the run is set to write there (owner, 2026-09-29: the
// daily jobs' pins and edits belong on prod). JOBS_PROD_BASE is its address
// (https://www.chronopin.com) and JOBS_PROD_SESSION_SECRET its SESSION_SECRET,
// so curator tokens are signed as they are locally and no password is handled.
// Both are set in .env.local, never committed. Local ids match production's
// only after `npm run db:pull-prod`, so pull before a run. The owner requests
// no automatic production-to-local sync after a job (2026-10-06).
export function prodBase(): string | null {
  const base = process.env.JOBS_PROD_BASE?.trim().replace(/\/$/, '');
  if (!base) return null;
  if (!process.env.JOBS_PROD_SESSION_SECRET) throw new Error('JOBS_PROD_BASE is set but JOBS_PROD_SESSION_SECRET is not');
  return base;
}

// Where pins are read for editing and written: production when set, else here.
const writeBase = () => prodBase() ?? apiBase();

export class ApiCallError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function call<T>(
  method: string,
  path: string,
  { token, body, timeoutMs = 180000, base = writeBase() }: { token?: string; body?: unknown; timeoutMs?: number; base?: string } = {},
): Promise<T> {
  const request = async (): Promise<T> => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await response.text();
    if (!response.ok) throw new ApiCallError(response.status, `${method} ${path} answered ${response.status}: ${text.slice(0, 500)}`);
    return (text ? JSON.parse(text) : null) as T;
  };
  const production = process.env.JOBS_PROD_BASE?.trim().replace(/\/$/, '');
  return method !== 'GET' && base === production ? productionWrite(request) : request();
}

async function tokenFor(handle: string): Promise<string> {
  const id = await curatorId(handle);
  if (!id) throw new ApiCallError(400, `${handle} is not a curator account on this database`);
  if (prodBase()) {
    return new SignJWT({ id })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime('5h')
      .sign(new TextEncoder().encode(process.env.JOBS_PROD_SESSION_SECRET));
  }
  return signToken(id);
}

// The scrape runs on this machine even when the pin will be posted to
// production, so it needs a token the local app accepts.
async function localTokenFor(handle: string): Promise<string> {
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
  return call<Record<string, any>>('POST', '/api/scrape', { token: await localTokenFor(curator), body: { url, note }, timeoutMs: 240000, base: apiBase() });
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

// The two below replay local readings through their dedicated endpoints as
// the pin's author, without rewriting the rest of the pin. They do
// nothing unless the run writes to production, and a failure is logged by the
// caller, not fatal: the local copy stays and the next push can repeat it.

// A reading of an event's performers and tickets (PUT /api/pins/:id/event-info).
export async function pushEventInfo(pinId: number, reading: { fields: Record<string, unknown>; source: string; sourceUrl?: string | null }): Promise<boolean> {
  if (!prodBase()) return false;
  const pin = await getPin(pinId);
  if (!isCurator(pin.user?.userName)) return false;
  await call('PUT', `/api/pins/${pinId}/event-info`, { token: await tokenFor(pin.user!.userName), body: { ...reading.fields, source: reading.source, sourceUrl: reading.sourceUrl ?? null } });
  return true;
}

// A pin's tone score uses the lightweight score endpoint, never a full pin
// PUT (which also starts search, media, source-wiki and other save work).
// The server checks ownership and the hash again at the time of the write.
export async function pushSentiment(pinId: number, sentiment: number, product: string | undefined, scored: SentimentText): Promise<boolean> {
  if (!prodBase()) return false;
  const pin = await getPin(pinId);
  if (!isCurator(pin.user?.userName)) return false;
  if (sentimentHash({ title: pin.title, description: pin.description ?? null }) !== sentimentHash(scored)) return false;
  const result = await call<{ saved: number; refused: { id: number; reason: string }[] }>('PUT', '/api/pins/sentiments', {
    token: await tokenFor(pin.user!.userName),
    body: [{ id: pinId, sentiment, textHash: sentimentHash(scored), ...(product !== undefined ? { product } : {}) }],
  });
  return result.saved === 1;
}


// A model pin's rubric or spec tables, replayed to production through their
// own endpoints as the pin's author (the modelRubrics task saves locally
// first). Nothing happens unless the run writes to production.
export async function pushModelPerf(pinId: number, endpoint: 'llm-performance' | 'video-performance' | 'performance', body: Record<string, unknown>): Promise<boolean> {
  if (!prodBase()) return false;
  const pin = await getPin(pinId);
  if (!isCurator(pin.user?.userName)) return false;
  await call('PUT', `/api/pins/${pinId}/${endpoint}`, { token: await tokenFor(pin.user!.userName), body });
  return true;
}

// Only the sponsored translation endpoints: these are admin operations,
// signed as the existing admin on the job database (same IDs as production).
export async function sponsoredTranslationRequest(method: 'GET' | 'POST', path: string, body?: unknown) {
  if (!/^\/api\/admin\/sponsored-ads\/(?:translations(?:\?[^#]*)?|[1-9]\d*\/translations)$/.test(path)) throw new Error('Not a sponsored translation endpoint');
  const [admin] = await db.query<{ id: number }>(`SELECT "id" FROM "User" WHERE "role" = 'admin' ORDER BY "id" LIMIT 1`);
  if (!admin) throw new Error('No admin account available for ad translations');
  const token = prodBase()
    ? await new SignJWT({ id: admin.id }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setIssuedAt().setExpirationTime('5h').sign(new TextEncoder().encode(process.env.JOBS_PROD_SESSION_SECRET))
    : await signToken(admin.id);
  return call<Record<string, any>>(method, path, { token, body });
}


async function adminToken(why: string): Promise<string> {
  const [admin] = await db.query<{ id: number }>(`SELECT "id" FROM "User" WHERE "role" = 'admin' ORDER BY "id" LIMIT 1`);
  if (!admin) throw new Error(`No admin account available for ${why}`);
  return prodBase()
    ? await new SignJWT({ id: admin.id }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setIssuedAt().setExpirationTime('5h').sign(new TextEncoder().encode(process.env.JOBS_PROD_SESSION_SECRET))
    : await signToken(admin.id);
}

// An industry forecast row, or a replacement of its survey lines, on
// production's admin endpoint (the industryForecasts task). Nothing happens
// unless the run writes to production.
export async function industryForecastRequest(body: Record<string, unknown>): Promise<boolean> {
  if (!prodBase()) return false;
  await call('PUT', '/api/admin/industry-forecasts', { token: await adminToken('industry forecasts'), body });
  return true;
}

// Sends campaign finance (a batch of people with their cycles, named by
// bioguide id) to production's admin endpoint (the personCampaigns task).
export async function personCampaignsRequest(people: unknown[]) {
  return call<{ saved: number; missing: string[] }>('POST', '/api/admin/person-campaigns', { token: await adminToken('person campaigns'), body: { people } });
}

// Sends disclosed stock trades to production's admin endpoint, signed as the
// existing admin (the personTrades task). Only that one endpoint.
export async function personTradesRequest(filings: unknown[]) {
  const [admin] = await db.query<{ id: number }>(`SELECT "id" FROM "User" WHERE "role" = 'admin' ORDER BY "id" LIMIT 1`);
  if (!admin) throw new Error('No admin account available for person trades');
  const token = prodBase()
    ? await new SignJWT({ id: admin.id }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setIssuedAt().setExpirationTime('5h').sign(new TextEncoder().encode(process.env.JOBS_PROD_SESSION_SECRET))
    : await signToken(admin.id);
  return call<{ added: number; missing: string[] }>('POST', '/api/admin/person-trades', { token, body: { filings } });
}

// The tag backfill for goods pins (productLifecycle.ts): reads of Pin and
// PinTag and writes of PinTag rows through the admin DB API, signed as the
// existing admin. Nothing else.
export async function adminDbRequest<T = Record<string, any>>(method: 'GET' | 'POST' | 'DELETE', path: string, body?: unknown): Promise<T> {
  if (!/^\/api\/admin\/db\/(?:Pin|PinTag)(?:\?[^#]*)?$/.test(path)) throw new Error('Not a Pin or PinTag admin table path');
  if (method !== 'GET' && !path.startsWith('/api/admin/db/PinTag')) throw new Error('Only PinTag rows may be written');
  const [admin] = await db.query<{ id: number }>(`SELECT "id" FROM "User" WHERE "role" = 'admin' ORDER BY "id" LIMIT 1`);
  if (!admin) throw new Error('No admin account available');
  const token = await new SignJWT({ id: admin.id }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setIssuedAt().setExpirationTime('5h').sign(new TextEncoder().encode(process.env.JOBS_PROD_SESSION_SECRET));
  return call<T>(method, path, { token, body, base: prodBase()! });
}

// A scraped review's sentiment (PinReview.sentiment) on production: the row's
// reviews are read there, the score goes on the review with this url when it
// has none, and the column is patched through the admin table API, so nothing
// else in the rubric is replaced. Nothing unless the run writes to production;
// the job database shares production's pin ids.
export async function pushReviewSentiment(table: ReviewTable, pinId: number, scores: { url: string; sentiment: number }[]): Promise<boolean> {
  const base = prodBase();
  if (!base || !(REVIEW_TABLES as readonly string[]).includes(table)) return false;
  const [admin] = await db.query<{ id: number }>(`SELECT "id" FROM "User" WHERE "role" = 'admin' ORDER BY "id" LIMIT 1`);
  if (!admin) throw new Error('No admin account available');
  const token = await new SignJWT({ id: admin.id }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setIssuedAt().setExpirationTime('5h').sign(new TextEncoder().encode(process.env.JOBS_PROD_SESSION_SECRET));
  const there = await call<{ rows: { reviews: PinReview[] | string }[] }>('GET', `/api/admin/db/${table}?pinId=${pinId}&limit=1`, { token, base });
  const row = there.rows?.[0];
  if (!row) return false;
  const reviews: PinReview[] = typeof row.reviews === 'string' ? JSON.parse(row.reviews) : row.reviews;
  const byUrl = new Map(scores.map((s) => [s.url, s.sentiment]));
  let changed = 0;
  for (const review of reviews) {
    const value = byUrl.get(review.url);
    if (review.sentiment == null && value != null) {
      review.sentiment = value;
      changed++;
    }
  }
  if (!changed) return false;
  await call('PATCH', `/api/admin/db/${table}?pinId=${pinId}`, { token, base, body: { reviews } });
  return true;
}
