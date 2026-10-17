import fs from 'fs';
import path from 'path';
import { type MusicRankingEntry } from '../../src/lib/music';

const catalogJsonPath = path.resolve(process.cwd(), 'src/lib/musicCatalog.json');
const catalogTsPath = path.resolve(process.cwd(), 'src/lib/musicCatalog.ts');

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function searchItunes(query: string, country?: string): Promise<string | null> {
  try {
    let url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`;
    if (country) {
      url += `&country=${country.toLowerCase()}`;
    }
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const data: any = await res.json();
      if (data.results && data.results[0] && data.results[0].artworkUrl100) {
        return data.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
      }
    }
  } catch (err: any) {
    // ignore
  }
  return null;
}

async function verifyUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function main() {
  const catalog: MusicRankingEntry[] = JSON.parse(fs.readFileSync(catalogJsonPath, 'utf8'));
  console.log(`Researching cover art for ${catalog.length} catalog songs...`);

  let replacedCount = 0;
  for (let i = 0; i < catalog.length; i++) {
    const song = catalog[i];
    const isUnsplash = !song.artworkUrl || song.artworkUrl.includes('unsplash.com');

    if (!isUnsplash) {
      continue;
    }

    console.log(`[${i + 1}/${catalog.length}] Researching cover for: ${song.artist} - "${song.title}" (${song.year})`);

    const cleanTitle = song.title.replace(/\(.*\)/g, '').trim();
    const cleanArtist = song.artist.replace(/ft\..*$/i, '').trim();

    let newArt: string | null = null;

    // 1. Try artist + clean title
    newArt = await searchItunes(`${cleanArtist} ${cleanTitle}`);
    await sleep(400);

    // 2. Try with country store
    if (!newArt && song.countryCode) {
      newArt = await searchItunes(`${cleanArtist} ${cleanTitle}`, song.countryCode);
      await sleep(400);
    }

    // 3. Try full artist and title
    if (!newArt) {
      newArt = await searchItunes(`${song.artist} ${song.title}`);
      await sleep(400);
    }

    // 4. Try native title / alternate query for known special titles
    if (!newArt) {
      const parenthetical = song.title.match(/\((.*?)\)/);
      if (parenthetical && parenthetical[1]) {
        newArt = await searchItunes(`${cleanArtist} ${parenthetical[1]}`);
        await sleep(400);
      }
    }

    // 5. Fallback: verified official YouTube thumbnail
    if (!newArt && song.youtubeId) {
      const ytMax = `https://i.ytimg.com/vi/${song.youtubeId}/maxresdefault.jpg`;
      const ytHq = `https://i.ytimg.com/vi/${song.youtubeId}/hqdefault.jpg`;
      if (await verifyUrl(ytMax)) {
        newArt = ytMax;
      } else if (await verifyUrl(ytHq)) {
        newArt = ytHq;
      }
    }

    if (newArt) {
      console.log(`  ✓ Found cover art: ${newArt}`);
      song.artworkUrl = newArt;
      replacedCount++;
    } else {
      console.warn(`  ✗ Failed to find cover art for: ${song.title}`);
    }
  }

  console.log(`\nReplaced ${replacedCount} cover art URLs.`);

  // Write updated catalog JSON
  fs.writeFileSync(catalogJsonPath, JSON.stringify(catalog, null, 2));
  console.log(`Updated ${catalogJsonPath}`);

  // Write TypeScript module
  const tsContent = `import { type MusicRankingEntry } from './music';\n\nexport const RAW_SEED_MUSIC_RANKINGS: MusicRankingEntry[] = ${JSON.stringify(
    catalog,
    null,
    2,
  )};\n`;
  fs.writeFileSync(catalogTsPath, tsContent);
  console.log(`Updated ${catalogTsPath}`);

  const remainingUnsplash = catalog.filter((s) => s.artworkUrl?.includes('unsplash.com'));
  console.log(`Remaining unsplash covers: ${remainingUnsplash.length}`);
}

main().catch(console.error);
