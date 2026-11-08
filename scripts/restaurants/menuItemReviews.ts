// Replay researched dish reviews without replacing menus, photos or other reviews.
// Dry run: npx tsx scripts/restaurants/menuItemReviews.ts [local|prod]
// Save and verify: npx tsx scripts/restaurants/menuItemReviews.ts [local|prod] --apply
// Refresh the admin login first; evidence is in menuItemReviews.json.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import catalog from './menuItemReviews.json';
import { restaurantSourceKey, type RestaurantMenuProfile } from '../../src/lib/restaurantMenus';

type RecordRow = { id: number; enabled: boolean; revision: number; regionSlug?: string | null; profile: { pinSourceUrl: string; menu?: RestaurantMenuProfile } & Partial<RestaurantMenuProfile> };
const prod = process.argv.includes('prod');
const apply = process.argv.includes('--apply');
const base = prod ? 'https://www.chronopin.com' : 'http://localhost:3000';
const environment = prod ? 'prod' : 'local';
const token = readFileSync(`.scrape/admin${prod ? '' : '-local'}.token`, 'utf8').trim();
async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${base}/api/admin/${path}`, { method: body ? 'PUT' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  if (!response.ok) throw new Error(`${environment} ${path}: HTTP ${response.status}`);
  return response.json() as Promise<T>;
}
async function run() {
  // Region filters select guide tiles, excluding menu-only profiles for the same city.
  // Read every page, then match the researched exact-branch source below.
  const ordinary: { content: RecordRow[] } = { content: [] };
  for (let offset = 0; ; offset += 1000) {
    const page = await request<{ content: RecordRow[] }>(`restaurant-content?limit=1000&offset=${offset}`);
    ordinary.content.push(...page.content);
    if (page.content.length < 1000) break;
  }
  const specials = await request<{ venues: RecordRow[] }>('restaurant-specials?region=san-diego');
  const matched = new Set<number>();
  const pending: { path: string; row: RecordRow; profile: RecordRow['profile'] }[] = [];
  for (const [endpoint, rows] of [['restaurant-content', ordinary.content], ['restaurant-specials', specials.venues]] as const) {
    for (const row of rows.filter((r) => r.enabled)) {
      const profile = structuredClone(row.profile);
      const menus = endpoint === 'restaurant-content' ? profile.menu?.menus : profile.menus;
      for (const menu of menus ?? []) for (const item of menu.items) {
        catalog.forEach((entry, index) => {
          if (restaurantSourceKey(entry.pinSourceUrl) !== restaurantSourceKey(profile.pinSourceUrl) || entry.itemName !== item.name) return;
          matched.add(index);
          item.reviews = [...(item.reviews ?? []).filter((r) => r.sourceUrl !== entry.review.sourceUrl), entry.review];
        });
      }
      if (!isDeepStrictEqual(row.profile, profile)) pending.push({ path: `${endpoint}/${row.id}`, row, profile });
    }
  }
  const missing = catalog.filter((_, i) => !matched.has(i));
  if (missing.length) throw new Error(`No matching menu items: ${missing.map((e) => e.itemName).join(', ')}`);
  console.log(`${environment}: ${matched.size} researched review associations; ${pending.length} profiles ${apply ? 'to save' : 'would change (dry run)'}`);
  if (!apply) return;
  const directory = `.scrape/menu-item-reviews/${environment}-${Date.now()}`;
  mkdirSync(directory, { recursive: true });
  for (const { path, row, profile } of pending) {
    // Do not overwrite a concurrent edit even if it happened after the list request.
    const current = await request<RecordRow>(path);
    if (current.revision !== row.revision) throw new Error(`${path} changed; rerun from fresh records`);
    writeFileSync(`${directory}/${path.replace('/', '-')}-before.json`, JSON.stringify(current, null, 2));
    await request(path, { profile, revision: current.revision, enabled: current.enabled, ...(current.regionSlug !== undefined ? { regionSlug: current.regionSlug } : {}) });
    const readback = await request<RecordRow>(path);
    if (!isDeepStrictEqual(readback.profile, profile)) throw new Error(`${path}: profile readback mismatch`);
    writeFileSync(`${directory}/${path.replace('/', '-')}-after.json`, JSON.stringify(readback, null, 2));
    console.log(`${environment}: saved and verified ${path}`);
  }
}
run().catch((error) => { console.error(error.message); process.exitCode = 1; });
