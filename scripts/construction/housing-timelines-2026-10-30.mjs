// Applies drafted housing-project research (.tmp/housing-timeline/<id>.json, written by research lanes) to production or local:
// references, summary sections, published price, status tag, buildout profile with milestones, reaction excerpts.
// Every quote is re-verified against the raw page (PDFs via pdftotext) before anything is written; a draft with an unverifiable quote is held.
// node scripts/construction/housing-timelines-2026-10-30.mjs [--base https://www.chronopin.com] [--apply] [--only id,id]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const args = process.argv.slice(2);
const val = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : undefined);
const base = (val('--base') ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
if (!['http://127.0.0.1:3000', 'https://www.chronopin.com'].includes(base)) throw Error('Known hosts only.');
const apply = args.includes('--apply');
const only = val('--only')?.split(',').map(Number);
const token = fs.readFileSync(base.startsWith('https') ? '.scrape/admin.token' : '.scrape/admin-local.token', 'utf8').trim();
const ASSESSED = '2026-10-30';
const dir = '.tmp/housing-timeline';
const call = async (method, p, body, soft) => {
  const r = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), redirect: 'error' });
  const t = await r.text();
  if (!r.ok) { if (soft) return null; throw Error(`${method} ${p}: ${r.status} ${t.slice(0, 300)}`); }
  return t ? JSON.parse(t) : null;
};
const clip = (s, n) => (s.length <= n ? s : s.slice(0, n - 1) + '…');
const dec = (x) => x.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&(amp|nbsp|rsquo|lsquo|ldquo|rdquo|ndash|mdash|quot|apos);/g, (_, n) => ({ amp: '&', nbsp: ' ', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', ndash: '–', mdash: '—', quot: '"', apos: "'" })[n]);
const norm = (s) => dec(s).replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').replace(/" /g, '"').replace(/ "/g, '"').toLowerCase().trim();
const pages = new Map();
async function pageText(url) {
  if (pages.has(url)) return pages.get(url);
  let all = '';
  for (const ua of ['Mozilla/5.0', null]) {
    try {
      const r = await fetch(url, { headers: ua ? { 'User-Agent': ua } : {}, signal: AbortSignal.timeout(40000) });
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.subarray(0, 4).toString() === '%PDF') {
        const f = path.join(os.tmpdir(), `q${Date.now()}.pdf`); fs.writeFileSync(f, buf);
        all += ' ' + execFileSync('pdftotext', ['-layout', f, '-'], { maxBuffer: 1 << 28 }).toString(); fs.unlinkSync(f);
      } else all += ' ' + buf.toString('utf8').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
    } catch { /* try the other agent */ }
  }
  pages.set(url, norm(all)); return pages.get(url);
}
async function verify(s, where) {
  if (s?.url?.startsWith('http://')) s.url = s.url.replace('http://', 'https://');
  if (!s?.url?.startsWith('https://')) throw Error(`${where}: source needs an https url`);
  const t = await pageText(s.url);
  for (const p of s.quote.split(/\.\.\.|…/).map((x) => norm(x).replace(/^[,. ]+|[,. ]+$/g, ''))) if (!t.includes(p)) throw Error(`${where}: quote not found on ${s.url}: ${p.slice(0, 70)}`);
  if (s.quote.length > 300) throw Error(`${where}: quote over 300 chars`);
}
const pd = (x) => (/^\d{4}-\d{2}-\d{2}$/.test(x ?? '') && x <= ASSESSED ? x : null); // year-only or retrieval-day dates become null
const ev = (s) => ({ url: s.url, title: clip(s.title, 1000), publishedDate: pd(s.publishedDate), quote: s.quote });
const FSTATUS = { Proposed: 'announced', Withdrawn: 'announced', 'In Progress': 'construction', Completed: 'production' };
const STATUS = Object.keys(FSTATUS);
const NA = 'Not scored: a single housing development is not a manufacturing facility, and no capability evidence was published.';
const axes = () => Object.fromEntries(['scale', 'technical', 'workforce', 'automation', 'efficiency', 'supplyChain'].map((k) => [k, { basis: 'unknown', score: null, sources: [], reasoning: NA }]));

const files = fs.readdirSync(dir).filter((f) => /^\d+\.json$/.test(f)).map((f) => Number(f.slice(0, -5))).filter((id) => !only || only.includes(id)).sort((a, b) => a - b);
const log = [];
for (const id of files) {
  try {
    const d = JSON.parse(fs.readFileSync(`${dir}/${id}.json`, 'utf8'));
    const pin = await call('GET', `/api/pins/${id}`, undefined, true);
    if (!pin || pin.title !== d.title) { log.push([id, 'skip', `identity mismatch or missing in ${base}`]); continue; }
    if (!STATUS.includes(d.status)) throw Error('bad status');
    // verify every quote first
    for (const [i, m] of (d.factory?.milestones ?? []).entries()) await verify(m.source, `milestone ${i}`);
    for (const [i, m] of (d.factory?.metrics ?? []).entries()) await verify(m.source, `metric ${i}`);
    for (const [i, r] of (d.reviews ?? []).entries()) await verify(r, `review ${i}`);
    if (d.price) await verify(d.price.source, 'price');
    const milestones = d.factory?.milestones ?? [];
    if (!milestones.length) { log.push([id, 'hold', 'no milestones drafted']); continue; }

    const refs = new Set([pin.sourceUrl, ...(pin.references ?? []).map((r) => r.url)]);
    const newRefs = (d.refs ?? []).filter((r) => !refs.has(r.url));
    for (const r of newRefs) refs.add(r.url);
    const evRefs = [...(d.factory.metrics ?? []).map((m) => m.source), ...milestones.map((m) => m.source), ...(d.price ? [d.price.source] : [])];
    for (const s of evRefs) if (!refs.has(s.url)) { refs.add(s.url); newRefs.push({ url: s.url, title: clip(s.title, 500), publishedDate: pd(s.publishedDate), reasoning: `Source: “${clip(s.quote, 250)}”` }); }
    for (const m of d.summarySectionsHtml?.matchAll(/data-ref="([^"]+)"/g) ?? []) if (!refs.has(m[1])) throw Error(`summary cites a URL not in refs: ${m[1]}`);

    const have = await call('GET', `/api/pins/${id}/factory`, undefined, true);
    // A published budget replaces an earlier estimate (investment metric labelled "Estimated ...").
    const estMetric = have?.metrics?.find((m) => m.key === 'investment' && /^estimated/i.test(m.label));
    const replaceEstimate = !!(d.price && estMetric);
    const price = d.price && (pin.price == null || replaceEstimate) ? d.price : null;
    if (d.price && pin.price != null && pin.price !== d.price.amount && !estMetric) log.push([id, 'note', `kept existing price ${pin.price}; draft says ${d.price.amount}`]);

    let sum0 = pin.longFormSummary ?? '';
    if (replaceEstimate) sum0 = sum0.replace(/<h3>Estimated cost<\/h3>[\s\S]*?(?=<h3>|$)/, '');
    const firstH3 = d.summarySectionsHtml?.match(/<h3>[^<]+<\/h3>/)?.[0];
    const summary = d.summarySectionsHtml && !(firstH3 && sum0.includes(firstH3)) ? sum0 + d.summarySectionsHtml : sum0;
    const factory = have ?? { sector: d.factory.sector ?? 'Residential construction', status: FSTATUS[d.status], assessmentDate: ASSESSED, rubricYear: 2026, source: 'session', axes: axes(), metrics: [] };
    delete factory.checkedAt;
    factory.status = FSTATUS[d.status]; factory.assessmentDate = ASSESSED;
    if (replaceEstimate) factory.metrics = factory.metrics.filter((m) => m !== estMetric && !(m.key === 'investment' && /^estimated/i.test(m.label)));
    const keys = new Set(factory.metrics.map((m) => m.key));
    for (const m of d.factory.metrics ?? []) {
      if (m.key && keys.has(m.key)) continue;
      keys.add(m.key);
      factory.metrics.push({ key: m.key, label: m.label, value: m.value, basis: FSTATUS[d.status] === 'announced' ? 'planned' : m.basis, source: ev(m.source) });
    }
    factory.metrics = factory.metrics.slice(0, 12);
    factory.milestones = milestones.slice(0, 12).map((m) => ({ label: m.label, date: m.date, basis: m.basis, source: ev(m.source) }));
    const kinds = new Set(factory.metrics.map((m) => m.key).filter(Boolean));
    if (kinds.size < 3) throw Error(`only ${kinds.size} metric keys`);

    const { rows: tags } = await call('GET', `/api/admin/db/PinTag?pinId=${id}&limit=200`);
    const stale = tags.filter((t) => STATUS.some((s) => s.toLowerCase() === t.name.toLowerCase()) && t.name !== d.status);
    const addTags = [d.status, ...(d.status === 'In Progress' ? ['Under Construction'] : []), 'Housing'].filter((n) => !tags.some((t) => t.name.toLowerCase() === n.toLowerCase()));

    log.push([id, apply ? 'applying' : 'dry', `${d.status}${stale.length ? ` (was ${stale.map((t) => t.name)})` : ''} ms ${milestones.length} reviews ${(d.reviews ?? []).length} refs+${newRefs.length} tags+${addTags.length} price ${price ? price.amount : '-'}`]);
    if (!apply) continue;

    for (const r of newRefs) await call('POST', '/api/admin/db/PinReference', { pinId: id, url: r.url, title: r.title, publishedDate: pd(r.publishedDate), reasoning: r.reasoning ?? 'Cited in the project timeline.', confidence: 90, addedByUserId: pin.user?.id ?? pin.userId });
    if (stale.length) await call('DELETE', `/api/admin/db/PinTag?id.in=${stale.map((t) => t.id).join(',')}`);
    if (addTags.length) await call('POST', '/api/admin/db/PinTag', addTags.map((name) => ({ pinId: id, name, kind: 'topic', source: 'user' })));
    const { rows: [row] } = await call('GET', `/api/admin/db/Pin?id=${id}`);
    const qs = new URLSearchParams({ id: String(id), userId: String(row.userId), title: row.title });
    qs.set(row.price === null ? 'price.null' : 'price', String(row.price));
    const patch = { longFormSummary: summary };
    if (price) { patch.price = price.amount; patch.priceCurrency = price.currency; }
    if (d.dateConfidenceReasoning) patch.dateConfidenceReasoning = d.dateConfidenceReasoning;
    const { rows: done } = await call('PATCH', `/api/admin/db/Pin?${qs}`, patch);
    if (done.length !== 1) throw Error('concurrent edit');
    await call('PUT', `/api/pins/${id}/factory`, factory);
    if (d.reviews?.length) await call('PUT', `/api/pins/${id}/critic-reviews`, { reviews: d.reviews.map(({ url, title, publishedDate, quote, sentiment }) => ({ url, title, publishedDate: pd(publishedDate), quote, sentiment })), source: 'session', basis: 'Editorial estimate of each quoted reaction’s tone toward the project; quotes are verbatim from the cited pages.', sourceUrl: pin.sourceUrl });
    const after = await call('GET', `/api/pins/${id}`);
    const f = await call('GET', `/api/pins/${id}/factory`);
    if (after.user.id !== pin.user.id || after.title !== pin.title || f.milestones?.length !== factory.milestones.length) throw Error('readback mismatch');
    log.push([id, 'saved', `author ${after.user.userName} price ${after.price} ms ${f.milestones.length}`]);
  } catch (e) { log.push([id, 'ERROR', e.message]); }
}
for (const l of log) console.log(base, ...l);
