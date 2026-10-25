// Replay the opened-source cost/date evidence, then run status.mjs with the same manifest.
// node --env-file=.env.local scripts/construction/research.mjs [--manifest path] [--dry-run]
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

const manifest = process.argv.includes('--manifest')
  ? process.argv[process.argv.indexOf('--manifest') + 1]
  : 'scripts/construction/research-2026-10-24.json';
const report = JSON.parse(await fs.readFile(manifest, 'utf8'));
const dry = process.argv.includes('--dry-run');
const stable = (row) => JSON.stringify(row, Object.keys(row).sort());
const hash = (row) => createHash('sha256').update(stable(row)).digest('hex');
const escape = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const marker = '<h3>Construction research — October 24, 2026</h3>';
const directory = report.snapshotDirectory || '.scrape/construction-status-research-2026-10-24';
await fs.mkdir(directory, { recursive: true });

for (const env of report.environments) {
  const base = env.base.startsWith('https:') ? process.env.PRODUCTION_API_TRANSPORT || env.base : env.base;
  let token;
  const call = async (method, route, body) => {
    let response;
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch(base + route, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      if (method !== 'GET' || ![502, 503, 504].includes(response.status) || attempt === 2) break;
      await response.arrayBuffer();
      await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
    }
    if (!response.ok) throw Error(`${env.base} ${method} ${route}: ${response.status}`);
    return response.json();
  };
  const email = process.env.ADMIN_EMAIL || 'flynni2008@gmail.com';
  ({ token } = await call('POST', '/auth/local', { email, password: process.env.ADMIN_PASSWORD }));
  const { rows: admins } = await call('GET', `/api/admin/db/User?email=${encodeURIComponent(email)}`);
  if (admins.length !== 1 || admins[0].role !== 'admin') throw Error('Admin identity mismatch');

  // Validate the entire selected batch before the first write in an environment.
  const plans = [];
  for (const entry of env.pins) {
    const research = report.research.find((r) => r.id === entry.id);
    const { rows } = await call('GET', `/api/admin/db/Pin?id=${entry.id}`);
    const before = rows[0];
    const originalTitle = entry.expectedOriginalTitle || entry.title;
    if (rows.length !== 1 || ![originalTitle, research.patch.title || originalTitle].includes(before.title) || before.userId !== entry.expectedAuthorId) throw Error(`Identity mismatch ${entry.id}`);
    const receiptPath = `${directory}/${new URL(env.base).hostname}-${entry.id}-before.json`;
    let original;
    try { original = JSON.parse(await fs.readFile(receiptPath, 'utf8')); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      if (![entry.expectedPinSha256, entry.savedPinSha256].includes(hash(before))) throw Error(`Pin changed since research snapshot: ${entry.id}`);
      original = before;
      if (!dry) await fs.writeFile(receiptPath, JSON.stringify(original, null, 2) + '\n', { flag: 'wx' });
    }
    const citations = research.sources.map((s) => `<li>${escape(s.title)}: <q>${escape(s.quote)}</q><cite data-ref="${escape(s.url)}"></cite></li>`).join('');
    const separator = '<h3>Earlier pin evidence</h3>';
    const earlier = original.longFormSummary?.startsWith(marker)
      ? original.longFormSummary.slice(original.longFormSummary.indexOf(separator) + separator.length)
      : original.longFormSummary || '';
    const patch = {
      price: research.price, priceCurrency: research.priceCurrency,
      ...research.patch,
      longFormSummary: `${marker}<p>${escape(research.note)}</p><ul>${citations}</ul>${separator}${earlier}`,
    };
    if (research.patch.utcStartDateTime && original.utcEndDateTime) {
      const duration = Date.parse(original.utcEndDateTime) - Date.parse(original.utcStartDateTime);
      if (duration < 0) throw Error(`Invalid original interval ${entry.id}`);
      patch.utcEndDateTime = new Date(Date.parse(research.patch.utcStartDateTime) + duration).toISOString();
    }
    // Resume only an unchanged original or our exact saved result.
    const normalized = { ...before };
    for (const key of Object.keys(patch)) normalized[key] = original[key];
    normalized.utcUpdatedDateTime = original.utcUpdatedDateTime;
    if (stable(normalized) !== stable(original)) throw Error(`Unrelated fields changed ${entry.id}`);
    for (const key of Object.keys(patch)) {
      if (before[key] !== original[key] && before[key] !== patch[key]) throw Error(`Conflicting edit ${entry.id}/${key}`);
    }
    plans.push({ entry, research, before, patch });
  }

  for (const { entry, research, before, patch } of plans) {
    if (dry) { console.log(env.base, entry.id, entry.status, research.price, research.priceCurrency, 'validated'); continue; }
    const { rows: references } = await call('GET', `/api/admin/db/PinReference?pinId=${entry.id}&limit=1000`);
    for (const source of research.sources) {
      if (!source.url.startsWith('https:') || !source.quote || source.openedAt !== report.checkedAt) throw Error('Unreviewed source');
      const found = references.find((r) => r.url === source.url);
      const reason = `Construction research ${report.checkedAt}: ${research.note} Source quote: “${source.quote}”${source.quoteNote ? ` ${source.quoteNote}` : ''}`;
      if (found && !found.reasoning?.includes(reason)) {
        const reasoning = [found.reasoning, reason].filter(Boolean).join('\n\n');
        if (reasoning.length > 2000) throw Error(`Reference reasoning too long ${entry.id}`);
        const { rows } = await call('PATCH', `/api/admin/db/PinReference?id=${found.id}`, { reasoning });
        if (rows.length !== 1) throw Error('Reference update failed');
      } else if (!found) {
        await call('POST', '/api/admin/db/PinReference', {
          pinId: entry.id, url: source.url, title: source.title,
          publishedDate: source.publishedDate, confidence: 95,
          reasoning: reason, addedByUserId: admins[0].id,
        });
      }
    }
    if (Object.entries(patch).some(([key, value]) => before[key] !== value)) {
      // Match every affected value; database timestamps may retain microseconds
      // that the JSON response rounds away, so they cannot be equality guards.
      const query = new URLSearchParams({ id: String(entry.id), title: before.title, userId: String(before.userId) });
      for (const key of Object.keys(patch)) {
        if (before[key] === null) query.set(`${key}.null`, 'true');
        else query.set(key, String(before[key]));
      }
      const { rows } = await call('PATCH', `/api/admin/db/Pin?${query}`, patch);
      if (rows.length !== 1) throw Error(`Concurrent pin edit ${entry.id}`);
    }
    const [{ rows: saved }, { rows: refs }] = await Promise.all([
      call('GET', `/api/admin/db/Pin?id=${entry.id}`),
      call('GET', `/api/admin/db/PinReference?pinId=${entry.id}&limit=1000`),
    ]);
    for (const [key, value] of Object.entries(before)) {
      const expected = Object.hasOwn(patch, key) ? patch[key] : value;
      if (key !== 'utcUpdatedDateTime' && saved[0][key] !== expected) throw Error(`Verification failed ${entry.id}/${key}`);
    }
    for (const source of research.sources) if (!refs.some((r) => r.url === source.url && r.reasoning?.includes(source.quote))) throw Error(`Missing evidence ${entry.id}`);
    for (const ref of references) if (!refs.some((r) => r.id === ref.id && r.url === ref.url && r.addedByUserId === ref.addedByUserId)) throw Error(`Original reference changed ${entry.id}`);
    entry.metadataVerified = true;
    entry.savedPinSha256 = hash(saved[0]);
    await fs.writeFile(manifest, JSON.stringify(report, null, 2) + '\n');
    console.log(env.base, entry.id, 'cost/date/evidence verified');
  }
}
