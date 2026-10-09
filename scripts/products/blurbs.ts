// Loads the /products landing page's "why it is good" lines (ProductBlurb,
// 0142) from a JSON file: [{ "pinId": 314, "blurb": "...", "sourceUrl": "https://...",
// "rating": { "score": 4.6, "max": 5, "source": "Wirecutter", "url": "https://..." } }] (rating optional).
//   npx tsx --env-file=.env.local scripts/products/blurbs.ts scripts/products/blurbs.json [--apply]
// A dry run by default. Every blurb must be backed by its sourceUrl: claim a
// rank, a score or a feature only when the page says so.

import { readFileSync } from 'node:fs';
import Products from '../../src/server/model/products';

const [file, ...flags] = process.argv.slice(2);
if (!file) throw new Error('usage: blurbs.ts <file.json> [--apply]');
const apply = flags.includes('--apply');
const rows: { pinId: number; blurb: string; sourceUrl?: string; rating?: { score: number; max: number; source: string; url?: string } }[] = JSON.parse(readFileSync(file, 'utf8'));

for (const row of rows) {
  if (!Number.isInteger(row.pinId) || !row.blurb?.trim() || row.blurb.length > 400) throw new Error(`bad row ${JSON.stringify(row)}`);
  console.log(`${row.pinId}\t${row.blurb}`);
  if (apply) await Products.saveBlurb({ pinId: row.pinId, blurb: row.blurb, sourceUrl: row.sourceUrl, rating: row.rating });
}
console.log(apply ? `saved ${rows.length}` : `dry run, ${rows.length} rows`);
process.exit(0);
