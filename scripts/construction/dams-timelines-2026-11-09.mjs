// Dated project timelines (PinFactory profile with milestones) and reaction excerpts (critic reviews) for the 8 dam pins on production.
// Every quote is re-checked against the raw page (pdftotext for PDFs) first; an unverifiable quote aborts the pin.
//   node scripts/construction/dams-timelines-2026-11-09.mjs [--apply] [--only 20919,...]
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',').map(Number) : null;
const base = 'https://www.chronopin.com';
const token = fs.readFileSync('.scrape/admin.token', 'utf8').trim();
const call = async (method, path, body, soft) => {
  const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), redirect: 'error' });
  const t = await r.text();
  if (!r.ok) { if (soft) return { error: `${r.status} ${t.slice(0, 300)}` }; throw Error(`${method} ${path}: ${r.status} ${t.slice(0, 400)}`); }
  return t ? JSON.parse(t) : null;
};
const ASSESSED = '2026-11-09';
const U = {
  andRel: 'https://www.valleywater.org/news-events/news-releases/ValleyWaterreachesmajormilestoneinrebuildingAndersonDam',
  andTun: 'https://www.valleywater.org/news-events/news-releases/Anderson-Dam-Tunnel-Project-on-track-for-completion-in-2026',
  sj: 'https://www.sanjoseinside.com/news/nearly-2b-reconstruction-of-anderson-dam-to-begin-in-2027/',
  mht: 'https://morganhilltimes.com/anderson-dam-rebuild-project-is-delayed-again',
  grossMs: 'https://www.denverwater.org/tap/major-milestone-gross-dam-construction',
  grossAbout: 'https://www.denverwater.org/grossreservoir/about-the-project',
  grossFacts: 'https://denverwater.org/node/35667',
  grossCourt: 'https://www.kunc.org/news/2026-09-17/denver-water-can-finish-and-fill-gross-reservoir-us-appeals-court-rules',
  kunc25: 'https://www.kunc.org/news/2025-08-03/as-gross-reservoir-rises-boulder-county-residents-grapple-with-projects-legal-turmoil',
  roughGb: 'https://www.dvidshub.net/news/printable/570430',
  roughAward: 'https://www.dvidshub.net/news/printable/554926',
  rr558: 'https://www.dvidshub.net/news/558854/louisville-district-holds-public-meeting-phase-2-rough-river-dam-safety-modification-project',
  hanson: 'https://www.fdcorp.com/en/news/dams/2026/usace-contract-award-finalized-for-howard-a-hanson-dam-additional-water-storage-fish-passage',
  tpu: 'https://mytpu.org/?p=26108',
  prado: 'https://www.californiaconstructionnews.com/?p=11990',
  sitesAbout: 'https://sitesproject.org/about-sites/', sitesGov: 'https://www.gov.ca.gov/2026/09/24/californias-largest-new-water-storage-project-takes-a-major-step-forward/',
  sitesFinal: 'https://www.gov.ca.gov/?p=115136', sitesFacts: 'https://www.usbr.gov/mp/mpr-news/docs/factsheets/sites.pdf',
  foe: 'https://mavensnotebook.com/wp-content/uploads/2026/03/Friends-of-River-Sites-Press-Release.pdf',
  agri: 'https://www.agri-pulse.com/articles/24875-sites-clears-a-key-water-right-hurdle-but-the-strings-attached-leave-uncertainty',
  gold: 'https://www.troutmanenergyreport.com/2026/02/ferc-approves-1200%E2%80%91mw-pumped-storage-project-on-former-smelter-site/',
  nwpb: 'https://www.nwpb.org/local/2026-02-03/goldendale-energy-storage-project-receives-milestone-license-tribes-continue-to-raise-concerns',
};
const T = {
  andRel: 'Valley Water: Valley Water reaches major milestone in rebuilding Anderson Dam', andTun: 'Valley Water: Anderson Dam Tunnel Project on track for completion in 2026',
  sj: 'San José Inside: Nearly $2B reconstruction of Anderson Dam to begin in 2027 (quoting Valley Water Board Chair Tony Estremera)', mht: 'Morgan Hill Times: Anderson Dam rebuild project is delayed again (quoting Valley Water District 1 Director John Varela)',
  grossMs: 'Denver Water: Major milestone for Gross Dam construction', grossAbout: 'Denver Water: Gross Reservoir Expansion Project, About the Project', grossFacts: 'Denver Water: Gross Reservoir Expansion, dam dimensions',
  grossCourt: 'KUNC: Denver Water can finish and fill Gross Reservoir, US appeals court rules (quoting the 10th Circuit)', kunc25: 'KUNC: As Gross Reservoir rises, Boulder County residents grapple with project’s legal turmoil (quoting resident Anna McDermott)',
  roughGb: 'USACE Louisville District: Groundbreaking ceremony for Rough River Dam Safety Modification Phase 2 (quoting Col. L. Reyn Mann)', roughAward: 'USACE Louisville District: awards construction contract for Phase 2 of Rough River Dam Safety Modification project',
  rr558: 'USACE Louisville District: public meeting on Phase 2 (quoting Col. L. Reyn Mann)',
  hanson: 'FlatironDragados: USACE Contract Award Finalized for Howard A. Hanson Dam Additional Water Storage Fish Passage (quoting USACE Seattle District Commander Col. Kathryn Sanborn)', tpu: 'Tacoma Public Utilities: Feds award $657 million contract to get fish past dam (quoting Army Corps Seattle District)',
  prado: 'California Construction News: U.S. Army Corps of Engineers awards $1.13B contract for Prado Dam spillway project (quoting Assistant Secretary of the Army Adam Telle)',
  sitesAbout: 'Sites Project Authority: About Sites Reservoir', sitesGov: 'Governor of California: California’s largest new water storage project takes a major step forward', sitesFinal: 'Governor of California: largest new reservoir in more than 50 years clears final permit (quoting Governor Gavin Newsom)', sitesFacts: 'Bureau of Reclamation: Sites Reservoir Project fact sheet',
  foe: 'Friends of the River press release on the draft Sites water right (quoting Policy Director Keiko Mertz)', agri: 'Agri-Pulse: Sites clears a key water right hurdle, but the strings attached leave uncertainty (quoting Governor Newsom)',
  gold: 'Troutman Pepper Locke, Washington Energy Report: FERC Approves 1,200-MW Pumped Storage Project on Former Smelter Site', nwpb: 'Northwest Public Broadcasting: Goldendale Energy Storage project receives milestone license (quoting Rye Development’s Erik Steimle)',
};
const D = { andRel: '2026-07-28', andTun: '2026-04-27', sj: '2026-07-29', mht: '2025-01-22', grossMs: '2026-06-08', grossAbout: null, grossFacts: null, grossCourt: '2026-09-17', kunc25: '2025-08-03', roughGb: '2026-07-21', roughAward: '2025-12-19', rr558: null, hanson: '2026-03-26', tpu: '2024-10-21', prado: '2026-03-30', sitesAbout: null, sitesGov: '2026-09-24', sitesFinal: null, sitesFacts: null, foe: null, agri: '2026-06-24', gold: '2026-02-12', nwpb: '2026-02-03' };

const norm = (s) => s.replace(/&#8217;|&rsquo;|[’‘]/g, "'").replace(/&#8220;|&#8221;|&ldquo;|&rdquo;|[“”]/g, '"').replace(/&amp;/g, '&').replace(/&#8211;|&#8212;|[–—‑]/g, '-').replace(/&nbsp;|&#160;| /g, ' ').replace(/\s+/g, ' ').toLowerCase().trim();
const pages = {};
async function text(key) {
  if (pages[key]) return pages[key];
  const r = await fetch(U[key], { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36' } });
  if (!r.ok) throw Error(`fetch ${key}: ${r.status}`);
  if (U[key].toLowerCase().split('?')[0].endsWith('.pdf')) {
    fs.mkdirSync('.tmp/dams', { recursive: true });
    fs.writeFileSync(`.tmp/dams/t-${key}.pdf`, Buffer.from(await r.arrayBuffer()));
    return (pages[key] = norm(execFileSync('pdftotext', [`.tmp/dams/t-${key}.pdf`, '-'], { encoding: 'utf8' })));
  }
  return (pages[key] = norm((await r.text()).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ')));
}
const S = async (key, quote) => {
  const t = await text(key);
  for (const p of quote.split('...').map((x) => norm(x).replace(/^[,. ]+|[,. ]+$/g, ''))) if (!t.includes(p)) throw Error(`Quote not found on ${key}: ${p.slice(0, 100)}`);
  return { url: U[key], title: T[key], publishedDate: D[key], quote };
};
const NA = 'Not scored: no peer cohort or capability benchmark was published for this project.';
const axes = () => Object.fromEntries(['scale', 'technical', 'workforce', 'automation', 'efficiency', 'supplyChain'].map((k) => [k, { basis: 'unknown', score: null, sources: [], reasoning: NA }]));
const profile = (sector, status, metrics, milestones) => ({ sector, status, assessmentDate: ASSESSED, rubricYear: 2026, source: 'session', axes: axes(), metrics, milestones });
const M = async (key, basis, label, value, k, q) => ({ key: k, basis, label, value, source: await S(k2(key), q) });
const k2 = (x) => x;
const metric = async (mk, basis, label, value, src, quote) => ({ key: mk, basis, label, value, source: await S(src, quote) });
const mile = async (basis, label, date, src, quote) => ({ label, date, basis, source: await S(src, quote) });
const rev = async (src, quote, sentiment, title) => ({ ...(await S(src, quote)), ...(title ? { title } : {}), sentiment });

const P = {
  20919: async () => ({ // Anderson Dam Seismic Retrofit
    profile: profile('Dam seismic retrofit', 'announced', [
      await metric('investment', 'planned', 'Total project cost', 'About $2.8 billion (the construction contract is $1.88 billion)', 'andRel', 'At a total cost of about $2.8 billion'),
      await metric('timeline', 'planned', 'Construction period', 'Crews begin at the dam in early 2027; about seven years of construction', 'andRel', 'Construction is expected to take about seven years.'),
      await metric('stage', 'planned', 'Stage', 'Construction contract awarded July 24, 2026; most precursor projects are complete', 'andRel', 'Most of the precursor projects to meet regulatory requirements, help manage flows in Coyote Creek and prepare the site for rebuilding Anderson Dam have been completed.'),
    ], [
      await mile('planned', 'FERC orders the reservoir drawn down to dead pool until seismic upgrades are complete', '2020', 'andTun', 'In 2020, the Federal Energy Regulatory Commission directed Valley Water to reduce Anderson Reservoir to “dead pool,” or as low as possible, until the dam’s seismic upgrades are complete.'),
      await mile('planned', 'Board awards the $1.88B construction contract', '2026-07-24', 'andRel', 'Valley Water reached a major milestone on July 24, 2026, when its Board of Directors awarded the construction contract for the Anderson Dam Seismic Retrofit Project.'),
      await mile('planned', 'Construction begins at the dam', '2027-01', 'andRel', 'In early 2027, crews will begin construction at the dam.'),
    ]),
    reviews: [await rev('sj', 'Rebuilding Anderson Dam is our top priority', 0.8), await rev('mht', 'While this delay may be disappointing, it is also not uncommon for major infrastructure projects such as this,', -0.2)],
  }),
  20920: async () => ({ // Anderson tunnel
    profile: profile('Dam outlet tunnel', 'construction', [
      await metric('capacity', 'demonstrated', 'Outlet size', 'New 13-foot-diameter outlet replaces the existing 4-foot-diameter outlet pipe', 'andRel', 'The new tunnel replaces the dam\'s existing 4-foot-diameter outlet pipe with a new 13-foot-diameter outlet.'),
      await metric('timeline', 'planned', 'Completion', 'On track for completion in 2026; functional this winter', 'andTun', 'The project remains on track for completion in 2026.'),
      await metric('stage', 'demonstrated', 'Stage', 'Final concrete pour inside the tunnel done; steel pipe installation began April 2026', 'andTun', 'Most recently, crews completed the final concrete pour inside the tunnel'),
      await metric('products', 'demonstrated', 'Tunnel', 'More than 1,700 feet long', 'andTun', 'crews completed excavation of the more than 1,700-foot-long tunnel in 2024'),
    ], [
      await mile('demonstrated', 'Tunnel construction begins', '2021', 'andTun', 'Construction on the tunnel began in 2021'),
      await mile('demonstrated', 'Excavation of the 1,700-foot tunnel completed', '2024', 'andTun', 'crews completed excavation of the more than 1,700-foot-long tunnel in 2024'),
      await mile('demonstrated', 'Steel pipe installation begins in the tunnel', '2026-04', 'andTun', 'In April, workers began installing a large steel pipe within a section of the tunnel.'),
      await mile('planned', 'Completion', '2026', 'andTun', 'The project remains on track for completion in 2026.'),
    ]),
    reviews: [await rev('mht', 'The construction of the FERC Order Compliance Project Risk Reduction Measures and Conservation Measures is ongoing and will not cease during the delay,', 0.1, 'Morgan Hill Times: Anderson Dam rebuild project is delayed again (quoting Valley Water’s Keller, who says tunnel-related work continues)')],
  }),
  20921: async () => ({ // Gross
    profile: profile('Dam raise', 'construction', [
      await metric('investment', 'planned', 'Construction contract (not the total project cost)', 'Original $531 million contract, now just under $602 million after 2023 and 2026 amendments', 'grossAbout', 'the original $531 million figure has increased to just under $602 million through budget amendments approved in 2023 and 2026'),
      await metric('capacity', 'planned', 'Dam size', '131 feet higher to a total of 471 feet; crest 2,040 feet (was 340 feet high and 1,050 feet long)', 'grossFacts', 'The new dam will be 131 feet higher (a total of 471 feet high) and almost twice as long (2,040 feet) across the crest.'),
      await metric('timeline', 'planned', 'Remaining work', 'About another year of work after June 2026; reservoir fills from 2027', 'grossMs', 'Remaining work on the dam is expected to take another year'),
      await metric('stage', 'demonstrated', 'Stage', 'Roller-compacted concrete topped out June 3, 2026 at 470 feet', 'grossMs', 'Workers placed the final layer of roller-compacted concrete at 3 a.m., raising the dam’s height to 470 feet above the valley floor.'),
    ], [
      await mile('demonstrated', 'Board approves the construction contract', '2021-12', 'grossAbout', 'In December 2021, the Denver Board of Water Commissioners approved a $531 million construction contract for the expansion of Gross Reservoir.'),
      await mile('demonstrated', 'Project starts', '2022-04', 'grossFacts', 'The project started in April 2022'),
      await mile('demonstrated', 'Roller-compacted concrete topped out at 470 feet', '2026-06-03', 'grossMs', 'Workers placed the final layer of roller-compacted concrete at 3 a.m., raising the dam’s height to 470 feet above the valley floor.'),
      await mile('demonstrated', '10th Circuit lifts the injunction; Denver Water can finish and fill', '2026-09-15', 'grossCourt', 'Denver Water can finish its Gross Dam expansion and fill the controversial reservoir in western Boulder County, the 10th U.S. Circuit Court of Appeals ruled Tuesday'),
      await mile('planned', 'Reservoir begins to fill to its new capacity', '2027', 'grossAbout', 'When the reservoir begins to fill to its new, increased capacity in 2027'),
    ]),
    reviews: [
      await rev('kunc25', 'You hear these giant backup beepers crashing, grinding all night long. Even with earplugs, I can’t sleep.', -0.7),
      await rev('grossCourt', 'We do not think the Corps’s choice of cost methodology was arbitrary or capricious,', 0.3),
      await rev('grossMs', 'We’re incredibly excited and proud to have reached this milestone,', 0.8, 'Denver Water: Major milestone for Gross Dam construction (quoting program manager Jeff Martin)'),
    ],
  }),
  20922: async () => ({ // Rough River
    profile: profile('Dam safety modification', 'construction', [
      await metric('investment', 'planned', 'Phase 2 contract value', 'About $655 million expected at completion (base contract $320 million); whole project up to $891 million', 'roughAward', 'the total contract value expected to be around $655M at contract completion'),
      await metric('timeline', 'planned', 'Duration', 'Approximately six to eight years', 'roughGb', 'The work is anticipated to take approximately six to eight years to complete.'),
      await metric('products', 'planned', 'Scope', 'New outlet works and a full-depth cutoff wall 75 to 180 feet deep across the dam', 'roughGb', 'the cutoff wall will be constructed across the crest of the dam varying in depth from 75 to 180 feet'),
      await metric('stage', 'demonstrated', 'Stage', 'Phase 2 groundbreaking held July 21, 2026', 'roughGb', 'joined local, state and federal officials July 21 to break ground on Phase 2 of the Rough River Dam Safety Modification project'),
    ], [
      await mile('demonstrated', 'Phase 1 risk reduction measures completed', '2017', 'roughGb', 'initial risk reduction measures were completed in 2017 during Phase 1 of the project'),
      await mile('demonstrated', 'Phase 2 base contract awarded to Thalle-Bauer', '2025-12-18', 'roughAward', 'awarded a base contract for $320 million to Thalle-Bauer LLC'),
      await mile('demonstrated', 'Phase 2 groundbreaking', '2026-07-21', 'roughGb', 'joined local, state and federal officials July 21 to break ground on Phase 2 of the Rough River Dam Safety Modification project'),
    ]),
    reviews: [
      await rev('roughGb', 'We saw its value firsthand in the historic floods in spring 2025, and over the last year alone the dam has prevented more than $70 million in flood damages.', 0.7),
      await rev('rr558', 'We have some exciting news today that we were finally able to award the Safety Modification project – this is such a huge milestone.', 0.7),
    ],
  }),
  20923: async () => ({ // Hanson
    profile: profile('Dam fish passage facility', 'announced', [
      await metric('investment', 'planned', 'Contract value', '$691 million contract finalized with the Army Corps of Engineers Seattle District', 'hanson', 'FlatironDragados and joint venture partner Aecon have finalized a $691 million contract with the U.S. Army Corps of Engineers, Seattle District'),
      await metric('timeline', 'planned', 'Construction start', 'Expected in the second quarter of 2026; no later confirmation read', 'hanson', 'Construction is expected to begin in the second quarter of 2026.'),
      await metric('products', 'planned', 'Facility', 'Fixed multiport collector, steep slope bypass, deceleration tunnel and outfall stilling basin', 'hanson', 'The facility will include a fixed multiport collector, steep slope bypass, deceleration tunnel and outfall stilling basin structures.'),
    ], [
      await mile('planned', 'Contract finalized', '2026-03-26', 'hanson', 'FlatironDragados and joint venture partner Aecon have finalized a $691 million contract with the U.S. Army Corps of Engineers, Seattle District'),
      await mile('planned', 'Construction expected to begin', '2026-04', 'hanson', 'Construction is expected to begin in the second quarter of 2026.'),
    ]),
    reviews: [
      await rev('hanson', 'We are excited to start construction on the Additional Water Storage Project at Howard A. Hanson Dam', 0.8),
      await rev('tpu', 'We are excited to support salmon and Orca recovery with our tribal partners, federal and state agencies, and our non-federal sponsor Tacoma Public Utilities', 0.8),
    ],
  }),
  20924: async () => ({ // Prado
    profile: profile('Dam spillway modification', 'announced', [
      await metric('investment', 'planned', 'Contract value', '$1.13 billion contract to Barnard Construction', 'prado', 'has awarded a $1.13 billion contract to Barnard Construction Co. Inc.'),
      await metric('timeline', 'planned', 'Construction period', 'Significant construction from spring 2027 through 2033', 'prado', 'Significant construction is expected to begin in spring 2027 and continue through 2033.'),
      await metric('products', 'planned', 'Scope', 'Labyrinth-style spillway control structure, rebuilt chute walls and slabs, spillway crest raised 20 feet', 'prado', 'The second phase raises the spillway’s crest by 20 feet to match the elevation of a 2005 main dam embankment raise.'),
    ], [
      await mile('planned', 'Construction expected to begin', '2027-03', 'prado', 'Significant construction is expected to begin in spring 2027 and continue through 2033.'),
      await mile('planned', 'Construction expected to continue through', '2033', 'prado', 'Significant construction is expected to begin in spring 2027 and continue through 2033.'),
    ]),
    reviews: [await rev('prado', 'Our ‘Building Infrastructure, Not Paperwork’ initiatives are about delivering results by prioritizing our nation’s highest priority projects,', 0.7)],
  }),
  20925: async () => ({ // Sites
    profile: profile('Offstream reservoir', 'announced', [
      await metric('capacity', 'planned', 'Storage and dam height', '1.5 million acre-feet; Golden Gate Dam about 310 feet tall', 'sitesFacts', 'Golden Gate Dam, which will be approximately 310 feet tall'),
      await metric('timeline', 'planned', 'Schedule', 'Construction scheduled to begin in 2026; operational at the end of 2033', 'sitesAbout', 'Construction is scheduled to begin in 2026. Sites Reservoir is anticipated to be operational at the end of 2033.'),
      await metric('stage', 'planned', 'Stage', 'State Water Resources Control Board approved the final water right permit', 'sitesFinal', 'the State Water Resources Control Board approved the project’s final water right permit'),
      await metric('products', 'planned', 'Environmental storage', 'Up to 372,020 acre-feet of storage space for environmental uses', 'sitesAbout', 'Provide up to 372,020 acre-feet of storage space for environmental uses'),
    ], [
      await mile('planned', 'State Water Board approves the final water right permit', '2026-11', 'sitesFinal', 'the State Water Resources Control Board approved the project’s final water right permit'),
      await mile('planned', 'Construction scheduled to begin', '2026', 'sitesAbout', 'Construction is scheduled to begin in 2026.'),
      await mile('planned', 'Reservoir anticipated to be operational', '2033', 'sitesAbout', 'Sites Reservoir is anticipated to be operational at the end of 2033.'),
    ]),
    reviews: [
      await rev('foe', 'The draft water right decision clearly shows that the Board agrees with our position that the proposed reservoir will cause major water quality and environmental impacts that need to be addressed,', -0.5),
      await rev('agri', 'I urge you to balance the many public interests to ensure Sites Reservoir can be built,', 0.5),
      await rev('sitesFinal', 'Now it’s time to get shovels in the ground.', 0.9),
    ],
  }),
  20926: async () => ({ // Goldendale
    profile: profile('Pumped storage hydropower', 'announced', [
      await metric('capacity', 'planned', 'Generating capacity', '1,200 megawatts, closed-loop pumped storage', 'gold', 'issued a 40-year original license to FFP Project 101, LLC (FFP) to construct and operate a 1,200-megawatt pumped storage hydropower facility'),
      await metric('stage', 'planned', 'Stage', 'FERC 40-year license issued January 22, 2026; no construction start read', 'gold', 'issued a 40-year original license to FFP Project 101, LLC (FFP) to construct and operate a 1,200-megawatt pumped storage hydropower facility'),
      await metric('products', 'planned', 'Design', 'Upper reservoir in the Columbia Hills, lower reservoir on the former smelter site, water bought from Klickitat County PUD No. 1', 'gold', 'Designed as a closed-loop system supplied by water purchased from Klickitat County Public Utility District No. 1'),
    ], [
      await mile('planned', 'FERC issues the 40-year license', '2026-01-22', 'gold', 'issued a 40-year original license to FFP Project 101, LLC (FFP) to construct and operate a 1,200-megawatt pumped storage hydropower facility'),
    ]),
    reviews: [
      await rev('nwpb', 'A storage project like this that’s sustainable over a long period of time essentially becomes the backbone of the renewable energy grid,', 0.8),
      await rev('gold', 'The licensing process drew extensive comment and opposition from tribes, environmental non-governmental organizations (NGOs), and local stakeholders.', -0.5, 'Troutman Pepper Locke, Washington Energy Report (reported): opposition during FERC licensing'),
    ],
  }),
};

for (const id of Object.keys(P).map(Number)) {
  if (only && !only.includes(id)) continue;
  const d = await P[id]();
  console.log(id, `verified: ${d.profile.metrics.length} metrics, ${d.profile.milestones.length} milestones, ${d.reviews.length} reviews`);
  if (!apply) continue;
  const pin = await call('GET', `/api/pins/${id}`);
  const have = new Set([pin.sourceUrl, ...(pin.references ?? []).map((r) => r.url)]);
  const urls = new Set([...d.profile.metrics.map((m) => m.source), ...d.profile.milestones.map((m) => m.source), ...d.reviews].map((e) => e.url));
  for (const url of urls) {
    if (have.has(url)) continue;
    const key = Object.keys(U).find((k) => U[k] === url);
    const r = await call('POST', '/api/admin/db/PinReference', { pinId: id, url, title: T[key], ...(D[key] ? { publishedDate: D[key] } : {}), reasoning: 'Cited by the project timeline or reaction excerpts.', confidence: 85, addedByUserId: pin.userId ?? pin.user?.id }, true);
    console.log(r?.error ? `   ref ${key}: ${r.error}` : `   ref added ${key}`);
  }
  await call('PUT', `/api/pins/${id}/factory`, d.profile);
  await call('PUT', `/api/pins/${id}/critic-reviews`, { reviews: d.reviews.map(({ url, title, publishedDate, quote, sentiment }) => ({ url, title, ...(publishedDate ? { publishedDate } : {}), quote, sentiment })), source: 'session', basis: 'Editorial estimate of each quoted reaction’s tone toward the project; quotes are verbatim from the cited pages.', sourceUrl: pin.sourceUrl });
  await call('POST', '/api/admin/pins/expire', { ids: [id] });
  const f = await call('GET', `/api/pins/${id}/factory`);
  const rv = await call('GET', `/api/pins/${id}/critic-reviews`);
  console.log(`   saved: ${f.milestones.length} milestones, ${f.metrics.length} metrics, ${rv.reviews?.length ?? 0} reviews`);
}
console.log(apply ? 'applied' : 'dry run (no writes); add --apply');
