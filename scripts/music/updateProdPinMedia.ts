import fs from 'fs';
import path from 'path';
import { type MusicRankingEntry } from '../../src/lib/music';

const REPO = process.cwd();
const TOKEN_FILE = path.join(REPO, '.scrape', 'admin.token');
const PROGRESS_FILE = path.join(REPO, '.scrape', 'prod-batches', 'music-2026-10-16', 'media-updated.json');
const catalogJsonPath = path.resolve(REPO, 'src/lib/musicCatalog.json');
const pinIdsPath = path.resolve(REPO, 'scripts/music/musicPinIds.json');

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    throw new Error(`Admin login failed with status ${res.status}`);
  }
  const data: any = await res.json();
  const token = data.token;
  fs.writeFileSync(TOKEN_FILE, token);
  return token;
}

export async function main() {
  console.log('Loading catalog and pin IDs...');
  const catalog: MusicRankingEntry[] = JSON.parse(fs.readFileSync(catalogJsonPath, 'utf8'));
  const pinIds: Record<string, number> = JSON.parse(fs.readFileSync(pinIdsPath, 'utf8'));

  let token = await getAdminToken();
  console.log('Authenticated with admin token.');

  const progress: Record<string, boolean> = fs.existsSync(PROGRESS_FILE)
    ? JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'))
    : {};

  console.log(`Checking ${catalog.length} pins for media updates...`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < catalog.length; i++) {
    const song = catalog[i];
    const pinId = pinIds[song.id];
    if (!pinId) {
      console.warn(`[${i + 1}/${catalog.length}] No pinId for ${song.id}, skipping.`);
      continue;
    }

    if (progress[song.id]) {
      skippedCount++;
      continue;
    }

    // Fetch existing pin from prod
    let pin: any = null;
    let attempts = 0;
    while (!pin && attempts < 3) {
      attempts++;
      try {
        const getRes = await fetch(`https://www.chronopin.com/api/pins/${pinId}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(30000),
        });
        if (getRes.status === 401) {
          token = await getAdminToken();
          continue;
        }
        if (getRes.ok) {
          pin = await getRes.json();
        } else {
          console.error(`  Failed to GET pin ${pinId}: ${getRes.status}`);
          await sleep(2000);
        }
      } catch (err: any) {
        console.warn(`  Network error fetching pin ${pinId}: ${err.message}`);
        await sleep(3000);
      }
    }

    if (!pin) {
      console.error(`Could not fetch pin ${pinId} (${song.id}), moving on.`);
      continue;
    }

    const currentMediaUrl = pin.media?.[0]?.originalUrl || '';
    const needsMediaUpdate = currentMediaUrl !== song.artworkUrl;
    const needsTitleUpdate = pin.productName !== song.title && song.id.startsWith('tw-');

    if (!needsMediaUpdate && !needsTitleUpdate) {
      progress[song.id] = true;
      fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 1) + '\n');
      skippedCount++;
      continue;
    }

    console.log(
      `[${i + 1}/${catalog.length}] Updating prod pin #${pinId} (${song.id}: ${song.artist} - "${song.title}")...`,
    );
    if (needsMediaUpdate) {
      console.log(`   Old media: ${currentMediaUrl}`);
      console.log(`   New media: ${song.artworkUrl}`);
    }

    const newMedia = [
      {
        type: '1',
        originalUrl: song.artworkUrl,
        authorName: song.artist,
        authorUrl: song.sourceUrl,
      },
    ];

    const putBody = {
      ...pin,
      media: newMedia,
      productName: song.title,
      title: `${song.artist} — "${song.title}" (${song.chartName} #${song.rank} ${song.year})`,
    };

    let putSuccess = false;
    let putAttempts = 0;
    while (!putSuccess && putAttempts < 3) {
      putAttempts++;
      try {
        const putRes = await fetch(`https://www.chronopin.com/api/pins/${pinId}?lightweight=1`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(putBody),
          signal: AbortSignal.timeout(60000),
        });

        if (putRes.status === 401) {
          token = await getAdminToken();
          continue;
        }

        if (putRes.ok) {
          const updatedPin: any = await putRes.json();
          console.log(`   ✓ Saved! New thumb: ${updatedPin.media?.[0]?.thumbName}`);
          progress[song.id] = true;
          fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 1) + '\n');
          putSuccess = true;
          updatedCount++;
        } else {
          const errText = await putRes.text();
          console.error(`   ✗ PUT error (status ${putRes.status}): ${errText}`);
          await sleep(3000);
        }
      } catch (err: any) {
        console.warn(`   ✗ Network error on PUT: ${err.message}`);
        await sleep(4000);
      }
    }

    await sleep(1500);
  }

  console.log(`\nFinished updating prod pin media. Updated: ${updatedCount}, Skipped: ${skippedCount}.`);
}

main().catch(console.error);
