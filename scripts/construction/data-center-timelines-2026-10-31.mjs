// Applies researched drafts (.tmp/dc-timeline/<id>.json, brief: .tmp/dc-timeline/BRIEF.md) to @DataCenterDesk pins that had a status tag but no
// project timeline: every quote is re-checked against its live page, then refs, status tag, summary sections, price (only when the pin has none),
// dates, buildout profile (metrics, milestones, capacity points) and reaction excerpts are saved. Pictures are a separate, reviewed step.
// Translations are left to the translations agent.
// node scripts/construction/data-center-timelines-2026-10-31.mjs [--base https://www.chronopin.com] [--dir .tmp/dc-timeline] [--only 1,2] [--drop-unverified] [--apply]
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const args = process.argv.slice(2);
const val = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : undefined);
const base = (val('--base') ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
if (!['http://127.0.0.1:3000', 'https://www.chronopin.com'].includes(base)) throw Error('Known hosts only.');
const apply = args.includes('--apply');
const dir = val('--dir') ?? '.tmp/dc-timeline';
const only = val('--only')?.split(',').map(Number);
const ASSESSED = '2026-10-31';
const token = fs.readFileSync(base.startsWith('https') ? '.scrape/admin.token' : '.scrape/admin-local.token', 'utf8').trim();
const call = async (method, p, body, soft) => {
  const r = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), redirect: 'error' });
  const t = await r.text();
  if (!r.ok) { if (soft) return null; throw Error(`${method} ${p}: ${r.status} ${t.slice(0, 300)}`); }
  return t ? JSON.parse(t) : null;
};
const clip = (s, n) => (s.length <= n ? s : s.slice(0, n - 1) + '…');
const dec = (x) => x.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&(amp|nbsp|rsquo|lsquo|ldquo|rdquo|ndash|mdash|quot|apos);/g, (_, n) => ({ amp: '&', nbsp: ' ', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', ndash: '–', mdash: '—', quot: '"', apos: "'" })[n]);
const norm = (s) => dec(s).replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/ /g, ' ').replace(/\s+/g, ' ').replace(/" /g, '"').replace(/ "/g, '"').toLowerCase().trim();
const pages = new Map();
// Plain curl with no browser User-Agent: a page that refuses it is left unverified (and dropped), never worked around. PDFs go through pdftotext.
function pageText(url) {
  if (!pages.has(url)) {
    let text = '';
    try {
      const buf = execFileSync('curl', ['-sL', '-m', '60', url], { maxBuffer: 1 << 28 });
      if (buf.subarray(0, 4).toString() === '%PDF') {
        fs.writeFileSync('/tmp/dc-quote.pdf', buf);
        text = execFileSync('pdftotext', ['-layout', '/tmp/dc-quote.pdf', '-'], { maxBuffer: 1 << 28 }).toString();
      } else text = buf.toString('utf8').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ');
    } catch { /* unreadable */ }
    pages.set(url, norm(text));
  }
  return pages.get(url);
}
function verify(s, where) {
  if (s?.url?.startsWith('http://')) s.url = s.url.replace('http://', 'https://');
  if (!s?.url?.startsWith('https://')) throw Error(`${where}: source needs an https url`);
  if (!s.quote || s.quote.length > 300) throw Error(`${where}: quote missing or over 300 chars`);
  const t = pageText(s.url);
  for (const p of s.quote.split(/\.\.\.|…/).map((x) => norm(x).replace(/^[,. ]+|[,. ]+$/g, ''))) if (p && !t.includes(p)) throw Error(`${where}: quote not found on ${s.url}: ${p.slice(0, 70)}`);
}
const pd = (x) => (/^\d{4}-\d{2}-\d{2}$/.test(x ?? '') && x <= ASSESSED ? x : null);
const ev = (s) => ({ url: s.url, title: clip(s.title ?? s.url, 1000), publishedDate: pd(s.publishedDate), quote: s.quote });
const FSTATUS = { Proposed: 'announced', Withdrawn: 'announced', 'In Progress': 'construction', Completed: 'production' };
const STATUS = Object.keys(FSTATUS);
const NA = 'Not scored: a data-center campus is not a manufacturing facility, and no capability evidence was published.';
const axes = () => Object.fromEntries(['scale', 'technical', 'workforce', 'automation', 'efficiency', 'supplyChain'].map((k) => [k, { basis: 'unknown', score: null, sources: [], reasoning: NA }]));
const METRIC_KEYS = ['investment', 'employment', 'floorArea', 'siteArea', 'capacity', 'timeline', 'stage', 'products'];

const files = fs.readdirSync(dir).filter((f) => /^\d+\.json$/.test(f)).map((f) => Number(f.slice(0, -5))).filter((id) => !only || only.includes(id)).sort((a, b) => a - b);
const log = [];
for (const id of files) {
  try {
    const d = JSON.parse(fs.readFileSync(`${dir}/${id}.json`, 'utf8'));
    const pin = await call('GET', `/api/pins/${id}`, undefined, true);
    if (!pin || pin.title !== d.title) { log.push([id, 'skip', `identity mismatch or missing in ${base}`]); continue; }
    if (!STATUS.includes(d.status)) { log.push([id, 'hold', `no verified status (${d.status}); gaps: ${(d.gaps ?? []).join(' | ').slice(0, 160)}`]); continue; }
    const dropped = [];
    const keep = (list, get, what) => (list ?? []).filter((x, i) => { try { verify(get(x), `${what} ${i}`); return true; } catch (e) { if (!args.includes('--drop-unverified')) throw e; dropped.push(e.message.slice(0, 100)); return false; } });
    d.factory.milestones = keep(d.factory.milestones, (m) => m.source, 'milestone');
    d.factory.metrics = keep(d.factory.metrics, (m) => m.source, 'metric');
    d.capacityPoints = keep(d.capacityPoints, (c) => c.source, 'capacity point');
    d.reviews = keep(d.reviews, (r) => ({ url: r.url, quote: r.quote }), 'review');
    if (d.price) { try { verify(d.price.source, 'price'); } catch (e) { if (!args.includes('--drop-unverified')) throw e; dropped.push(e.message.slice(0, 100)); d.price = null; } }
    const milestones = d.factory.milestones;
    if (!milestones.length) { log.push([id, 'hold', `no verified milestones ${dropped.join(' ; ')}`]); continue; }
    const keys = new Set(d.factory.metrics.map((m) => m.key));
    if (keys.size < 3) { log.push([id, 'hold', `only ${keys.size} verified metric keys ${dropped.join(' ; ')}`]); continue; }

    // refs: pin's own plus everything cited by a kept item
    const have = new Set([pin.sourceUrl, ...(pin.references ?? []).map((r) => r.url)]);
    const cited = new Map();
    for (const s of [...milestones.map((m) => m.source), ...d.factory.metrics.map((m) => m.source), ...d.capacityPoints.map((c) => c.source), ...d.reviews, ...(d.price ? [d.price.source] : [])]) if (!have.has(s.url) && !cited.has(s.url)) cited.set(s.url, s);
    for (const r of d.refs ?? []) if (!have.has(r.url) && !cited.has(r.url)) cited.set(r.url, { ...r, reasoning: r.reasoning });
    const newRefs = [...cited.values()];
    // keep only sections whose cites point at the pin's references or a kept ref
    const okUrls = new Set([...have, ...newRefs.map((r) => r.url)]);
    const section = (d.summarySectionsHtml ?? '').replace(/<cite data-ref="([^"]+)"><\/cite>/g, (m, u) => (okUrls.has(u) ? m : ''));
    const summary = section && (pin.longFormSummary ?? '').includes(section.slice(0, 200)) ? pin.longFormSummary : (pin.longFormSummary ?? '') + section; // re-runs do not append twice

    const factory = { sector: d.factory.sector ?? 'Data center', status: FSTATUS[d.status], assessmentDate: ASSESSED, rubricYear: 2026, source: 'session', axes: axes(),
      metrics: d.factory.metrics.slice(0, 12).filter((m) => METRIC_KEYS.includes(m.key)).map((m) => ({ key: m.key, label: clip(m.label, 100), value: clip(m.value, 500), basis: FSTATUS[d.status] === 'announced' ? 'planned' : m.basis, source: ev(m.source) })),
      milestones: milestones.slice(0, 12).map((m) => ({ label: clip(m.label, 100), date: m.date, basis: m.basis, source: ev(m.source) })) };
    if (d.capacityPoints.length >= 2 && new Set(d.capacityPoints.map((c) => c.kind)).size === 1) factory.capacityPoints = d.capacityPoints.slice(0, 12).map((c) => ({ date: c.date, mw: c.mw, kind: c.kind, basis: c.basis, label: clip(c.label, 100), source: ev(c.source) }));

    const { rows: tags } = await call('GET', `/api/admin/db/PinTag?pinId=${id}&limit=200`);
    const stale = tags.filter((t) => STATUS.some((s) => s.toLowerCase() === t.name.toLowerCase()) && t.name !== d.status);
    const wanted = [d.status, ...(d.status === 'In Progress' ? ['Under Construction'] : []), ...(d.extraTags ?? ['Data Centers'])];
    const addTags = wanted.filter((n) => !tags.some((t) => t.name.toLowerCase() === n.toLowerCase()));
    const priceNew = d.price && pin.price == null ? d.price : null;
    log.push([id, apply ? 'applying' : 'dry', `${d.status}${stale.length ? ` (was ${stale.map((t) => t.name)})` : ''} ms ${milestones.length} cap ${factory.capacityPoints?.length ?? 0} reviews ${d.reviews.length} refs+${newRefs.length} tags+${addTags.length} price ${priceNew ? priceNew.amount : '-'}${dropped.length ? ` dropped ${dropped.length}` : ''}`]);
    if (!apply) continue;

    for (const r of newRefs) await call('POST', '/api/admin/db/PinReference', { pinId: id, url: r.url, title: clip(r.title ?? r.url, 500), publishedDate: pd(r.publishedDate), reasoning: r.reasoning ?? 'Cited in the project timeline.', confidence: 90, addedByUserId: pin.userId });
    if (stale.length) await call('DELETE', `/api/admin/db/PinTag?id.in=${stale.map((t) => t.id).join(',')}`);
    if (addTags.length) await call('POST', '/api/admin/db/PinTag', addTags.map((name) => ({ pinId: id, name, kind: 'topic', source: 'user' })));
    const { rows: [row] } = await call('GET', `/api/admin/db/Pin?id=${id}`);
    const qs = new URLSearchParams({ id: String(id), userId: String(row.userId), title: row.title });
    qs.set(row.price === null ? 'price.null' : 'price', String(row.price));
    const patch = { longFormSummary: summary };
    if (priceNew) { patch.price = priceNew.amount; patch.priceCurrency = priceNew.currency; }
    if (d.description && d.description.length > 40) patch.description = d.description.startsWith('<p>') ? d.description : `<p>${d.description}</p>`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(d.startDate ?? '') && d.startDate <= ASSESSED) { patch.utcStartDateTime = `${d.startDate}T00:00:00.000Z`; patch.allDay = true; }
    if (/^\d{4}-\d{2}-\d{2}$/.test(d.endDate ?? '')) patch.utcEndDateTime = `${d.endDate}T00:00:00.000Z`;
    if (d.dateConfidenceReasoning) patch.dateConfidenceReasoning = d.dateConfidenceReasoning;
    const { rows: done } = await call('PATCH', `/api/admin/db/Pin?${qs}`, patch);
    if (done.length !== 1) throw Error('concurrent edit');
    await call('PUT', `/api/pins/${id}/factory`, factory);
    if (d.reviews.length) await call('PUT', `/api/pins/${id}/critic-reviews`, { reviews: d.reviews.map(({ url, title, publishedDate, quote, sentiment }) => ({ url, title, publishedDate: pd(publishedDate), quote, sentiment })), source: 'session', basis: 'Editorial estimate of each quoted reaction’s tone toward the project; quotes are verbatim from the cited pages.', sourceUrl: pin.sourceUrl });
    await call('POST', '/api/admin/pins/expire', { ids: [id] });
    const after = await call('GET', `/api/pins/${id}`);
    const f = await call('GET', `/api/pins/${id}/factory`);
    if (after.user.id !== pin.user.id || after.title !== pin.title || f.milestones?.length !== factory.milestones.length) throw Error('readback mismatch');
    log.push([id, 'saved', `author ${after.user.userName} ms ${f.milestones.length} tags ${after.tags.filter((t) => STATUS.includes(t.name)).map((t) => t.name)}`]);
  } catch (e) { log.push([id, 'ERROR', e.message]); }
}
for (const l of log) console.log(base, ...l);
