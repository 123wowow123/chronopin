// The plant and factory pins that carry no factory profile: read by the jobs'
// factory_profile_gaps tool (./tools.ts) for the factoryProfiles task
// (docs/okf/scraping/daily-jobs.md#factoryprofiles).
//
// A pin about a plant, factory or fab being built (or opened) carries a
// PinFactory buildout profile (0214): sourced metric cards plus a dated project
// timeline. A new pin has none the day it is saved; this finds it.

import * as db from '../db';
import { factoryProblem } from '../model/pinFactory';
import type { FactoryProfile } from '@/lib/pinFactory';

export type FactoryGap = { pinId: number; title: string; start: string; status: string | null; price: number | null; priceCurrency: string | null; author: string | null; sourceUrl: string | null };

// Manufacturing/Factory pins without a profile, newest first. A pin counts when
// it carries a construction status tag (Proposed, In Progress, Completed) or a
// construction price; closures, sales and layoffs usually have neither and the
// task skips the few that slip through (with a learning saying why).
export async function factoryGaps(limit = 5, skip: number[] = []): Promise<{ gaps: FactoryGap[]; remaining: number }> {
  const rows = await db.query<{ id: number; title: string; start: Date; status: string | null; price: number | null; priceCurrency: string | null; author: string | null; sourceUrl: string | null }>(
    `SELECT p."id", p."title", p."utcStartDateTime" AS "start", p."price", p."priceCurrency", p."sourceUrl", u."userName" AS "author",
       (SELECT string_agg(t."name", ', ') FROM "PinTag" t WHERE t."pinId" = p."id" AND t."name" IN ('Proposed', 'In Progress', 'Completed')) AS "status"
     FROM "Pin" p LEFT JOIN "User" u ON u."id" = p."userId"
     WHERE p."utcDeletedDateTime" IS NULL
       AND NOT EXISTS (SELECT 1 FROM "PinFactory" f WHERE f."pinId" = p."id")
       AND NOT EXISTS (SELECT 1 FROM "PinTag" t WHERE t."pinId" = p."id" AND t."name" = 'Predicted')
       AND EXISTS (SELECT 1 FROM "PinTag" t WHERE t."pinId" = p."id" AND t."name" IN ('Manufacturing', 'Factory'))
       AND (p."price" IS NOT NULL OR EXISTS (SELECT 1 FROM "PinTag" t WHERE t."pinId" = p."id" AND t."name" IN ('Proposed', 'In Progress', 'Completed')))
     ORDER BY p."utcStartDateTime" DESC`,
  );
  const gaps = rows
    .filter((row) => !skip.includes(row.id))
    .map((row) => ({ pinId: row.id, title: row.title, start: row.start.toISOString().slice(0, 10), status: row.status, price: row.price, priceCurrency: row.priceCurrency, author: row.author, sourceUrl: row.sourceUrl }));
  return { gaps: gaps.slice(0, limit), remaining: Math.max(0, gaps.length - limit) };
}

// Every quoted page must already be one the pin cites (its source or a
// reference): the factory panel's sources are the pin's own evidence.
export function factoryEvidenceProblem(profile: FactoryProfile, cited: string[]): string | null {
  const allowed = new Set(cited);
  const urls = [
    ...Object.values(profile.axes).flatMap((a) => [...a.sources, ...(a.benchmark?.sources ?? [])]),
    ...profile.metrics.map((m) => m.source),
    ...(profile.milestones ?? []).map((m) => m.source),
  ].map((s) => s.url);
  const missing = [...new Set(urls)].filter((u) => !allowed.has(u));
  return missing.length ? `Add these pages to the pin's references first (update_pin with addReferences), then save again: ${missing.join(', ')}` : null;
}

// Validated exactly as the PUT endpoint does, with the run's defaults applied.
export function buildFactoryProfile(input: Record<string, unknown>, today: string): FactoryProfile | string {
  const checked = factoryProblem({ rubricYear: 2026, assessmentDate: today, ...input, source: 'session' });
  return checked;
}
