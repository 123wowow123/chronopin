import fs from 'fs';
import path from 'path';
import { type MusicRankingEntry } from '../../src/lib/music';

const catalogJsonPath = path.resolve(process.cwd(), 'src/lib/musicCatalog.json');
const catalogTsPath = path.resolve(process.cwd(), 'src/lib/musicCatalog.ts');

export const TARGETED_FIXES: Record<string, Partial<MusicRankingEntry>> = {
  // Taiwan
  'tw-2026-1': {
    title: 'We Will Be Fine (又到天黑)',
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music113/v4/10/61/15/106115c8-4c09-e429-3235-48999eae4fee/4710616566789.jpg/600x600bb.jpg',
  },
  'tw-2025-1': {
    title: 'We Will Be Fine (又到天黑)',
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/e7/fa/9b/e7fa9b9a-8e48-ca3c-d975-2ce91e25c43d/4710616566147.jpg/600x600bb.jpg',
  },
  'tw-2024-1': {
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/fe/23/fd/fe23fdee-13dc-64b3-300c-928eeb460980/3000.png/600x600bb.jpg',
  },
  'tw-2023-1': {
    title: 'I Want to Occupy You (我想要佔據你)',
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/10/ba/77/10ba77f4-47ae-8cb6-2913-cf49b78452b5/1..jpg/600x600bb.jpg',
  },
  'tw-2022-1': {
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/1a/07/93/1a079307-f4a0-9998-f5a3-bcd6aadc6dd8/dj.ihfqdaey.jpg/600x600bb.jpg',
  },
  'tw-2018-1': {
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/85/a5/52/85a55237-6d96-a656-21cf-715b72be15a9/cover.jpg/600x600bb.jpg',
  },
  'tw-2017-1': {
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/64/a0/f1/64a0f1b8-a36b-ff10-509a-9a8f5fef53ff/dj.zfoqlnar.jpg/600x600bb.jpg',
  },
  // China
  'cn-2024-1': {
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/d3/16/74/d316744b-ea3d-51e3-c887-971fe9a511a8/J_XMas_Cover_4000x4000_T_231213.jpg/600x600bb.jpg',
  },
  'cn-2017-1': {
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/23/65/4a/23654a78-6769-a2ec-bfd7-e032ea71c65a/191018640989.jpg/600x600bb.jpg',
  },
  // Spain
  'es-2020-1': {
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/8d/18/02/8d180261-e809-4ea1-6385-f457371d5ec1/886448774136.jpg/600x600bb.jpg',
  },
  'es-2021-1': {
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/4a/39/1c/4a391ca4-1cef-1f88-8287-aae2bcb8b85e/886448830405.jpg/600x600bb.jpg',
  },
  // United Kingdom
  'gb-2020-2': {
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/3c/3a/f8/3c3af84d-da1e-c574-79b2-abf3df527673/22CRGIM34076.rgb.jpg/600x600bb.jpg',
  },
  // United States
  'us-2018-2': {
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/69/60/7e/69607eb7-78c8-0258-654d-64d64ab20ca9/190295710132.jpg/600x600bb.jpg',
  },
  'us-2018-1': {
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music128/v4/4f/61/ef/4f61efab-6b4b-2472-73b9-5e9149ce30e9/00602567926917.rgb.jpg/600x600bb.jpg',
  },
  // Canada
  'ca-2018-1': {
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music128/v4/4f/61/ef/4f61efab-6b4b-2472-73b9-5e9149ce30e9/00602567926917.rgb.jpg/600x600bb.jpg',
  },
};

export async function main() {
  const catalog: MusicRankingEntry[] = JSON.parse(fs.readFileSync(catalogJsonPath, 'utf8'));
  console.log(`Applying targeted cover fixes to ${catalog.length} catalog tracks...`);

  let applied = 0;
  for (const s of catalog) {
    const fix = TARGETED_FIXES[s.id];
    if (fix) {
      Object.assign(s, fix);
      console.log(`  ✓ Updated ${s.id} (${s.artist} - ${s.title}) -> ${s.artworkUrl}`);
      applied++;
    }
  }

  console.log(`Applied fixes to ${applied} songs.`);

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
