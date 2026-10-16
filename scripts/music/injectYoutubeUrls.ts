import fs from 'fs';
import path from 'path';

const mapPath = path.resolve(process.cwd(), 'scripts/music/musicYoutubeMap.json');
const musicTsPath = path.resolve(process.cwd(), 'src/lib/music.ts');

const map = JSON.parse(fs.readFileSync(mapPath, 'utf-8')) as Record<string, { youtubeId: string; youtubeUrl: string }>;
let code = fs.readFileSync(musicTsPath, 'utf-8');

// 1. Ensure MusicRankingEntry interface includes youtubeId and youtubeUrl
if (!code.includes('youtubeId?: string;')) {
  code = code.replace(
    'audioUrl?: string;',
    'audioUrl?: string;\n  youtubeId?: string;\n  youtubeUrl?: string;',
  );
}

// 2. Inject youtubeId & youtubeUrl into each seed ranking
let updated = 0;
for (const [id, data] of Object.entries(map)) {
  const idSnippet = `id: '${id}',`;
  const idPos = code.indexOf(idSnippet);
  if (idPos === -1) {
    console.warn(`Could not find entry ${id}`);
    continue;
  }
  const nextEntryPos = code.indexOf(`id: '`, idPos + 10);
  const chunkLimit = nextEntryPos === -1 ? idPos + 2000 : nextEntryPos;
  const chunk = code.slice(idPos, chunkLimit);

  if (chunk.includes('youtubeId:')) {
    // replace existing
    const replaced = chunk
      .replace(/youtubeId: '.*?',/, `youtubeId: '${data.youtubeId}',`)
      .replace(/youtubeUrl: '.*?',/, `youtubeUrl: '${data.youtubeUrl}',`);
    code = code.slice(0, idPos) + replaced + code.slice(chunkLimit);
    updated++;
  } else {
    // insert after audioUrl
    const audioPos = code.indexOf('audioUrl:', idPos);
    if (audioPos !== -1 && audioPos < chunkLimit) {
      const lineEnd = code.indexOf('\n', audioPos);
      const toInsert = `\n    youtubeId: '${data.youtubeId}',\n    youtubeUrl: '${data.youtubeUrl}',`;
      code = code.slice(0, lineEnd) + toInsert + code.slice(lineEnd);
      updated++;
    }
  }
}

fs.writeFileSync(musicTsPath, code, 'utf-8');
console.log(`Successfully injected YouTube data for ${updated} music entries into src/lib/music.ts`);

