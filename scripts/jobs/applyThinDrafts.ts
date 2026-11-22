// Applies researched thin-pin drafts (JSON from research agents) through the jobs updatePin (real PUT API, prod when
// JOBS_PROD_BASE is set). Gates: text >= 900 chars, final refs <= 5 (uncited/lowest-confidence adds trimmed first),
// every cited URL must be the sourceUrl or a final reference, else the pin is held for review.
//   npx tsx scripts/jobs/applyThinDrafts.ts draft_A.json 16408,16300 [--apply]
import '../env';
import fs from 'node:fs';
import { getPin, updatePin } from '../../src/server/jobs/pinApi';
const [file, idList] = process.argv.slice(2);
const apply = process.argv.includes('--apply');
const drafts = JSON.parse(fs.readFileSync(file, 'utf8'));
const items: any[] = Array.isArray(drafts) ? drafts : drafts.pins ?? Object.values(drafts);
const want = new Set(idList.split(',').map(Number));
const strip = (h: string) => h.replace(/<[^>]+>/g, '');
for (const d of items.filter((x) => want.has(x.id))) {
  if (d.skip) { console.log(d.id, 'SKIP', d.reason); continue; }
  const pin: any = await getPin(d.id);
  const existing: string[] = (pin.references ?? []).map((r: any) => r.url);
  const known = new Set([...existing, pin.sourceUrl].filter(Boolean));
  const cited = [...new Set([...(d.longFormSummary as string).matchAll(/data-ref="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&')))];
  let adds: any[] = (d.addReferences ?? []).filter((r: any) => !known.has(r.url));
  const room = Math.max(0, 5 - existing.length);
  adds = adds.sort((a, b) => Number(cited.includes(b.url)) - Number(cited.includes(a.url)) || b.confidence - a.confidence).slice(0, room);
  const finalRefs = new Set([...known, ...adds.map((a) => a.url)]);
  const uncited = cited.filter((u) => !finalRefs.has(u));
  const text = strip(d.longFormSummary).length;
  const distinct = finalRefs.size;
  const problems = [text < 900 && `text ${text}`, distinct < 3 && `sources ${distinct}`, uncited.length && `cited-not-ref ${uncited.join(' ')}`].filter(Boolean);
  console.log(d.id, problems.length ? 'HOLD ' + problems.join('; ') : 'ok', `text ${text} refs ${existing.length}+${adds.length} distinct ${distinct}`);
  if (problems.length || !apply) continue;
  // Keep what a rewrite must not lose: "Credit:" bullets and the generated Nintendo series-catalog block (internal links).
  const oldSummary: string = pin.longFormSummary ?? '';
  let summary: string = d.longFormSummary;
  const creditBullets = [...oldSummary.matchAll(/<li>(.*?)<\/li>/gs)].map((m) => m[0]).filter((b) => b.includes('redit:') && !summary.includes(b.slice(4, 60)));
  if (creditBullets.length && !summary.includes('redit:') && summary.trimEnd().endsWith('</ul>')) summary = summary.trimEnd().replace(/<\/ul>$/, creditBullets.join('') + '</ul>');
  const catalogAt = oldSummary.indexOf('Part of the');
  if (catalogAt >= 0 && oldSummary.includes('series catalog') && !summary.includes('series catalog')) summary = `${summary}\n\n${oldSummary.slice(catalogAt)}`;
  const patch: Record<string, unknown> = { longFormSummary: summary };
  if (d.description) patch.description = d.description;
  if (adds.length) patch.addReferences = adds;
  const saved: any = await updatePin(d.id, patch);
  const after = await getPin(d.id) as any;
  console.log('  saved', d.id, strip(after.longFormSummary ?? '').length, 'chars', (after.references ?? []).length, 'refs');
}
process.exit(0);
