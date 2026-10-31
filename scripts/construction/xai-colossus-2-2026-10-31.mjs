// Fills pin 18978 (xAI Colossus 2, Memphis): groundbreaking-to-completion dates, status tags, buildout profile with a dated
// timeline, reaction excerpts, references, full summary and three pictures (uploaded to Azure Blob). Every quote is re-checked
// against its live page before anything is written. Translations are left to the translations agent.
// node scripts/construction/xai-colossus-2-2026-10-31.mjs [--base https://www.chronopin.com] [--apply] [--img <dir with epoch.png selc.jpg px.jpg>]
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
const args = process.argv.slice(2);
const val = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : undefined);
const base = (val('--base') ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
if (!['http://127.0.0.1:3000', 'https://www.chronopin.com'].includes(base)) throw Error('Known hosts only.');
const apply = args.includes('--apply');
const IMG = val('--img');
const token = fs.readFileSync(base.startsWith('https') ? '.scrape/admin.token' : '.scrape/admin-local.token', 'utf8').trim();
const ID = 18978, ASSESSED = '2026-10-31';
const call = async (method, p, body, soft) => {
  const r = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), redirect: 'error' });
  const t = await r.text();
  if (!r.ok) { if (soft) return null; throw Error(`${method} ${p}: ${r.status} ${t.slice(0, 300)}`); }
  return t ? JSON.parse(t) : null;
};
const dec = (x) => x.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&(amp|nbsp|rsquo|lsquo|ldquo|rdquo|ndash|mdash|quot|apos);/g, (_, n) => ({ amp: '&', nbsp: ' ', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', ndash: '–', mdash: '—', quot: '"', apos: "'" })[n]);
const norm = (s) => dec(s).replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/ /g, ' ').replace(/\s+/g, ' ').replace(/" /g, '"').replace(/ "/g, '"').toLowerCase().trim();
const pages = new Map();
async function pageText(url) {
  if (!pages.has(url)) {
    // some outlets (SELC) refuse Node's fetch but serve curl
    const html = execFileSync('curl', ['-sL', '-m', '40', '-A', 'Mozilla/5.0 (compatible; research)', url], { encoding: 'utf8', maxBuffer: 1 << 28 });
    pages.set(url, norm(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ')));
  }
  return pages.get(url);
}
async function verify(s, where) {
  const t = await pageText(s.url);
  for (const p of s.quote.split(/\.\.\.|…/).map((x) => norm(x).replace(/^[,. ]+|[,. ]+$/g, ''))) if (!t.includes(p)) throw Error(`${where}: quote not found on ${s.url}: ${p.slice(0, 80)}`);
  if (s.quote.length > 300) throw Error(`${where}: quote over 300 chars`);
}

// ---- sources (url, title, publishedDate, verbatim quote) ----
const EPOCH = 'https://epoch.ai/data/ai-data-centers/directory/colossus-2';
const S = (url, title, publishedDate, quote) => ({ url, title, publishedDate, quote });
const epoch = (quote) => S(EPOCH, 'Colossus 2 | AI data centers (Epoch AI)', '2026-07-30', quote);
const SEMI = 'https://newsletter.semianalysis.com/p/xais-colossus-2-first-gigawatt-datacenter';
const PX = 'https://512pixels.net/2026/07/spacexai-to-replace-gas-turbines-southaven/';
const MPB = 'https://www.mpbonline.org/blogs/news/mississippi-regulators-approve-permit-for-xai-gas-turbines-in-southaven-despite-resident-concerns/';
const SELC = 'https://www.selc.org/news/xai-built-an-illegal-power-plant-to-power-its-data-center/';
const FLOOD = 'https://floodlightnews.org/mississippi-regulators-greenlight-xais-southaven-power-plant-despite-strong-public-opposition/';
const FOX = 'https://www.fox13memphis.com/news/it-sounds-like-a-jet-taking-off-southaven-neighbors-want-class-action-lawsuit-against-xai/article_e6391513-aa7f-4fc1-881a-e9a9401f2f2f.html';
const MUSS = 'https://desotocountynews.com/desoto-county-news/musselwhite-comments-on-xai-expanding-operations-to-southaven/';

const src = {
  clearing: epoch('Land clearing begins next to the existing building.'),
  kickoff: S(SEMI, "xAI's Colossus 2 - First Gigawatt Datacenter In The World (SemiAnalysis)", '2025-09-16', 'when xAI acquired a 1m sqft warehouse in Memphis, and two adjacent sites totaling 100 acres'),
  turbines1: S(PX, 'SpaceXAI to Remove Temporary Gas Turbines From North Mississippi Site (512 Pixels)', '2026-07-30', 'The company started operating its first three turbines (about 39 megawatts of power capacity) on August 1, 2025.'),
  cluster1: epoch('Battery facility looks complete (though more might be added). Turbines look connected up, minimal construction around them.'),
  permit: S(MPB, 'Mississippi regulators approve permit for xAI gas turbines in Southaven despite resident concerns (MPB)', '2026-03-10', 'The Mississippi Environmental Quality Permit Board voted unanimously Tuesday to approve the company’s application to install 41 permanent natural gas turbines at the site.'),
  suit: S(SELC, 'xAI built an illegal power plant to power its data center (SELC)', '2026-04-14', 'SELC and Earthjustice are challenging xAI in a new lawsuit representing the national NAACP and its Mississippi State Conference.'),
  bldg3: epoch('The roof for building 3 is halfway complete.'),
  order: S(PX, 'SpaceXAI to Remove Temporary Gas Turbines From North Mississippi Site (512 Pixels)', '2026-07-30', 'We have entered into an agreed order with the Mississippi Department of Environmental Quality (MDEQ) establishing a fixed removal timeline for all 69 of the temporary, mobile turbines'),
  removal: S(PX, 'SpaceXAI to Remove Temporary Gas Turbines From North Mississippi Site (512 Pixels)', '2026-07-30', 'All temporary turbines will be removed by July 2027.'),
  done: epoch('Building 3 is estimated to be completed.'),
  solaris: S(SEMI, "xAI's Colossus 2 - First Gigawatt Datacenter In The World (SemiAnalysis)", '2025-09-16', 'Solaris expects to have over 1.1GW of fully operating turbines for xAI by Q2 2027.'),
  cost: epoch('supported by 946 MW of IT power at a capital cost of $35.8 B.'),
  costProj: epoch('In Q1 2027, we project it to rise to 1,824k H100e AI compute, 1,531 MW IT power and a cost of $58.0 B.'),
  capacity: epoch('It hosts an estimated 1,112k H100-equivalents of AI compute, supported by 946 MW of IT power'),
  plant: S(PX, 'SpaceXAI to Remove Temporary Gas Turbines From North Mississippi Site (512 Pixels)', '2026-07-30', 'The 1.2 GW permanent power plant currently under construction will consist of 41 permanent turbines authorized under a Clean Air Act permit'),
  jobs: S(MPB, 'Mississippi regulators approve permit for xAI gas turbines in Southaven despite resident concerns (MPB)', '2026-03-10', 'We\'ve already created thousands of well-paying jobs in construction, engineering, and operations that support local families and strengthen the regional economy,'),
  site: S(FOX, '“It sounds like a jet taking off”: Southaven neighbors want class action lawsuit against xAI (FOX13 Memphis)', '2026-06-10', 'The site was once a Duke Energy power plant, revived last year by xAI.'),
  suitCount: S(SELC, 'xAI built an illegal power plant to power its data center (SELC)', '2026-04-14', 'xAI installed 27 gas turbines at a nearby location in Southaven'),
  foxCount: S(FOX, '“It sounds like a jet taking off”: Southaven neighbors want class action lawsuit against xAI (FOX13 Memphis)', '2026-06-10', 'According to the lawsuit, there are 57 gas-powered turbines operating nearly 24/7 at the power plant.'),
};
const reviews = [
  { url: MUSS, title: 'Musselwhite comments on xAI expanding operations to Southaven (DeSoto County News)', publishedDate: '2025-08-01', sentiment: 0.9, quote: '“This is a development of global magnitude,” Musselwhite said. “It will bring exponential benefits to Southaven, DeSoto County, Mississippi, and the entire Mid-South region.”' },
  { url: MPB, title: 'xAI operations VP Brent Mayo to Mississippi permit board (MPB)', publishedDate: '2026-03-10', sentiment: 0.7, quote: src.jobs.quote },
  { url: FLOOD, title: 'Southaven residents react to the Mississippi permit vote (Floodlight)', publishedDate: '2026-03-11', sentiment: -0.7, quote: '“I’m disappointed, but not surprised. It was pretty obvious this permit was going to be pushed through at any cost.' },
  { url: SELC, title: 'SELC senior attorney Ben Grillot on the NAACP lawsuit (Southern Environmental Law Center)', publishedDate: '2026-04-14', sentiment: -0.8, quote: '“xAI’s continued operation of these turbines is not only illegal, it’s an insult to families living nearby who for months have expressed serious concerns about how air pollution from the company’s personal power plant could impact their health and wellbeing,”' },
  { url: FOX, title: 'Southaven neighbors want class action lawsuit against xAI (FOX13 Memphis)', publishedDate: '2026-06-10', sentiment: -0.6, quote: '“It gets really loud at night to the point it sounds like there\'s airplanes hovering over your house for hours,” explained Taylor Logsdon' },
];
const notScored = 'Not scored: a data-center campus is not a manufacturing facility, and no capability evidence was published.';
const axes = Object.fromEntries(['scale', 'technical', 'workforce', 'automation', 'efficiency', 'supplyChain'].map((k) => [k, { basis: 'unknown', score: null, sources: [], reasoning: notScored }]));
const ev = (s) => ({ url: s.url, title: s.title.slice(0, 1000), publishedDate: s.publishedDate, quote: s.quote });
const M = (label, date, basis, s) => ({ label, date, basis, source: ev(s) });
const milestones = [
  M('Land clearing visible beside the existing building', '2025-02-28', 'demonstrated', src.clearing),
  M('xAI acquires the warehouse and two adjacent sites (100 acres)', '2025-03-07', 'demonstrated', src.kickoff),
  M('First three Southaven power turbines start operating', '2025-08-01', 'demonstrated', src.turbines1),
  M('First compute cluster online (battery and turbines connected)', '2025-10-19', 'demonstrated', src.cluster1),
  M('Mississippi permit board approves 41 permanent turbines', '2026-03-10', 'demonstrated', src.permit),
  M('NAACP sues xAI over unpermitted Southaven turbines', '2026-04-14', 'demonstrated', src.suit),
  M('Building 3 roof halfway complete', '2026-06-15', 'demonstrated', src.bldg3),
  M('Agreed order sets removal of the temporary turbines', '2026-07-30', 'demonstrated', src.order),
  M('Estimated completion: Building 3 finished, about 1.5 GW IT power', '2027-02-25', 'planned', src.done),
  M('Solaris turbine fleet targeted above 1.1 GW', 'Q2 2027', 'planned', src.solaris),
  M('All temporary turbines removed', 'July 2027', 'planned', src.removal),
];
const metrics = [
  { key: 'stage', basis: 'demonstrated', label: 'Stage', value: 'Operating, with expansion under way: Building 3 roof halfway complete on 15 Jun 2026 (Epoch AI satellite reading)', source: ev(src.bldg3) },
  { key: 'capacity', basis: 'demonstrated', label: 'Compute and IT power (Epoch AI estimate)', value: 'About 1,112k H100-equivalents on 946 MW of IT power now; Epoch projects 1,824k and 1,531 MW by Q1 2027', source: ev(src.capacity) },
  { key: 'timeline', basis: 'planned', label: 'Completion target', value: 'Building 3 estimated complete 25 Feb 2027 (Epoch); temporary Southaven turbines removed by July 2027', source: ev(src.done) },
  { key: 'employment', basis: 'demonstrated', label: 'Jobs (company claim)', value: 'xAI says it has created "thousands" of construction, engineering and operations jobs; no count is published', source: ev(src.jobs) },
  { key: 'investment', basis: 'planned', label: 'Estimated capital cost (Epoch AI model)',
    value: 'About $35.8 billion now, rising to a projected $58.0 billion by Q1 2027. Epoch AI’s modelled cost of compute plus building, not a published construction budget.',
    source: ev(src.cost), breakdown: [
      { kind: 'sourced', label: 'Epoch AI current capital cost', value: '$35.8 billion', note: 'Modelled from satellite-observed cooling and power equipment and company disclosures; covers compute hardware and the building.', source: ev(src.cost) },
      { kind: 'sourced', label: 'Epoch AI projected cost, Q1 2027', value: '$58.0 billion', note: 'Epoch’s projection for the completed Building 3 buildout.', source: ev(src.costProj) },
      { kind: 'assumption', label: 'What it is not', value: 'No published budget', note: 'Neither xAI nor a regulator has published a construction budget; chips are most of the modelled figure, and the Southaven power plant is not separately priced.' },
      { kind: 'result', label: 'Figure used for the price', value: '$35.8 billion (current)', note: 'The current Epoch AI estimate; replace it if a budget is published.' },
    ] },
];
const factory = { sector: 'Data center', status: 'construction', assessmentDate: ASSESSED, rubricYear: 2026, source: 'session', axes, metrics, milestones };

const c = (u) => `<cite data-ref="${u}"></cite>`;
const summary = `<h3>The site</h3><ul>
<li>Colossus 2 was kicked off in March 2025, when xAI acquired a 1m sqft warehouse in Memphis and two adjacent sites totaling 100 acres.${c(SEMI)}</li>
<li>Epoch AI’s satellite record shows land clearing beside the existing building by 28 Feb 2025.${c(EPOCH)}</li>
<li>Power comes from a plant on Stanton Road in Southaven, Mississippi, across the state line: a former Duke Energy plant revived by xAI.${c(FOX)}</li></ul>
<h3>What is being built</h3><ul>
<li>Epoch AI estimates the campus at about 1,112k H100-equivalents and 946 MW of IT power, and projects 1,824k and 1,531 MW by Q1 2027.${c(EPOCH)}</li>
<li>Its first cluster (about 110,000 GB200 processors, about 210 MW) corresponds to the October 2025 imagery; the second, GB300-class cluster and a third building followed, with the Building 3 roof halfway complete on 15 Jun 2026.${c(EPOCH)}</li></ul>
<h3>Power, permits and opposition</h3><ul>
<li>The first three Southaven turbines started on 1 Aug 2025.${c(PX)}</li>
<li>On 10 Mar 2026 Mississippi’s permit board voted unanimously to approve 41 permanent turbines.${c(MPB)} xAI says the 1.2 GW plant is under construction under that Clean Air Act permit.${c(PX)}</li>
<li>On 14 Apr 2026 the NAACP, represented by SELC and Earthjustice, sued xAI over unpermitted turbines.${c(SELC)}</li>
<li>On 30 Jul 2026 xAI announced an agreed order with Mississippi regulators: all temporary turbines are to be removed by July 2027.${c(PX)}</li>
<li>Turbine counts differ by source: 27 in SELC’s complaint,${c(SELC)} 57 in the residents’ lawsuit,${c(FOX)} and 69 in xAI’s own statement.${c(PX)}</li>
<li>Neighbors describe near-constant noise; the Southaven mayor called the project “a development of global magnitude”, and xAI says it has created thousands of jobs.${c(FOX)}${c(MUSS)}${c(MPB)}</li></ul>
<h3>Timeline and cost</h3><ul>
<li>The build runs from the February 2025 land clearing to Epoch AI’s projected completion of Building 3 on 25 Feb 2027 (a projection, not a developer commitment).${c(EPOCH)}</li>
<li>No construction budget is published. The $35.8 billion on this pin is Epoch AI’s modelled cost of compute plus building, projected to reach $58.0 billion by Q1 2027.${c(EPOCH)}</li></ul>`;
const description = '<p>xAI’s Colossus 2 in Whitehaven, Memphis is a gigawatt-class AI data center that Epoch AI tracks at 946 MW of IT power and about 1,112k H100-equivalents, still expanding toward a projected 1,531 MW by February 2027. It is powered by gas turbines at a former Duke Energy plant across the state line in Southaven, Mississippi, where 41 permanent turbines were permitted in March 2026 and temporary units are due to be removed by July 2027. The build has drawn a NAACP Clean Air Act lawsuit and neighbors’ noise complaints, and support from Southaven’s mayor and xAI, which cites thousands of jobs.</p>';
const reasoning = 'The pin starts at the first Epoch AI satellite reading of land clearing (28 Feb 2025); SemiAnalysis dates the project kickoff to the 7 Mar 2025 site purchase. The end date is Epoch AI’s projected completion of Building 3 (25 Feb 2027), a projection rather than a developer commitment. Power-plant and turbine-removal targets (Q2 2027, July 2027) are listed as separate planned milestones.';
const tagsWanted = ['In Progress', 'Under Construction', 'Memphis', 'Southaven', 'Natural Gas Turbines', 'Clean Air Act'];
const refs = [[EPOCH, 'Colossus 2 | AI data centers (Epoch AI)', '2026-07-30'], [SEMI, src.kickoff.title, '2025-09-16'], [PX, src.order.title, '2026-07-30'], [MPB, src.permit.title, '2026-03-10'], [SELC, src.suit.title, '2026-04-14'], [FLOOD, 'Mississippi regulators greenlight xAI’s Southaven power plant despite strong public opposition (Floodlight)', '2026-03-11'], [FOX, src.site.title, '2026-06-10'], [MUSS, reviews[0].title, '2025-08-01']];

const media = [
  { file: 'epoch.png', credit: 'Epoch AI (satellite image of Colossus 2, CC BY)', page: EPOCH },
  { file: 'selc.jpg', credit: 'Steve Jones, via Southern Environmental Law Center', page: SELC },
  { file: 'px.jpg', credit: '512 Pixels (photographer not named): Solaris turbines at the Southaven site', page: PX },
];

// ---- verify ----
const all = [...Object.entries(src).map(([k, s]) => [k, s]), ...reviews.map((r, i) => [`review ${i}`, r])];
for (const [k, s] of all) await verify(s, k);
const pin = await call('GET', `/api/pins/${ID}`);
if (!pin.title.startsWith('xAI Colossus 2 Memphis Supercluster')) throw Error('identity mismatch');
const { rows: tags } = await call('GET', `/api/admin/db/PinTag?pinId=${ID}&limit=200`);
const addTags = tagsWanted.filter((n) => !tags.some((t) => t.name.toLowerCase() === n.toLowerCase()));
console.log(base, ID, 'quotes verified:', all.length, '| tags +', addTags.join(', ') || 'none', '| media now', pin.media?.length ?? 0);
if (!apply) process.exit(0);

// ---- pictures to Azure Blob ----
const key = execFileSync('az', ['storage', 'account', 'keys', 'list', '--subscription', '9cbdc0e0-b85f-4267-b19a-6fd55f4e2af5', '-n', 'chronopin', '--query', '[0].value', '-o', 'tsv'], { encoding: 'utf8' }).trim();
const container = new BlobServiceClient('https://chronopin.blob.core.windows.net', new StorageSharedKeyCredential('chronopin', key)).getContainerClient('thumb');
const add = [];
for (const [i, m] of media.entries()) {
  const jpg = await sharp(fs.readFileSync(`${IMG}/${m.file}`)).rotate().resize({ width: 2000, withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
  const hash = crypto.createHash('sha256').update(jpg).digest('hex').slice(0, 16);
  const blob = container.getBlockBlobClient(`datacenters/usa-${ID}-${i}-${hash}.jpg`);
  if (!(await blob.exists())) await blob.uploadData(jpg, { blobHTTPHeaders: { blobContentType: 'image/jpeg', blobCacheControl: 'public, max-age=31536000, immutable' } });
  const check = Buffer.from(await (await fetch(blob.url)).arrayBuffer());
  if (crypto.createHash('sha256').update(check).digest('hex').slice(0, 16) !== hash) throw Error(`blob verify failed ${m.file}`);
  add.push({ type: 1, originalUrl: blob.url, authorName: m.credit, authorUrl: m.page });
}

// ---- save ----
const have = new Set([pin.sourceUrl, ...(pin.references ?? []).map((r) => r.url)]);
for (const [url, title, publishedDate] of refs) if (!have.has(url)) await call('POST', '/api/admin/db/PinReference', { pinId: ID, url, title: title.slice(0, 500), publishedDate, confidence: 90, reasoning: 'Cited in the project timeline and summary.', addedByUserId: pin.userId });
if (addTags.length) await call('POST', '/api/admin/db/PinTag', addTags.map((name) => ({ pinId: ID, name, kind: 'topic', source: 'user' })));
const { rows: [row] } = await call('GET', `/api/admin/db/Pin?id=${ID}`);
const q = new URLSearchParams({ id: String(ID), userId: String(row.userId), title: row.title });
q.set(row.price === null ? 'price.null' : 'price', String(row.price));
const { rows: done } = await call('PATCH', `/api/admin/db/Pin?${q}`, { utcStartDateTime: '2025-02-28T00:00:00.000Z', utcEndDateTime: '2027-02-25T00:00:00.000Z', allDay: true, dateConfidence: 'estimated', dateConfidenceReasoning: reasoning, description, longFormSummary: summary });
if (done.length !== 1) throw Error('concurrent edit');
await call('PUT', `/api/pins/${ID}/factory`, factory);
await call('PUT', `/api/pins/${ID}/critic-reviews`, { reviews: reviews.map(({ url, title, publishedDate, quote, sentiment }) => ({ url, title, publishedDate, quote, sentiment })), source: 'session', basis: 'Editorial estimate of each quoted reaction’s tone toward the project; quotes are verbatim from the cited pages.', sourceUrl: pin.sourceUrl });
const cur = await call('GET', `/api/pins/${ID}`);
await call('PUT', `/api/pins/${ID}?lightweight=1`, { ...cur, media: [...(cur.media ?? []).map((m) => ({ type: Number(m.type), originalUrl: m.originalUrl, ...(m.authorName ? { authorName: m.authorName } : {}), ...(m.authorUrl ? { authorUrl: m.authorUrl } : {}) })), ...add] });
// thumbnail processing clears attribution on new media: restore it, then round-trip once
const mid = await call('GET', `/api/pins/${ID}`);
let fixed = 0;
for (const m of mid.media) { const a = add.find((x) => x.originalUrl === m.originalUrl); if (a && (m.authorName !== a.authorName || m.authorUrl !== a.authorUrl)) { await call('PATCH', `/api/admin/db/Medium?id=${m.id}`, { authorName: a.authorName, authorUrl: a.authorUrl }); fixed++; } }
if (fixed) await call('PUT', `/api/pins/${ID}?lightweight=1`, await call('GET', `/api/pins/${ID}`));
await call('POST', '/api/admin/pins/expire', { ids: [ID] });

// ---- readback ----
const after = await call('GET', `/api/pins/${ID}`);
const f = await call('GET', `/api/pins/${ID}/factory`);
const badCredit = add.filter((a) => !after.media.some((m) => m.originalUrl === a.originalUrl && m.authorName === a.authorName));
const ok = after.user.id === pin.user.id && after.title === pin.title && after.price === pin.price && f.milestones?.length === milestones.length && !badCredit.length;
console.log(base, ok ? 'OK' : 'READBACK MISMATCH', '| author', after.user.userName, '| start', after.utcStartDateTime, 'end', after.utcEndDateTime, '| media', after.media.length, `(${fixed} credits restored)`, '| tags', after.tags.map((t) => t.name).join(', '), '| milestones', f.milestones?.length, '| refs', after.references?.length);
