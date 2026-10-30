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

// Routine researched maintenance is authorized for every author (AGENTS.md).
// The native PUT preserves ownership; use admin when the curator list excludes it.
export async function updatePin(id: number, patch: PinPatch): Promise<PinJson> {
  const pin = await getPin(id);
  const author = pin.user?.userName;
  const token = isCurator(author) ? await tokenFor(author!) : await adminToken('routine pin maintenance');
  await call<PinJson>('PUT', `/api/pins/${id}`, { token, body: mergePatch(pin, patch) });
  const saved = await getPin(id);
  const owner = (p: PinJson) => p.user?.id ?? p.userId ?? p.user?.userName ?? null;
  if (owner(saved) !== owner(pin)) throw new Error(`Pin ${id}: author changed during maintenance; inspect the saved record`);
  return saved;
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
  if (sentimentHash({ title: pin.title, description: pin.description ?? null }) !== sentimentHash(scored)) return false;
  const result = await call<{ saved: number; refused: { id: number; reason: string }[] }>('PUT', '/api/pins/sentiments', {
    token: isCurator(pin.user?.userName) ? await tokenFor(pin.user!.userName) : await adminToken('routine sentiment maintenance'),
    body: [{ id: pinId, sentiment, textHash: sentimentHash(scored), ...(product !== undefined ? { product } : {}) }],
  });
  return result.saved === 1;
}


// Replay enrichment by source identity, since production ids can differ.
// Admin maintenance preserves ownership, including non-curator authors.
export async function pushModelPerf(pinId: number, endpoint: 'llm-performance' | 'video-performance' | 'performance' | 'competitors' | 'factory', body: Record<string, unknown> | unknown[]): Promise<boolean> {
  if (!prodBase()) return false;
  const [local] = await db.query<{ sourceUrl: string | null }>(`SELECT "sourceUrl" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [pinId]);
  if (!local?.sourceUrl) throw new Error(`Pin ${pinId}: missing sourceUrl for production enrichment`);
  const token = await adminToken('model and product enrichment');
  const found = await call<{ rows: { id: number }[] }>('GET', `/api/admin/db/Pin?sourceUrl=${encodeURIComponent(local.sourceUrl)}&utcDeletedDateTime.null=true&limit=2`, { token });
  if (found.rows.length !== 1) throw new Error(`Pin ${pinId}: production sourceUrl is missing or ambiguous`);
  const id = found.rows[0].id;
  const before = await getPin(id);
  const path = `/api/pins/${id}/${endpoint}`;
  let payload = body;
  if (endpoint === 'performance' && !Array.isArray(body)) {
    const current = await call<{ charts: unknown[]; tables: unknown[] } | null>('GET', path, { token });
    payload = { charts: current?.charts ?? [], tables: current?.tables ?? [], ...body };
  }
  await call('PUT', path, { token, body: payload });
  const saved = await call<Record<string, unknown> | unknown[]>('GET', path, { token });
  // Responses may add timestamps, review sentiments and linked pin objects.
  const contains = (actual: unknown, expected: unknown): boolean => {
    if (Array.isArray(expected)) return Array.isArray(actual) && actual.length === expected.length && expected.every((item, i) => contains(actual[i], item));
    if (expected && typeof expected === 'object') return !!actual && typeof actual === 'object' && Object.entries(expected).every(([key, value]) => contains((actual as Record<string, unknown>)[key], value));
    return actual === expected;
  };
  // Competitor GET returns nested linked pins rather than competitorPinId.
  if (endpoint !== 'competitors' && !contains(saved, payload)) throw new Error(`Pin ${id}: ${endpoint} readback verification failed`);
  const after = await getPin(id);
  if (after.user?.userName !== before.user?.userName) throw new Error(`Pin ${id}: author changed during enrichment`);
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

// Review maintenance uses the native pin endpoints, as admin, without changing
// the original author. Local research ids must be resolved by sourceUrl before
// calling this against production.
export async function reviewResearchRequest<T>(method: 'GET' | 'PUT' | 'POST', path: string, body?: unknown, production = false): Promise<T> {
  const review = /^\/api\/pins\/\d+\/(?:taste|car-performance|gas-car-performance|aircraft-performance|llm-performance|video-performance|hotel|dining|critic-reviews)$/.test(path);
  const evidence = /^\/api\/pins\/\d+\/references$/.test(path) || path === '/api/admin/source-wikis';
  const links = /^\/api\/admin\/db\/(?:Source|PinSource)(?:\?[^#]*)?$/.test(path);
  if (!((review && method !== 'POST') || (evidence && method === 'POST') || (links && method !== 'PUT'))) throw new Error('Not a pin review or review evidence endpoint');
  const [admin] = await db.query<{ id: number }>(`SELECT "id" FROM "User" WHERE "role" = 'admin' ORDER BY "id" LIMIT 1`);
  if (!admin) throw new Error('No admin account available for review research');
  const base = production ? prodBase() : apiBase();
  if (!base) throw new Error('Production is not configured');
  const token = production
    ? await new SignJWT({ id: admin.id }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setIssuedAt().setExpirationTime('5h').sign(new TextEncoder().encode(process.env.JOBS_PROD_SESSION_SECRET))
    : await signToken(admin.id);
  return call<T>(method, path, { token, body, base });
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

// Premium trader positions to production's admin endpoint (the traderPositions
// task). Production pushes them to its own premium subscribers.
export async function traderPositionsRequest(positions: unknown[]) {
  if (!prodBase()) return null;
  return call<{ added: number[]; skipped: number }>('POST', '/api/admin/traders', { token: await adminToken('trader positions'), body: { positions } });
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

// A storm pin's track (PinFlightPath): a pin update leaves the path alone, so
// the storm_tracks task writes it itself, as admin on production through the
// admin table API (an upsert on the pin's one row), or into the local table.
export async function saveFlightPathRow(pinId: number, path: { label: string; sourceUrl: string; estimated: boolean; points: [number, number][] }): Promise<void> {
  const base = prodBase();
  if (!base) {
    const { saveFlightPath } = await import('../services/pinFlightPath');
    await saveFlightPath(pinId, path);
    return;
  }
  // The table's key is its own id, so the pin's row is patched by pinId, or inserted when it has none yet.
  const token = await adminToken('storm tracks');
  const row = { label: path.label, sourceUrl: path.sourceUrl, estimated: path.estimated, points: path.points };
  const patched = await call<{ rows?: unknown[] }>('PATCH', `/api/admin/db/PinFlightPath?pinId=${pinId}`, { token, base, body: row });
  if (!patched.rows?.length) await call('POST', '/api/admin/db/PinFlightPath', { token, base, body: [{ pinId, ...row }] });
}
