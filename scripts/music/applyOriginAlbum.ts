// Merges scripts/music/originAlbum.json (+ originOverrides.json) into the music catalog
// (musicCatalog.json and musicCatalog.ts) and reports gaps.
import fs from 'fs';
import path from 'path';
import { ORIGIN_BY_CODE } from '../../src/lib/musicOrigins';

const R = (f: string) => path.resolve(process.cwd(), f);
const catalog: any[] = JSON.parse(fs.readFileSync(R('src/lib/musicCatalog.json'), 'utf8'));
const cache = JSON.parse(fs.readFileSync(R('scripts/music/originAlbum.json'), 'utf8'));
const overridesPath = R('scripts/music/originOverrides.json');
// { "<artist lowercased primary>" | "<entry id>": { code, area?, album?: false } }
const overrides: Record<string, any> = fs.existsSync(overridesPath) ? JSON.parse(fs.readFileSync(overridesPath, 'utf8')) : {};

const primary = (artist: string) =>
  (artist.replace(/\s*\(.*?\)\s*/g, ' ').split(/\s+(?:&|ft\.?|feat\.?|featuring|x|and|with|×)\s+|,\s*/i)[0].trim() || artist).toLowerCase();

const missingOrigin: string[] = [];
const noAlbum: string[] = [];
const partial: string[] = [];

for (const e of catalog) {
  const o = overrides[e.id] ?? overrides[primary(e.artist)] ?? cache.__origins?.[primary(e.artist)];
  const code = o?.code ?? o?.countryCode;
  const meta = code ? ORIGIN_BY_CODE[code] : undefined;
  if (meta) {
    e.originCountry = meta.name;
    e.originCountryCode = meta.code;
    e.originFlag = meta.flag;
    e.originContinent = meta.continent;
    if (o.area) e.originArea = o.area; else delete e.originArea;
  } else {
    missingOrigin.push(`${e.id} ${e.artist} (${code ?? 'none'})`);
  }
  const a = overrides[e.id]?.album === false ? null : cache[e.id]?.album;
  if (a?.tracks?.length) {
    e.album = {
      title: a.title, kind: a.kind, url: a.url, artworkUrl: a.artworkUrl, releaseDate: a.releaseDate,
      trackCount: a.trackCount,
      tracks: a.tracks.map((t: any) => ({ n: t.n, title: t.title, previewUrl: t.previewUrl, durationMs: t.durationMs })),
    };
    if (a.trackCount && a.tracks.length < a.trackCount) partial.push(`${e.id} ${a.title}: ${a.tracks.length}/${a.trackCount} previews`);
  } else {
    delete e.album;
    noAlbum.push(`${e.id} ${e.artist} - ${e.title}`);
  }
}

fs.writeFileSync(R('src/lib/musicCatalog.json'), JSON.stringify(catalog, null, 2) + '\n');
fs.writeFileSync(
  R('src/lib/musicCatalog.ts'),
  `import { type MusicRankingEntry } from './music';\n\nexport const RAW_SEED_MUSIC_RANKINGS: MusicRankingEntry[] = ${JSON.stringify(catalog, null, 2)};\n`,
);
console.log({ entries: catalog.length, missingOrigin, noAlbum, partial });
