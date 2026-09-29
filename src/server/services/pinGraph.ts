// How pins relate to each other, for the map's web overlay and graph view.
// Computed on read from what is already stored (threads, confirmed duplicates,
// company, shared tags and shared sources), so nothing new is written or
// backfilled. Only edges among the asked-for pins are returned.
//
// A line has to be earned. A thread or a confirmed duplicate is a relation
// someone declared, so it is always drawn; everything else is scored on how
// much the two pins really share, each shared thing counting for less the more
// pins in view carry it, and only pairs reaching MIN_WEB_STRENGTH get a line.
// Two pins on the same busy tag are left apart, while two that share a studio,
// a rare tag and an article are joined. Each pin then keeps only its strongest
// MAX_WEB_LINKS of those, so a popular company cannot spray a hairball of n^2
// lines over the map.

import * as db from '../db';
import { FULL_WEB_STRENGTH, MAX_WEB_LINKS, MIN_WEB_STRENGTH, WEB_KIND_WEIGHT, type WebKind } from '@/lib/pinWeb';

export type GraphKind = WebKind;

export type GraphEdge = {
  a: number;
  b: number;
  kind: GraphKind;
  // What the two share: a tag's, company's or source's name.
  label?: string;
  // How much they share; FULL_WEB_STRENGTH for a declared relation.
  strength: number;
  // How many things in all, when they share more than the one labelled.
  shared?: number;
};

// A tag or source on more pins than this says little about any two of them.
const MAX_GROUP = 40;
export const MAX_GRAPH_PINS = 5000;
// The weights and the cap the map's ⓘ panel explains live with the drawing
// side of the web, in lib/pinWeb: MAX_WEB_LINKS is how many of these lines a
// pin keeps (threads and duplicates are drawn on top, and fill the quota
// first), and WEB_KIND_WEIGHT what one shared thing is worth.

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
      `SELECT "p"."companyId"::text AS "key", "c"."name"::text AS "label", "p"."id" AS "pinId"
       FROM "Pin" AS "p" JOIN "Company" AS "c" ON "c"."id" = "p"."companyId"
       WHERE "p"."id" = ANY($1::int[]) AND "p"."utcDeletedDateTime" IS NULL`,
      ids,
    ),
    grouped(
      `SELECT "t"."name"::text AS "key", "t"."name"::text AS "label", "p"."id" AS "pinId"
       FROM "PinTag" AS "t" JOIN "Pin" AS "p" ON "p"."id" = "t"."pinId"
       WHERE "p"."id" = ANY($1::int[]) AND "t"."kind" <> 'category' AND "p"."utcDeletedDateTime" IS NULL`,
      ids,
    ),
    grouped(
      `SELECT "s"."id"::text AS "key", COALESCE("s"."title", "s"."url")::text AS "label", "p"."id" AS "pinId"
       FROM "PinSource" AS "ps" JOIN "Source" AS "s" ON "s"."id" = "ps"."sourceId" JOIN "Pin" AS "p" ON "p"."id" = "ps"."pinId"
       WHERE "p"."id" = ANY($1::int[]) AND "ps"."utcRemovedDateTime" IS NULL AND "p"."utcDeletedDateTime" IS NULL`,
      ids,
    ),
  ]);

  const edges: GraphEdge[] = [];
  const seen = new Set<string>();
  const degree = new Map<number, number>();
  const pairKey = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);
  // One edge per pair: a declared relation is added first and wins the pair.
  const add = (edge: GraphEdge) => {
    if (edge.a === edge.b || seen.has(pairKey(edge.a, edge.b))) return;
    seen.add(pairKey(edge.a, edge.b));
    degree.set(edge.a, (degree.get(edge.a) ?? 0) + 1);
    degree.set(edge.b, (degree.get(edge.b) ?? 0) + 1);
    edges.push(edge);
  };
  for (const { a, b } of threads) add({ a, b, kind: 'thread', strength: FULL_WEB_STRENGTH });
  for (const { a, b } of duplicates) add({ a, b, kind: 'duplicate', strength: FULL_WEB_STRENGTH });

  // Every pair that shares something, scored over all of what they share. The
  // groups are capped at MAX_GROUP pins, so this stays far short of n^2.
  type Pair = { a: number; b: number; kind: GraphKind; label: string; strength: number; best: number; shared: number };
  const pairs = new Map<string, Pair>();
  for (const [kind, groups] of [['company', companies], ['source', sources], ['tag', tags]] as const) {
    for (const { label, pins } of groups) {
      // Rarity: the more pins in view carry this, the less it says about two of them.
      const weight = WEB_KIND_WEIGHT[kind] / Math.log2(pins.length);
      for (let i = 0; i < pins.length; i++) {
        for (let j = i + 1; j < pins.length; j++) {
          const [a, b] = pins[i] < pins[j] ? [pins[i], pins[j]] : [pins[j], pins[i]];
          const pair = pairs.get(pairKey(a, b)) ?? { a, b, kind, label, strength: 0, best: 0, shared: 0 };
          pair.strength += weight;
          pair.shared++;
          // Named after the narrowest thing they share, the one worth saying.
          if (weight > pair.best) {
            pair.best = weight;
            pair.kind = kind;
            pair.label = label;
          }
          pairs.set(pairKey(a, b), pair);
        }
      }
    }
  }

  // Strongest first, so the few lines a pin keeps are the ones that say most.
  const strong = [...pairs.values()]
    .filter((p) => p.strength >= MIN_WEB_STRENGTH)
    .sort((x, y) => y.strength - x.strength || x.a - y.a || x.b - y.b);
  for (const pair of strong) {
    if ((degree.get(pair.a) ?? 0) >= MAX_WEB_LINKS || (degree.get(pair.b) ?? 0) >= MAX_WEB_LINKS) continue;
    add({
      a: pair.a,
      b: pair.b,
      kind: pair.kind,
      label: pair.label,
      strength: Math.round(pair.strength * 100) / 100,
      ...(pair.shared > 1 ? { shared: pair.shared } : {}),
    });
  }
  return edges;
}

// Rows of (key, label, pinId) as groups of 2..MAX_GROUP distinct pins.
async function grouped(sql: string, ids: number[]) {
  const rows = await db.query<{ key: string; label: string; pinId: number }>(sql, [ids]);
  const groups = new Map<string, { label: string; pins: Set<number> }>();
  for (const row of rows) {
    const group = groups.get(row.key) ?? { label: row.label, pins: new Set<number>() };
    group.pins.add(row.pinId);
    groups.set(row.key, group);
  }
  return [...groups.values()]
    .filter((g) => g.pins.size >= 2 && g.pins.size <= MAX_GROUP)
    .map((g) => ({ label: g.label, pins: [...g.pins].sort((x, y) => x - y) }));
}
