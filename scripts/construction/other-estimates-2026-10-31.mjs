// Applies drafted cost research for non-housing construction pins (.tmp/other-estimates/approved.json: lane drafts whose
// quotes were verified against the raw pages). published -> price only; estimate -> price + factory breakdown + summary section.
// Prices stay in the source currency (no FX). node scripts/construction/other-estimates-2026-10-31.mjs [--base https://www.chronopin.com] [--apply] [--only id,id]
import fs from 'node:fs';
const args = process.argv.slice(2);
const val = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : undefined);
const base = (val('--base') ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
if (!['http://127.0.0.1:3000', 'https://www.chronopin.com'].includes(base)) throw Error('Known hosts only.');
const apply = args.includes('--apply');
const only = val('--only')?.split(',').map(Number);
const token = fs.readFileSync(base.startsWith('https') ? '.scrape/admin.token' : '.scrape/admin-local.token', 'utf8').trim();
const ASSESSED = '2026-10-31';
const call = async (method, path, body, soft) => {
  const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), redirect: 'error' });
  const t = await r.text();
  if (!r.ok) { if (soft) return null; throw Error(`${method} ${path}: ${r.status} ${t.slice(0, 300)}`); }
  return t ? JSON.parse(t) : null;
};
const fmt = (n) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });
const sym = (c) => (c === 'USD' ? '$' : c === 'EUR' ? '€' : c === 'GBP' ? '£' : `${c} `);
const money = (n, c) => {
  const [d, w] = n >= 1e9 ? [1e9, 'billion'] : n >= 1e6 ? [1e6, 'million'] : [1, ''];
  const x = n / d;
  return `${sym(c)}${d === 1 ? fmt(n) : `${+x.toFixed(x >= 100 ? 0 : x >= 10 ? 1 : 2)} ${w}`}`;
};
const exact = (n, c) => `${sym(c)}${fmt(n)}`;
const clip = (s, n) => (s.length <= n ? s : s.slice(0, n - 1) + '…');
const ev = (s) => ({ url: s.url, title: clip(s.title, 1000), publishedDate: s.publishedDate ?? null, quote: clip(s.quote, 300) });
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const cite = (...u) => u.map((x) => `<cite data-ref="${x}"></cite>`).join('');
const one = (u) => ({ seats: 'seat', beds: 'bed', rooms: 'room' })[u] ?? u;

const entries = JSON.parse(fs.readFileSync('.tmp/other-estimates/approved.json', 'utf8'));
const NA = 'Not scored: a single building project is not a manufacturing facility, and no capability evidence was published.';
const axes = Object.fromEntries(['scale', 'technical', 'workforce', 'automation', 'efficiency', 'supplyChain'].map((k) => [k, { basis: 'unknown', score: null, sources: [], reasoning: NA }]));
const log = [];

for (const e of entries) {
  if (only && !only.includes(e.id)) continue;
  if (e.decision === 'null') { log.push([e.id, 'null', e.nullReason]); continue; }
  const pin = await call('GET', `/api/pins/${e.id}`, undefined, true);
  if (!pin || pin.title !== e.title) { log.push([e.id, 'skip', `identity mismatch or missing in ${base}`]); continue; }
  const refs = new Set([pin.sourceUrl, ...(pin.references ?? []).map((r) => r.url)]);
  const newRefs = [];
  const need = (s, why) => { if (!refs.has(s.url)) { refs.add(s.url); newRefs.push({ url: s.url, title: clip(s.title, 500), publishedDate: s.publishedDate ?? null, reasoning: `${why}: “${clip(s.quote, 300)}”` }); } };
  let price, currency, summaryHtml, factory;

  if (e.decision === 'published') {
    const p = e.published; price = p.amount; currency = p.currency;
    need(p.source, 'Published project cost');
    summaryHtml = `<h3>Cost</h3><p>The published cost is ${money(price, currency)}: ${esc(p.note)}${cite(p.source.url)}</p>`;
    if (e.scope) {
      // A published figure for a larger scope than the pin: labelled "Whole-project cost" on the pin page.
      const names = (pin.tags ?? []).map((t) => t.name);
      const status = names.includes('Completed') ? 'production' : names.includes('Proposed') ? 'announced' : 'construction';
      summaryHtml = `<h3>Cost</h3><p>${money(price, currency)} is the published cost of ${esc(e.scope)} The part this pin covers has no published cost of its own, so this is a whole-project figure, not the cost of what the pin covers.${e.caveats ? ' ' + esc(e.caveats) : ''}${cite(p.source.url)}</p>`;
      const have = await call('GET', `/api/pins/${e.id}/factory`, undefined, true);
      factory = have ?? { sector: 'Construction', status, assessmentDate: ASSESSED, rubricYear: 2026, source: 'session', axes, metrics: [] };
      delete factory.checkedAt;
      factory.metrics = [...factory.metrics.filter((m) => m.key !== 'investment'), { key: 'investment', basis: 'planned', label: 'Whole-project cost', value: clip(`${money(price, currency)} for ${e.scope}`, 500), source: ev(p.source) }];
    }
  } else {
    const { quantity: q, stage } = e;
    const b = { ...e.benchmark };
    const comps = b.comparators ?? null;
    if (comps) {
      if (comps.length < 2) throw Error(`${e.id}: need at least two comparators`);
      for (const c of comps) c.perUnit = c.cost / c.quantity;
      b.low = Math.round(Math.min(...comps.map((c) => c.perUnit))); b.high = Math.round(Math.max(...comps.map((c) => c.perUnit)));
      b.source = comps[0].source;
    }
    currency = b.currency;
    if (q.unit !== b.unit) throw Error(`${e.id}: quantity unit ${q.unit} != benchmark unit ${b.unit}`);
    need(q.source, 'Quantity'); need(stage.source, 'Project stage'); for (const c of comps ?? [{ source: b.source }]) need(c.source, 'Cost benchmark');
    const lo = q.value * b.low, hi = q.value * b.high, mid = (lo + hi) / 2;
    const step = 10 ** (Math.floor(Math.log10(mid)) - 2);
    price = Math.round(mid / step) * step;
    const built = stage.status !== 'announced';
    const basis = built ? 'demonstrated' : 'planned';
    const u = one(b.unit), qty = `${fmt(q.value)} ${q.unit}`;
    const per = (n) => `${exact(n, currency)} per ${u}`;
    const lines = [
      { kind: 'sourced', label: 'Quantity', value: qty, note: q.label, source: ev(q.source) },
      ...(comps
        ? comps.map((c) => ({ kind: 'sourced', label: `Comparable: ${c.name}`, value: per(Math.round(c.perUnit)), note: `${exact(c.cost, currency)} for ${fmt(c.quantity)} ${q.unit}. ${c.note ?? ''}`.trim(), source: ev(c.source) }))
        : [
          { kind: 'sourced', label: `Cost per ${u}, low`, value: per(b.low), note: `${b.label}, applied to ${b.region}. ${b.why}`, source: ev(b.source) },
          { kind: 'sourced', label: `Cost per ${u}, high`, value: per(b.high), note: 'Top of the same published range.', source: ev(b.source) },
        ]),
      ...(comps ? [{ kind: 'assumption', label: 'Benchmark choice', value: `${per(b.low)} to ${per(b.high)}`, note: `Range taken from the lowest and highest comparable above. ${b.label}. Applied to ${b.region}. ${b.why}` }] : []),
      { kind: 'result', label: 'Cost range', value: `${money(lo, currency)} – ${money(hi, currency)}`, note: `Low: ${qty} × ${exact(b.low, currency)} = ${exact(lo, currency)}. High: ${qty} × ${exact(b.high, currency)} = ${exact(hi, currency)}.` },
      { kind: 'result', label: 'Figure used for the price', value: money(price, currency), note: `${qty} × ${exact((b.low + b.high) / 2, currency)} (midpoint per ${u}) = ${exact(mid, currency)}${price === mid ? '' : `, rounded to ${money(price, currency)}`}. No currency conversion was applied.` },
      { kind: 'assumption', label: 'Not included', value: 'Land, soft costs, financing', note: `Land, design and permit fees, financing and owner costs are excluded, so this is a building-cost estimate, not a project budget. The benchmark is not adjusted for the year or place this was built. ${e.caveats ?? ''} No project budget was found.`.replace(/\s+/g, ' ').trim() },
    ];
    for (const l of lines) { l.note = clip(l.note, 500); l.value = clip(l.value, 200); }
    const single = b.low === b.high && !comps;
    if (single) { lines[2] = { ...lines[2], label: 'Cost per ' + u + ' (single published figure)', value: per(b.low), note: 'The source gives one figure, so low and high are the same.' }; lines.splice(1, 1); lines[1].label = `Cost per ${u}`; lines[1].note = `${b.label}, applied to ${b.region}. ${b.why}`; lines[1].source = ev(b.source); }
    const metric = {
      key: 'investment', basis: 'planned', label: 'Estimated construction cost',
      value: `About ${money(price, currency)} (${single ? 'single per-' + u + ' figure' : `range ${money(lo, currency)}–${money(hi, currency)}`}): ${qty} at ${single ? exact(b.low, currency) : `${exact(b.low, currency)}–${exact(b.high, currency)}`} per ${u}. ${comps ? `Based on ${comps.length} comparable projects. ` : ''}An estimate, not a published budget; excludes land, soft costs and financing.`,
      source: ev(b.source), breakdown: lines,
    };
    const have = await call('GET', `/api/pins/${e.id}/factory`, undefined, true);
    factory = have ?? { sector: 'Construction', status: stage.status, assessmentDate: ASSESSED, rubricYear: 2026, source: 'session', axes, metrics: [] };
    delete factory.checkedAt;
    const keep = factory.metrics.filter((m) => m.key !== 'investment');
    if (!keep.some((m) => m.key === 'stage')) keep.push({ key: 'stage', basis, label: 'Stage', value: stage.label, source: ev(stage.source) });
    if (!keep.some((m) => m.key === 'capacity' || m.key === 'floorArea')) keep.push({ key: q.unit.startsWith('sq') ? 'floorArea' : 'capacity', basis, label: q.unit.startsWith('sq') ? 'Floor area' : 'Capacity', value: q.label, source: ev(q.source) });
    if (!keep.some((m) => m.key === 'timeline')) keep.push({ key: 'timeline', basis, label: 'Status', value: stage.label, source: ev(stage.source) });
    factory.metrics = [...keep, metric];
    summaryHtml = `<h3>Estimated cost</h3><p>No project budget was found, so the price is an estimate built from published inputs, not a reported figure. The working:</p><ul>`
      + `<li>Quantity: ${esc(q.label)}.${cite(q.source.url)}</li>`
      + `<li>Cost per ${u}: ${exact(b.low, currency)} to ${exact(b.high, currency)} (${esc(b.label)}, applied to ${esc(b.region)}). ${esc(b.why)}${comps ? '' : cite(b.source.url)}</li>`
      + (comps ? comps.map((c) => `<li>Comparable, ${esc(c.name)}: ${exact(c.cost, currency)} for ${fmt(c.quantity)} ${q.unit}, ${exact(Math.round(c.perUnit), currency)} per ${u}.${cite(c.source.url)}</li>`).join('') : '')
      + `<li>Range: ${qty} × ${exact(b.low, currency)} = ${money(lo, currency)} to ${qty} × ${exact(b.high, currency)} = ${money(hi, currency)}. The midpoint, about ${money(price, currency)}, is used as the price.</li>`
      + `<li>Excluded: land, design and permit fees, financing and owner costs. The benchmark is not adjusted for the year or place this was built, and no currency conversion was applied.${e.caveats ? ' ' + esc(e.caveats) : ''}</li></ul>`;
  }

  const s = pin.longFormSummary ?? '';
  const section = /<h3>(?:Estimated cost|Cost)<\/h3>[\s\S]*?(?=<h3>|$)/;
  const longFormSummary = section.test(s) ? s.replace(section, () => summaryHtml)
    : /<h3>(?:Images?|Renderings?|Photos?)\b/.test(s) ? s.replace(/<h3>(?:Images?|Renderings?|Photos?)\b/, (m) => summaryHtml + m) : s + summaryHtml;
  if (pin.price != null && pin.price !== price) { log.push([e.id, 'skip', `already priced ${pin.price}`]); continue; }
  log.push([e.id, apply ? 'applying' : 'dry', `${e.decision} ${currency} ${price} refs+${newRefs.length}`]);
  if (!apply) continue;

  for (const r of newRefs) await call('POST', '/api/admin/db/PinReference', { pinId: e.id, ...r, confidence: 85, addedByUserId: pin.userId });
  const { rows: [row] } = await call('GET', `/api/admin/db/Pin?id=${e.id}`);
  const qs = new URLSearchParams({ id: String(e.id), userId: String(pin.userId), title: row.title });
  qs.set(row.price === null ? 'price.null' : 'price', String(row.price));
  const { rows: done } = await call('PATCH', `/api/admin/db/Pin?${qs}`, { price, priceCurrency: currency, longFormSummary });
  if (done.length !== 1) throw Error(`${e.id}: concurrent edit`);
  if (factory) await call('PUT', `/api/pins/${e.id}/factory`, factory);
  const after = await call('GET', `/api/pins/${e.id}`);
  if (after.price !== price || after.user.id !== pin.userId || after.title !== pin.title) throw Error(`${e.id}: readback mismatch`);
  log.push([e.id, 'saved', `${after.priceCurrency} ${after.price} author ${after.user.userName}`]);
}
for (const l of log) console.log(base, ...l);
