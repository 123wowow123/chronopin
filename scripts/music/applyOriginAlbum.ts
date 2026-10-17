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

// ---- Stats (scripts/music/stats/output-N.json from the research agents) ----
{
  const dir = R('scripts/music/stats');
  const outs: Record<string, any> = {};
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    if (/^output-\d+\.json$/.test(f)) Object.assign(outs, JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  }
  // Findings from reading primary/Wikipedia pages in Chrome; they override the agents' song stats field by field.
  const bf = path.join(dir, 'browser-findings.json');
  if (fs.existsSync(bf)) {
    for (const [id, f] of Object.entries<any>(JSON.parse(fs.readFileSync(bf, 'utf8')))) {
      outs[id] = { ...(outs[id] ?? {}), song: { ...(outs[id]?.song ?? {}), ...f.song }, notes: f.notes };
    }
  }
  let n = 0;
  const cat: any[] = JSON.parse(fs.readFileSync(R('src/lib/musicCatalog.json'), 'utf8'));
  for (const e of cat) {
    const o = outs[e.id];
    if (!o) continue;
    const s = o.song;
    const okUrl = (u: any) => typeof u === 'string' && /^https:\/\/[^ ]+$/.test(u);
    const okInt = (v: any, min: number) => v == null || (Number.isInteger(v) && v >= min);
    if (s && (!okInt(s.peak, 1) || !okInt(s.weeksOnChart, 0) || !okInt(s.weeksAtNumberOne, 0) ||
        (s.weeksOnChart != null && s.weeksAtNumberOne != null && s.weeksAtNumberOne > s.weeksOnChart))) {
      console.log('rejected song stats (invalid numbers):', e.id, JSON.stringify(s));
    } else if (s && (s.peak != null || s.weeksOnChart != null || s.weeksAtNumberOne != null) && okUrl(s.sourceUrl)) {
      e.songStats = { peak: s.peak ?? null, weeksOnChart: s.weeksOnChart ?? null, weeksAtNumberOne: s.weeksAtNumberOne ?? null, chart: s.chart, sourceUrl: s.sourceUrl, asOf: s.asOf };
      n++;
      // Weeks at #1 where an agent disagreed with the catalog, resolved against the Wikipedia/SNEP/ARIA/FIMI
      // number-one lists (2026-10-17): Melodrama is 17 weeks (rows 11 + 6), Ciel 6, Karaoke 4, Heat Waves 6 in
      // 2021. Buga (7) and the Xiao Mei Man runs (2, 27) stay as catalogued until a primary source confirms.
      if (e.id === 'fr-2026-1') { e.weeksAtNumberOne = 17; e.songStats.weeksAtNumberOne = 17; }
      else if (e.weeksAtNumberOne != null) e.songStats.weeksAtNumberOne = e.weeksAtNumberOne;
    }
    // Albums replaced on 2026-10-17 after the compilation review: the researched album stats described the old match.
    const albumChanged = new Set(['ng-2026-1', 'de-2023-1', 'de-2022-1', 'it-2022-1', 'es-2020-1', 'za-2019-1', 'it-2024-1', 'es-2021-1', 'fr-2022-1', 'fr-2021-1', 'es-2018-1', 'tw-2017-1', 'gb-2018-1']);
    const a = albumChanged.has(e.id) ? null : o.album;
    if (a) a.certifications = (a.certifications ?? []).filter((c: any) => c?.body && c?.level);
    if (a?.peak && !(Number.isInteger(a.peak.position) && a.peak.position >= 1 && a.peak.chart)) a.peak = null;
    if (a && e.album && ((a.certifications?.length ?? 0) > 0 || a.units || a.peak) && okUrl(a.sourceUrl)) {
      e.album.stats = { certifications: a.certifications ?? [], units: a.units ?? null, peak: a.peak ?? null, sourceUrl: a.sourceUrl };
    }
  }
  fs.writeFileSync(R('src/lib/musicCatalog.json'), JSON.stringify(cat, null, 2) + '\n');
  fs.writeFileSync(
    R('src/lib/musicCatalog.ts'),
    `import { type MusicRankingEntry } from './music';\n\nexport const RAW_SEED_MUSIC_RANKINGS: MusicRankingEntry[] = ${JSON.stringify(cat, null, 2)};\n`,
  );
  console.log({ statsOutputs: Object.keys(outs).length, songStatsApplied: n });
}
