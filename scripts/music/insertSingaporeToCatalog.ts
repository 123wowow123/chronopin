import fs from 'fs';
import path from 'path';
import { SINGAPORE_TRACKS } from './createSingaporePins';

const REPO = process.cwd();
const catalogJsonPath = path.join(REPO, 'src/lib/musicCatalog.json');
const catalogTsPath = path.join(REPO, 'src/lib/musicCatalog.ts');
const ytPath = path.join(REPO, 'scripts/music/musicYoutubeMap.json');
const audioPath = path.join(REPO, 'scripts/music/musicAudioPreviews.json');

export async function main() {
  console.log('--- Inserting Singapore Tracks into Catalog ---');
  let catalog: any[] = JSON.parse(fs.readFileSync(catalogJsonPath, 'utf8'));

  // Filter out any existing Singapore tracks just in case
  catalog = catalog.filter((t: any) => !t.id.startsWith('sg-'));

  const newCatalog: any[] = [];
  const years = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017];

  for (const year of years) {
    const yearTracks = catalog.filter((t: any) => t.year === year);
    const sgTrack = SINGAPORE_TRACKS.find((t) => t.year === year);

    if (!sgTrack) {
      console.warn(`Missing SG track for year ${year}`);
      newCatalog.push(...yearTracks);
      continue;
    }

    // Find the first Asian track in this year to place SG right before it
    const firstAsiaIdx = yearTracks.findIndex((t: any) => t.continent === 'Asia');
    if (firstAsiaIdx !== -1) {
      yearTracks.splice(firstAsiaIdx, 0, sgTrack);
    } else {
      yearTracks.push(sgTrack);
    }
    newCatalog.push(...yearTracks);
  }

  console.log(`Total tracks in new catalog: ${newCatalog.length} (was ${catalog.length})`);

  // Write musicCatalog.json
  fs.writeFileSync(catalogJsonPath, JSON.stringify(newCatalog, null, 2) + '\n');
  console.log(`Updated ${catalogJsonPath}`);

  // Write musicCatalog.ts
  const tsContent = `import { type MusicRankingEntry } from './music';\n\nexport const RAW_SEED_MUSIC_RANKINGS: MusicRankingEntry[] = ${JSON.stringify(newCatalog, null, 2)};\n`;
  fs.writeFileSync(catalogTsPath, tsContent);
  console.log(`Updated ${catalogTsPath}`);

  // Update musicYoutubeMap.json
  const ytData: Record<string, any> = fs.existsSync(ytPath)
    ? JSON.parse(fs.readFileSync(ytPath, 'utf8'))
    : {};
  for (const track of SINGAPORE_TRACKS) {
    ytData[track.id] = {
      youtubeId: track.youtubeId,
      youtubeUrl: track.youtubeUrl,
    };
  }
  fs.writeFileSync(ytPath, JSON.stringify(ytData, null, 2) + '\n');
  console.log(`Updated ${ytPath}`);

  // Update musicAudioPreviews.json
  const audioData: Record<string, string> = fs.existsSync(audioPath)
    ? JSON.parse(fs.readFileSync(audioPath, 'utf8'))
    : {};
  for (const track of SINGAPORE_TRACKS) {
    audioData[track.id] = track.audioUrl;
  }
  fs.writeFileSync(audioPath, JSON.stringify(audioData, null, 2) + '\n');
  console.log(`Updated ${audioPath}`);

  console.log('Catalog insertion completed successfully!');
}

main().catch(console.error);
