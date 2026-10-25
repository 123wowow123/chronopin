// The Announced and Released tags on goods pins (owner, 2026-10-24): every live
// pin with a productName on a /products shelf (or tagged Product) is Announced,
// and Released once its start date has come. A pin still to launch has no
// Released, so a product gains it on the first run after its date. Restaurants,
// films and events are left out, as Products.shelfIds does. Run by the news
// job's productLifecycle task on this database and, when the run writes to
// production, on production through the admin DB API (ids differ, so each
// side is read for itself).

import { PRODUCT_SHELVES } from '@/lib/products';
import * as db from '../db';
import PinTag from '../model/pinTag';
import { adminDbRequest, prodBase } from './pinApi';

const NOT_GOODS = ['Restaurant', 'Restaurant Opening', 'Top Restaurants', 'Movie', 'Festival', 'Conference'];
const SHELF_TAGS = [...PRODUCT_SHELVES.map((s) => s.name), 'Automotive', 'Product'];

export type LifecycleResult = { goods: number; tagged: number; untagged: number };

async function syncLocal(): Promise<LifecycleResult> {
  const pins = await db.query<{ id: number; out: boolean }>(
    `SELECT "p"."id", "p"."utcStartDateTime" <= now() AS "out" FROM "Pin" AS "p"
     WHERE "p"."utcDeletedDateTime" IS NULL AND nullif("p"."productName", '') IS NOT NULL
       AND EXISTS (SELECT 1 FROM "PinTagView" AS "c" WHERE "c"."pinId" = "p"."id" AND "c"."kind" <> 'reserved' AND "c"."name" = ANY($1::citext[]))
       AND NOT EXISTS (SELECT 1 FROM "PinTagView" AS "x" WHERE "x"."pinId" = "p"."id" AND "x"."name" = ANY($2::citext[]))
     ORDER BY "p"."id"`,
    [SHELF_TAGS, NOT_GOODS],
  );
  let tagged = 0;
  let untagged = 0;
  for (const pin of pins) {
    if (pin.out) {
      if (await PinTag.addUserTags(pin.id, ['Announced', 'Released'])) tagged++;
      continue;
    }
    const stored = await db.query<{ name: string }>(
      `SELECT "name"::text AS "name" FROM "PinTag" WHERE "pinId" = $1 AND "source" = 'user' AND "kind" <> 'category' ORDER BY "id"`,
      [pin.id],
    );
    const names = stored.map((r) => r.name);
    const kept = names.filter((n) => n !== 'Released');
    if (!kept.includes('Announced')) kept.push('Announced');
    if (kept.length === names.length && kept.every((n, i) => n === names[i])) continue;
    if (await PinTag.setUserTags(pin.id, kept)) (names.includes('Released') ? untagged++ : tagged++);
  }
  return { goods: pins.length, tagged, untagged };
}

type Row = Record<string, any>;

async function allRows(table: string, query: string): Promise<Row[]> {
  const rows: Row[] = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await adminDbRequest<{ rows: Row[] }>('GET', `/api/admin/db/${table}?${query}&limit=1000&offset=${offset}`);
    rows.push(...page.rows);
    if (page.rows.length < 1000) return rows;
  }
}

async function syncProd(): Promise<LifecycleResult> {
  const enc = (names: string[]) => encodeURIComponent(names.join(','));
  const excluded = new Set((await allRows('PinTag', `name.in=${enc(NOT_GOODS)}`)).map((t) => t.pinId));
  const candidates = [...new Set((await allRows('PinTag', `name.in=${enc(SHELF_TAGS)}`)).map((t) => t.pinId as number))].filter((id) => !excluded.has(id));
  const pins: Row[] = [];
  for (let i = 0; i < candidates.length; i += 200) pins.push(...(await allRows('Pin', `id.in=${candidates.slice(i, i + 200).join(',')}&utcDeletedDateTime.null=true`)));
  const goods = pins.filter((p) => typeof p.productName === 'string' && p.productName.trim());
  const have = new Set((await allRows('PinTag', 'name.in=Announced,Released')).map((t) => `${t.pinId}:${t.name}`));
  const add: Row[] = [];
  const remove: number[] = [];
  for (const p of goods) {
    const out = new Date(p.utcStartDateTime).getTime() <= Date.now();
    if (!have.has(`${p.id}:Announced`)) add.push({ pinId: p.id, name: 'Announced', kind: 'topic', source: 'user' });
    if (out && !have.has(`${p.id}:Released`)) add.push({ pinId: p.id, name: 'Released', kind: 'topic', source: 'user' });
    if (!out && have.has(`${p.id}:Released`)) remove.push(p.id);
  }
  for (let i = 0; i < add.length; i += 200) await adminDbRequest('POST', '/api/admin/db/PinTag', add.slice(i, i + 200));
  for (const id of remove) await adminDbRequest('DELETE', `/api/admin/db/PinTag?pinId=${id}&name=Released`);
  return { goods: goods.length, tagged: add.length, untagged: remove.length };
}

export async function syncProductLifecycle(): Promise<{ local: LifecycleResult; production: LifecycleResult | null }> {
  const local = await syncLocal();
  return { local, production: prodBase() ? await syncProd() : null };
}
