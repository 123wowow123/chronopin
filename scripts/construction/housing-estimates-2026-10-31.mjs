// Applies drafted housing cost research (.tmp/housing-estimates/approved.json: lane drafts whose quotes were verified against the raw pages) to production or local:
// published budget -> price only; estimate -> price + factory breakdown + "Estimated cost" summary section.
// node scripts/construction/housing-estimates-2026-10-31.mjs [--base https://www.chronopin.com] [--apply] [--only id,id]
import fs from 'node:fs';
const args = process.argv.slice(2);
const val = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : undefined);
const base = (val('--base') ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
if (!['http://127.0.0.1:3000', 'https://www.chronopin.com'].includes(base)) throw Error('Known hosts only.');
const apply = args.includes('--apply');
const only = val('--only')?.split(',').map(Number);
const token = fs.readFileSync(base.startsWith('https') ? '.scrape/admin.token' : '.scrape/admin-local.token', 'utf8').trim();
const ASSESSED = '2026-10-30';
const call = async (method, path, body, soft) => {
  const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), redirect: 'error' });
  const t = await r.text();
  if (!r.ok) { if (soft) return null; throw Error(`${method} ${path}: ${r.status} ${t.slice(0, 300)}`); }
  return t ? JSON.parse(t) : null;
};
const fmt = (n) => n.toLocaleString('en-US');
const money = (n, cur) => `${cur === 'USD' ? '$' : cur + ' '}${n >= 1e6 ? `${+(n / 1e6).toFixed(n >= 1e8 ? 0 : 1)} million` : fmt(n)}`;
const Mi = (n) => `$${(n / 1e6).toFixed(1)} million`;
const clip = (s, n) => (s.length <= n ? s : s.slice(0, n - 1) + '…');
const ev = (s) => ({ url: s.url, title: clip(s.title, 1000), publishedDate: s.publishedDate ?? null, quote: clip(s.quote, 300) });
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const cite = (...u) => u.map((x) => `<cite data-ref="${x}"></cite>`).join('');

const entries = JSON.parse(fs.readFileSync('.tmp/housing-estimates/approved.json', 'utf8'));
const NA = 'Not scored: a single housing development is not a manufacturing facility, and no capability evidence was published.';
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
  let price, currency = 'USD', summaryHtml, factory;

  if (e.decision === 'published') {
    const p = e.published; price = p.amount; currency = p.currency;
    need(p.source, 'Published project cost');
    summaryHtml = `<h3>Cost</h3><p>The published cost is ${money(price, currency)}: ${esc(p.note)}${cite(p.source.url)}</p>`;
  } else {
    const { units, stage, benchmark: b } = e;
    need(units.source, 'Unit count'); need(stage.source, 'Project stage'); need(b.source, 'Cost benchmark');
    const lo = units.count * b.low, hi = units.count * b.high, mid = units.count * (b.low + b.high) / 2;
    const step = mid < 1e8 ? 1e5 : 1e6;
    price = Math.round(mid / step) * step;
    const built = stage.status !== 'announced';
    const basis = built ? 'demonstrated' : 'planned';
    const perU = (n) => `$${fmt(n)}`;
    const lines = [
      { kind: 'sourced', label: 'Homes', value: fmt(units.count), note: units.label, source: ev(units.source) },
      { kind: 'sourced', label: 'Cost per unit, low', value: `${perU(b.low)} per unit`, note: `${b.rowLabel}, applied to ${b.region}. ${b.why}`, source: ev(b.source) },
      { kind: 'sourced', label: 'Cost per unit, high', value: `${perU(b.high)} per unit`, note: 'Top of the same published range.', source: ev(b.source) },
      { kind: 'result', label: 'Cost range', value: `${Mi(lo)} – ${Mi(hi)}`, note: `Low: ${fmt(units.count)} × ${perU(b.low)} = ${perU(lo)}. High: ${fmt(units.count)} × ${perU(b.high)} = ${perU(hi)}.` },
      { kind: 'result', label: 'Figure used for the price', value: money(price, 'USD'), note: `${fmt(units.count)} × ${perU((b.low + b.high) / 2)} (midpoint per unit) = ${perU(mid)}${price === mid ? '' : `, rounded to ${money(price, 'USD')}`}. About ${perU(Math.round(price / units.count / 1000) * 1000)} per unit.` },
      { kind: 'assumption', label: 'Not included', value: 'Land, soft costs, financing', note: `Land, design and permit fees, financing and the developer fee are excluded, so this is a vertical building cost, not a project budget. The benchmark is a 2026 range with no adjustment for the year this was built. ${e.caveats ?? ''} No construction budget was found for this project.`.replace(/\s+/g, ' ').trim() },
    ];
    for (const l of lines) { l.note = clip(l.note, 500); l.value = clip(l.value, 200); }
    const metric = {
      key: 'investment', basis: 'planned', label: 'Estimated construction cost',
      value: `About ${money(price, 'USD')} (range ${Mi(lo)}–${Mi(hi)}): ${fmt(units.count)} units at ${perU(b.low)}–${perU(b.high)} per unit. An estimate, not a published budget; excludes land, soft costs and financing.`,
      source: ev(b.source), breakdown: lines,
    };
    const have = await call('GET', `/api/pins/${e.id}/factory`, undefined, true);
    factory = have ?? { sector: 'Residential construction', status: stage.status, assessmentDate: ASSESSED, rubricYear: 2026, source: 'session', axes, metrics: [] };
    delete factory.checkedAt;
    const keep = factory.metrics.filter((m) => m.key !== 'investment');
    if (!keep.some((m) => m.key === 'stage')) keep.push({ key: 'stage', basis, label: 'Stage', value: stage.label, source: ev(stage.source) });
    if (!keep.some((m) => m.key === 'capacity')) keep.push({ key: 'capacity', basis, label: 'Homes', value: units.label, source: ev(units.source) });
    factory.metrics = [...keep, metric];
    summaryHtml = `<h3>Estimated cost</h3><p>No construction budget was found for this project, so the price is an estimate built from published inputs, not a reported figure. The working:</p><ul>`
      + `<li>Quantity: ${esc(units.label)}.${cite(units.source.url)}</li>`
      + `<li>Cost per unit: ${perU(b.low)} to ${perU(b.high)} (${esc(b.rowLabel)}, applied to ${esc(b.region)}). ${esc(b.why)}${cite(b.source.url)}</li>`
      + `<li>Range: ${fmt(units.count)} × ${perU(b.low)} = ${Mi(lo)} to ${fmt(units.count)} × ${perU(b.high)} = ${Mi(hi)}. The midpoint, about ${money(price, 'USD')}, is used as the price.</li>`
      + `<li>Excluded: land, design and permit fees, financing and the developer fee. The benchmark is a 2026 range and is not adjusted for the year this was built.${e.caveats ? ' ' + esc(e.caveats) : ''}</li></ul>`;
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
  const q = new URLSearchParams({ id: String(e.id), userId: String(pin.userId), title: row.title });
  q.set(row.price === null ? 'price.null' : 'price', String(row.price));
  const { rows: done } = await call('PATCH', `/api/admin/db/Pin?${q}`, { price: price, priceCurrency: currency, longFormSummary });
  if (done.length !== 1) throw Error(`${e.id}: concurrent edit`);
  if (factory) await call('PUT', `/api/pins/${e.id}/factory`, factory);
  const after = await call('GET', `/api/pins/${e.id}`);
  if (after.price !== price || after.user.id !== pin.userId || after.title !== pin.title) throw Error(`${e.id}: readback mismatch`);
  log.push([e.id, 'saved', `price ${after.price} author ${after.user.userName}`]);
}
for (const l of log) console.log(base, ...l);
