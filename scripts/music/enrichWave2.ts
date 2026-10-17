import fs from 'fs';
import path from 'path';
import { WAVE_2_CANDIDATES, Candidate } from './wave2Candidates';

const existingPreviews: Record<string, string> = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), 'scripts/music/musicAudioPreviews.json'), 'utf8'),
);
const existingYt: Record<string, { youtubeId: string; youtubeUrl: string }> = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), 'scripts/music/musicYoutubeMap.json'), 'utf8'),
);

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log(`Enriching ${WAVE_2_CANDIDATES.length} Wave 2 candidates...`);
  const enriched: any[] = [];

  for (let i = 0; i < WAVE_2_CANDIDATES.length; i++) {
    const song = WAVE_2_CANDIDATES[i];
    console.log(`[${i + 1}/${WAVE_2_CANDIDATES.length}] ${song.id}: ${song.artist} - "${song.title}"`);

    let audioUrl = song.audioUrl || existingPreviews[song.id];
    let youtubeId = song.youtubeId || existingYt[song.id]?.youtubeId;
    let youtubeUrl = song.youtubeUrl || existingYt[song.id]?.youtubeUrl;
    let artworkUrl = song.artworkUrl;

    if (!audioUrl) {
      try {
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(song.itunesQuery)}&entity=song&limit=1`;
        const res = await fetch(url);
        if (res.ok) {
          const data: any = await res.json();
          if (data.results && data.results[0]) {
            audioUrl = data.results[0].previewUrl;
            if (data.results[0].artworkUrl100) {
              artworkUrl = data.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
            }
          }
        }
      } catch (err: any) {
        console.warn(`  iTunes error for ${song.title}:`, err.message);
      }
      await sleep(1000);
    }

    if (!youtubeId) {
      try {
        const queryEncoded = encodeURIComponent(song.youtubeQuery);
        const res = await fetch(`https://www.youtube.com/results?search_query=${queryEncoded}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        });
        const html = await res.text();
        const match = html.match(/watch\?v=([a-zA-Z0-9_-]{11})/);
        if (match && match[1]) {
          youtubeId = match[1];
          youtubeUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
        }
      } catch (err: any) {
        console.warn(`  YouTube error for ${song.title}:`, err.message);
      }
      await sleep(500);
    }

    console.log(`  -> audio: ${audioUrl ? 'OK' : 'MISSING'}, yt: ${youtubeId || 'MISSING'}`);

    enriched.push({
      id: song.id,
      year: song.year,
      rank: song.rank,
      title: song.title,
      artist: song.artist,
      chartName: song.chartName,
      chartAuthority: song.chartAuthority,
      continent: song.continent,
      country: song.country,
      countryCode: song.countryCode,
      countryFlag: song.countryFlag,
      sourceUrl: song.sourceUrl,
      releaseDate: song.releaseDate,
      genres: song.genres,
      artworkUrl: artworkUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
      audioUrl: audioUrl || '',
      youtubeId: youtubeId || '',
      youtubeUrl: youtubeUrl || '',
      streamsOrUnits: song.streamsOrUnits,
      weeksAtNumberOne: song.weeksAtNumberOne,
      summary: song.summary,
    });
  }

  const outPath = path.resolve(process.cwd(), 'scripts/music/wave2Enriched.json');
  fs.writeFileSync(outPath, JSON.stringify(enriched, null, 2));
  console.log(`Saved ${enriched.length} songs to ${outPath}`);
}

main().catch(console.error);
