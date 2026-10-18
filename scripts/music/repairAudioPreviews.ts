import fs from 'fs';
import path from 'path';
import dns from 'dns';
import { type MusicRankingEntry } from '../../src/lib/music';

dns.setDefaultResultOrder('ipv4first');

const catalogJsonPath = path.resolve(process.cwd(), 'src/lib/musicCatalog.json');
const catalogTsPath = path.resolve(process.cwd(), 'src/lib/musicCatalog.ts');

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyAudio(url: string): Promise<boolean> {
  if (!url) return false;
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(6000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function searchPreview(query: string, country?: string): Promise<string | null> {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}${country ? `&country=${country.toLowerCase()}` : ''}&entity=song&limit=5`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data: any = await res.json();
      if (data.results && data.results.length > 0) {
        for (const r of data.results) {
          if (r.previewUrl) {
            const isAlive = await verifyAudio(r.previewUrl);
            if (isAlive) {
              return r.previewUrl;
            }
          }
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export async function main() {
  const catalog: MusicRankingEntry[] = JSON.parse(fs.readFileSync(catalogJsonPath, 'utf8'));
  console.log(`Checking audio previews for all ${catalog.length} tracks...`);

  const broken: MusicRankingEntry[] = [];
  for (let i = 0; i < catalog.length; i++) {
    const song = catalog[i];
    const ok = await verifyAudio(song.audioUrl || '');
    if (!ok) {
      broken.push(song);
      console.log(`  ✗ Broken preview: [${song.id}] ${song.artist} - "${song.title}"`);
    }
    // minimal sleep
    if (i % 20 === 0) await sleep(50);
  }

  console.log(`\nFound ${broken.length} broken audio preview URLs.`);

  if (broken.length === 0) {
    console.log('All audio previews are working 100%!');
    return;
  }

  let fixedCount = 0;
  for (const song of broken) {
    console.log(`\nRepairing: [${song.id}] ${song.artist} - "${song.title}" (${song.year}, ${song.countryCode})`);

    const cleanArtist = song.artist.replace(/[\(\uff08][^\)\uff09]+[\)\uff09]/g, '').replace(/ft\..*$/i, '').trim();
    const cleanTitle = song.title.replace(/[\(\uff08][^\)\uff09]+[\)\uff09]/g, '').trim();
    const nativeArtist = song.artist.match(/[\(\uff08]([^\)\uff09]+)[\)\uff09]/)?.[1] || '';
    const nativeTitle = song.title.match(/[\(\uff08]([^\)\uff09]+)[\)\uff09]/)?.[1] || '';

    const queries: { q: string; c?: string }[] = [];

    // Native queries if Asian characters exist
    if (nativeArtist && nativeTitle) {
      queries.push({ q: `${nativeArtist} ${nativeTitle}`, c: song.countryCode });
      queries.push({ q: `${nativeArtist} ${nativeTitle}`, c: 'us' });
    }
    if (nativeTitle) {
      queries.push({ q: `${cleanArtist} ${nativeTitle}`, c: song.countryCode });
      queries.push({ q: `${cleanArtist} ${nativeTitle}`, c: 'us' });
    }

    // Standard artist + title
    queries.push({ q: `${cleanArtist} ${cleanTitle}`, c: song.countryCode });
    queries.push({ q: `${cleanArtist} ${cleanTitle}`, c: 'us' });
    queries.push({ q: `${cleanArtist} ${cleanTitle}`, c: 'gb' });
    queries.push({ q: `${cleanArtist} ${cleanTitle} single`, c: 'us' });
    queries.push({ q: `${song.artist} ${song.title}`, c: 'us' });

    let freshUrl: string | null = null;
    for (const q of queries) {
      freshUrl = await searchPreview(q.q, q.c);
      if (freshUrl) break;
      await sleep(300);
    }

    if (freshUrl) {
      console.log(`  ✓ Found working preview: ${freshUrl}`);
      song.audioUrl = freshUrl;
      fixedCount++;
    } else {
      console.error(`  ✗ Failed to find preview for: ${song.artist} - ${song.title}`);
    }
    await sleep(400);
  }

  console.log(`\nFixed ${fixedCount} of ${broken.length} broken audio previews.`);

  // Write updated catalog JSON
  fs.writeFileSync(catalogJsonPath, JSON.stringify(catalog, null, 2) + '\n');
  console.log(`Saved ${catalogJsonPath}`);

  // Write TypeScript module
  const tsContent = `import { type MusicRankingEntry } from './music';\n\nexport const RAW_SEED_MUSIC_RANKINGS: MusicRankingEntry[] = ${JSON.stringify(
    catalog,
    null,
    2,
  )};\n`;
  fs.writeFileSync(catalogTsPath, tsContent);
  console.log(`Saved ${catalogTsPath}`);
}

main().catch(console.error);
