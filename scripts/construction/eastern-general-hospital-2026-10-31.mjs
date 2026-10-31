// Prices pin 2235 (Eastern General Hospital campus, Singapore) as a best estimate bracketed by the two award figures that
// aggregators publish for the same tender (HLTHQ0ETT24000046), with the reasoning in the estimate breakdown.
// node scripts/construction/eastern-general-hospital-2026-10-31.mjs [--base https://www.chronopin.com] [--apply]
import fs from 'node:fs';
const args = process.argv.slice(2);
const base = (args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://127.0.0.1:3000').replace(/\/$/, '');
if (!['http://127.0.0.1:3000', 'https://www.chronopin.com'].includes(base)) throw Error('Known hosts only.');
const apply = args.includes('--apply');
const token = fs.readFileSync(base.startsWith('https') ? '.scrape/admin.token' : '.scrape/admin-local.token', 'utf8').trim();
const ID = 2235;
const call = async (method, path, body, soft) => {
  const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), redirect: 'error' });
  const t = await r.text();
  if (!r.ok) { if (soft) return null; throw Error(`${method} ${path}: ${r.status} ${t.slice(0, 300)}`); }
  return t ? JSON.parse(t) : null;
};
const fmt = (n) => n.toLocaleString('en-US');
const A = { url: 'https://recordowl.com/company/obayashi-singapore-private-limited', title: 'Obayashi Singapore Private Limited - government procurement awards (RecordOwl, mirrors GeBIZ)', publishedDate: '2025-05-13',
  quote: 'Ref HLTHQ0ETT24000046 · Ministry of Health-Ministry Headquarter ITT For Part A: Proposed Development of an Integrated Acute and Community Hospital at Bedok North, Singapore; and Part B: Contingency Works Published 04 Oct 2024 Closed 20 Jan 2025 Awarded S$1,814,961,863.00 · 13 May 2025' };
const B = { url: 'https://www.biddetail.com/contract-awards/24790483$f8117c21-8934-448e-99aa-7cb312c10cf2', title: 'Contract Award for ITT for Part A: Integrated Acute and Community Hospital at Bedok North (BidDetail)', publishedDate: '2025-05-13',
  quote: 'Tender No HLTHQ0ETT24000046 Funded By Self-Funded Country Singapore , South Eastern Asia Contract Value 1,395 Billion' };
const B2 = { ...B, quote: 'Base Tender Offer , Optional Offer 1: Automated Storage / Retrieval System For Materials Management Department (Mmd)' };
const BEDS = { url: 'https://www.singhealth.com.sg/news/infrastructure/eastern-general-hospital-campus-commences-main-construction-and-', title: 'Eastern General Hospital Campus Commences Main Construction and Gears Up for Virtual Services', publishedDate: '2025-08-05',
  quote: 'When completed, the EGH Campus will have about 1,400 beds, with about 1,000 acute care beds under the Eastern General Hospital (EGH) and 400 community care beds under the Eastern Community Hospital (ECH).' };
const STAGE = { ...BEDS, quote: 'have successfully completed piling works and started on main construction.' };

const lo = 1395000000, hi = 1814961863, mid = (lo + hi) / 2, price = 1605000000, beds = 1400;
const lines = [
  { kind: 'sourced', label: 'Award record A', value: `S$${fmt(hi)}`, note: 'Awarded amount for the Ministry of Health tender covering the Bedok North hospital (Part A) and contingency works (Part B), 13 May 2025, as mirrored from the GeBIZ record by RecordOwl.', source: A },
  { kind: 'sourced', label: 'Award record B', value: 'S$1,395 million', note: 'The same tender and date list a contract value of "1,395 Billion" with no currency (reproduced as the mirror prints it). It is read here as S$1.395 billion because it is the same Singapore tender, the same date and about the same size as record A.', source: B },
  { kind: 'sourced', label: 'What the tender covers', value: 'Base offer + 8 optional offers', note: 'Record B lists a base tender offer plus optional offers (materials-handling automation, multi-year maintenance packages and bedhead service modules). Which of these each figure includes is not stated.', source: B2 },
  { kind: 'assumption', label: 'Reading of the gap', value: `S$${fmt(lo)}–S$${fmt(hi)}`, note: 'The two figures are treated as the plausible bracket: the lower may exclude optional offers and the higher may include them, along with Part B contingency works. Neither could be checked against the primary GeBIZ or Ministry of Health notice, which was not readable, so the real construction contract could fall outside this range.' },
  { kind: 'result', label: 'Cost range', value: 'S$1.395 billion – S$1.815 billion', note: `Low: S$${fmt(lo)} (record B). High: S$${fmt(hi)} (record A).` },
  { kind: 'result', label: 'Figure used for the price', value: 'S$1.605 billion', note: `Midpoint of the range (S$${fmt(Math.round(mid))}) rounded to the nearest S$5 million, as a best estimate between two unreconciled figures.` },
  { kind: 'sourced', label: 'Beds', value: '1,400', note: 'About 1,000 acute and 400 community care beds.', source: BEDS },
  { kind: 'result', label: 'Cross-check', value: `about S$${fmt(Math.round(price / beds / 1000) * 1000)} per bed`, note: 'The price divided by about 1,400 beds, shown only to size the figure; it is not used to compute it.' },
  { kind: 'assumption', label: 'Not included', value: 'Land, equipment, fit-out', note: 'The main building contract excludes land, design fees, medical equipment and fit-out by nominated specialists. A separate S$26.9 million retrofit contract at the existing community hospital is not part of it.' },
];
const metric = {
  key: 'investment', basis: 'planned', label: 'Estimated construction cost',
  value: 'About S$1.605 billion (range S$1.395 billion–S$1.815 billion): midpoint of two award figures for the main building tender, which two procurement mirrors report differently. An estimate, not a published budget; excludes land, equipment and fit-out.',
  source: A, breakdown: lines,
};
const NA = 'Not scored: a single hospital campus is not a manufacturing facility, and no capability evidence was published.';
const axes = Object.fromEntries(['scale', 'technical', 'workforce', 'automation', 'efficiency', 'supplyChain'].map((k) => [k, { basis: 'unknown', score: null, sources: [], reasoning: NA }]));
const factory = { sector: 'Construction', status: 'construction', assessmentDate: '2026-10-31', rubricYear: 2026, source: 'session', axes, metrics: [
  { key: 'stage', basis: 'demonstrated', label: 'Stage', value: 'Piling complete, main construction started (Aug 2025)', source: STAGE },
  { key: 'capacity', basis: 'planned', label: 'Beds', value: 'About 1,400 beds (about 1,000 acute plus 400 community)', source: BEDS },
  metric] };

const cite = (...u) => u.map((x) => `<cite data-ref="${x}"></cite>`).join('');
const html = `<h3>Estimated cost</h3><p>No project budget has been published, so the price is a best estimate, not a reported figure. Two procurement mirrors report different award values for the same Ministry of Health tender covering the Bedok North hospital: S$1,814,961,863${cite(A.url)} and a contract value of 1,395 (billion, currency unstated)${cite(B.url)}. The second notice lists a base offer plus optional offers, mostly multi-year maintenance and equipment packages, so the figures probably differ in scope, but that could not be confirmed against the primary tender record. The price is the midpoint, about S$1.605 billion, rounded. It excludes land, medical equipment and specialist fit-out.</p>`;

const pin = await call('GET', `/api/pins/${ID}`);
if (!pin.title.startsWith("Singapore's Eastern General Hospital")) throw Error('identity mismatch');
if (pin.price != null && pin.price !== price) throw Error(`already priced ${pin.price}`);
const s = pin.longFormSummary ?? '';
const section = /<h3>(?:Estimated cost|Cost)<\/h3>[\s\S]*?(?=<h3>|$)/;
const longFormSummary = section.test(s) ? s.replace(section, () => html) : /<h3>(?:Images?|Renderings?|Photos?)\b/.test(s) ? s.replace(/<h3>(?:Images?|Renderings?|Photos?)\b/, (m) => html + m) : s + html;
console.log(base, ID, 'price', price, 'sections', section.test(s) ? 'replace' : 'insert');
if (!apply) process.exit(0);

const refs = new Set([pin.sourceUrl, ...(pin.references ?? []).map((r) => r.url)]);
for (const [src, why] of [[A, 'Award record A'], [B, 'Award record B'], [BEDS, 'Beds and stage']]) {
  if (!refs.has(src.url)) { refs.add(src.url); await call('POST', '/api/admin/db/PinReference', { pinId: ID, url: src.url, title: src.title.slice(0, 500), publishedDate: src.publishedDate, confidence: 70, reasoning: `${why}: “${src.quote.slice(0, 300)}”`, addedByUserId: pin.userId }); }
}
const { rows: [row] } = await call('GET', `/api/admin/db/Pin?id=${ID}`);
const q = new URLSearchParams({ id: String(ID), userId: String(pin.userId), title: row.title });
q.set(row.price === null ? 'price.null' : 'price', String(row.price));
const { rows: done } = await call('PATCH', `/api/admin/db/Pin?${q}`, { price, priceCurrency: 'SGD', longFormSummary });
if (done.length !== 1) throw Error('concurrent edit');
await call('PUT', `/api/pins/${ID}/factory`, factory);
const after = await call('GET', `/api/pins/${ID}`);
console.log('saved', after.priceCurrency, after.price, after.user.userName);
