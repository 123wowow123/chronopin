// How pins relate to each other, for the map's web overlay and graph view.
// Computed on read from what is already stored (threads, confirmed duplicates,
// company, shared tags and shared sources), so nothing new is written or
// backfilled. Only edges among the asked-for pins are returned, and a group
// of pins sharing something is chained in start order rather than joined
// pairwise, so a popular tag cannot produce a hairball of n^2 lines.

import * as db from '../db';

export type GraphKind = 'thread' | 'duplicate' | 'company' | 'tag' | 'source';

export type GraphEdge = {
  a: number;
  b: number;
  kind: GraphKind;
  // What the two share: a tag's, company's or source's name.
  label?: string;
};

// A tag or source on more pins than this says little about any two of them.
const MAX_GROUP = 40;
export const MAX_GRAPH_PINS = 5000;

export async function pinGraph(ids: number[]): Promise<GraphEdge[]> {
  if (ids.length < 2) return [];
  const [threads, duplicates, companies, tags, sources] = await Promise.all([
    db.query<{ a: number; b: number }>(
      `SELECT "id" AS "a", "parentId" AS "b" FROM "Pin"
       WHERE "id" = ANY($1::int[]) AND "parentId" = ANY($1::int[]) AND "utcDeletedDateTime" IS NULL`,
      [ids],
    ),
    db.query<{ a: number; b: number }>(
      `SELECT "pinId" AS "a", "otherPinId" AS "b" FROM "PinDuplicate"
       WHERE "status" = 'confirmed' AND "pinId" = ANY($1::int[]) AND "otherPinId" = ANY($1::int[])`,
      [ids],
    ),
    grouped(
      `SELECT "p"."companyId"::text AS "key", "c"."name"::text AS "label", "p"."id" AS "pinId", "p"."utcStartDateTime" AS "at"
       FROM "Pin" AS "p" JOIN "Company" AS "c" ON "c"."id" = "p"."companyId"
       WHERE "p"."id" = ANY($1::int[]) AND "p"."utcDeletedDateTime" IS NULL`,
      ids,
    ),
    grouped(
      `SELECT "t"."name"::text AS "key", "t"."name"::text AS "label", "p"."id" AS "pinId", "p"."utcStartDateTime" AS "at"
       FROM "PinTag" AS "t" JOIN "Pin" AS "p" ON "p"."id" = "t"."pinId"
       WHERE "p"."id" = ANY($1::int[]) AND "t"."kind" <> 'category' AND "p"."utcDeletedDateTime" IS NULL`,
      ids,
    ),
    grouped(
      `SELECT "s"."id"::text AS "key", COALESCE("s"."title", "s"."url")::text AS "label", "p"."id" AS "pinId", "p"."utcStartDateTime" AS "at"
       FROM "PinSource" AS "ps" JOIN "Source" AS "s" ON "s"."id" = "ps"."sourceId" JOIN "Pin" AS "p" ON "p"."id" = "ps"."pinId"
       WHERE "p"."id" = ANY($1::int[]) AND "ps"."utcRemovedDateTime" IS NULL AND "p"."utcDeletedDateTime" IS NULL`,
      ids,
    ),
  ]);

  const edges: GraphEdge[] = [];
  // One edge per pair: the first kind found (the strongest) wins.
  const seen = new Set<string>();
  const add = (a: number, b: number, kind: GraphKind, label?: string) => {
    if (a === b) return;
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ a, b, kind, ...(label ? { label } : {}) });
  };
  for (const { a, b } of threads) add(a, b, 'thread');
  for (const { a, b } of duplicates) add(a, b, 'duplicate');
  for (const [kind, groups] of [['company', companies], ['source', sources], ['tag', tags]] as const) {
    for (const { label, pins } of groups) {
      for (let i = 1; i < pins.length; i++) add(pins[i - 1], pins[i], kind, label);
    }
  }
  return edges;
}

// Rows of (key, label, pinId, at) as groups of 2..MAX_GROUP pins in start order.
async function grouped(sql: string, ids: number[]) {
  const rows = await db.query<{ key: string; label: string; pinId: number; at: Date }>(sql, [ids]);
  const groups = new Map<string, { label: string; pins: { id: number; at: number }[] }>();
  for (const row of rows) {
    const group = groups.get(row.key) ?? { label: row.label, pins: [] };
    group.pins.push({ id: row.pinId, at: new Date(row.at).getTime() });
    groups.set(row.key, group);
  }
  return [...groups.values()]
    .filter((g) => g.pins.length >= 2 && g.pins.length <= MAX_GROUP)
    .map((g) => ({ label: g.label, pins: g.pins.sort((x, y) => x.at - y.at || x.id - y.id).map((p) => p.id) }));
}
