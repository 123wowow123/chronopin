// A company's hub pin and product tree (CompanyHub / CompanyProduct, 0243).

import * as db from '../db';
import { nestProducts, type HubFactJson, type CompanyHubJson, type HubPinJson } from '@/lib/companyHub';
import type { SegmentRow } from '@/lib/companySegments';
import Pins from './pins';

// The company a pin is the hub of, or null for any other pin.
export async function hubCompanyOfPin(pinId: number): Promise<{ companyId: number; companyName: string } | null> {
  const rows = await db.query<{ companyId: number; companyName: string }>(
    `SELECT h."companyId", c."name" AS "companyName"
     FROM "CompanyHub" h JOIN "Company" c ON c."id" = h."companyId"
     WHERE h."pinId" = $1`,
    [pinId],
  );
  return rows[0] ?? null;
}

// The hub pin of a company, or null when it has none.
export async function hubPinOfCompany(companyId: number): Promise<number | null> {
  const rows = await db.query<{ pinId: number }>(`SELECT "pinId" FROM "CompanyHub" WHERE "companyId" = $1`, [companyId]);
  return rows[0]?.pinId ?? null;
}

// The tree: every product of the company, each with its thread's pins.
export async function companyHubTree(companyId: number, companyName: string): Promise<CompanyHubJson> {
  const products = await db.query<{ id: number; parentId: number | null; name: string; summary: string | null; overview: string | null; facts: HubFactJson[]; rank: number }>(
    `SELECT "id", "parentId", "name", "summary", "overview", "facts", "rank" FROM "CompanyProduct" WHERE "companyId" = $1`,
    [companyId],
  );
  const listed = await db.query<{ productId: number; pinId: number; milestoneLabel: string | null }>(
    `SELECT pp."productId", pp."pinId", pp."milestoneLabel" FROM "CompanyProductPin" pp JOIN "CompanyProduct" cp ON cp."id" = pp."productId" WHERE cp."companyId" = $1 ORDER BY pp."pinId"`,
    [companyId],
  );
  // Each listed pin stands for its whole thread; a pin two listed pins share is shown once.
  const threads = new Map<number, number[]>(await Promise.all([...new Set(listed.map((l) => l.pinId))].map(async (id): Promise<[number, number[]]> => [id, await Pins.threadIds(id)])));
  const order = new Map<number, number[]>();
  for (const { productId, pinId } of listed) order.set(productId, [...new Set([...(order.get(productId) ?? []), ...(threads.get(pinId) ?? [])])]);
  const ids = [...new Set([...order.values()].flat())];
  const rows = ids.length
    ? await db.query<{ id: number; title: string; description: string | null; utcStartDateTime: Date | string; allDay: boolean; thumbName: string | null; originalUrl: string | null }>(
        `SELECT p."id", p."title", left(p."description", 200) AS "description", p."utcStartDateTime", p."allDay", pic."thumbName", pic."originalUrl"
         FROM "Pin" p
         -- The pin's first image, else its first medium (a video's still).
         LEFT JOIN LATERAL (
           SELECT m."thumbName", CASE WHEN m."type" = '1' THEN m."originalUrl" END AS "originalUrl"
           FROM "PinMedium" pm JOIN "Medium" m ON m."id" = pm."mediumId"
           WHERE pm."pinId" = p."id" AND pm."utcDeletedDateTime" IS NULL
           ORDER BY m."type" = '1' DESC, pm."weight" DESC, pm."id"
           LIMIT 1
         ) pic ON true
         WHERE p."id" = ANY($1::integer[]) AND p."utcDeletedDateTime" IS NULL`,
        [ids],
      )
    : [];
  const byId = new Map<number, HubPinJson>(
    rows.map((r) => [r.id, { id: r.id, title: r.title, description: r.description, utcStartDateTime: new Date(r.utcStartDateTime).toISOString(), allDay: r.allDay, thumbName: r.thumbName, originalUrl: r.originalUrl }]),
  );
  // Oldest first across the product's threads; within a thread that is its reading order.
  const pinsOf = (productId: number) =>
    (order.get(productId) ?? [])
      .flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []))
      .sort((a, b) => a.utcStartDateTime.localeCompare(b.utcStartDateTime) || a.id - b.id);
  const milestonesOf = (productId: number) => listed.filter((l) => l.productId === productId && l.milestoneLabel).map((l) => ({ pinId: l.pinId, label: l.milestoneLabel! }));
  return { companyId, companyName, products: nestProducts(products, pinsOf, milestonesOf) };
}

export type HubProductInput = { name: string; summary?: string | null; overview?: string | null; facts?: HubFactJson[]; pinIds?: number[]; milestones?: { pinId: number; label: string }[]; children?: HubProductInput[] };

// Parses a PUT body's product list, or says what is wrong with it.
export function hubProductsProblem(body: unknown, depth = 0): HubProductInput[] | string {
  if (!Array.isArray(body)) return 'products must be an array.';
  if (depth > 5) return 'products nest at most 6 deep.';
  const out: HubProductInput[] = [];
  for (const item of body) {
    if (!item || typeof item !== 'object') return 'each product must be an object.';
    const { name, summary, overview, facts, pinIds, milestones, children } = item as Record<string, unknown>;
    if (typeof name !== 'string' || !name.trim() || name.length > 200) return 'each product needs a name of 1-200 characters.';
    if (summary != null && (typeof summary !== 'string' || summary.length > 400)) return `summary of "${name}" must be at most 400 characters.`;
    if (overview != null && (typeof overview !== 'string' || overview.length > 8000)) return `overview of "${name}" must be at most 8000 characters.`;
    if (facts != null && !(Array.isArray(facts) && facts.length <= 30 && facts.every((f) => f && typeof f.label === 'string' && f.label && f.label.length <= 80 && typeof f.value === 'string' && f.value && f.value.length <= 400 && (f.pinId == null || Number.isInteger(f.pinId))))) return `facts of "${name}" must be up to 30 {label, value, pinId?}.`;
    if (milestones != null && !(Array.isArray(milestones) && milestones.every((m) => m && Number.isInteger(m.pinId) && m.pinId > 0 && typeof m.label === 'string' && m.label.trim() && m.label.length <= 80))) return `milestones of "${name}" must be {pinId, label} (label up to 80 characters).`;
    if (pinIds != null && !(Array.isArray(pinIds) && pinIds.every((n) => Number.isInteger(n) && n > 0))) return `pinIds of "${name}" must be pin ids.`;
    let kids: HubProductInput[] | undefined;
    if (children != null) {
      const parsed = hubProductsProblem(children, depth + 1);
      if (typeof parsed === 'string') return parsed;
      kids = parsed;
    }
    out.push({ name: name.trim(), summary: (summary as string | null | undefined)?.trim() || null, overview: (overview as string | null | undefined)?.trim() || null, facts: (facts as HubFactJson[] | undefined) ?? [], pinIds: (pinIds as number[] | undefined) ?? [], milestones: (milestones as { pinId: number; label: string }[] | undefined) ?? [], children: kids });
  }
  return out;
}

// Replaces a company's hub pin and whole product tree in one transaction.
export async function saveCompanyHub(companyId: number, hubPinId: number, products: HubProductInput[]): Promise<void> {
  await db.transaction(async (query) => {
    await query(`DELETE FROM "CompanyProduct" WHERE "companyId" = $1`, [companyId]);
    await query(`DELETE FROM "CompanyHub" WHERE "companyId" = $1`, [companyId]);
    await query(`INSERT INTO "CompanyHub" ("companyId", "pinId") VALUES ($1, $2)`, [companyId, hubPinId]);
    const insert = async (list: HubProductInput[], parentId: number | null) => {
      for (const [rank, p] of list.entries()) {
        const rows = await query<{ id: number }>(
          `INSERT INTO "CompanyProduct" ("companyId", "parentId", "name", "summary", "overview", "facts", "rank") VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7) RETURNING "id"`,
          [companyId, parentId, p.name, p.summary ?? null, p.overview ?? null, JSON.stringify(p.facts ?? []), rank],
        );
        const labels = new Map((p.milestones ?? []).map((m) => [m.pinId, m.label.trim()]));
        // A milestone is also a listed pin, so it needs no separate entry in pinIds.
        for (const pinId of new Set([...(p.pinIds ?? []), ...labels.keys()])) {
          await query(`INSERT INTO "CompanyProductPin" ("productId", "pinId", "milestoneLabel") VALUES ($1, $2, $3)`, [rows[0].id, pinId, labels.get(pinId) ?? null]);
        }
        if (p.children?.length) await insert(p.children, rows[0].id);
      }
    };
    await insert(products, null);
  });
}

// Every pin a company's hub tree lists (the hub itself and each product's
// pins), so a save can drop their cached pages.
export async function hubPinIds(companyId: number): Promise<number[]> {
  const rows = await db.query<{ id: number }>(
    `SELECT "pinId" AS "id" FROM "CompanyHub" WHERE "companyId" = $1
     UNION SELECT pp."pinId" FROM "CompanyProductPin" pp JOIN "CompanyProduct" cp ON cp."id" = pp."productId" WHERE cp."companyId" = $1`,
    [companyId],
  );
  return rows.map((r) => r.id);
}

// A company's revenue by segment and quarter (0246), for its landing page.
export async function companySegments(companyId: number): Promise<SegmentRow[]> {
  const rows = await db.query<{ period: string; periodEnd: Date | string; segment: string; amountBillions: string; pinId: number | null }>(
    `SELECT "period", "periodEnd", "segment", "amountBillions", "pinId" FROM "CompanySegmentRevenue" WHERE "companyId" = $1 ORDER BY "periodEnd", "segment"`,
    [companyId],
  );
  return rows.map((r) => ({ period: r.period, periodEnd: new Date(r.periodEnd).toISOString().slice(0, 10), segment: r.segment, amountBillions: Number(r.amountBillions), pinId: r.pinId }));
}

// Replaces a company's segment figures in one transaction.
export async function saveCompanySegments(companyId: number, rows: SegmentRow[]): Promise<void> {
  await db.transaction(async (query) => {
    await query(`DELETE FROM "CompanySegmentRevenue" WHERE "companyId" = $1`, [companyId]);
    for (const r of rows) {
      await query(`INSERT INTO "CompanySegmentRevenue" ("companyId", "periodEnd", "period", "segment", "amountBillions", "pinId") VALUES ($1, $2, $3, $4, $5, $6)`, [companyId, r.periodEnd, r.period, r.segment, r.amountBillions, r.pinId]);
    }
  });
}
