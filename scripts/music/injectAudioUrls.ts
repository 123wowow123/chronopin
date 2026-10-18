import fs from 'fs';
import path from 'path';

const previewsPath = path.resolve(process.cwd(), 'scripts/music/musicAudioPreviews.json');
const musicTsPath = path.resolve(process.cwd(), 'src/lib/music.ts');

const previews = JSON.parse(fs.readFileSync(previewsPath, 'utf-8')) as Record<string, string>;
let code = fs.readFileSync(musicTsPath, 'utf-8');

// 1. Ensure MusicRankingEntry has audioUrl
if (!code.includes('audioUrl?: string;')) {
  code = code.replace(
    'artworkUrl: string;',
    'artworkUrl: string;\n  audioUrl?: string;',
  );
}

// 2. Inject audioUrl into each seed ranking
let updated = 0;
for (const [id, url] of Object.entries(previews)) {
  if (!url) continue;
  const idSnippet = `id: '${id}',`;
  const idPos = code.indexOf(idSnippet);
  if (idPos === -1) {
    console.warn(`Could not find entry ${id}`);
    continue;
  }
  const nextEntryPos = code.indexOf(`id: '`, idPos + 10);
  const chunkLimit = nextEntryPos === -1 ? idPos + 2000 : nextEntryPos;
  const chunk = code.slice(idPos, chunkLimit);

  if (chunk.includes('audioUrl:')) {
    // replace existing
    const replacedChunk = chunk.replace(/audioUrl: '.*?',/, `audioUrl: '${url}',`);
    code = code.slice(0, idPos) + replacedChunk + code.slice(chunkLimit);
    updated++;
  } else {
    // insert after artworkUrl
    const artworkPos = code.indexOf('artworkUrl:', idPos);
    if (artworkPos !== -1 && artworkPos < chunkLimit) {
      const lineEnd = code.indexOf('\n', artworkPos);
      code = code.slice(0, lineEnd) + `\n    audioUrl: '${url}',` + code.slice(lineEnd);
      updated++;
    }
  }
}

// 3. Add helper functions at the end of music.ts
const helpers = `
export function getMusicRankingEntry(idOrPinId: string | number): MusicRankingEntry | undefined {
  if (typeof idOrPinId === 'number') {
    return SEED_MUSIC_RANKINGS.find((r) => r.pinId === idOrPinId);
  }
  return SEED_MUSIC_RANKINGS.find((r) => r.id === idOrPinId || String(r.pinId) === idOrPinId);
}

export function getMusicRankingByTitleOrPin(id: number, title?: string, productName?: string | null): MusicRankingEntry | undefined {
  const byPinId = SEED_MUSIC_RANKINGS.find((r) => r.pinId === id);
  if (byPinId) return byPinId;

  if (productName) {
    const pLower = productName.toLowerCase().trim();
    const byProduct = SEED_MUSIC_RANKINGS.find((r) => r.title.toLowerCase().trim() === pLower);
    if (byProduct) return byProduct;
  }

  if (title) {
    const tLower = title.toLowerCase();
    const byTitle = SEED_MUSIC_RANKINGS.find(
      (r) => tLower.includes(r.title.toLowerCase()) || r.title.toLowerCase().includes(tLower),
    );
    if (byTitle) return byTitle;
  }

  return undefined;
}
`;

if (!code.includes('getMusicRankingEntry')) {
  code = code.trimEnd() + '\n' + helpers;
}

fs.writeFileSync(musicTsPath, code, 'utf-8');
console.log(`Successfully updated ${updated} music entries in src/lib/music.ts`);

