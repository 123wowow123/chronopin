// Adds artist origin (MusicBrainz) and album + full-album 30s previews (iTunes) to every
// catalog entry. Results are cached in scripts/music/originAlbum.json so reruns are cheap.
import fs from 'fs';
import path from 'path';
import dns from 'dns';

dns.setDefaultResultOrder('ipv4first');

const catalogPath = path.resolve(process.cwd(), 'src/lib/musicCatalog.json');
const cachePath = path.resolve(process.cwd(), 'scripts/music/originAlbum.json');
const UA = 'ChronoPinMusicResearch/1.0 (https://www.chronopin.com)';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson(url: string, headers: Record<string, string> = {}, tries = 4): Promise<any> {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, ...headers }, signal: AbortSignal.timeout(15000) });
      if (res.ok) return await res.json();
      if (res.status === 503 || res.status === 429 || res.status === 403) await sleep(3000 * (i + 1));
      else return null;
    } catch {
      await sleep(1500 * (i + 1));
    }
  }
  return null;
}

const norm = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\(.*?\)|\[.*?\]/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

// First credited artist: "A & B", "A ft. B", "A x B", "A, B".
function primaryArtist(artist: string): string {
  const stripped = artist.replace(/\s*\(.*?\)\s*/g, ' ');
  return stripped.split(/\s+(?:&|ft\.?|feat\.?|featuring|x|and|with|×)\s+|,\s*/i)[0].trim() || artist;
}

interface Origin { country: string; countryCode: string; area?: string; mbid?: string }

async function areaCountry(areaId: string): Promise<{ code?: string; name: string } | null> {
  let id = areaId;
  for (let depth = 0; depth < 5; depth++) {
    await sleep(1100);
    const a = await getJson(`https://musicbrainz.org/ws/2/area/${id}?inc=area-rels&fmt=json`);
    if (!a) return null;
    const codes: string[] | undefined = a['iso-3166-1-codes'];
    if (codes?.length) return { code: codes[0], name: a.name };
    const parent = (a.relations || []).find((r: any) => r['target-type'] === 'area' && r.direction === 'backward' && r.type === 'part of');
    if (!parent) return null;
    id = parent.area.id;
  }
  return null;
}

async function findOrigin(artist: string): Promise<Origin | null> {
  const name = primaryArtist(artist).replace(/\s*[(（].*$/, '').trim();
  await sleep(1100);
  const q = encodeURIComponent(`artist:"${name}"`);
  const data = await getJson(`https://musicbrainz.org/ws/2/artist/?query=${q}&fmt=json&limit=5`);
  const hit = (data?.artists || []).find((a: any) => a.score >= 90 && (norm(a.name) === norm(name) || (a.aliases || []).some((x: any) => norm(x.name) === norm(name))));
  if (!hit) return null;
  const areaName = (hit.area || hit['begin-area'])?.name;
  if (hit.country) return { country: '', countryCode: hit.country, area: areaName, mbid: hit.id };
  const areaId = hit.area?.id || hit['begin-area']?.id;
  if (!areaId) return null;
  const c = await areaCountry(areaId);
  return c?.code ? { country: '', countryCode: c.code, area: areaName, mbid: hit.id } : null;
}

interface Track { n: number; title: string; previewUrl: string; durationMs?: number; trackViewUrl?: string }
interface Album { title: string; kind: 'album' | 'single' | 'ep'; collectionId: number; url?: string; artworkUrl?: string; releaseDate?: string; storefront: string; tracks: Track[]; trackCount?: number }

function kindOf(name: string): Album['kind'] {
  if (/ - single$/i.test(name)) return 'single';
  if (/ - ep$/i.test(name)) return 'ep';
  return 'album';
}

async function findAlbum(e: any): Promise<Album | null> {
  const extra = process.env.EXTRA_STORES ? process.env.EXTRA_STORES.split(',') : [];
  const stores = [e.countryCode, 'us', ...extra].map((s: string) => s.toLowerCase()).filter((s, i, a) => a.indexOf(s) === i);
  const artist = primaryArtist(e.artist);
  let best: { r: any; store: string; score: number } | null = null;
  for (const store of stores) {
    const term = encodeURIComponent(`${artist} ${e.title}`);
    const data = await getJson(`https://itunes.apple.com/search?term=${term}&entity=song&limit=25&country=${store}`);
    await sleep(700);
    for (const r of data?.results || []) {
      if (!r.previewUrl || !r.collectionId) continue;
      if (norm(r.trackName).replace(/ (live|remix|sped up|acoustic)\b.*/, '') !== norm(e.title) && !norm(r.trackName).startsWith(norm(e.title))) continue;
      if (!norm(r.artistName).includes(norm(artist).split(' ')[0])) continue;
      const kind = kindOf(r.collectionName || '');
      let score = kind === 'album' ? 3 : kind === 'ep' ? 2 : 1;
      if (r.previewUrl === e.audioUrl) score += 0.5;
      if (/deluxe|expanded|edition|tour|live|remix|karaoke|instrumental/i.test(r.collectionName)) score -= 0.4;
      if (!best || score > best.score) best = { r, store, score };
    }
    if (best && best.score >= 3) break;
  }
  if (!best) {
    // Fallback: the artist's own catalogue (search ranking buries some titles).
    for (const store of stores) {
      const a = await getJson(`https://itunes.apple.com/search?term=${encodeURIComponent(artist)}&entity=musicArtist&limit=3&country=${store}`);
      await sleep(700);
      const art = (a?.results || []).find((x: any) => norm(x.artistName) === norm(artist)) || a?.results?.[0];
      if (!art?.artistId) continue;
      const cat = await getJson(`https://itunes.apple.com/lookup?id=${art.artistId}&entity=song&limit=200&country=${store}`);
      await sleep(700);
      for (const r of cat?.results || []) {
        if (r.wrapperType !== 'track' || !r.previewUrl || !r.collectionId) continue;
        if (!norm(r.trackName).startsWith(norm(e.title).split(' ').slice(0, 3).join(' '))) continue;
        const kind = kindOf(r.collectionName || '');
        const score = (kind === 'album' ? 3 : kind === 'ep' ? 2 : 1) - (/deluxe|live|remix/i.test(r.collectionName) ? 0.4 : 0);
        if (!best || score > best.score) best = { r, store, score };
      }
      if (best) break;
    }
  }
  if (!best) return null;
  const lk = await getJson(`https://itunes.apple.com/lookup?id=${best.r.collectionId}&entity=song&country=${best.store}`);
  await sleep(700);
  const items: any[] = lk?.results || [];
  const col = items.find((x) => x.wrapperType === 'collection');
  const songs = items.filter((x) => x.wrapperType === 'track' && x.kind === 'song');
  const tracks: Track[] = songs
    .sort((a, b) => (a.discNumber - b.discNumber) || (a.trackNumber - b.trackNumber))
    .filter((s) => s.previewUrl)
    .map((s, i) => ({ n: i + 1, title: s.trackName, previewUrl: s.previewUrl, durationMs: s.trackTimeMillis, trackViewUrl: s.trackViewUrl }));
  const title: string = (col?.collectionName || best.r.collectionName).replace(/ - (Single|EP)$/i, '');
  return {
    title,
    kind: kindOf(col?.collectionName || best.r.collectionName),
    collectionId: best.r.collectionId,
    url: col?.collectionViewUrl,
    artworkUrl: (col?.artworkUrl100 || best.r.artworkUrl100)?.replace('100x100bb', '600x600bb'),
    releaseDate: (col?.releaseDate || best.r.releaseDate)?.slice(0, 10),
    storefront: best.store,
    trackCount: col?.trackCount ?? songs.length,
    tracks,
  };
}

async function main() {
  const catalog: any[] = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const cache: Record<string, any> = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, 'utf8')) : {};
  const originByArtist: Record<string, Origin | null> = cache.__origins || {};
  cache.__origins = originByArtist;
  const only = process.argv[2];
  for (const e of catalog) {
    if (only && e.id !== only) continue;
    const c = (cache[e.id] ||= {});
    const key = primaryArtist(e.artist).toLowerCase();
    if (!(key in originByArtist)) {
      originByArtist[key] = await findOrigin(e.artist);
      console.log(`origin ${e.artist} ->`, JSON.stringify(originByArtist[key]));
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 1));
    }
    if (!('album' in c)) {
      c.album = await findAlbum(e);
      console.log(`album  ${e.id} ${e.title} ->`, c.album ? `${c.album.title} (${c.album.kind}, ${c.album.tracks.length}/${c.album.trackCount})` : 'none');
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 1));
    }
  }
}
main();
