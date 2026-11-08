// Port Authority Bus Terminal replacement (pin 2219): $11B cost, 2030/2035 schedule, timeline, reaction excerpts, tags.
// Every quote is checked against the raw page. node scripts/construction/port-authority-bus-terminal-2026-11-08.mjs [--base https://www.chronopin.com] [--apply]
import fs from 'node:fs';
const args = process.argv.slice(2);
const val = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : undefined);
const base = (val('--base') ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
if (!['http://127.0.0.1:3000', 'https://www.chronopin.com'].includes(base)) throw Error('Known hosts only.');
const apply = args.includes('--apply');
const token = fs.readFileSync(base.startsWith('https') ? '.scrape/admin.token' : '.scrape/admin-local.token', 'utf8').trim();
const ID = 2219, ASSESSED = '2026-11-08';
const call = async (method, path, body) => {
  const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), redirect: 'error' });
  const t = await r.text();
  if (!r.ok) throw Error(`${method} ${path}: ${r.status} ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : null;
};
const U = {
  abc: 'https://abc7ny.com/post/new-jersey-bus-commuters-face-delays-port-authority-terminal-work-ramps/19939973/',
  ny1: 'https://ny1.com/nyc/all-boroughs/news/2026/10/23/construction-on-new-port-authority-bus-terminal-in-full-swing',
  cbs: 'https://www.cbsnews.com/newyork/news/port-authority-bus-terminal-construction-traffic-disruptions-midtown-nyc/',
  fox: 'https://www.fox5ny.com/news/port-authority-bus-terminal-midtown',
  ny1b: 'https://ny1.com/nyc/all-boroughs/news/2025/05/29/workers-break-ground-on-port-authority-bus-terminal-replacement',
  pa: 'https://www.panynj.gov/port-authority/en/press-room/press-release-archives/2026-press-releases/port-authority-marks-major-constrcution-milestone-for-midtown-bu.html',
};
const T = {
  abc: 'ABC7 New York: NJ bus commuters face delays as Port Authority Bus Terminal work ramps up', ny1: 'NY1 (Spectrum News): Construction on new Port Authority Bus Terminal in full swing',
  cbs: 'CBS New York: Port Authority Bus Terminal construction will cause major traffic disruptions for years in Midtown', fox: 'FOX 5 New York: Port Authority Bus Terminal groundbreaking',
  ny1b: 'NY1: Workers break ground on Port Authority Bus Terminal replacement', pa: 'Port Authority: first steel beams for Dyer Avenue deck-overs (press release)',
};
const D = { abc: '2026-10-15', ny1: '2026-10-23', cbs: '2026-10-15', fox: '2025-05-29', ny1b: '2025-05-29', pa: '2026-04-28' };
const norm = (s) => s.replace(/&#8217;|&rsquo;|&#39;|&#x27;|&apos;|[’‘]/g, "'").replace(/&#8220;|&#8221;|&quot;|[“”]/g, '"').replace(/&amp;/g, '&').replace(/&#8211;|&#8212;|[–—]/g, '-').replace(/&nbsp;|&#160;| /g, ' ').replace(/\s+/g, ' ').replace(/" /g, '"').replace(/ "/g, '"').toLowerCase().trim();
const pages = {};
const text = async (k) => pages[k] ??= norm((await (await fetch(U[k], { headers: { 'User-Agent': 'ChronopinResearch/1.0' } })).text()).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' '));
const S = async (k, quote) => {
  const t = await text(k);
  for (const p of quote.split('...').map((x) => norm(x).replace(/^[,. ]+|[,. ]+$/g, ''))) if (!t.includes(p)) throw Error(`Quote not found on ${k}: ${p.slice(0, 80)}`);
  return { url: U[k], title: T[k], publishedDate: D[k], quote };
};
const q = {
  cost: await S('abc', 'construction advances on the $11 billion project'),
  cost2: await S('ny1', 'Construction is underway on an $11 billion new terminal.'),
  ph1: await S('abc', 'Phase 1 is expected to be completed by the end of 2030, with the new bus terminal scheduled for completion in 2035.'),
  done: await S('ny1', 'Completion is set for 2035.'),
  ramps: await S('abc', 'Crews have begun removing ramps that carry buses from the Lincoln Tunnel into the 75-year-old terminal'),
  steel: await S('pa', 'PLACEMENT OF FIRST STEEL BEAMS FOR DYER AVENUE DECK OVERS'),
  gb: await S('fox', 'Phase one of the project is now underway'),
};
const rev = (k, quote, title, sentiment) => S(k, quote).then((r) => ({ ...r, title, sentiment }));
const reviews = [
  await rev('fox', 'A new Midtown Bus Terminal will deliver an enhanced experience for millions of riders, breathe new life into the surrounding neighborhood', 'FOX 5 New York: Governor Kathy Hochul at the groundbreaking', 0.9),
  await rev('ny1', 'We think this is going to be a real gem for this neighborhood,', 'NY1: Port Authority Executive Director Kathryn Garcia', 0.8),
  await rev('cbs', 'hold our nose, hope that the new development is going to be a good thing', 'CBS New York: Alex Joseph, Midtown resident', 0.0),
  await rev('ny1', 'It takes a little longer to get through the tunnel during rush hour,', 'NY1: Melissa Weiner, bus rider', -0.2),
  await rev('abc', "Very bad business for us because we have to get to work on time and we're not going to get a pass because the bus was late,", 'ABC7: Clora Vernon, bus rider, on ramp-closure delays', -0.4),
].map((r) => ({ ...r, quote: r.quote.replace(/,$/, '') }));
console.log('all quotes verified');

const pin = await call('GET', `/api/pins/${ID}`);
if (!pin.title.startsWith('Construction Starts on the Port Authority Bus Terminal')) throw Error('identity mismatch in ' + base);
const newRefs = [
  [U.abc, T.abc, D.abc, 'Oct 2026: $11 billion project, Lincoln Tunnel ramp removal and rerouting, Phase 1 by end of 2030 and terminal in 2035', 85],
  [U.ny1, T.ny1, D.ny1, 'Oct 2026: construction under way on an $11 billion terminal, deck-overs, Garcia on the result, completion 2035', 85],
  [U.cbs, T.cbs, D.cbs, 'Oct 2026: traffic disruptions and Midtown commuter and resident reactions', 80],
  [U.ny1b, T.ny1b, D.ny1b, 'Groundbreaking day: Hochul and Murphy, about $10 billion at the time', 80],
].filter(([u]) => !pin.references.some((r) => r.url === u));
const sec = `<h3>Construction status and cost (October 2026)</h3><ul>`
  + `<li>ABC7 and NY1 now describe it as an $11 billion project, up from the roughly $10 billion cited at the May 2025 groundbreaking.<cite data-ref="${U.abc}"></cite><cite data-ref="${U.ny1}"></cite></li>`
  + `<li>In mid-October 2026 crews began removing ramps that carry buses from the Lincoln Tunnel into the terminal, rerouting buses onto temporary routes around West 39th Street and 10th Avenue.<cite data-ref="${U.abc}"></cite></li>`
  + `<li>Phase 1 is expected to be completed by the end of 2030, with the new bus terminal scheduled for completion in 2035.<cite data-ref="${U.abc}"></cite></li></ul>`;
const summary = pin.longFormSummary.includes('<h3>Construction status and cost (October 2026)</h3>') ? pin.longFormSummary : pin.longFormSummary + sec;
const description = 'Construction began May 29, 2025 on the Dyer Avenue deck-overs and a temporary terminal that keeps 8,000 buses a day running while the 1950 building is replaced. The project is now reported at $11 billion, with Phase 1 due by the end of 2030 and the new terminal in 2035.';
const dcr = pin.dateConfidenceReasoning.replace(/\s*Cost:.*$/, '') + ' Cost: ABC7 (15 Oct 2026) and NY1 (23 Oct 2026) report an $11 billion project; the $10 billion figure was the May 2025 groundbreaking estimate.';
const tagNames = ['Under Construction', 'Lincoln Tunnel'];
const { rows: haveTags } = await call('GET', `/api/admin/db/PinTag?pinId=${ID}&limit=200`);
const tagsToAdd = tagNames.filter((n) => !haveTags.some((t) => t.name.toLowerCase() === n.toLowerCase())).map((name) => ({ pinId: ID, name, kind: 'topic', source: 'user' }));

const f = await call('GET', `/api/pins/${ID}/factory`);
const ev = ({ url, title, publishedDate, quote }) => ({ url, title, publishedDate, quote });
const metrics = f.metrics.filter((m) => m.key !== 'investment');
metrics.unshift({ key: 'investment', basis: 'planned', label: 'Project cost', value: '$11 billion for the whole replacement (ABC7, 15 Oct 2026; NY1, 23 Oct 2026); about $10 billion was cited at the May 2025 groundbreaking', source: ev(q.cost) });
const keep = f.milestones.filter((m) => m.date === '2024-12-04' || m.date === '2026-05-18');
const milestones = [
  ...keep,
  { label: 'Groundbreaking: phase one (Dyer Avenue deck-overs, temporary terminal) begins', date: '2025-05-29', basis: 'demonstrated', source: ev(q.gb) },
  { label: 'First steel beams placed for the Dyer Avenue deck-overs', date: '2026-04-28', basis: 'demonstrated', source: ev(q.steel) },
  { label: 'Lincoln Tunnel ramp removal begins; buses rerouted', date: '2026-10', basis: 'demonstrated', source: ev(q.ramps) },
  { label: 'Estimated: Phase 1 complete', date: '2030', basis: 'planned', source: ev(q.ph1) },
  { label: 'Estimated: new bus terminal complete', date: '2035', basis: 'planned', source: ev(q.done) },
].sort((a, b) => a.date.localeCompare(b.date));
const factory = { ...f, metrics, milestones, assessmentDate: ASSESSED, rubricYear: 2026, source: 'session' };
delete factory.checkedAt;

console.log(base, apply ? 'APPLY' : 'dry', { refs: refsToAdd(), tags: tagsToAdd.map((t) => t.name), milestones: milestones.map((m) => m.date), summaryAdds: summary !== pin.longFormSummary });
function refsToAdd() { return newRefs.length; }
if (!apply) process.exit(0);
for (const [url, title, publishedDate, reasoning, confidence] of newRefs) await call('POST', '/api/admin/db/PinReference', { pinId: ID, url, title, publishedDate, reasoning, confidence, addedByUserId: pin.userId });
if (tagsToAdd.length) await call('POST', '/api/admin/db/PinTag', tagsToAdd);
const { rows: [row] } = await call('GET', `/api/admin/db/Pin?id=${ID}`);
const qs = new URLSearchParams({ id: String(ID), userId: String(row.userId), title: row.title });
qs.set(row.price === null ? 'price.null' : 'price', String(row.price));
const { rows: done } = await call('PATCH', `/api/admin/db/Pin?${qs}`, { price: 11000000000, priceCurrency: 'USD', description, longFormSummary: summary, dateConfidenceReasoning: dcr });
if (done.length !== 1) throw Error('concurrent edit');
await call('PUT', `/api/pins/${ID}/factory`, factory);
await call('PUT', `/api/pins/${ID}/critic-reviews`, { reviews: reviews.map(({ url, title, publishedDate, quote, sentiment }) => ({ url, title, publishedDate, quote, sentiment })), source: 'session', basis: 'Editorial estimate of each quoted reaction’s tone toward the project; quotes are verbatim from the cited pages.', sourceUrl: pin.sourceUrl });
await call('POST', '/api/admin/pins/expire', { ids: [ID] });
const after = await call('GET', `/api/pins/${ID}`);
console.log({ price: after.price, author: after.user.userName, tags: after.tags.map((t) => t.name), refs: after.references.length, media: after.media.length });
