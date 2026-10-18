// Attaches the audited source wikis (scripts/music/musicWikis.json) to the music-ranking pins on prod,
// without the server fetching any page: the pin's link is created as a Source + PinSource through the
// admin table API (the lightweight pin edit does not sync links), then the finished wikis are pushed
// through /api/admin/source-wikis. Idempotent. Run after repointProdPins.ts.
//   npx tsx scripts/music/attachWikisProd.ts [--dry]
import fs from 'fs';
import path from 'path';
import { urlKey } from '../../src/lib/citations';

const REPO = process.cwd();
const BASE = 'https://www.chronopin.com';
const dry = process.argv.includes('--dry');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let token = fs.readFileSync(path.join(REPO, '.scrape', 'admin.token'), 'utf8').trim();

async function api(method: string, p: string, body?: unknown): Promise<any> {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(BASE + p, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(90000),
      });
      const text = await res.text();
      if (!res.ok) throw Object.assign(new Error(`${method} ${p} ${res.status}: ${text.slice(0, 300)}`), { status: res.status });
      return text ? JSON.parse(text) : {};
    } catch (e: any) {
      if (e.status && e.status < 500) throw e;
      if (i >= 5) throw e;
      await sleep(5000 * i);
    }
  }
}

async function main() {
  const catalog: { id: string; sourceUrl: string }[] = JSON.parse(fs.readFileSync(path.join(REPO, 'src/lib/musicCatalog.json'), 'utf8'));
  const pinIds: Record<string, number> = JSON.parse(fs.readFileSync(path.join(REPO, 'scripts/music/musicPinIds.json'), 'utf8'));
  const wikis: { url: string }[] = JSON.parse(fs.readFileSync(path.join(REPO, 'scripts/music/musicWikis.json'), 'utf8'));
  const wikiUrls = new Set(wikis.map((w) => w.url));

  // pin -> link key, for the pins whose link has a wiki
  const pinKey = new Map<number, { key: string; url: string }>();
  for (const c of catalog) {
    const key = c.sourceUrl ? urlKey(c.sourceUrl) : undefined;
    if (key && wikiUrls.has(c.sourceUrl) && pinIds[c.id]) pinKey.set(pinIds[c.id], { key, url: c.sourceUrl });
  }
  const keys = new Map([...pinKey.values()].map((v) => [v.key, v.url]));
  console.log(`${pinKey.size} pins, ${keys.size} distinct links`);

  // 1. Sources
  const sourceId = new Map<string, number>();
  const missing: { urlKey: string; url: string; kind: string }[] = [];
  for (const [key, url] of keys) {
    const r = await api('GET', `/api/admin/db/Source?urlKey=${encodeURIComponent(key)}&limit=1`);
    if (r.rows[0]) sourceId.set(key, r.rows[0].id);
    else missing.push({ urlKey: key, url, kind: 'web' });
    await sleep(150);
  }
  console.log(`sources: ${sourceId.size} exist, ${missing.length} to create`);
  if (!dry && missing.length) {
    for (let i = 0; i < missing.length; i += 50) {
      const r = await api('POST', '/api/admin/db/Source', missing.slice(i, i + 50));
      for (const row of r.rows) sourceId.set(row.urlKey, row.id);
    }
  }

  // 2. PinSource: the pin cites its new link, and no longer the old one
  const ids = [...pinKey.keys()];
  let added = 0;
  let removed = 0;
  for (let i = 0; i < ids.length; i += 40) {
    const chunk = ids.slice(i, i + 40);
    const r = await api('GET', `/api/admin/db/PinSource?pinId.in=${chunk.join(',')}&limit=1000`);
    const byPin = new Map<number, any[]>();
    for (const row of r.rows) byPin.set(row.pinId, [...(byPin.get(row.pinId) ?? []), row]);
    for (const pinId of chunk) {
      const target = sourceId.get(pinKey.get(pinId)!.key);
      if (!target) continue;
      const rows = byPin.get(pinId) ?? [];
      for (const row of rows) {
        if (row.sourceId !== target && !row.utcRemovedDateTime) {
          removed++;
          if (!dry) await api('PATCH', `/api/admin/db/PinSource?pinId=${pinId}&sourceId=${row.sourceId}`, { utcRemovedDateTime: new Date().toISOString() });
        }
      }
      const mine = rows.find((row) => row.sourceId === target);
      if (!mine) {
        added++;
        if (!dry) await api('POST', '/api/admin/db/PinSource?upsert=1', { pinId, sourceId: target, role: 'source', summarizedWikiVersion: 1, utcRemovedDateTime: null });
      } else if (mine.utcRemovedDateTime) {
        added++;
        if (!dry) await api('PATCH', `/api/admin/db/PinSource?pinId=${pinId}&sourceId=${target}`, { utcRemovedDateTime: null });
      }
    }
    await sleep(300);
  }
  console.log(`pin links: ${added} added, ${removed} old links retired`);

  // 3. Wikis
  if (dry) return;
  const tally: Record<string, number> = {};
  for (let i = 0; i < wikis.length; i += 25) {
    const r = await api('POST', '/api/admin/source-wikis', { wikis: wikis.slice(i, i + 25) });
    for (const x of r.results) {
      tally[x.status] = (tally[x.status] ?? 0) + 1;
      if (x.status !== 'saved') console.log(`  ${x.status}: ${x.url} ${x.message ?? ''}`);
    }
    await sleep(500);
  }
  console.log('wikis:', tally);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
