import '../scripts/env';
import * as db from '@/server/db';
import { readFileSync, writeFileSync } from 'node:fs';
const audit = JSON.parse(readFileSync('tmp/review-audit.json', 'utf8'));
const research = JSON.parse(readFileSync('tmp/review-dates.json', 'utf8'));
const approved = new Map<number, number>([
  [19984, 0.1], [20014, 0.9], [19872, -0.5], [19878, 0.55], [19877, 0.7], [19981, 0.7],
  [19873, 0.55], [20018, 0.55], [20067, 0.7], [15216, 0.8], [15261, 0.7], [15262, 0.05],
  [15254, 0.55], [19972, -0.2], [20016, -0.2], [20015, 0.75], [19993, 0.65], [20019, 0.85],
  [20022, 0.65], [20021, 0.8], [20025, 0.7], [19551, -0.4], [19552, -0.4], [19553, -0.4],
  [2462, 0.8], [2592, 0.6], [163, 0.7], [5461, 0.1],
]);
const entries = new Map<string, any>();
for (const [url, page] of Object.entries(research.pages) as [string, any][]) {
  if (!page.publishedDate || page.publishedDate < '1900-01-01' || page.publishedDate > '2026-10-26') continue;
  for (const match of page.matches ?? []) {
    if (!approved.has(match.pinId) || !match.quoteMatches) continue;
    const old = audit.tables.find((t: any) => t.table === match.table).undated.find((r: any) => r.pinId === match.pinId && r.review.url === url);
    if (old.review.quote.length > 300) continue;
    const [pin] = await db.query(`SELECT "sourceUrl" FROM "Pin" WHERE "id" = $1`, [match.pinId]);
    const key = `${match.table}:${match.pinId}`;
    const entry = entries.get(key) ?? { table: match.table, pinId: match.pinId, pinSourceUrl: pin.sourceUrl, basis: 'Publication dates verified 2026-10-26 from explicit publisher metadata; existing verbatim extracts rechecked in the opened HTTPS body. Sentiment estimates follow the review rubric. Original publication day, not modification or research date.', reviews: [], evidence: [] };
    entry.reviews.push({ ...old.review, title: page.title || old.review.title, publishedDate: page.publishedDate, sentiment: old.review.sentiment ?? approved.get(match.pinId) });
    entry.evidence.push({ url, finalUrl: page.finalUrl, openedAt: research.checkedAt, quoteVerified: true, dates: page.dates });
    entries.set(key, entry);
  }
}
writeFileSync('scripts/products/review-research-2026-10-26.json', JSON.stringify({ checkedAt: research.checkedAt, entries: [...entries.values()] }, null, 2) + '\n');
console.log(entries.size, 'pins;', [...entries.values()].reduce((n,e)=>n+e.reviews.length,0), 'reviews');
await db.closeConnection();
