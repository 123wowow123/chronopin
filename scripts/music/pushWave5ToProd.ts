import fs from 'fs';
import path from 'path';

const REPO = process.cwd();
const BATCH_DIR = path.join(REPO, '.scrape', 'prod-batches', 'music-2026-10-18');
const DRAFTS_DIR = path.join(BATCH_DIR, 'drafts');
const POSTED_FILE = path.join(BATCH_DIR, 'posted-prod.json');
const ORDER_FILE = path.join(BATCH_DIR, 'ORDER.txt');
const TOKEN_FILE = path.join(REPO, '.scrape', 'admin.token');

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

  // Refresh token from .env.local
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
  console.log('Starting production pin push...');
  let token = await getAdminToken();
  console.log('Authenticated with admin token.');

  const order: string[] = fs
    .readFileSync(ORDER_FILE, 'utf8')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const posted: Record<string, number | string> = fs.existsSync(POSTED_FILE)
    ? JSON.parse(fs.readFileSync(POSTED_FILE, 'utf8'))
    : {};

  const toPost = order.filter((name) => typeof posted[name] !== 'number');
  console.log(`Total pins in order: ${order.length}`);
  console.log(`Already posted on prod: ${order.length - toPost.length}`);
  console.log(`Remaining to post: ${toPost.length}`);

  if (toPost.length === 0) {
    console.log('All pins are already posted to production!');
    return;
  }

  const BATCH_SIZE = 1;
  for (let i = 0; i < toPost.length; i += BATCH_SIZE) {
    const chunkNames = toPost.slice(i, i + BATCH_SIZE);
    const chunkBodies: any[] = [];

    for (const name of chunkNames) {
      const draftPath = path.join(DRAFTS_DIR, `${name}.json`);
      const body = JSON.parse(fs.readFileSync(draftPath, 'utf8'));
      delete body.desk;
      delete body.parent;
      delete body._notes;
      body.parentId = null;
      chunkBodies.push(body);
    }

    console.log(
      `[${i + 1}-${Math.min(i + BATCH_SIZE, toPost.length)} / ${toPost.length}] Posting ${chunkNames.join(', ')}...`,
    );

    let attempts = 0;
    let success = false;
    while (!success && attempts < 3) {
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
            pins: chunkBodies,
          }),
          signal: AbortSignal.timeout(120000),
        });

        if (res.status === 401) {
          console.warn('  401 Unauthorized, refreshing token...');
          token = await getAdminToken();
          continue;
        }

        const data: any = await res.json();
        const results = data.results || [];

        for (let j = 0; j < chunkNames.length; j++) {
          const name = chunkNames[j];
          const result = results[j];
          if (result && 'id' in result) {
            posted[name] = result.id;
            console.log(`  ✓ ${name} -> prod pin #${result.id}`);
          } else if (result && result.error) {
            console.error(`  ✗ ${name} error:`, result.error);
            posted[name] = `error: ${result.error}`;
          } else {
            console.error(`  ✗ ${name} unexpected result:`, result);
          }
        }

        fs.writeFileSync(POSTED_FILE, JSON.stringify(posted, null, 1) + '\n');
        success = true;
      } catch (err: any) {
        console.warn(`  Network error (attempt ${attempts}):`, err.message);
        await sleep(5000);
      }
    }

    if (!success) {
      console.error(`Failed to post pin: ${chunkNames.join(', ')}, continuing...`);
      await sleep(8000);
    } else {
      await sleep(3000);
    }
  }

  console.log('Finished posting pins to prod.');
}

main().catch(console.error);
