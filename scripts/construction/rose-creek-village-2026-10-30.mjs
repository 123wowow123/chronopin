// Rose Creek Village (Pacific Beach): cost, status tag, tags, references, summary, project timeline/buildout profile and reaction excerpts.
// Every quote is checked against the raw page (or the pdftotext of the SDHC loan report) before anything is written.
// node scripts/construction/rose-creek-village-2026-10-30.mjs [--base https://www.chronopin.com] [--apply]
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const args = process.argv.slice(2);
const val = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : undefined);
const base = (val('--base') ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
if (!['http://127.0.0.1:3000', 'https://www.chronopin.com'].includes(base)) throw Error('Known hosts only.');
const apply = args.includes('--apply');
const token = fs.readFileSync(base.startsWith('https') ? '.scrape/admin.token' : '.scrape/admin-local.token', 'utf8').trim();
const ID = 7019, ASSESSED = '2026-10-30';
const call = async (method, path, body, soft) => {
  const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), redirect: 'error' });
  const t = await r.text();
  if (!r.ok) { if (soft) return null; throw Error(`${method} ${path}: ${r.status} ${t.slice(0, 300)}`); }
  return t ? JSON.parse(t) : null;
};

const U = {
  nc: 'https://nationalcore.org/communities/rose-creek-village/',
  ncRel: 'https://nationalcore.org/rose-creek-village-brings-stability-and-opportunity-to-pacific-beach/',
  sdhc: 'https://sdhc.org/news-release/rose-creek-village-groundbreaking/',
  loan: 'https://sdhc.org/wp-content/uploads/2024/07/HAR24-013-Rose-Creek-Loan.pdf',
  lacava: 'https://timesofsandiego.com/politics/2024/07/29/councilman-lacava-opposes-loans-for-rose-creek-affordable-housing-over-height-limit/',
  tosd: 'https://timesofsandiego.com/business/2025/09/17/crews-break-ground-pacific-beach-affordable-housing-development/',
  nbc: 'https://nbcsandiego.com/news/local/controversial-5-story-building-pacific-beach-will-bypass-30-foot-coastal-height-limit/3584821',
  fox: 'https://fox5sandiego.com/news/local-news/affordable-housing-pacific-beach/amp',
  county: 'https://www.countynewscenter.com/affordable-housing-development-breaks-ground-in-pacific-beach/',
};
const T = {
  nc: 'Rose Creek Village - National CORE', ncRel: 'National CORE: Rose Creek Village groundbreaking', sdhc: 'SDHC: Rose Creek Village groundbreaking',
  loan: 'SDHC: Rose Creek Village loan recommendation (June 13, 2024)',
  lacava: 'Times of San Diego: Councilman LaCava opposes loans for Rose Creek affordable housing over height limit',
  tosd: 'Times of San Diego: Crews break ground on PB affordable housing development',
  nbc: 'NBC 7 San Diego: Controversial 5-story building in Pacific Beach will bypass 30-foot coastal height limit',
  fox: 'FOX 5 San Diego: New affordable housing for veterans in San Diego',
  county: 'County of San Diego News Center: Affordable Housing Development Breaks Ground in Pacific Beach',
};
const D = { nc: '2025-08-18', ncRel: '2025-09-18', sdhc: '2025-09-17', loan: '2024-06-13', lacava: '2024-07-30', tosd: '2025-09-18', nbc: '2024-08-03', fox: '2025-09-18', county: '2025-09-17' };

// ---- verbatim quote check ----
const norm = (s) => s.replace(/&#8217;|&rsquo;|[’‘]/g, "'").replace(/&#8220;|&#8221;|[“”]/g, '"').replace(/&amp;/g, '&').replace(/&#8211;|&#8212;|[–—]/g, '-').replace(/&nbsp;|&#160;| /g, ' ').replace(/\s+/g, ' ').replace(/" /g, '"').replace(/ "/g, '"').toLowerCase().trim();
const pages = {};
async function text(key) {
  if (pages[key]) return pages[key];
  let t;
  if (key === 'loan') t = fs.readFileSync('.tmp/rose/loan.txt', 'utf8');
  else {
    t = await (await fetch(U[key], { headers: key === 'sdhc' ? {} : { 'User-Agent': 'Mozilla/5.0' } })).text();
    t = t.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
  }
  return (pages[key] = norm(t));
}
const S = async (key, quote) => {
  const parts = quote.split('...').map((p) => norm(p).replace(/^[,. ]+|[,. ]+$/g, ''));
  const t = await text(key);
  for (const p of parts) if (!t.includes(p)) throw Error(`Quote not found on ${key}: ${p.slice(0, 80)}`);
  return { url: U[key], title: T[key], publishedDate: D[key], quote };
};

// ---- evidence ----
const q = {
  cost: await S('nbc', 'The overall project is expected to cost $40.5 million and take two years to complete.'),
  tdc: await S('loan', 'Rose Creek Village has an estimated total development cost of $36,137,259 ($602,288/unit).'),
  units: await S('nc', 'Of the 60 studio apartment homes available, 18 apartments will be set aside as permanent supportive housing for veterans'),
  mix: await S('nc', 'Total Apartments: 60 59 Studios 1 Two-bedroom (Manager’s Apartment)'),
  area: await S('loan', 'Gross Building Square Foot Hard Cost $21,312,941/ 36,322 square feet'),
  start: await S('sdhc', 'celebrated its groundbreaking today, commemorating the start of construction that will produce 59 new studio apartments'),
  fall: await S('nc', 'Anticipated Completion Date: Fall 2026'),
  y2027: await S('county', 'Completion of Rose Creek Village is expected in 2027.'),
  planned: await S('loan', 'Completion of construction work • December 2026'),
  planning: await S('nbc', 'I was actually one of the presenters to the planning group back in November of 2021'),
  loanRec: await S('loan', 'Approve a proposed residual receipts loan in an amount not to exceed $2,000,000 to Rose Creek Village'),
  hearing: await S('lacava', 'The City Council’s hearing on the loan agreement will begin at 10 a.m. on Tuesday, July 30.'),
  site: await S('lacava', 'on the site of a former restaurant at 2662 Garnet Avenue in Pacific Beach'),
  height: await S('lacava', 'it is in the city’s Coastal Height Limit Overlay Zone and exceeds the 30-foot restriction'),
  five: await S('county', 'At five stories, it exceeds the typical 30-foot height limit in a coastal zone.'),
};
const reviews = [
  { ...(await S('lacava', 'Council may not have the authority to interfere with the permitting of this Prop.-D busting project, but we are under no obligation to use taxpayer dollars to support it,')), title: 'Times of San Diego: Councilmember Joe LaCava on the Prop D height limit (opposed the loans)', sentiment: -0.6 },
  { ...(await S('nbc', 'I mean, I don’t know if it’s the best location, but we need something, and we got to put it somewhere.')), title: 'NBC 7: J. Kulavis, nearby resident, on parking and the need for housing', sentiment: 0.1 },
  { ...(await S('sdhc', 'Every community in San Diego deserves to have housing that is affordable for residents to live in,')), title: 'SDHC release: Council President Pro Tem Kent Lee at the groundbreaking', sentiment: 0.8 },
  { ...(await S('fox', 'Projects this extraordinary only happen when we come together as a community and work together to get this done,')), title: 'FOX 5: Mayor Todd Gloria at the groundbreaking', sentiment: 0.9 },
  { ...(await S('tosd', 'We believe it’s the right project here — at the right time, in the right place,')), title: 'Times of San Diego: John Seymour of National CORE (developer) at the groundbreaking', sentiment: 0.7 },
].map((r) => ({ ...r, quote: r.quote.replace(/,$/, '') }));
console.log('all quotes verified');

const newRefs = [
  [U.lacava, T.lacava, D.lacava, 'LaCava opposes the loans over the Prop D height limit; project described as $36 million on a former restaurant site'],
  [U.nbc, T.nbc, D.nbc, 'Council debate, neighbors’ height and parking concerns, developer reply, $40.5 million cost and two-year build'],
  [U.tosd, T.tosd, D.tosd, 'Groundbreaking coverage: Gloria, Lee, Seymour, all-electric building with solar'],
  [U.fox, T.fox, D.fox, 'Groundbreaking coverage with Gloria and SDCHC’s Wurster'],
  [U.county, T.county, D.county, 'County: five stories exceed the 30-foot coastal limit; completion expected in 2027'],
];
const longSection = `<h3>Site, height and approval</h3><ul>`
  + `<li>The five-story building stands on the site of a former restaurant at 2662 Garnet Avenue.<cite data-ref="${U.lacava}"></cite><cite data-ref="${U.county}"></cite></li>`
  + `<li>The site is in the Coastal Height Limit Overlay Zone, created by voters in 1972 (Proposition D), and exceeds its 30-foot limit; Councilmember Joe LaCava voted against the city’s two loans, saying his objection was to the process, not the merits.<cite data-ref="${U.lacava}"></cite></li>`
  + `<li>At the council hearing neighbors raised building height and parking on Garnet Avenue, while one said the need for affordable homes was clear; SDCHC’s director replied that the 2021 planning-group presentation had been mischaracterised.<cite data-ref="${U.nbc}"></cite></li></ul>`
  + `<h3>Construction and timeline</h3><ul>`
  + `<li>Groundbreaking was held on September 17, 2025, marking the start of construction.<cite data-ref="${U.sdhc}"></cite></li>`
  + `<li>Estimated completion: National CORE’s property page gives “Fall 2026”, while the County’s groundbreaking release says completion is expected in 2027. SDHC’s June 2024 plan had construction finishing in December 2026. The pin keeps the developer’s fall 2026 target and treats the date as an estimate.<cite data-ref="${U.nc}"></cite><cite data-ref="${U.county}"></cite><cite data-ref="${U.loan}"></cite></li></ul>`
  + `<h3>Cost</h3><ul>`
  + `<li>NBC 7 reported the project is expected to cost $40.5 million; this is the most recent published figure and is used as the pin’s price.<cite data-ref="${U.nbc}"></cite></li>`
  + `<li>SDHC’s June 2024 loan report estimated a total development cost of $36,137,259 ($602,288 per unit), of which $5,007,887 was land and $21,312,941 construction.<cite data-ref="${U.loan}"></cite></li></ul>`;

const log = [];
const pin = await call('GET', `/api/pins/${ID}`);
if (pin.title !== 'Rose Creek Village Completes in Pacific Beach') throw Error('identity mismatch in ' + base);
const have = new Set([pin.sourceUrl, ...pin.references.map((r) => r.url)]);
const refsToAdd = newRefs.filter(([u]) => !have.has(u));
const summary = pin.longFormSummary.includes('<h3>Site, height and approval</h3>') ? pin.longFormSummary : pin.longFormSummary + longSection;
const tagNames = ['In Progress', 'Under Construction', 'Housing','Pacific Beach', 'Veterans', 'Supportive Housing', 'Homelessness'];
const { rows: haveTags } = await call('GET', `/api/admin/db/PinTag?pinId=${ID}&limit=200`);
const tagsToAdd = tagNames.filter((n) => !haveTags.some((t) => t.name.toLowerCase() === n.toLowerCase())).map((name) => ({ pinId: ID, name, kind: 'topic', source: 'user' }));

const NA = 'Not scored: a single housing development is not a manufacturing facility, and no capability evidence was published.';
const axes = Object.fromEntries(['scale', 'technical', 'workforce', 'automation', 'efficiency', 'supplyChain'].map((k) => [k, { basis: 'unknown', score: null, sources: [], reasoning: NA }]));
const ev = ({ url, title, publishedDate, quote }) => ({ url, title, publishedDate, quote });
const factory = {
  sector: 'Residential construction', status: 'construction', assessmentDate: ASSESSED, rubricYear: 2026, source: 'session', axes,
  metrics: [
    { key: 'investment', basis: 'planned', label: 'Project cost', value: '$40.5 million expected cost (NBC 7, Aug 2024); SDHC’s June 2024 estimate of total development cost was $36,137,259 ($602,288 per unit), including $5.0 million for land', source: ev(q.cost) },
    { key: 'capacity', basis: 'planned', label: 'Homes', value: '60 apartments: 59 affordable studios (18 permanent supportive homes for veterans) and one two-bedroom manager’s apartment', source: ev(q.mix) },
    { key: 'floorArea', basis: 'planned', label: 'Gross building area', value: '36,322 gross square feet (22,906 net rentable) per SDHC’s 2024 loan report; five stories', source: ev(q.area) },
    { key: 'timeline', basis: 'planned', label: 'Completion target', value: 'Fall 2026 per National CORE; the County says 2027. An estimate, not a confirmed date', source: ev(q.fall) },
    { key: 'stage', basis: 'demonstrated', label: 'Stage', value: 'Under construction since the September 17, 2025 groundbreaking', source: ev(q.start) },
  ],
  milestones: [
    { label: 'Developer presents the project to the Pacific Beach planning group', date: '2021-11', basis: 'demonstrated', source: ev(q.planning) },
    { label: 'SDHC recommends a $2 million residual receipts loan', date: '2024-06-13', basis: 'demonstrated', source: ev(q.loanRec) },
    { label: 'City Council hearing on the two city loans (over $4 million)', date: '2024-07-30', basis: 'demonstrated', source: ev(q.hearing) },
    { label: 'Groundbreaking: construction starts', date: '2025-09-17', basis: 'demonstrated', source: ev(q.start) },
    { label: 'Estimated completion: National CORE target', date: 'Fall 2026', basis: 'planned', source: ev(q.fall) },
    { label: 'Estimated completion: County of San Diego says 2027', date: '2027', basis: 'planned', source: ev(q.y2027) },
  ],
};
const dcr = 'Estimated: National CORE states “Anticipated Completion Date: Fall 2026”; the County of San Diego’s groundbreaking release says completion is expected in 2027. November 30 represents the end of meteorological fall, not a confirmed completion or move-in day.';

console.log(base, apply ? 'APPLY' : 'dry', { refs: refsToAdd.length, tags: tagsToAdd.map((t) => t.name), reviews: reviews.length, summaryAdds: summary !== pin.longFormSummary });
if (!apply) process.exit(0);

for (const [url, title, publishedDate, reasoning] of refsToAdd) await call('POST', '/api/admin/db/PinReference', { pinId: ID, url, title, publishedDate, reasoning, confidence: 90, addedByUserId: pin.user.id ?? pin.userId });
if (tagsToAdd.length) await call('POST', '/api/admin/db/PinTag', tagsToAdd);
const { rows: [row] } = await call('GET', `/api/admin/db/Pin?id=${ID}`);
const qs = new URLSearchParams({ id: String(ID), userId: String(row.userId), title: row.title });
qs.set(row.price === null ? 'price.null' : 'price', String(row.price));
const { rows: done } = await call('PATCH', `/api/admin/db/Pin?${qs}`, { price: 40500000, priceCurrency: 'USD', longFormSummary: summary, dateConfidenceReasoning: dcr });
if (done.length !== 1) throw Error('concurrent edit');
await call('PUT', `/api/pins/${ID}/factory`, factory);
await call('PUT', `/api/pins/${ID}/critic-reviews`, { reviews: reviews.map(({ url, title, publishedDate, quote, sentiment }) => ({ url, title, publishedDate, quote, sentiment })), source: 'session', basis: 'Editorial estimate of each quoted reaction’s tone toward the project; quotes are verbatim from the cited pages.', sourceUrl: pin.sourceUrl });

const after = await call('GET', `/api/pins/${ID}`);
const f = await call('GET', `/api/pins/${ID}/factory`);
const cr = await call('GET', `/api/pins/${ID}/critic-reviews`);
console.log({ price: after.price, cur: after.priceCurrency, author: after.user.userName, tags: after.tags.map((t) => t.name), refs: after.references.length, media: after.media.length, milestones: f.milestones?.length, metrics: f.metrics.length, reviews: JSON.stringify(cr).length });
