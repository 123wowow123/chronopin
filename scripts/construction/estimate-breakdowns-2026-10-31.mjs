// Converts the flat-text "Estimated construction cost" metric on pins 20640/20650/20654 into a structured
// breakdown, using only the sources already saved in each pin's factory profile. Price and summary untouched.
// node scripts/construction/estimate-breakdowns-2026-10-31.mjs [--base https://www.chronopin.com] [--apply]
import fs from 'node:fs';
const args = process.argv.slice(2);
const base = (args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://127.0.0.1:3000').replace(/\/$/, '');
if (!['http://127.0.0.1:3000', 'https://www.chronopin.com'].includes(base)) throw Error('Known hosts only.');
const apply = args.includes('--apply');
const token = fs.readFileSync(base.startsWith('https') ? '.scrape/admin.token' : '.scrape/admin-local.token', 'utf8').trim();
const call = async (method, path, body) => {
  const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), redirect: 'error' });
  const t = await r.text();
  if (!r.ok) throw Error(`${method} ${path}: ${r.status} ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : null;
};
const fmt = (n) => n.toLocaleString('en-US');
const M = (n) => `$${(n / 1e6).toFixed(1)} million`;

const PINS = [
  { id: 20640, title: "Perry's Café Redevelopment Project", units: 223, lo: 420000, hi: 615000, price: 115000000, bench: 'California (Los Angeles, Bay Area, San Diego) wood-frame podium projects',
    unitsNote: 'Apartments in a seven-story building, 33 of them affordable.',
    extra: [{ kind: 'result', label: 'Cross-check', value: `about $${fmt(Math.round(115000000 / 239887))} per gross sq ft`, note: 'The price divided by the 239,887 sq ft of gross building area in the city filing, as a reasonableness check on the per-unit range.' }],
    excluded: 'Land, design and permit fees, financing and the developer fee. The only published figure, the roughly $9 million land purchase in 2024, is not construction cost.' },
  { id: 20650, title: 'Newman Building Redevelopment (North Park)', units: 92, lo: 420000, hi: 615000, price: 47000000, bench: 'California (Los Angeles, Bay Area, San Diego) wood-frame podium projects',
    unitsNote: '16 subsidized and 76 market-rate apartments in a seven-story building.',
    extra: [],
    excluded: 'Land, design and permit fees, financing and the developer fee. The benchmark is for new wood-frame construction; the structural system and the cost of restoring the historic building are not published, so the real figure could differ.' },
  { id: 20654, title: 'San Diego Unified Workforce Housing at Eugene Brucker Education Center (University Heights)', units: 1500, lo: 385000, hi: 595000, price: 735000000, bench: 'mass timber mid-rise (Type IV-B) construction, a national range',
    unitsNote: 'About 1,500 units in the Protea + Malick proposal; unit counts, income mix and heights are still being negotiated.',
    extra: [],
    excluded: 'Land (the district owns it), design and permit fees, financing, the developer fee, the pool, child care, retail and off-site street work.',
    benchNote: 'Terrapin gives a California row only for wood-frame podium buildings, so this national mass timber range may understate the cost.' },
];

for (const p of PINS) {
  const pin = await call('GET', `/api/pins/${p.id}`);
  if (pin.title !== p.title) throw Error(`${p.id}: identity mismatch (${pin.title})`);
  const f = await call('GET', `/api/pins/${p.id}/factory`);
  delete f.checkedAt;
  const inv = f.metrics.find((m) => m.key === 'investment');
  const cap = f.metrics.find((m) => m.key === 'capacity');
  if (!inv || !/^estimated/i.test(inv.label) || !cap) throw Error(`${p.id}: unexpected metrics`);
  const costLo = p.units * p.lo, costHi = p.units * p.hi, mid = p.units * (p.lo + p.hi) / 2;
  const unit = (n) => `$${fmt(n)}`;
  const rounded = p.price === mid ? 'exactly the midpoint' : `the midpoint ($${fmt(mid)}) rounded to $${fmt(p.price / 1e6)} million`;
  const lines = [
    { kind: 'sourced', label: 'Homes', value: fmt(p.units), note: p.unitsNote, source: cap.source },
    { kind: 'sourced', label: 'Cost per unit, low', value: `${unit(p.lo)} per unit`, note: `Benchmark for ${p.bench}.${p.benchNote ? ' ' + p.benchNote : ''}`, source: inv.source },
    { kind: 'sourced', label: 'Cost per unit, high', value: `${unit(p.hi)} per unit`, note: 'Top of the same published range.', source: inv.source },
    { kind: 'result', label: 'Cost range', value: `${M(costLo)} – ${M(costHi)}`, note: `Low: ${fmt(p.units)} × ${unit(p.lo)} = ${unit(costLo)}. High: ${fmt(p.units)} × ${unit(p.hi)} = ${unit(costHi)}.` },
    { kind: 'result', label: 'Figure used for the price', value: `$${fmt(p.price / 1e6)} million`, note: `${fmt(p.units)} × ${unit((p.lo + p.hi) / 2)} (midpoint per unit) = ${unit(mid)}, ${rounded}.` },
    ...p.extra,
    { kind: 'assumption', label: 'Not included', value: 'Land, soft costs, financing', note: `${p.excluded} This is an estimate of vertical building cost, not a published budget.` },
  ];
  const value = `About $${fmt(p.price / 1e6)} million (range ${M(costLo)}–${M(costHi)}): ${fmt(p.units)} units at ${unit(p.lo)}–${unit(p.hi)} per unit. An estimate, not a published budget; excludes land, soft costs and financing.`;
  inv.value = value; inv.breakdown = lines;
  console.log(base, p.id, 'price', pin.price, '->', p.price, 'lines', lines.length);
  if (pin.price !== p.price) throw Error(`${p.id}: price differs from the figure in this script`);
  if (!apply) continue;
  await call('PUT', `/api/pins/${p.id}/factory`, f);
  const after = await call('GET', `/api/pins/${p.id}`);
  const f2 = await call('GET', `/api/pins/${p.id}/factory`);
  for (const k of ['price', 'priceCurrency', 'longFormSummary', 'title', 'utcStartDateTime']) if (JSON.stringify(after[k]) !== JSON.stringify(pin[k])) throw Error(`${p.id}: ${k} changed`);
  console.log('  saved; breakdown lines', f2.metrics.find((m) => m.key === 'investment').breakdown.length, 'author', after.user.userName);
}
