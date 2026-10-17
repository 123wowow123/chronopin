// Fills catalog gaps in originAlbum.json: hand-picked iTunes collections for songs the automatic
// matcher missed, and per-track previews that are only served from another storefront.
import fs from 'fs';
import path from 'path';

const cachePath = path.resolve(process.cwd(), 'scripts/music/originAlbum.json');
const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const STORES = ['us', 'gb', 'jp', 'kr', 'tw', 'hk', 'cn', 'br', 'fr', 'de', 'au', 'sg', 'mx', 'es', 'se'];

async function lookup(id: number, store: string) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(`https://itunes.apple.com/lookup?id=${id}&entity=song&country=${store}`, { signal: AbortSignal.timeout(15000) });
      if (r.ok) return ((await r.json()) as any).results as any[];
    } catch {}
    await sleep(1500);
  }
  return [];
}
const kindOf = (n: string) => (/ - single$/i.test(n) ? 'single' : / - ep$/i.test(n) ? 'ep' : 'album');
const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, '');

// id -> [collectionId, storefront it is previewable in]
const manual: Record<string, [number, string]> = {
  'cn-2025-1': [1730563960, 'tw'], 'cn-2024-1': [1730563960, 'tw'],
};

async function build(id: string, collectionId: number, store: string) {
  const items = await lookup(collectionId, store);
  const col = items.find((x) => x.wrapperType === 'collection');
  if (!col) return console.log('no collection', id, collectionId, store);
  const songs = items.filter((x) => x.wrapperType === 'track' && x.kind === 'song' && x.previewUrl)
    .sort((a, b) => a.discNumber - b.discNumber || a.trackNumber - b.trackNumber);
  cache[id] = cache[id] || {};
  cache[id].album = {
    title: col.collectionName.replace(/ - (Single|EP)$/i, ''), kind: kindOf(col.collectionName), collectionId,
    url: col.collectionViewUrl, artworkUrl: col.artworkUrl100?.replace('100x100bb', '600x600bb'),
    releaseDate: col.releaseDate?.slice(0, 10), storefront: store, trackCount: col.trackCount,
    tracks: songs.map((s, i) => ({ n: i + 1, title: s.trackName, previewUrl: s.previewUrl, durationMs: s.trackTimeMillis })),
  };
  console.log('manual', id, col.collectionName, songs.length + '/' + col.trackCount);
}

async function main() {
  const extra = fs.existsSync('scripts/music/manualAlbums.json') ? JSON.parse(fs.readFileSync('scripts/music/manualAlbums.json', 'utf8')) : manual;
  for (const [id, [cid, st]] of Object.entries<[number, string]>(extra)) {
    await build(id, cid, st);
    await sleep(700);
  }
  // Partial albums: borrow missing previews from other storefronts' copy of the same album.
  for (const [id, v] of Object.entries<any>(cache)) {
    const a = v?.album;
    if (id === '__origins' || !a || !a.trackCount || a.tracks.length >= a.trackCount || a.trackCount > 40) continue;
    const have = new Set(a.tracks.map((t: any) => norm(t.title)));
    const full: any[] = [];
    for (const st of [a.storefront, ...STORES.filter((s) => s !== a.storefront)]) {
      const items = (await lookup(a.collectionId, st)).filter((x) => x.wrapperType === 'track' && x.kind === 'song');
      await sleep(600);
      for (const s of items) {
        if (!s.previewUrl) continue;
        if (!full.some((f) => f.trackId === s.trackId)) full.push(s);
      }
      if (full.length >= a.trackCount) break;
    }
    if (full.length > a.tracks.length) {
      full.sort((x, y) => x.discNumber - y.discNumber || x.trackNumber - y.trackNumber);
      a.tracks = full.map((s, i) => ({ n: i + 1, title: s.trackName, previewUrl: s.previewUrl, durationMs: s.trackTimeMillis }));
      console.log('filled', id, a.title, a.tracks.length + '/' + a.trackCount);
    } else console.log('still partial', id, a.title, a.tracks.length + '/' + a.trackCount, 'have', have.size);
  }
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 1));
}
main();
