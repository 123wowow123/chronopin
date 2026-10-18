import fs from 'fs';
import path from 'path';
import { type MusicRankingEntry } from '../../src/lib/music';

const enrichedPath = path.resolve(process.cwd(), 'scripts/music/wave4Enriched.json');
const catalogJsonPath = path.resolve(process.cwd(), 'src/lib/musicCatalog.json');
const catalogTsPath = path.resolve(process.cwd(), 'src/lib/musicCatalog.ts');
const previewsPath = path.resolve(process.cwd(), 'scripts/music/musicAudioPreviews.json');
const ytPath = path.resolve(process.cwd(), 'scripts/music/musicYoutubeMap.json');

export async function run() {
  if (!fs.existsSync(enrichedPath)) {
    console.error(`Missing ${enrichedPath}`);
    process.exit(1);
  }

  const newSongs: MusicRankingEntry[] = JSON.parse(fs.readFileSync(enrichedPath, 'utf8'));
  const currentCatalog: MusicRankingEntry[] = JSON.parse(fs.readFileSync(catalogJsonPath, 'utf8'));
  const previews: Record<string, string> = JSON.parse(fs.readFileSync(previewsPath, 'utf8'));
  const yt: Record<string, { youtubeId: string; youtubeUrl: string }> = JSON.parse(fs.readFileSync(ytPath, 'utf8'));

  console.log(`Current catalog size: ${currentCatalog.length}`);
  console.log(`New songs to append: ${newSongs.length}`);

  const existingIds = new Set(currentCatalog.map((s) => s.id));

  let addedCount = 0;
  for (const song of newSongs) {
    if (existingIds.has(song.id)) {
      console.log(`Skipping duplicate id: ${song.id}`);
      continue;
    }

    // Verify audio preview & youtube id are present
    if (!song.audioUrl) {
      console.warn(`WARNING: Missing audioUrl for ${song.id} (${song.title})`);
    }
    if (!song.youtubeId) {
      console.warn(`WARNING: Missing youtubeId for ${song.id} (${song.title})`);
    }

    currentCatalog.push(song);
    existingIds.add(song.id);

    if (song.audioUrl) {
      previews[song.id] = song.audioUrl;
    }
    if (song.youtubeId) {
      yt[song.id] = {
        youtubeId: song.youtubeId,
        youtubeUrl: song.youtubeUrl || `https://www.youtube.com/watch?v=${song.youtubeId}`,
      };
    }
    addedCount++;
  }

  // Sort catalog by year DESC, continent (West to East), country, rank ASC
  const continentOrder: Record<string, number> = {
    'North America': 0,
    'Latin America': 1,
    Europe: 2,
    Africa: 3,
    Asia: 4,
    Oceania: 5,
  };

  currentCatalog.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    const cA = continentOrder[a.continent] ?? 99;
    const cB = continentOrder[b.continent] ?? 99;
    if (cA !== cB) return cA - cB;
    if (a.country !== b.country) return a.country.localeCompare(b.country);
    return a.rank - b.rank;
  });

  console.log(`New total catalog size: ${currentCatalog.length} (added ${addedCount})`);

  fs.writeFileSync(catalogJsonPath, JSON.stringify(currentCatalog, null, 2));
  console.log(`Updated ${catalogJsonPath}`);

  // Write TypeScript module
  const tsContent = `import { type MusicRankingEntry } from './music';\n\nexport const RAW_SEED_MUSIC_RANKINGS: MusicRankingEntry[] = ${JSON.stringify(
    currentCatalog,
    null,
    2,
  )};\n`;
  fs.writeFileSync(catalogTsPath, tsContent);
  console.log(`Updated ${catalogTsPath}`);

  fs.writeFileSync(previewsPath, JSON.stringify(previews, null, 2));
  console.log(`Updated ${previewsPath}`);

  fs.writeFileSync(ytPath, JSON.stringify(yt, null, 2));
  console.log(`Updated ${ytPath}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
