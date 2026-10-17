// Re-points the music-ranking pins on prod to the audited catalog (src/lib/musicCatalog.json):
// title, text, source, date, tags, reference and artwork. A GET -> modify -> PUT?lightweight=1 round
// trip per pin (no wiki/Chromium listeners on the VM). Resumable via the progress file.
//   npx tsx scripts/music/repointProdPins.ts [--dry] [--only us-2026-1,ca-2025-1] [--limit 5]
import fs from 'fs';
import path from 'path';
import { type MusicRankingEntry } from '../../src/lib/music';

const REPO = process.cwd();
const BATCH = path.join(REPO, '.scrape', 'prod-batches', 'music-2026-10-16');
const TOKEN_FILE = path.join(REPO, '.scrape', 'admin.token');
const PROGRESS_FILE = path.join(BATCH, 'repointed.json');
const UNVERIFIED_TAG = 'Unverified chart claim';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const only = args.includes('--only') ? new Set(args[args.indexOf('--only') + 1].split(',')) : null;
const limit = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : Infinity;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// Prod's small VM drops connections under load: retry network failures with backoff.
async function retryFetch(url: string, init: RequestInit, tries = 5): Promise<Response> {
  for (let i = 1; ; i++) {
    try {
      return await fetch(url, init);
    } catch (e) {
      if (i >= tries) throw e;
      await sleep(5000 * i);
    }
  }
}
const escapeHtml = (v: string) => v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

async function getAdminToken(force = false): Promise<string> {
  if (!force && fs.existsSync(TOKEN_FILE) && Date.now() - fs.statSync(TOKEN_FILE).mtimeMs < 4 * 3600 * 1000) {
    const t = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
    if (t) return t;
  }
  let email = '';
  let password = '';
  for (const line of fs.readFileSync(path.join(REPO, '.env.local'), 'utf8').split('\n')) {
    const m = line.trim().match(/^(ADMIN_EMAIL|ADMIN_PASSWORD)=(.*)$/);
    if (m) (m[1] === 'ADMIN_EMAIL' ? (email = m[2]) : (password = m[2]));
  }
  const strip = (s: string) => s.trim().replace(/^['"]|['"]$/g, '');
  const res = await retryFetch('https://www.chronopin.com/auth/local', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: strip(email), password: strip(password) }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Admin login failed with status ${res.status}`);
  const token = ((await res.json()) as any).token as string;
  fs.writeFileSync(TOKEN_FILE, token);
  return token;
}

const verdicts: Record<string, string> = JSON.parse(fs.readFileSync(path.join(REPO, 'scripts/music/musicAuditVerdicts.json'), 'utf8'));
const unverified = (s: MusicRankingEntry) => verdicts[s.id] === 'unverifiable';

export function buildFields(song: MusicRankingEntry) {
  const bad = unverified(song);
  const title = bad
    ? `${song.artist} — "${song.title}" (${song.chartName} ${song.year}, unverified)`
    : `${song.artist} — "${song.title}" (${song.chartName} #${song.rank} ${song.year})`;
  const description = bad
    ? song.summary.startsWith('Unverified:') ? song.summary : `Unverified: ${song.summary}`
    : `${song.artist} achieved the #${song.rank} music ranking of ${song.year} on ${song.country}'s ${song.chartName}. ${song.summary}`;
  const longFormSummary =
    `<p>${escapeHtml(song.summary)}<cite data-ref="${escapeHtml(song.sourceUrl)}"></cite></p>` +
    (song.streamsOrUnits ? `<p><strong>Performance:</strong> ${escapeHtml(song.streamsOrUnits)}</p>` : '') +
    (song.weeksAtNumberOne ? `<p><strong>Weeks at number one:</strong> ${song.weeksAtNumberOne}</p>` : '');
  const tags = [
    song.continent,
    song.country,
    String(song.year),
    song.chartName,
    song.artist,
    'Music Ranking',
    ...song.genres,
    ...(bad ? [UNVERIFIED_TAG] : []),
  ];
  return {
    title,
    description,
    longFormSummary,
    tags: [...new Set(tags)].map((name) => ({ name, kind: 'topic', source: 'user' })),
    references: song.sourceUrl
      ? [
          {
            url: song.sourceUrl,
            title: `${song.chartName} — ${song.year}`,
            confidence: bad ? 60 : 90,
            reasoning: bad
              ? `No source confirms this song as #1 for ${song.year}; kept pending research.`
              : `Chart source for the ${song.year} #${song.rank} ranking.`,
          },
        ]
      : [],
    media: song.artworkUrl
      ? [{ type: '1', originalUrl: song.artworkUrl, authorName: song.artist, authorUrl: song.sourceUrl || undefined }]
      : [],
    dateConfidence: bad ? 'estimated' : 'confirmed',
    dateConfidenceReasoning: bad ? `Release date of the song; the chart claim is unverified.` : `Release date and chart position verified against ${song.chartName}.`,
    utcStartDateTime: `${song.releaseDate}T00:00:00.000Z`,
    productName: song.title,
    company: song.artist,
  };
}

async function main() {
  const catalog: MusicRankingEntry[] = JSON.parse(fs.readFileSync(path.join(REPO, 'src/lib/musicCatalog.json'), 'utf8'));
  const pinIds: Record<string, number> = JSON.parse(fs.readFileSync(path.join(REPO, 'scripts/music/musicPinIds.json'), 'utf8'));
  const progress: Record<string, number | string> = fs.existsSync(PROGRESS_FILE) ? JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')) : {};
  let token = await getAdminToken();
  let done = 0;
  // Prod refuses two pins with one source URL (the fragment counts): a chart page shared by several
  // entries stays clean on the first and gets #<entry id> on the rest, as the original seed did.
  const firstFor = new Map<string, string>();
  for (const c of catalog) if (c.sourceUrl && !firstFor.has(c.sourceUrl)) firstFor.set(c.sourceUrl, c.id);

  for (const song of catalog) {
    if (only && !only.has(song.id)) continue;
    if (typeof progress[song.id] === 'number') continue;
    if (done >= limit) break;
    const pinId = pinIds[song.id];
    if (!pinId) {
      console.warn(`no pin id for ${song.id}`);
      continue;
    }
    const get = await retryFetch(`https://www.chronopin.com/api/pins/${pinId}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) });
    if (get.status === 401) {
      token = await getAdminToken(true);
      continue;
    }
    if (!get.ok) {
      console.error(`GET ${pinId} ${get.status}`);
      continue;
    }
    const pin: any = await get.json();
    const fields = buildFields(song);
    const body: any = { ...pin, ...fields };
    delete body.companyId;
    delete body.companyWikiUrl;
    delete body.companyLogoUrl;
    delete body.sourceUrl;
    if (song.sourceUrl) body.sourceUrl = firstFor.get(song.sourceUrl) === song.id ? song.sourceUrl : `${song.sourceUrl}#${song.id}`;
    else body.sourceUrl = pin.sourceUrl;
    if (dry) {
      console.log(`DRY ${song.id} -> pin ${pinId}: ${pin.title}\n   => ${fields.title}\n   src ${body.sourceUrl} start ${fields.utcStartDateTime} media ${fields.media.length} tags ${fields.tags.length}`);
      done++;
      continue;
    }
    const put = await retryFetch(`https://www.chronopin.com/api/pins/${pinId}?lightweight=1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90000),
    });
    if (put.ok) {
      progress[song.id] = pinId;
      console.log(`✓ ${song.id} pin ${pinId}: ${fields.title}`);
    } else {
      const t = await put.text();
      progress[song.id] = `error ${put.status}: ${t.slice(0, 200)}`;
      console.error(`✗ ${song.id} pin ${pinId} ${put.status}: ${t.slice(0, 200)}`);
      if (put.status === 401) token = await getAdminToken(true);
    }
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 1) + '\n');
    done++;
    await sleep(3000);
  }
}

if (process.argv[1]?.endsWith('repointProdPins.ts')) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
