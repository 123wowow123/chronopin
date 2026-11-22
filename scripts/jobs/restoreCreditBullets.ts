// Re-appends the original "Credit:" bullets (from scripts/backup/seedPins.json) to a prod summary that a rewrite dropped.
//   npx tsx scripts/jobs/restoreCreditBullets.ts 16408,16892 [--apply]
import '../env';
import fs from 'node:fs';
import { getPin, updatePin } from '../../src/server/jobs/pinApi';
const ids = process.argv[2].split(',').map(Number);
const apply = process.argv.includes('--apply');
const raw = JSON.parse(fs.readFileSync('scripts/backup/seedPins.json', 'utf8'));
const seed = new Map<number, any>((Array.isArray(raw) ? raw : raw.pins).map((p: any) => [p.id, p]));
for (const id of ids) {
  const old = seed.get(id)?.longFormSummary ?? '';
  const bullets = [...old.matchAll(/<li>(.*?)<\/li>/gs)].map((m) => m[0]).filter((b) => b.includes('redit'));
  const prod: any = await getPin(id);
  const cur: string = prod.longFormSummary ?? '';
  if (!bullets.length || cur.includes('redit:') || !cur.trimEnd().endsWith('</ul>')) { console.log(id, 'SKIP', bullets.length, cur.includes('redit:')); continue; }
  const known = new Set([prod.sourceUrl, ...(prod.references ?? []).map((r: any) => r.url)]);
  const miss = bullets.flatMap((b) => [...b.matchAll(/data-ref="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'))).filter((u) => !known.has(u));
  console.log(id, apply ? 'restoring' : 'would restore', bullets.length, 'bullet(s)', miss.length ? 'CITES NON-REF ' + miss.join(' ') : '');
  if (apply) await updatePin(id, { longFormSummary: cur.trimEnd().replace(/<\/ul>$/, bullets.join('') + '</ul>') });
}
process.exit(0);
