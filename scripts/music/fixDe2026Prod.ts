import fs from 'fs';
import path from 'path';

const REPO = process.cwd();
const TOKEN_FILE = path.join(REPO, '.scrape', 'admin.token');
const DRAFT = path.join(REPO, '.scrape', 'prod-batches', 'music-2026-10-19', 'drafts', 'de-2026-1.json');
const PIN_ID = 16088;

async function token(): Promise<string> {
  if (fs.existsSync(TOKEN_FILE) && Date.now() - fs.statSync(TOKEN_FILE).mtimeMs < 4 * 3600 * 1000) return fs.readFileSync(TOKEN_FILE, 'utf8').trim();
  const env = fs.readFileSync(path.join(REPO, '.env.local'), 'utf8');
  const get = (k: string) => env.split('\n').map((l) => l.trim().match(new RegExp(`^${k}=(.*)$`))?.[1]).find(Boolean)?.replace(/^['"]|['"]$/g, '') ?? '';
  const res = await fetch('https://www.chronopin.com/auth/local', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: get('ADMIN_EMAIL'), password: get('ADMIN_PASSWORD') }) });
  if (!res.ok) throw new Error(`login ${res.status}`);
  const t = ((await res.json()) as { token: string }).token;
  fs.writeFileSync(TOKEN_FILE, t);
  return t;
}

(async () => {
  const t = await token();
  const auth = { Authorization: `Bearer ${t}` };
  const pin = (await (await fetch(`https://www.chronopin.com/api/pins/${PIN_ID}`, { headers: auth })).json()) as Record<string, unknown>;
  console.log('before:', pin.title);
  const d = JSON.parse(fs.readFileSync(DRAFT, 'utf8'));
  for (const k of ['desk', 'parent', '_notes', 'sourceWikis']) delete d[k];
  const body = { ...pin, ...d };
  const res = await fetch(`https://www.chronopin.com/api/pins/${PIN_ID}?lightweight=1`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...auth }, body: JSON.stringify(body) });
  console.log('PUT', res.status);
  const after = (await (await fetch(`https://www.chronopin.com/api/pins/${PIN_ID}`)).json()) as { title: string; sourceUrl: string; media: unknown[]; tags: unknown[]; references: unknown[] };
  console.log('after:', after.title, after.sourceUrl, 'media', after.media.length, 'tags', after.tags.length, 'refs', after.references.length);
})();
