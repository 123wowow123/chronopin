// Dry preview by default. --apply writes the five researched pin wiki additions.
// node scripts/boundaries/publish-research-wikis.mjs [--apply]
import fs from 'node:fs';
import { isDeepStrictEqual } from 'node:util';

const base = 'https://www.chronopin.com';
const entries = JSON.parse(fs.readFileSync('scripts/boundaries/research-pin-wikis-2026-10-25.json', 'utf8'));
const token = fs.readFileSync('.scrape/admin-boundaries-prod.token', 'utf8').trim();
const apply = process.argv.includes('--apply');
const marker = '<h3>Boundary research — 2026-10-25</h3>';
const end = '<!-- boundary-research-2026-10-25-end -->';
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const call = async (path, body) => {
  const r = await fetch(base + path, {
    method: body === undefined ? 'GET' : 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(60000),
  });
  if (!r.ok) throw Error(`${path}: HTTP ${r.status} ${(await r.text()).slice(0, 500)}`);
  return r.json();
};
const report = [];
for (const entry of entries) {
  const path = `/api/pins/${entry.pinId}`;
  const before = await call(path);
  if (before.title !== entry.pinTitle) throw Error(`Title changed: ${entry.pinId}`);
  const old = before.longFormSummary ?? '';
  const startIndex = old.indexOf(marker);
  const endIndex = old.indexOf(end, startIndex);
  if (startIndex >= 0 && endIndex < 0) throw Error(`Unterminated research section: ${entry.pinId}`);
  const section = marker + '<p>Research checked 25 October 2026. Boundary coverage remains unverified.</p>'
    + entry.paragraphs.map(p => `<p>${escape(p)}</p>`).join('')
    + '<p>Research sources:</p><ul>'
    + entry.references.map(r => `<li><a href="${escape(r.url)}">${escape(r.title)}</a></li>`).join('')
    + '</ul>' + end;
  const summary = startIndex < 0 ? old + '\n' + section
    : old.slice(0, startIndex) + section + old.slice(endIndex + end.length);
  const references = [...(before.references ?? [])];
  for (const ref of entry.references) {
    if (!references.some(r => r.url === ref.url)) references.push({ ...ref, confidence: 90, reasoning: 'Supports the research findings or stated limitations; does not establish a complete verified electoral geometry layer.' });
  }
  const changed = summary !== old || references.length !== (before.references ?? []).length;
  if (apply && changed) {
    // Recheck immediately before writing so a concurrent edit is not overwritten.
    const fresh = await call(path);
    if (!isDeepStrictEqual(fresh, before)) throw Error(`Concurrent edit: ${entry.pinId}`);
    const snapshot = `.scrape/boundaries/wiki-research-${entry.pinId}-before.json`;
    if (!fs.existsSync(snapshot)) fs.writeFileSync(snapshot, JSON.stringify(before, null, 2));
    await call(path + '?lightweight=1', { ...before, longFormSummary: summary, references });
  }
  if (apply) {
    const saved = await call(path);
    if (saved.longFormSummary !== summary) throw Error(`Wiki verification failed: ${entry.pinId}`);
    for (const field of ['title', 'description', 'sourceUrl', 'utcStartDateTime', 'utcEndDateTime', 'parentId', 'dateConfidence', 'latitude', 'longitude']) {
      if (!isDeepStrictEqual(saved[field], before[field])) throw Error(`Changed ${field}: ${entry.pinId}`);
    }
    if (saved.user?.id !== before.user?.id) throw Error(`Author changed: ${entry.pinId}`);
    for (const ref of references) {
      if (!saved.references?.some(r => r.url === ref.url)) throw Error(`Reference missing: ${entry.pinId}`);
    }
  }
  report.push({ pinId: entry.pinId, changed, verified: apply, checkedAt: new Date().toISOString() });
  console.log(entry.pinId, apply ? 'saved and verified' : 'preview', changed ? 'updated section' : 'unchanged');
}
if (apply) fs.writeFileSync('.scrape/boundaries/research-wikis-production-verified.json', JSON.stringify(report, null, 2));
