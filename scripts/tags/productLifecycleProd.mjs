// Production counterpart of productLifecycle.ts, through the admin DB API
// (the token in .scrape/admin.token). --dry-run only counts.
import { readFileSync } from 'node:fs';
const BASE = 'https://www.chronopin.com';
const TOKEN = readFileSync(new URL('../../.scrape/admin.token', import.meta.url), 'utf8').trim();
const dry = process.argv.includes('--dry-run');
const SHELVES = ['Electronics', 'Audio', 'Fashion', 'Watches', 'Gaming', 'Tabletop', 'Collectibles', 'Ice Cream', 'Snack', 'Alcoholic Drinks', 'Comics', 'Automotive', 'Product'];
const NOT_GOODS = ['Restaurant', 'Restaurant Opening', 'Top Restaurants', 'Movie', 'Festival', 'Conference'];

async function api(method, path, body) {
  const res = await fetch(BASE + path, { method, headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`${method} ${path} ${res.status} ${(await res.text()).slice(0, 300)}`);
  return res.json();
}
async function all(table, query) {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await api('GET', `/api/admin/db/${table}?${query}&limit=1000&offset=${offset}`);
    rows.push(...page.rows);
    if (page.rows.length < 1000) return rows;
  }
}
const list = (names) => names.join(',');

const shelfTags = await all('PinTag', `name.in=${encodeURIComponent(list(SHELVES))}`);
const excluded = new Set((await all('PinTag', `name.in=${encodeURIComponent(list(NOT_GOODS))}`)).map((t) => t.pinId));
const candidates = [...new Set(shelfTags.map((t) => t.pinId))].filter((id) => !excluded.has(id));
const pins = [];
for (let i = 0; i < candidates.length; i += 200) {
  pins.push(...(await all('Pin', `id.in=${candidates.slice(i, i + 200).join(',')}&utcDeletedDateTime.null=true`)));
}
const goods = pins.filter((p) => p.productName && p.productName.trim());
const have = new Map();
for (const t of await all('PinTag', `name.in=Announced,Released`)) have.set(`${t.pinId}:${t.name}`, t);
const now = Date.now();
const add = [];
const remove = [];
for (const p of goods) {
  const out = new Date(p.utcStartDateTime).getTime() <= now;
  if (!have.has(`${p.id}:Announced`)) add.push({ pinId: p.id, name: 'Announced', kind: 'topic', source: 'user' });
  if (out && !have.has(`${p.id}:Released`)) add.push({ pinId: p.id, name: 'Released', kind: 'topic', source: 'user' });
  if (!out && have.has(`${p.id}:Released`)) remove.push(p.id);
}
console.log(`${goods.length} goods pins, ${add.length} tags to add, ${remove.length} Released to remove`);
if (dry) process.exit(0);
for (let i = 0; i < add.length; i += 200) await api('POST', '/api/admin/db/PinTag', add.slice(i, i + 200));
for (const id of remove) await api('DELETE', `/api/admin/db/PinTag?pinId=${id}&name=Released`);
console.log('done');
