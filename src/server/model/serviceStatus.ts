// ServiceStatus (0250): the vendor health shown on AI model pins. Refreshed on view
// from StatusGator's service page when the stored row is older than the TTL; a failed
// fetch keeps the old row (stale beats blank) and is retried after a short back-off.

import * as db from '../db';
import { OFFICIAL_STATUS_HOSTS, parseStatuspage, parseStatusGator, serviceForTitle, statusGatorUrl, type ServiceStatusJson } from '@/lib/serviceStatus';

const TTL_MS = 10 * 60_000;
const RETRY_MS = 2 * 60_000;
const retryAt = new Map<string, number>();
const inFlight = new Map<string, Promise<void>>();

type Row = Omit<ServiceStatusJson, 'uptimePct' | 'checkedAt'> & { uptimePct: string | null; checkedAt: Date };

async function stored(slug: string): Promise<Row | null> {
  const [row] = await db.query<Row>(`SELECT * FROM "ServiceStatus" WHERE "slug" = $1`, [slug]);
  return row ?? null;
}

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; ChronopinStatus/1.0)' };

async function json(url: string): Promise<any> {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

// The vendor's own status page first, StatusGator when it has no API or it fails.
async function read(slug: string, name: string) {
  const host = OFFICIAL_STATUS_HOSTS[slug];
  if (host) {
    try {
      const [summary, recent] = await Promise.all([json(`https://${host}/api/v2/summary.json`), json(`https://${host}/api/v2/incidents.json`)]);
      const official = parseStatuspage(summary, recent, slug, name, host);
      if (official) return official;
    } catch { /* fall through to StatusGator */ }
  }
  const res = await fetch(statusGatorUrl(slug), { headers: HEADERS, signal: AbortSignal.timeout(8000) });
  return res.ok ? parseStatusGator(await res.text(), slug, name) : null;
}

async function refresh(slug: string, name: string): Promise<void> {
  try {
    const parsed = await read(slug, name);
    if (!parsed) { retryAt.set(slug, Date.now() + RETRY_MS); return; }
    await db.query(
      `INSERT INTO "ServiceStatus" ("slug","name","status","headline","uptimePct","downMinutes","degradedMinutes","days","incidents","source","sourceUrl","checkedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11,now())
       ON CONFLICT ("slug") DO UPDATE SET "name"=EXCLUDED."name","status"=EXCLUDED."status","headline"=EXCLUDED."headline","uptimePct"=EXCLUDED."uptimePct",
         "downMinutes"=EXCLUDED."downMinutes","degradedMinutes"=EXCLUDED."degradedMinutes","days"=EXCLUDED."days","incidents"=EXCLUDED."incidents","source"=EXCLUDED."source","sourceUrl"=EXCLUDED."sourceUrl","checkedAt"=now()`,
      [slug, parsed.name, parsed.status, parsed.headline, parsed.uptimePct, parsed.downMinutes, parsed.degradedMinutes, JSON.stringify(parsed.days), JSON.stringify(parsed.incidents), parsed.source, parsed.sourceUrl],
    );
  } catch {
    retryAt.set(slug, Date.now() + RETRY_MS);
  }
}

// The status for a model pin's title, or null when the title names no tracked service.
export async function serviceStatusForTitle(title: string): Promise<ServiceStatusJson | null> {
  const service = serviceForTitle(title);
  if (!service) return null;
  let row = await stored(service.slug);
  const stale = !row || Date.now() - new Date(row.checkedAt).getTime() > TTL_MS;
  if (stale && (retryAt.get(service.slug) ?? 0) < Date.now()) {
    let job = inFlight.get(service.slug);
    if (!job) { job = refresh(service.slug, service.name).finally(() => inFlight.delete(service.slug)); inFlight.set(service.slug, job); }
    await job;
    row = await stored(service.slug);
  }
  return row ? { ...row, uptimePct: row.uptimePct == null ? null : Number(row.uptimePct), checkedAt: new Date(row.checkedAt).toISOString() } : null;
}

// Not a preview, beta, announcement-only or retirement pin: a model customers can use.
const NOT_GA = /\b(preview|beta|experimental|retire[sd]?|deprecat\w*|shut(s| down)|predicted|announces?|announced|unveil\w*)\b/i;

// True when the pin is a generally released model with no later released *model* pin
// further down its thread (a product chain's non-model launches do not replace it).
export async function isLatestRelease(pinId: number): Promise<boolean> {
  const rows = await db.query<{ id: number; title: string; start: Date; predicted: boolean; model: boolean }>(
    `WITH RECURSIVE chain AS (
       SELECT "id", "title", "utcStartDateTime" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL
       UNION ALL
       SELECT c."id", c."title", c."utcStartDateTime" FROM "Pin" c JOIN chain ON c."parentId" = chain."id" WHERE c."utcDeletedDateTime" IS NULL
     )
     SELECT chain."id", chain."title", chain."utcStartDateTime" AS "start",
       EXISTS (SELECT 1 FROM "PinTag" t WHERE t."pinId" = chain."id" AND t."name" IN ('Predicted', 'Prediction Market', 'Polymarket', 'Kalshi')) AS "predicted",
       EXISTS (SELECT 1 FROM "PinTag" t WHERE t."pinId" = chain."id" AND t."name" = 'AI Models') AS "model"
     FROM chain`,
    [pinId],
  );
  const released = (row: { title: string; start: Date; predicted: boolean }) => !row.predicted && new Date(row.start).getTime() <= Date.now() && !NOT_GA.test(row.title);
  const self = rows.find((row) => row.id === pinId);
  return !!self && released(self) && !rows.some((row) => row.id !== pinId && row.model && released(row));
}
