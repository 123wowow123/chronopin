import fs from 'fs';
import path from 'path';
import { WAVE_3_CANDIDATES } from './wave3Candidates';

const previewsPath = path.resolve(process.cwd(), 'scripts/music/musicAudioPreviews.json');
const ytPath = path.resolve(process.cwd(), 'scripts/music/musicYoutubeMap.json');

const existingPreviews: Record<string, string> = fs.existsSync(previewsPath)
  ? JSON.parse(fs.readFileSync(previewsPath, 'utf8'))
  : {};
const existingYt: Record<string, { youtubeId: string; youtubeUrl: string }> = fs.existsSync(ytPath)
  ? JSON.parse(fs.readFileSync(ytPath, 'utf8'))
  : {};

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function searchItunes(query: string) {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`;
    const res = await fetch(url);
    if (res.ok) {
      const data: any = await res.json();
      if (data.results && data.results[0]) {
        return {
          previewUrl: data.results[0].previewUrl,
          artworkUrl: data.results[0].artworkUrl100
            ? data.results[0].artworkUrl100.replace('100x100bb', '600x600bb')
            : undefined,
        };
      }
    }
  } catch (err: any) {
    console.warn(`  iTunes error for query "${query}":`, err.message);
  }
  return null;
}

async function searchYoutube(query: string) {
  try {
    const queryEncoded = encodeURIComponent(query);
    const res = await fetch(`https://www.youtube.com/results?search_query=${queryEncoded}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    const html = await res.text();
    const match = html.match(/watch\?v=([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) {
      return match[1];
    }
  } catch (err: any) {
    console.warn(`  YouTube error for query "${query}":`, err.message);
  }
  return null;
}

async function main() {
  console.log(`Enriching ${WAVE_3_CANDIDATES.length} Wave 3 candidates...`);
  const enriched: any[] = [];

  for (let i = 0; i < WAVE_3_CANDIDATES.length; i++) {
    const song = WAVE_3_CANDIDATES[i];
    console.log(`[${i + 1}/${WAVE_3_CANDIDATES.length}] ${song.id}: ${song.artist} - "${song.title}"`);

    let audioUrl = song.audioUrl || existingPreviews[song.id];
    let youtubeId = song.youtubeId || existingYt[song.id]?.youtubeId;
    let youtubeUrl = song.youtubeUrl || existingYt[song.id]?.youtubeUrl;
    let artworkUrl = song.artworkUrl;

    if (!audioUrl) {
      // 1. Try song.itunesQuery
      let itunesRes = await searchItunes(song.itunesQuery);
      await sleep(800);

      // 2. Fallback search by clean artist + title
      if (!itunesRes?.previewUrl) {
        const cleanTitle = song.title.replace(/\(.*\)/g, '').trim();
        const cleanArtist = song.artist.replace(/ft\..*$/i, '').trim();
        itunesRes = await searchItunes(`${cleanArtist} ${cleanTitle}`);
        await sleep(800);
      }

      if (itunesRes?.previewUrl) {
        audioUrl = itunesRes.previewUrl;
        if (!artworkUrl && itunesRes.artworkUrl) {
          artworkUrl = itunesRes.artworkUrl;
        }
      }
    }

    if (!youtubeId) {
      youtubeId = await searchYoutube(song.youtubeQuery);
      await sleep(600);

      if (!youtubeId) {
        const cleanTitle = song.title.replace(/\(.*\)/g, '').trim();
        const cleanArtist = song.artist.replace(/ft\..*$/i, '').trim();
        youtubeId = await searchYoutube(`${cleanArtist} ${cleanTitle} official audio`);
        await sleep(600);
      }

      if (youtubeId) {
        youtubeUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
      }
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

  const outPath = path.resolve(process.cwd(), 'scripts/music/wave3Enriched.json');
  fs.writeFileSync(outPath, JSON.stringify(enriched, null, 2));
  console.log(`Saved ${enriched.length} songs to ${outPath}`);

  // Summary of missing items
  const missingAudio = enriched.filter((s) => !s.audioUrl);
  const missingYt = enriched.filter((s) => !s.youtubeId);
  console.log(`Finished enrichment: missing audio = ${missingAudio.length}, missing yt = ${missingYt.length}`);
}

main().catch(console.error);
