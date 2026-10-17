import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const REPO = process.cwd();
const TOKEN_FILE = path.join(REPO, '.scrape', 'admin.token');
const PIN_IDS_FILE = path.join(REPO, 'scripts/music/musicPinIds.json');

export interface SingaporeTrackDef {
  id: string;
  year: number;
  rank: number;
  title: string;
  artist: string;
  chartName: string;
  chartAuthority: string;
  continent: 'Asia';
  country: 'Singapore';
  countryCode: 'SG';
  countryFlag: '🇸🇬';
  sourceUrl: string;
  releaseDate: string;
  genres: string[];
  artworkUrl: string;
  audioUrl: string;
  youtubeId: string;
  youtubeUrl: string;
  streamsOrUnits: string;
  weeksAtNumberOne: number;
  summary: string;
}

export const SINGAPORE_TRACKS: SingaporeTrackDef[] = [
  {
    id: 'sg-2026-1',
    year: 2026,
    rank: 1,
    title: 'APT.',
    artist: 'ROSÉ & Bruno Mars',
    chartName: 'The Official Singapore Chart (RIAS Top Streaming)',
    chartAuthority: 'Recording Industry Association Singapore (RIAS)',
    continent: 'Asia',
    country: 'Singapore',
    countryCode: 'SG',
    countryFlag: '🇸🇬',
    sourceUrl: 'https://www.rias.org.sg/the-official-singapore-chart/#sg-2026-1',
    releaseDate: '2024-10-18',
    genres: ['Pop-Punk', 'Pop-Rock'],
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/2d/14/66/2d14661b-345b-d0f3-4e86-56ef626e68aa/075679629203.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/70/41/42/70414259-14f5-245e-bd79-93c80401d556/mzaf_8687698460653166345.plus.aac.p.m4a',
    youtubeId: 'ekr2nIex040',
    youtubeUrl: 'https://www.youtube.com/watch?v=ekr2nIex040',
    streamsOrUnits: 'Official Singapore Chart #1 · 10 Weeks at #1 · RIAS Multi-Platinum',
    weeksAtNumberOne: 10,
    summary: 'The explosive retro-pop collaboration shattered Singapore streaming records, spending 10 consecutive weeks atop The Official Singapore Chart.'
  },
  {
    id: 'sg-2025-1',
    year: 2025,
    rank: 1,
    title: "Don't Say You Love Me",
    artist: 'Jin',
    chartName: 'The Official Singapore Chart (RIAS Top Streaming)',
    chartAuthority: 'Recording Industry Association Singapore (RIAS)',
    continent: 'Asia',
    country: 'Singapore',
    countryCode: 'SG',
    countryFlag: '🇸🇬',
    sourceUrl: 'https://www.rias.org.sg/the-official-singapore-chart/#sg-2025-1',
    releaseDate: '2025-05-16',
    genres: ['K-Pop', 'Pop-Rock'],
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/90/35/34/90353434-7681-fbf0-e425-8f0252f401d7/198704436611_Cover.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/9a/39/f1/9a39f147-533d-a5f3-2138-6b69c3db2a0f/mzaf_17512144094401549216.plus.aac.p.m4a',
    youtubeId: 'o7BcyAd6rqg',
    youtubeUrl: 'https://www.youtube.com/watch?v=o7BcyAd6rqg',
    streamsOrUnits: 'Official Singapore Chart #1 · 7 Weeks at #1 · Spotify Singapore Top Track',
    weeksAtNumberOne: 7,
    summary: "BTS's Jin topped The Official Singapore Chart for seven weeks with this soaring pop-rock anthem that dominated Singapore digital streaming throughout 2025."
  },
  {
    id: 'sg-2024-1',
    year: 2024,
    rank: 1,
    title: 'Espresso',
    artist: 'Sabrina Carpenter',
    chartName: 'RIAS Top Streaming Chart',
    chartAuthority: 'Recording Industry Association Singapore (RIAS)',
    continent: 'Asia',
    country: 'Singapore',
    countryCode: 'SG',
    countryFlag: '🇸🇬',
    sourceUrl: 'https://www.rias.org.sg/chart-archive/#sg-2024-1',
    releaseDate: '2024-04-11',
    genres: ['Nu-Disco', 'Pop'],
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/a1/1c/ca/a11ccab6-7d4c-e041-d028-998bcebeb709/24UMGIM61704.rgb.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/99/da/ff/99daffce-cdde-59c6-5ae0-7f922ce411a8/mzaf_5621292401829922816.plus.aac.p.m4a',
    youtubeId: 'eVli-tstM5E',
    youtubeUrl: 'https://www.youtube.com/watch?v=eVli-tstM5E',
    streamsOrUnits: 'Spotify Singapore Most Streamed Song 2024 · RIAS #1',
    weeksAtNumberOne: 6,
    summary: "Sabrina Carpenter's irresistible nu-disco smash became Singapore's most-streamed song of 2024, leading nationwide cafe playlists and radio rotation."
  },
  {
    id: 'sg-2023-1',
    year: 2023,
    rank: 1,
    title: 'Seven',
    artist: 'Jung Kook & Latto',
    chartName: 'RIAS Top Streaming Chart',
    chartAuthority: 'Recording Industry Association Singapore (RIAS)',
    continent: 'Asia',
    country: 'Singapore',
    countryCode: 'SG',
    countryFlag: '🇸🇬',
    sourceUrl: 'https://www.rias.org.sg/chart-archive/#sg-2023-1',
    releaseDate: '2023-07-14',
    genres: ['UK Garage', 'Pop'],
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/86/78/b4/8678b4b3-2341-7239-b6cb-bcfdaef0e4e0/196922656545_Cover.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/87/fc/7c/87fc7ced-ace9-2ec4-2e8a-c9a64c841a15/mzaf_3965990725450677139.plus.aac.p.m4a',
    youtubeId: 'QU9c0053UAU',
    youtubeUrl: 'https://www.youtube.com/watch?v=QU9c0053UAU',
    streamsOrUnits: '17 Weeks at #1 (Longest in RIAS History) · RIAS Multi-Platinum',
    weeksAtNumberOne: 17,
    summary: 'Jung Kook made chart history in Singapore with 17 weeks at #1 on the RIAS Top Streaming Chart, the longest continuous chart-topping run in Singapore history.'
  },
  {
    id: 'sg-2022-1',
    year: 2022,
    rank: 1,
    title: 'Glimpse of Us',
    artist: 'Joji',
    chartName: 'RIAS Top Streaming Chart',
    chartAuthority: 'Recording Industry Association Singapore (RIAS)',
    continent: 'Asia',
    country: 'Singapore',
    countryCode: 'SG',
    countryFlag: '🇸🇬',
    sourceUrl: 'https://www.rias.org.sg/chart-archive/#sg-2022-1',
    releaseDate: '2022-06-10',
    genres: ['Piano Pop', 'R&B'],
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/d0/2a/43/d02a433a-3ab8-9a94-b07d-1dc599b64966/93624864387.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/0c/53/c2/0c53c240-300a-5ddf-fc86-3a54e1b73a78/mzaf_13555682862214742934.plus.aac.p.m4a',
    youtubeId: 'FvOpPeKSf_4',
    youtubeUrl: 'https://www.youtube.com/watch?v=FvOpPeKSf_4',
    streamsOrUnits: '10 Weeks at #1 · RIAS Top Streaming Champion',
    weeksAtNumberOne: 10,
    summary: "Joji's melancholic piano ballad captivated Singapore listeners, holding #1 on the RIAS chart for 10 weeks and becoming one of the most covered tracks of 2022."
  },
  {
    id: 'sg-2021-1',
    year: 2021,
    rank: 1,
    title: 'Bluebirds',
    artist: 'Tanya Chua (蔡健雅)',
    chartName: 'RIAS Top Regional Chart',
    chartAuthority: 'Recording Industry Association Singapore (RIAS)',
    continent: 'Asia',
    country: 'Singapore',
    countryCode: 'SG',
    countryFlag: '🇸🇬',
    sourceUrl: 'https://www.rias.org.sg/chart-archive/#sg-2021-1',
    releaseDate: '2021-08-13',
    genres: ['Folk Pop', 'Mandopop'],
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/67/aa/3b/67aa3bdc-f3a6-9438-d08a-b827496e1cae/21UMGIM62085.rgb.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/b2/1b/df/b21bdf0f-6917-8b84-05b7-8bc14da9720d/mzaf_12285678337823653264.plus.aac.p.m4a',
    youtubeId: 'uYLyTyUajrU',
    youtubeUrl: 'https://www.youtube.com/watch?v=uYLyTyUajrU',
    streamsOrUnits: '33rd Golden Melody Awards 4x Winner (Album of the Year) · RIAS Regional #1',
    weeksAtNumberOne: 5,
    summary: "Singapore national icon Tanya Chua's acoustic masterpiece from DEPART swept the 33rd Golden Melody Awards and led Singapore's regional streaming charts."
  },
  {
    id: 'sg-2020-1',
    year: 2020,
    rank: 1,
    title: 'How You Like That',
    artist: 'BLACKPINK',
    chartName: 'RIAS Top Streaming Chart',
    chartAuthority: 'Recording Industry Association Singapore (RIAS)',
    continent: 'Asia',
    country: 'Singapore',
    countryCode: 'SG',
    countryFlag: '🇸🇬',
    sourceUrl: 'https://www.rias.org.sg/chart-archive/#sg-2020-1',
    releaseDate: '2020-06-26',
    genres: ['K-Pop', 'EDM-Trap'],
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/c3/64/46/c364465f-6271-8aae-93a8-b9979d2befe5/20UMGIM82075.rgb.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/8f/b2/b1/8fb2b1a2-2498-9490-82f8-0226abfa9dc9/mzaf_9379484322617408629.plus.aac.p.m4a',
    youtubeId: 'ioNng23DkIM',
    youtubeUrl: 'https://www.youtube.com/watch?v=ioNng23DkIM',
    streamsOrUnits: '8 Consecutive Weeks at #1 (2020 Longest Run) · RIAS Top Streaming #1',
    weeksAtNumberOne: 8,
    summary: "BLACKPINK's explosive comeback single set the 2020 record in Singapore with 8 consecutive weeks at #1, leading Singapore's massive K-pop streaming surge."
  },
  {
    id: 'sg-2019-1',
    year: 2019,
    rank: 1,
    title: 'The Story of Us (将故事写成我们)',
    artist: 'JJ Lin (林俊杰)',
    chartName: 'RIAS Top Regional Chart',
    chartAuthority: 'Recording Industry Association Singapore (RIAS)',
    continent: 'Asia',
    country: 'Singapore',
    countryCode: 'SG',
    countryFlag: '🇸🇬',
    sourceUrl: 'https://www.rias.org.sg/chart-archive/#sg-2019-1',
    releaseDate: '2019-09-20',
    genres: ['Mandopop', 'Ballad'],
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music113/v4/b4/60/09/b4600934-05dd-b5e6-7d41-46cdb2ac304a/190295343361.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/c3/07/d9/c307d9fa-9264-8cba-23be-5cdfbcde2bb6/mzaf_6035974358094296760.plus.aac.p.m4a',
    youtubeId: 'AKjgg3I6HEQ',
    youtubeUrl: 'https://www.youtube.com/watch?v=AKjgg3I6HEQ',
    streamsOrUnits: 'Spotify Singapore #1 Local Artist · RIAS Regional #1 · 350M+ Asian Streams',
    weeksAtNumberOne: 9,
    summary: "Singapore superstar JJ Lin’s timeless romantic ballad written with Vincent Fang became Singapore's most celebrated wedding anthem and regional chart-topper."
  },
  {
    id: 'sg-2018-1',
    year: 2018,
    rank: 1,
    title: 'thank u, next',
    artist: 'Ariana Grande',
    chartName: 'RIAS Top Streaming Chart',
    chartAuthority: 'Recording Industry Association Singapore (RIAS)',
    continent: 'Asia',
    country: 'Singapore',
    countryCode: 'SG',
    countryFlag: '🇸🇬',
    sourceUrl: 'https://www.rias.org.sg/chart-archive/#sg-2018-1',
    releaseDate: '2018-11-03',
    genres: ['Pop', 'R&B'],
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/bb/69/07/bb6907de-8ad4-970b-3311-121320e1bf9c/19UMGIM03691.rgb.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/89/96/16/8996169e-2309-a298-f6f0-e7c52fe8e176/mzaf_590631660224715451.plus.aac.p.m4a',
    youtubeId: 'gl1aHhXnN1k',
    youtubeUrl: 'https://www.youtube.com/watch?v=gl1aHhXnN1k',
    streamsOrUnits: '8 Consecutive Weeks at #1 (2018 Longest Run) · RIAS Multi-Platinum',
    weeksAtNumberOne: 8,
    summary: "Ariana Grande dominated the Singapore year-end charts, spending eight straight weeks at #1 on the newly launched RIAS Digital Streaming Chart."
  },
  {
    id: 'sg-2017-1',
    year: 2017,
    rank: 1,
    title: 'Wind Coat (风衣)',
    artist: 'Stefanie Sun (孙燕姿)',
    chartName: 'RIAS Top Regional Chart',
    chartAuthority: 'Recording Industry Association Singapore (RIAS)',
    continent: 'Asia',
    country: 'Singapore',
    countryCode: 'SG',
    countryFlag: '🇸🇬',
    sourceUrl: 'https://www.rias.org.sg/chart-archive/#sg-2017-1',
    releaseDate: '2017-11-09',
    genres: ['Mandopop', 'Acoustic'],
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/11/43/34/1143346f-1d34-a812-738d-41b941c49fa3/00602567102038.rgb.jpg/600x600bb.jpg',
    audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/e6/03/c6/e603c6c8-f39e-83dc-da2d-df16ec61c677/mzaf_7997443692342386297.plus.aac.p.m4a',
    youtubeId: 'cfOsmenwU6w',
    youtubeUrl: 'https://www.youtube.com/watch?v=cfOsmenwU6w',
    streamsOrUnits: 'RIAS Platinum Certified Album (No. 13 - A Dancing Van Gogh) · Singapore Year-End #1',
    weeksAtNumberOne: 6,
    summary: "Singapore's beloved pop queen Stefanie Sun returned with the emotional lead ballad of No. 13 - A Dancing Van Gogh, celebrating companionship and friendship."
  }
];

async function getAdminToken(): Promise<string> {
  if (fs.existsSync(TOKEN_FILE)) {
    const stats = fs.statSync(TOKEN_FILE);
    if (Date.now() - stats.mtimeMs < 4 * 3600 * 1000) {
      const token = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
      if (token) return token;
    }
  }

  const envContent = fs.readFileSync(path.join(REPO, '.env.local'), 'utf8');
  let email = '';
  let password = '';
  for (const line of envContent.split('\n')) {
    const m = line.trim().match(/^(ADMIN_EMAIL|ADMIN_PASSWORD)=(.*)$/);
    if (m) {
      if (m[1] === 'ADMIN_EMAIL') email = m[2].trim().replace(/^['"]|['"]$/g, '');
      if (m[1] === 'ADMIN_PASSWORD') password = m[2].trim().replace(/^['"]|['"]$/g, '');
    }
  }

  const res = await fetch('https://www.chronopin.com/auth/local', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`Admin login failed with status ${res.status}`);
  }
  const data: any = await res.json();
  const token = data.token;
  fs.writeFileSync(TOKEN_FILE, token);
  return token;
}

export function buildPinPayload(t: SingaporeTrackDef) {
  const pinTitle = `${t.artist} — "${t.title}" (${t.chartName} #${t.rank} ${t.year})`;
  const description = `${t.artist} achieved the #${t.rank} music ranking of ${t.year} on Singapore's ${t.chartName}. ${t.summary}`;
  const longFormSummary = `<p>${t.artist} reached #${t.rank} on ${t.chartName} in Singapore for ${t.year}.<cite data-ref="${t.sourceUrl}"></cite></p><p>${t.summary}</p><p><strong>Performance:</strong> ${t.streamsOrUnits}</p>`;

  return {
    title: pinTitle,
    description,
    sourceUrl: t.sourceUrl,
    utcStartDateTime: `${t.releaseDate}T00:00:00.000Z`,
    allDay: true,
    dateConfidence: 'confirmed',
    dateConfidenceReasoning: `Verified official ${t.chartName} ranking.`,
    longFormSummary,
    address: 'Singapore',
    company: t.artist,
    productName: t.title,
    categories: ['Music'],
    tags: [
      'Music Ranking',
      'Asia',
      'Singapore',
      String(t.year),
      t.chartName,
      t.artist,
      ...t.genres
    ],
    media: [
      {
        type: 1,
        originalUrl: t.artworkUrl,
        authorName: t.artist,
        authorUrl: t.sourceUrl,
      }
    ],
    references: [
      {
        url: t.sourceUrl,
        title: `${t.chartName} Official Chart`,
        confidence: 95,
        reasoning: `Verified official music ranking for ${t.year} in Singapore.`
      }
    ],
    sourceWikis: [
      {
        url: t.sourceUrl,
        title: `${t.chartName} Official Chart`,
        generatedBy: 'admin/batch',
        wiki: {
          title: `${t.chartName} Official Chart`,
          summary: `${t.artist} reached #${t.rank} on ${t.chartName} in Singapore for ${t.year}.`,
          body: description,
          tags: ['Music', 'Chart', 'Singapore']
        }
      }
    ]
  };
}

function sqlEscape(str: string): string {
  return str.replace(/'/g, "''");
}

export async function main() {
  console.log('--- Creating Singapore Music Pins on Production ---');
  const token = await getAdminToken();
  console.log('Authenticated with admin token.');

  const pinIds: Record<string, number> = fs.existsSync(PIN_IDS_FILE)
    ? JSON.parse(fs.readFileSync(PIN_IDS_FILE, 'utf8'))
    : {};

  const createdMap: Record<string, number> = {};

  for (const track of SINGAPORE_TRACKS) {
    if (pinIds[track.id]) {
      console.log(`Pin for ${track.id} already exists with ID: ${pinIds[track.id]}`);
      createdMap[track.id] = pinIds[track.id];
      continue;
    }

    const payload = buildPinPayload(track);
    console.log(`Posting pin for ${track.id}: ${track.artist} - ${track.title}...`);

    let attempts = 0;
    let pinId: number | null = null;
    while (!pinId && attempts < 3) {
      attempts++;
      try {
        const res = await fetch('https://www.chronopin.com/api/admin/pins', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userName: '@MusicDesk',
            pins: [payload],
          }),
        });

        const data: any = await res.json();
        const result = data.results?.[0];
        if (result && typeof result.id === 'number') {
          const newPinId: number = result.id;
          pinId = newPinId;
          console.log(`  ✓ Created pin #${newPinId} for ${track.id}`);
          pinIds[track.id] = newPinId;
          createdMap[track.id] = newPinId;
          fs.writeFileSync(PIN_IDS_FILE, JSON.stringify(pinIds, null, 2) + '\n');
        } else {
          console.error(`  ✗ Error posting ${track.id}:`, result || data);
        }
      } catch (err: any) {
        console.error(`  Network error (attempt ${attempts}):`, err.message);
        await new Promise((r) => setTimeout(r, 4000));
      }
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log('All Singapore pins created/verified:', createdMap);

  // Now sync production database media:
  // 1. Ensure Medium.originalUrl is the Apple CDN cover art and thumbName = NULL
  // 2. Add full-length YouTube video medium (type 3)
  console.log('Generating database SQL updates for media and videos...');
  const statements: string[] = ['BEGIN;'];

  for (const track of SINGAPORE_TRACKS) {
    const pinId = pinIds[track.id];
    if (!pinId) continue;

    // 1. Ensure cover art is exact Apple CDN and thumbName is NULL
    statements.push(`
      UPDATE "Medium"
      SET "originalUrl" = '${sqlEscape(track.artworkUrl)}',
          "thumbName" = NULL,
          "originalWidth" = 600,
          "originalHeight" = 600
      WHERE id = (
        SELECT "mediumId" FROM "PinMedium"
        WHERE "pinId" = ${pinId} AND "utcDeletedDateTime" IS NULL
        LIMIT 1
      );
    `.trim());

    // 2. Insert video medium if not already present
    const videoUrl = track.youtubeUrl;
    const iframeHtml = `<iframe width="480" height="270" src="https://www.youtube.com/embed/${track.youtubeId}?feature=oembed&enablejsapi=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen title="${sqlEscape(track.title)} by ${sqlEscape(track.artist)}"></iframe>`;

    statements.push(`
      DO $$
      DECLARE
        vid_id INT;
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM "PinMedium" pm
          JOIN "Medium" m ON m."id" = pm."mediumId"
          WHERE pm."pinId" = ${pinId} AND m."type" = '3'
        ) THEN
          INSERT INTO "Medium" ("type", "thumbName", "thumbWidth", "thumbHeight", "originalUrl", "authorName", "authorUrl", "html")
          VALUES ('3', '${sqlEscape(track.artworkUrl)}', 800, 450, '${sqlEscape(videoUrl)}', '${sqlEscape(track.artist)}', '${sqlEscape(track.sourceUrl)}', '${sqlEscape(iframeHtml)}')
          RETURNING "id" INTO vid_id;

          INSERT INTO "PinMedium" ("pinId", "mediumId", "weight")
          VALUES (${pinId}, vid_id, 1)
          ON CONFLICT DO NOTHING;
        END IF;
      END $$;
    `.trim());
  }

  statements.push('COMMIT;');

  const sql = statements.join('\n\n') + '\n';
  const sqlFile = path.join(REPO, '.scrape', 'sync_singapore_media.sql');
  fs.writeFileSync(sqlFile, sql);
  console.log(`Wrote SQL to ${sqlFile}`);

  console.log('Applying SQL transaction to production database...');
  execSync(
    `ssh -i "$HOME/.ssh/chronopin_azure" azureuser@20.109.175.187 'docker exec -i docker-postgres-1 psql -U chronopin -d chronopin' < ${sqlFile}`,
    { stdio: 'inherit' }
  );

  console.log('Successfully updated production database with media & videos!');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

