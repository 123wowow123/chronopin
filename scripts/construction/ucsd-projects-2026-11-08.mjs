// UC San Diego current projects (plandesignbuild.ucsd.edu/projects/current.html), pins 20875-20880 on production.
// Adds the dated project timeline (PinFactory profile), reaction excerpts, media and corrections. Every quote is checked
// against the raw page (pdftotext for PDFs) before anything is written; an unverifiable quote aborts the run.
// node scripts/construction/ucsd-projects-2026-11-08.mjs [--apply] [--only 20875,20876]
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',').map(Number) : null;
const base = 'https://www.chronopin.com';
const token = fs.readFileSync('.scrape/admin.token', 'utf8').trim();
const ASSESSED = '2026-11-08';
const call = async (method, path, body, soft) => {
  const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), redirect: 'error' });
  const t = await r.text();
  if (!r.ok) { if (soft) return null; throw Error(`${method} ${path}: ${r.status} ${t.slice(0, 400)}`); }
  return t ? JSON.parse(t) : null;
};

const U = {
  cur: 'https://plandesignbuild.ucsd.edu/projects/current.html',
  rec: 'https://recreation.ucsd.edu/rimac-expansion/',
  gd: 'https://ucsdguardian.org/2026/03/02/bigger-isnt-always-better-especially-at-rimac/',
  reg24jul: 'https://regents.universityofcalifornia.edu/regmeet/july24/f2b.pdf',
  reg24aug: 'https://regents.universityofcalifornia.edu/regmeet/aug24/h1.pdf',
  kpbs: 'https://kpbs.org/news/education/2024/07/16/uc-san-diego-looking-to-add-more-housing-for-students-in-next-10-years',
  ut: 'https://www.sandiegouniontribune.com/2026/02/20/uc-san-diego-will-begin-building-historic-6000-bed-campus-residential-village-next-year/',
  today: 'https://today.ucsd.edu/story/city-approves-key-milestone-for-major-cultural-center-downtown',
  prebys: 'https://today.ucsd.edu/story/prebys-foundation-supports-vision-for-downtown-arts-with-5m-to-uc-san-diego-for-the-depot',
  sdbj: 'https://sdbj.com/featured/museum-of-contemporary-art-creating-downtown-arts-hub/',
  mriPdf: 'https://health.ucsd.edu/globalassets/content/locations/parking/thornton-construction-english-parking-valet-map-flier.pdf',
  mriPark: 'https://health.ucsd.edu/locations/parking-la-jolla/',
  ugNotice: 'https://www.firstuusandiego.org/blog/uc-san-diego-utility-project-to-begin-along-arbor-drive',
};
const T = {
  cur: 'Current Projects - UC San Diego Planning, Design & Construction', rec: 'RIMAC Expansion - UC San Diego Recreation',
  gd: 'The UCSD Guardian: Bigger isn’t always better, especially at RIMAC (student opinion)',
  reg24jul: 'UC Regents July 2024: Pepper Canyon East District Phase 1', reg24aug: 'UC Regents August 2024: La Jolla Medical Center Tower 2 and La Jolla Outpatient Pavilion',
  kpbs: 'KPBS: UC San Diego looking to add more housing for students in next 10 years', ut: 'San Diego Union-Tribune: UC San Diego will begin building historic 6,000-bed campus residential village next year',
  today: 'UC San Diego Today: City Approves Key Milestone for Major Cultural Center Downtown', prebys: 'UC San Diego Today: Prebys Foundation Supports Vision for Downtown Arts with $5M to UC San Diego for The Depot',
  sdbj: 'San Diego Business Journal: Museum of Contemporary Art Creating Downtown Arts Hub', mriPdf: 'UC San Diego Health: La Jolla Medical Campus Construction Alert',
  mriPark: 'UC San Diego Health: Parking & Directions for La Jolla locations', ugNotice: 'First UU Church of San Diego: UC San Diego Utility Project to Begin Along Arbor Drive (repost of a university notice)',
};
const D = { cur: null, rec: null, gd: '2026-03-02', reg24jul: '2024-07-17', reg24aug: null, kpbs: '2024-07-16', ut: '2026-02-20', today: '2024-11-21', prebys: '2025-02-13', sdbj: '2023-02-03', mriPdf: '2026-07-19', mriPark: null, ugNotice: '2025-04-14' };

// ---- verbatim quote check ----
const norm = (s) => s.replace(/&#8217;|&rsquo;|[’‘]/g, "'").replace(/&#8220;|&#8221;|&ldquo;|&rdquo;|[“”]/g, '"').replace(/&amp;/g, '&').replace(/&#8211;|&#8212;|[–—]/g, '-').replace(/&nbsp;|&#160;| /g, ' ').replace(/\s+/g, ' ').replace(/" /g, '"').replace(/ "/g, '"').toLowerCase().trim();
const pages = {};
async function text(key) {
  if (pages[key]) return pages[key];
  const url = U[key];
  let t;
  if (url.endsWith('.pdf')) {
    const r = await fetch(url);
    if (!r.ok) throw Error(`fetch ${key}: ${r.status}`);
    fs.mkdirSync('.tmp/ucsd', { recursive: true });
    fs.writeFileSync(`.tmp/ucsd/${key}.pdf`, Buffer.from(await r.arrayBuffer()));
    t = execFileSync('pdftotext', ['-layout', `.tmp/ucsd/${key}.pdf`, '-'], { encoding: 'utf8' });
  } else {
    const r = await fetch(url);
    if (!r.ok) throw Error(`fetch ${key}: ${r.status}`);
    t = (await r.text()).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
  }
  return (pages[key] = norm(t));
}
const S = async (key, quote, title) => {
  const parts = quote.split('...').map((p) => norm(p).replace(/^[,. ]+|[,. ]+$/g, ''));
  const t = await text(key);
  for (const p of parts) if (!t.includes(p)) throw Error(`Quote not found on ${key}: ${p.slice(0, 90)}`);
  return { url: U[key], title: title ?? T[key], publishedDate: D[key], quote };
};
const ev = ({ url, title, publishedDate, quote }) => ({ url, title, publishedDate, quote });
const NA = 'Not scored: a single campus project is not a manufacturing facility, and no capability evidence was published.';
const axes = () => Object.fromEntries(['scale', 'technical', 'workforce', 'automation', 'efficiency', 'supplyChain'].map((k) => [k, { basis: 'unknown', score: null, sources: [], reasoning: NA }]));
const profile = (sector, status, metrics, milestones) => ({ sector, status, assessmentDate: ASSESSED, rubricYear: 2026, source: 'session', axes: axes(), metrics, milestones });

const P = {};
// ---------- 20875 RIMAC ----------
P[20875] = async () => {
  const q = {
    start: await S('rec', 'In work that began in August 2025 and is slated to be completed in January 2027'),
    area: await S('rec', 'the project adds approximately 20,000 square feet of usable recreation space'),
    wall: await S('rec', 'a climbing wall — measuring 42 feet tall with eight lanes of top rope'),
    open: await S('rec', 'COMING JANUARY 7, 2027'),
    fnd: await S('rec', '1/26/26 Laying the foundation for the future of Recreation at UC San Diego.'),
    floor2: await S('rec', '4/23/26 Ascending to the new second floor.'),
    list: await S('cur', 'Anticipated Completion: January 2027'),
  };
  const rev = [
    { ...(await S('gd', '“I had a gap between classes and thought I could beat the crowd, but everyone was already there,” Montalvo said.', T.gd)), sentiment: -0.4 },
    { ...(await S('rec', 'will forge a campus hub to strengthen the UC San Diego student community for years to come.', 'UC San Diego Recreation (project owner): RIMAC Expansion page')), sentiment: 0.8 },
  ].map((r) => ({ ...r, quote: r.quote.replace(/, Montalvo said\.$/, ',”').replace(/^“|”$/g, '').replace(/,$/, '') }));
  return {
    profile: profile('Recreation facility', 'construction', [
      { key: 'floorArea', basis: 'planned', label: 'Added recreation space', value: 'About 20,000 square feet of usable recreation space (cardio, weights, an additional bouldering wall)', source: ev(q.area) },
      { key: 'products', basis: 'planned', label: 'Headline feature', value: 'Climbing wall 42 feet tall with eight lanes of top rope', source: ev(q.wall) },
      { key: 'timeline', basis: 'planned', label: 'Completion', value: 'January 2027 (opening January 7, 2027)', source: ev(q.open) },
      { key: 'stage', basis: 'demonstrated', label: 'Stage', value: 'Under construction since August 2025; second floor rising in April 2026', source: ev(q.floor2) },
    ], [
      { label: 'Construction begins', date: '2025-08', basis: 'demonstrated', source: ev(q.start) },
      { label: 'Foundation work reported', date: '2026-01-26', basis: 'demonstrated', source: ev(q.fnd) },
      { label: 'Second floor rising', date: '2026-04-23', basis: 'demonstrated', source: ev(q.floor2) },
      { label: 'Opening', date: '2027-01-07', basis: 'planned', source: ev(q.open) },
    ]),
    reviews: rev,
    refs: [[U.gd, T.gd, D.gd, 'Student opinion column on gym overcrowding during construction; source of the lead construction photo.']],
    media: [
      { type: 1, originalUrl: 'https://ucsdguardian.org/wp-content/uploads/2026/03/Thomas-Murphy-RIMAC-Construction-7.jpg', authorName: 'Thomas Murphy / UCSD Guardian', authorUrl: U.gd },
      { type: 1, originalUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/02/LionTree_Arena_exterior%2C_RIMAC_Sports_Complex%2C_UC_San_Diego.jpg', authorName: 'Greenstrat (Wikimedia Commons, public domain)', authorUrl: 'https://commons.wikimedia.org/wiki/File:LionTree_Arena_exterior,_RIMAC_Sports_Complex,_UC_San_Diego.jpg' },
      { type: 1, originalUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a7/North_Campus_Field_at_RIMAC_and_LionTree_Arena%2C_UCSD.jpg', authorName: 'Tktktk (Wikimedia Commons, CC BY 3.0)', authorUrl: 'https://commons.wikimedia.org/wiki/File:North_Campus_Field_at_RIMAC_and_LionTree_Arena,_UCSD.jpg' },
    ],
  };
};
// ---------- 20876 Pepper Canyon East ----------
P[20876] = async () => {
  const q = {
    cost: await S('ut', 'Chancellor Pradeep Khosla told the Union-Tribune the $2 billion village'),
    phases: await S('ut', 'will likely be constructed in two phases, with the first section providing 2,000 to 3,000 beds by 2030'),
    finish: await S('ut', 'the entire Pepper Canyon East project should be finished in 2032'),
    next: await S('ut', 'UC San Diego said Friday it expects to start building a historic 6,000-bed campus residential village next year'),
    beds: await S('reg24jul', 'up to an additional 4,000 beds (for a total of up to 6,000 beds)'),
    prelim: await S('reg24jul', 'preliminary plans funding of $60 million'),
    old: await S('reg24jul', 'starting construction in summer 2026 and completing in summer 2029'),
    kpbsPlan: await S('kpbs', 'a 10-year, $2 billion plan to build more'),
  };
  const rev = [
    { ...(await S('ut', '“I think 6,000 is where we are still focused on,” Khosla said.', 'San Diego Union-Tribune: Chancellor Pradeep Khosla on the 6,000-bed target')), sentiment: 0.5 },
    { ...(await S('kpbs', '“It starts the process where we can hire architects and engineers and planners to really further investigate the site,” Clossin said.', 'KPBS: UC San Diego campus planner Robert Clossin on the Regents request')), sentiment: 0.3 },
  ].map((r) => ({ ...r, quote: r.quote.replace(/,” (Khosla|Clossin) said\.$/, '').replace(/^“/, '') }));
  return {
    profile: profile('Student housing', 'announced', [
      { key: 'investment', basis: 'planned', label: 'Project cost', value: '$2 billion for the full 6,000-bed village, as stated by Chancellor Pradeep Khosla (Feb 2026)', source: ev(q.cost) },
      { key: 'capacity', basis: 'planned', label: 'Beds', value: 'Up to 6,000 beds: Phase 1 up to 2,000 beds (Regents 2024) or 2,000 to 3,000 (chancellor 2026), future phases up to 4,000 more', source: ev(q.beds) },
      { key: 'timeline', basis: 'planned', label: 'Completion target', value: 'Phase 1 by 2030 (campus list: Fall 2030); whole project 2032', source: ev(q.finish) },
      { key: 'stage', basis: 'planned', label: 'Stage', value: 'Pre-design; the university expects to start building in 2027', source: ev(q.next) },
    ], [
      { label: 'Regents asked to approve $60 million of Phase 1 preliminary plans funding', date: '2024-07-17', basis: 'demonstrated', source: ev(q.kpbsPlan) },
      { label: 'University says it expects to start building next year (2027)', date: '2026-02-20', basis: 'demonstrated', source: ev(q.next) },
      { label: 'Phase 1: first 2,000 to 3,000 beds', date: '2030', basis: 'planned', source: ev(q.phases) },
      { label: 'Whole project finished', date: '2032', basis: 'planned', source: ev(q.finish) },
    ]),
    reviews: rev,
    refs: [[U.ut, T.ut, D.ut, 'Chancellor Khosla: $2 billion village, two phases, 2,000 to 3,000 beds by 2030, entire project finished 2032, start building next year.'], [U.kpbs, T.kpbs, D.kpbs, 'Campus planner Robert Clossin on the Regents request, 6,000 beds, rents at least 30% below market.']],
    patch: {
      price: 2000000000, priceCurrency: 'USD', utcEndDateTime: '2032-12-31T00:00:00.000Z',
      dateConfidenceReasoning: 'Estimated. The university has not published a groundbreaking day: Chancellor Khosla told the Union-Tribune (Feb 20, 2026) it expects to start building next year (2027), with Phase 1 (2,000 to 3,000 beds) by 2030 and the entire project finished in 2032. The 2024 Regents plan (start summer 2026, finish summer 2029) has slipped, and the campus project list gives District Phase 1 as Fall 2030. The pin starts in 2027 and ends with the whole project in 2032 (year precision).',
    },
    summary: () => `<h3>What is planned</h3><ul><li>The campus proposes to develop the District on a 20-acre site on the west campus adjacent to the Light Rail Transit station, built in multiple phases with new student beds.<cite data-ref="${U.reg24jul}"></cite></li><li>Phase 1 would deliver up to 2,000 beds in apartment-style units; future phases would add up to 4,000 beds for a total of up to 6,000.<cite data-ref="${U.reg24jul}"></cite></li><li>The campus list describes the district as about 6,000 beds, a hotel, food and beverage, recreation and amenity space, replacing existing housing.<cite data-ref="${U.cur}"></cite></li><li>Phase 1 would demolish the current residence halls (994 beds) and permanently displace about 150 surface parking spaces.<cite data-ref="${U.reg24jul}"></cite></li><li>Khosla said the target remains 6,000 beds: "We are not trying to make it 8,000."<cite data-ref="${U.ut}"></cite></li></ul><h3>Timeline</h3><ul><li>July 2024 Regents plan: Phase 1 starts construction in summer 2026 and completes in summer 2029.<cite data-ref="${U.reg24jul}"></cite></li><li>February 2026: the university said it expects to start building next year (2027), with the first section providing 2,000 to 3,000 beds by 2030 and the entire project finished in 2032.<cite data-ref="${U.ut}"></cite></li><li>Current campus list: Pre-Design phase, District Phase 1 anticipated Fall 2030. No groundbreaking day is published, so the start is an estimate.<cite data-ref="${U.cur}"></cite></li></ul><h3>Cost</h3><ul><li>Chancellor Pradeep Khosla told the Union-Tribune the $2 billion village will be built in two phases; this is the only whole-project figure published and is used as the price.<cite data-ref="${U.ut}"></cite><cite data-ref="${U.kpbs}"></cite></li><li>Separately, the Regents were asked for $60 million of Phase 1 preliminary plans funding (90% architecture and engineering fees), from auxiliary-student housing reserves; that is design funding, not a construction cost.<cite data-ref="${U.reg24jul}"></cite></li><li>The map point is the trolley station beside the site, not a surveyed project boundary.<cite data-ref="${U.reg24jul}"></cite></li></ul>`,
    media: [
      { type: 1, originalUrl: 'https://buildsd.org/img/projects/PepperCanyonEast.jpg', authorName: 'BuildSD (conceptual rendering of Pepper Canyon East)', authorUrl: 'https://buildsd.pages.dev/projects/pepper-canyon-east' },
      { type: 1, originalUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/68/Pepper_Canyon_Hall.jpg', authorName: 'Andyroo (Wikimedia Commons, CC BY-SA 4.0), Pepper Canyon Hall on campus', authorUrl: 'https://commons.wikimedia.org/wiki/File:Pepper_Canyon_Hall.jpg' },
      { type: 1, originalUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f3/UCSD_Central_Campus_Station_Entrance.jpg', authorName: 'Wikimedia Commons (CC BY-SA 4.0), UCSD Central Campus trolley station beside the site', authorUrl: 'https://commons.wikimedia.org/wiki/File:UCSD_Central_Campus_Station_Entrance.jpg' },
    ],
  };
};
// ---------- 20877 The Depot ----------
P[20877] = async () => {
  const q = {
    approve: await S('today', 'On November 19, the San Diego City Council approved the transfer of property ownership for 1100 Kettner Boulevard'),
    retrofit: await S('today', 'invest significant resources in initial upgrades that would include everything from a seismic retrofit and upgrades to mechanical systems'),
    gift: await S('prebys', 'Prebys Foundation has awarded $5 million to support The Depot'),
    late26: await S('prebys', 'Renovation and updates of the historic building are anticipated to be completed in late 2026.'),
    res: await S('prebys', 'Nonprofit arts residencies are planned, as well as studio space for individual visual artists'),
    list: await S('cur', 'Anticipated Completion: Spring 2028'),
    design: await S('cur', 'Schematic Design'),
  };
  const rev = [
    { ...(await S('today', '“We trust that the university will be a good caretaker of the building and MCASD’s iconic site-specific art collection.', 'UC San Diego Today: Steve Strauss, MCASD Board of Trustees President, on the transfer')), sentiment: 0.6 },
    { ...(await S('sdbj', '“It’s really not altering the physical plant as much as its creating new programs, new partnerships,” Kanjo said.', 'San Diego Business Journal: MCASD director Kathryn Kanjo on the downtown campus (2023, before the transfer)')), sentiment: 0.5 },
    { ...(await S('prebys', 'We applaud UC San Diego’s exemplary leadership in saving The Depot as a resource for the arts community and as a creative asset for downtown', 'UC San Diego Today: Grant Oliphant, CEO of Prebys Foundation, on The Depot')), sentiment: 0.9 },
  ].map((r) => ({ ...r, quote: r.quote.replace(/,” Kanjo said\.$/, ',”').replace(/^“|”$/g, '').replace(/^"|"$/g, '') }));
  return {
    profile: profile('Arts and cultural venue', 'announced', [
      { key: 'products', basis: 'planned', label: 'Programming', value: 'Multidisciplinary arts incubator: nonprofit arts residencies and studio space for individual visual artists', source: ev(q.res) },
      { key: 'timeline', basis: 'planned', label: 'Completion', value: 'Campus project list: Spring 2028 anticipated; the Prebys release (2025) anticipated renovation by late 2026', source: ev(q.list) },
      { key: 'stage', basis: 'planned', label: 'Stage', value: 'Schematic Design on the campus project list; property transferred in late 2024', source: ev(q.design) },
    ], [
      { label: 'San Diego City Council approves transfer of 1100 Kettner to UC San Diego', date: '2024-11-19', basis: 'demonstrated', source: ev(q.approve) },
      { label: 'Planned initial upgrades: seismic retrofit, mechanical and A/V', date: '2024-11-21', basis: 'planned', source: ev(q.retrofit) },
      { label: 'Prebys Foundation awards $5 million for operations', date: '2025-02-13', basis: 'demonstrated', source: ev(q.gift) },
      { label: 'Renovation anticipated complete (Prebys release: late 2026)', date: '2026', basis: 'planned', source: ev(q.late26) },
      { label: 'Anticipated completion (campus project list: Spring 2028)', date: '2028-03', basis: 'planned', source: ev(q.list) },
    ]),
    reviews: rev,
    refs: [[U.sdbj, T.sdbj, D.sdbj, 'MCASD director Kanjo on turning the downtown campus into an arts hub (2023, before the transfer).']],
    summary: (s) => s.replace('<li>The campus lists the project in Schematic Design with completion anticipated in Spring 2028. No groundbreaking date is published.<cite data-ref="https://plandesignbuild.ucsd.edu/projects/current.html"></cite></li>', `<li>The campus lists the project in Schematic Design with completion anticipated in Spring 2028. No groundbreaking date is published.<cite data-ref="${U.cur}"></cite></li><li>The Prebys Foundation release (2025) said renovation and updates of the historic building were anticipated to be completed in late 2026; the two targets conflict and the pin keeps the campus list's Spring 2028 as its end.<cite data-ref="${U.prebys}"></cite></li>`),
    media: [
      { type: 1, originalUrl: 'https://today.ucsd.edu/news_uploads/_social/MCASD_Downtown_Jacobs_and_Copley_Buildings_Teaser.jpg', authorName: 'Museum of Contemporary Art San Diego (courtesy)', authorUrl: U.today },
      { type: 1, originalUrl: 'https://plandesignbuild.ucsd.edu/_images/projects/The-Depot-rendering.jpg', authorName: 'UC San Diego Planning, Design & Construction', authorUrl: U.cur },
      { type: 1, originalUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/ac/San_Diego_Santa_Fe_Depot_05.JPG', authorName: 'Wikimedia Commons (CC BY-SA 3.0)', authorUrl: 'https://commons.wikimedia.org/wiki/File:San_Diego_Santa_Fe_Depot_05.JPG' },
    ],
  };
};
// ---------- 20878 La Jolla Outpatient Pavilion ----------
P[20878] = async () => {
  const q = {
    gsf: await S('reg24aug', 'approximately 180,000 gross square feet'),
    orr: await S('reg24aug', 'at least six outpatient operating and procedural rooms'),
    budget: await S('reg24aug', '$250 million to $300 million for the outpatient pavilion'),
    plan: await S('reg24aug', 'construction is expected to start in spring 2026 with operations commencing in fall 2028'),
    done: await S('cur', 'Anticipated Completion: 2029'),
    stage: await S('cur', 'Design Development'),
  };
  return {
    profile: profile('Hospital outpatient facility', 'announced', [
      { key: 'investment', basis: 'planned', label: 'Preliminary budget', value: '$250 million to $300 million, facility only, full project cost (Regents item, Aug 2024); not a final budget', source: ev(q.budget) },
      { key: 'floorArea', basis: 'planned', label: 'Gross area', value: 'Approximately 180,000 gross square feet', source: ev(q.gsf) },
      { key: 'capacity', basis: 'planned', label: 'Procedure rooms', value: 'At least six outpatient operating and procedural rooms', source: ev(q.orr) },
      { key: 'timeline', basis: 'planned', label: 'Completion', value: 'Anticipated 2029 (campus list); the 2024 Regents plan said operations in fall 2028', source: ev(q.done) },
      { key: 'stage', basis: 'planned', label: 'Stage', value: 'Design Development', source: ev(q.stage) },
    ], [
      { label: 'Regents item proposes the pavilion and Tower 2; construction expected spring 2026', date: '2024-08', basis: 'demonstrated', source: ev(q.plan) },
      { label: 'Original target: operations commence fall 2028', date: '2028', basis: 'planned', source: ev(q.plan) },
      { label: 'Anticipated completion (campus project list)', date: '2029', basis: 'planned', source: ev(q.done) },
    ]),
    reviews: [],
    refs: [],
    media: [
      { type: 1, originalUrl: 'https://plandesignbuild.ucsd.edu/_images/projects/LJOPP-rendering.jpg', authorName: 'UC San Diego Planning, Design & Construction (project rendering)', authorUrl: U.cur },
      { type: 1, originalUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/de/Jacobs_Medical_Center.jpg', authorName: 'Wikimedia Commons (CC BY-SA 4.0), Jacobs Medical Center on the same campus', authorUrl: 'https://commons.wikimedia.org/wiki/File:Jacobs_Medical_Center.jpg' },
    ],
  };
};
// ---------- 20879 Thornton MRI Expansion ----------
P[20879] = async () => {
  const q = {
    start: await S('mriPdf', 'scheduled to begin Aug. 1, 2026, with completion in fall 2027'),
    add: await S('cur', 'addition of approximately 3,100 square feet to the existing radiology suite in Thornton Pavilion'),
    rooms: await S('cur', 'to accommodate two new magnetic resonance imaging (MRI) treatment rooms and related support space'),
    list: await S('cur', 'Anticipated Completion: Spring 2027'),
    ops: await S('mriPark', 'Valet drop-off/pickup delays: Expect delays due to separate, designated lanes for valet pickup and drop-off for patients during construction.'),
  };
  return {
    profile: profile('Hospital imaging', 'construction', [
      { key: 'floorArea', basis: 'planned', label: 'Addition and remodel', value: 'About 3,100 square feet added to the radiology suite plus about 700 square feet remodelled', source: ev(q.add) },
      { key: 'capacity', basis: 'planned', label: 'MRI rooms', value: 'Two new MRI treatment rooms and related support space', source: ev(q.rooms) },
      { key: 'timeline', basis: 'planned', label: 'Completion', value: 'Fall 2027 (health system alert); the campus project list says Spring 2027', source: ev(q.start) },
      { key: 'stage', basis: 'demonstrated', label: 'Stage', value: 'Construction impacts (valet lanes, delays) are posted on the health system parking page', source: ev(q.ops) },
    ], [
      { label: 'Construction scheduled to begin', date: '2026-08-01', basis: 'planned', source: ev(q.start) },
      { label: 'Campus project list: anticipated completion Spring 2027', date: '2027-03', basis: 'planned', source: ev(q.list) },
      { label: 'Health system alert: completion in fall 2027', date: '2027', basis: 'planned', source: ev(q.start) },
    ]),
    reviews: [], refs: [],
    media: [
      { type: 1, originalUrl: 'https://plandesignbuild.ucsd.edu/_images/projects/MRI-Expansion.png', authorName: 'UC San Diego Planning, Design & Construction (project rendering)', authorUrl: U.cur },
      { type: 1, originalUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/de/Jacobs_Medical_Center.jpg', authorName: 'Wikimedia Commons (CC BY-SA 4.0), Jacobs Medical Center, which includes Thornton Pavilion', authorUrl: 'https://commons.wikimedia.org/wiki/File:Jacobs_Medical_Center.jpg' },
    ],
  };
};
// ---------- 20880 Hillcrest utility undergrounding ----------
P[20880] = async () => {
  const q = {
    scope: await S('cur', 'would underground the existing overhead electrical and telecommunications facilities throughout the Hillcrest Campus gateway'),
    done: await S('cur', 'Anticipated Completion: Fall 2027'),
    trench: await S('ugNotice', 'trenching work starting the week of April 21'),
    closure: await S('ugNotice', 'Eastbound Arbor Drive (between Front St and First Ave) will be closed 24/7 for several months.'),
  };
  return {
    profile: profile('Utility infrastructure', 'construction', [
      { key: 'products', basis: 'planned', label: 'Scope', value: 'Overhead electrical and telecommunications lines moved underground along Arbor Drive and First Avenue', source: ev(q.scope) },
      { key: 'timeline', basis: 'planned', label: 'Completion', value: 'Fall 2027 anticipated', source: ev(q.done) },
      { key: 'stage', basis: 'planned', label: 'Stage', value: 'Trenching scheduled from the week of April 21, 2025; still on the campus current-projects list', source: ev(q.trench) },
    ], [
      { label: 'Trenching scheduled to start; eastbound Arbor Drive closed for several months', date: '2025-04-21', basis: 'planned', source: ev(q.closure) },
      { label: 'Anticipated completion', date: '2027', basis: 'planned', source: ev(q.done) },
    ]),
    reviews: [], refs: [],
    media: [
      { type: 1, originalUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/0d/UCSD_Medical_Center_Hillcrest.jpg', authorName: 'Coolcaesar (Wikimedia Commons, CC BY-SA 3.0)', authorUrl: 'https://commons.wikimedia.org/wiki/File:UCSD_Medical_Center_Hillcrest.jpg' },
      { type: 1, originalUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2c/UCSD_Medical_Center_Hillcrest_entrance.jpg', authorName: 'Coolcaesar (Wikimedia Commons, CC BY-SA 3.0)', authorUrl: 'https://commons.wikimedia.org/wiki/File:UCSD_Medical_Center_Hillcrest_entrance.jpg' },
    ],
  };
};

// ---------- apply ----------
for (const id of Object.keys(P).map(Number)) {
  if (only && !only.includes(id)) continue;
  const d = await P[id]();
  console.log(id, 'quotes verified:', d.profile.metrics.length, 'metrics,', d.profile.milestones.length, 'milestones,', d.reviews.length, 'reviews,', d.media.length, 'media');
  if (!apply) continue;
  const pin = await call('GET', `/api/pins/${id}`);
  if (pin.user.userName !== '@BuildDesk') throw Error('author mismatch ' + id);
  const have = new Set([pin.sourceUrl, ...pin.references.map((r) => r.url)]);
  for (const [url, title, publishedDate, reasoning] of d.refs) if (!have.has(url)) await call('POST', '/api/admin/db/PinReference', { pinId: id, url, title, publishedDate, reasoning, confidence: 85, addedByUserId: pin.user.id ?? pin.userId });
  const summary = d.summary ? d.summary(pin.longFormSummary) : pin.longFormSummary;
  const patch = { ...(d.patch ?? {}), ...(summary !== pin.longFormSummary ? { longFormSummary: summary } : {}) };
  if (Object.keys(patch).length) {
    const { rows: [row] } = await call('GET', `/api/admin/db/Pin?id=${id}`);
    const qs = new URLSearchParams({ id: String(id), userId: String(row.userId), title: row.title });
    qs.set(row.price === null ? 'price.null' : 'price', String(row.price));
    const { rows: done } = await call('PATCH', `/api/admin/db/Pin?${qs}`, patch);
    if (done.length !== 1) throw Error('concurrent edit ' + id);
  }
  await call('PUT', `/api/pins/${id}/factory`, d.profile);
  if (d.reviews.length) await call('PUT', `/api/pins/${id}/critic-reviews`, { reviews: d.reviews.map(({ url, title, publishedDate, quote, sentiment }) => ({ url, title, publishedDate, quote, sentiment })), source: 'session', basis: 'Editorial estimate of each quoted reaction’s tone toward the project; quotes are verbatim from the cited pages.', sourceUrl: pin.sourceUrl });
  // media: whole-pin round trip (GET, replace media, PUT)
  const fresh = await call('GET', `/api/pins/${id}`);
  fresh.media = d.media;
  await call('PUT', `/api/pins/${id}?lightweight=1`, fresh);
  const mid = await call('GET', `/api/pins/${id}`);
  let fixed = 0;
  for (const m of mid.media) {
    const a = d.media.find((x) => x.originalUrl === m.originalUrl);
    if (a && (m.authorName !== a.authorName || m.authorUrl !== a.authorUrl)) { await call('PATCH', `/api/admin/db/Medium?id=${m.id}`, { authorName: a.authorName, authorUrl: a.authorUrl }); fixed++; }
  }
  if (fixed) await call('PUT', `/api/pins/${id}?lightweight=1`, await call('GET', `/api/pins/${id}`));
  await call('POST', '/api/admin/pins/expire', { ids: [id] });
  const after = await call('GET', `/api/pins/${id}`);
  const f = await call('GET', `/api/pins/${id}/factory`);
  console.log(' applied', id, { price: after.price, end: after.utcEndDateTime, tags: after.tags.map((t) => t.name).join('|'), refs: after.references.length, media: after.media.map((m) => m.authorName ?? '-'), milestones: f.milestones?.length });
}
