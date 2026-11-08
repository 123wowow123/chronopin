// ServiceStatus (0250): the vendor health shown on AI model pins. Refreshed on view
// from StatusGator's service page when the stored row is older than the TTL; a failed
// fetch keeps the old row (stale beats blank) and is retried after a short back-off.

import * as db from '../db';
import { parseStatusGator, serviceForTitle, statusGatorUrl, type ServiceStatusJson } from '@/lib/serviceStatus';

const TTL_MS = 10 * 60_000;
const RETRY_MS = 2 * 60_000;
const retryAt = new Map<string, number>();
const inFlight = new Map<string, Promise<void>>();

type Row = Omit<ServiceStatusJson, 'uptimePct' | 'checkedAt'> & { uptimePct: string | null; checkedAt: Date };

async function stored(slug: string): Promise<Row | null> {
  const [row] = await db.query<Row>(`SELECT * FROM "ServiceStatus" WHERE "slug" = $1`, [slug]);
  return row ?? null;
}

async function refresh(slug: string, name: string): Promise<void> {
  try {
    const res = await fetch(statusGatorUrl(slug), { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ChronopinStatus/1.0)' }, signal: AbortSignal.timeout(8000) });
    const parsed = res.ok ? parseStatusGator(await res.text(), slug, name) : null;
    if (!parsed) { retryAt.set(slug, Date.now() + RETRY_MS); return; }
    await db.query(
      `INSERT INTO "ServiceStatus" ("slug","name","status","headline","uptimePct","downMinutes","degradedMinutes","days","sourceUrl","checkedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,now())
       ON CONFLICT ("slug") DO UPDATE SET "name"=EXCLUDED."name","status"=EXCLUDED."status","headline"=EXCLUDED."headline","uptimePct"=EXCLUDED."uptimePct",
         "downMinutes"=EXCLUDED."downMinutes","degradedMinutes"=EXCLUDED."degradedMinutes","days"=EXCLUDED."days","sourceUrl"=EXCLUDED."sourceUrl","checkedAt"=now()`,
      [slug, parsed.name, parsed.status, parsed.headline, parsed.uptimePct, parsed.downMinutes, parsed.degradedMinutes, JSON.stringify(parsed.days), parsed.sourceUrl],
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
