// US dam construction pins (owner request 2026-11-09): 8 projects, each with a sourced PinDam row (height / storage / MW / owner / state).
// Every quote is re-checked against the raw page before anything is written; an unverifiable quote aborts that pin.
//   node scripts/construction/dams-2026-11-09.mjs [--base http://localhost:3000|https://www.chronopin.com] [--token .scrape/admin-local.token] [--apply] [--dam-only] [--only anderson,gross]
// Idempotent: a pin is found by its sourceUrl (listing /api/pins/search is not needed: the admin create answers a duplicate with an error and we then look the pin up by title).
// --dam-only skips pin creation and only writes PinDam rows to pins that already exist (use on production once migration 0254 is deployed).
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const args = process.argv.slice(2);
const arg = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const apply = args.includes('--apply');
const damOnly = args.includes('--dam-only');
const only = arg('--only', null)?.split(',');
const base = arg('--base', 'http://localhost:3000');
const token = fs.readFileSync(arg('--token', '.scrape/admin-local.token'), 'utf8').trim();
const call = async (method, path, body, soft) => {
  const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), redirect: 'error' });
  const t = await r.text();
  if (!r.ok) { if (soft) return { error: `${r.status} ${t.slice(0, 300)}` }; throw Error(`${method} ${path}: ${r.status} ${t.slice(0, 400)}`); }
  return t ? JSON.parse(t) : null;
};

const U = {
  andRel: 'https://www.valleywater.org/news-events/news-releases/ValleyWaterreachesmajormilestoneinrebuildingAndersonDam',
  andTun: 'https://www.valleywater.org/news-events/news-releases/Anderson-Dam-Tunnel-Project-on-track-for-completion-in-2026',
  grossMs: 'https://www.denverwater.org/tap/major-milestone-gross-dam-construction',
  grossAbout: 'https://www.denverwater.org/grossreservoir/about-the-project',
  grossQa: 'https://www.denverwater.org/tap/qa-gross-reservoir-expansion-project',
  grossCourt: 'https://www.kunc.org/news/2026-09-17/denver-water-can-finish-and-fill-gross-reservoir-us-appeals-court-rules',
  roughGb: 'https://www.dvidshub.net/news/printable/570430',
  roughAward: 'https://www.dvidshub.net/news/printable/554926',
  hanson: 'https://www.fdcorp.com/en/news/dams/2026/usace-contract-award-finalized-for-howard-a-hanson-dam-additional-water-storage-fish-passage',
  prado: 'https://www.californiaconstructionnews.com/?p=11990',
  sitesAbout: 'https://sitesproject.org/about-sites/',
  sitesGov: 'https://www.gov.ca.gov/2026/09/24/californias-largest-new-water-storage-project-takes-a-major-step-forward/',
  sitesFinal: 'https://www.gov.ca.gov/?p=115136',
  nidAnd: 'https://nid.sec.usace.army.mil/nid/#/dams/system/CA00294/summary',
  nidRough: 'https://nid.sec.usace.army.mil/nid/#/dams/system/KY03012/summary',
  nidHanson: 'https://nid.sec.usace.army.mil/nid/#/dams/system/WA00298/summary',
  andFacts: 'https://www.valleywater.org/sites/default/files/SHELL_Anderson%20Dam_102418.pdf',
  grossFacts: 'https://denverwater.org/node/35667',
  pradoOc: 'https://pwip.oc.gov/service-areas/oc-infrastructure-programs/santa-ana-river-project/prado-dam',
  sitesFacts: 'https://www.usbr.gov/mp/mpr-news/docs/factsheets/sites.pdf',
  gold: 'https://www.troutmanenergyreport.com/2026/02/ferc-approves-1200%E2%80%91mw-pumped-storage-project-on-former-smelter-site/',
};
const T = {
  andFacts: 'Valley Water: Anderson Dam Seismic Retrofit Project fact sheet (By the Numbers)', grossFacts: 'Denver Water: Gross Reservoir Expansion, dam dimensions', pradoOc: 'OC Public Works: Prado Dam (Santa Ana River Project)', sitesFacts: 'Bureau of Reclamation: Sites Reservoir Project fact sheet',
  andRel: 'Valley Water: Valley Water reaches major milestone in rebuilding Anderson Dam', andTun: 'Valley Water: Anderson Dam Tunnel Project on track for completion in 2026',
  grossMs: 'Denver Water: Major milestone for Gross Dam construction', grossAbout: 'Denver Water: Gross Reservoir Expansion Project, About the Project', grossQa: 'Denver Water: Q&A on the Gross Reservoir Expansion Project',
  grossCourt: 'KUNC: Denver Water can finish and fill Gross Reservoir, US appeals court rules',
  roughGb: 'USACE Louisville District: Groundbreaking ceremony for Rough River Dam Safety Modification project marks beginning of work on Phase 2', roughAward: 'USACE Louisville District: awards construction contract for Phase 2 of Rough River Dam Safety Modification project',
  hanson: 'FlatironDragados: USACE Contract Award Finalized for Howard A. Hanson Dam Additional Water Storage Fish Passage', prado: 'California Construction News: U.S. Army Corps of Engineers awards $1.13B contract for Prado Dam spillway project',
  sitesAbout: 'Sites Project Authority: About Sites Reservoir', sitesGov: 'Governor of California: California’s largest new water storage project takes a major step forward', sitesFinal: 'Governor of California: largest new reservoir in more than 50 years clears final permit',
  gold: 'Troutman Pepper Locke, Washington Energy Report: FERC Approves 1,200-MW Pumped Storage Project on Former Smelter Site',
};
const D = { andRel: '2026-07-28', andTun: '2026-04-27', grossMs: '2026-06-08', grossAbout: null, grossQa: null, grossCourt: '2026-09-17', roughGb: '2026-07-21', roughAward: '2025-12-19', hanson: '2026-03-26', prado: '2026-03-30', sitesAbout: null, sitesGov: '2026-09-24', sitesFinal: null, gold: '2026-02-12' };

const norm = (s) => s.replace(/&#8217;|&rsquo;|[’‘]/g, "'").replace(/&#8220;|&#8221;|&ldquo;|&rdquo;|[“”]/g, '"').replace(/&amp;/g, '&').replace(/&#8211;|&#8212;|[–—‑]/g, '-').replace(/&nbsp;|&#160;| /g, ' ').replace(/\s+/g, ' ').toLowerCase().trim();
const pages = {};
async function text(key) {
  if (pages[key]) return pages[key];
  const r = await fetch(U[key], { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36' } });
  if (!r.ok) throw Error(`fetch ${key}: ${r.status}`);
  if (U[key].toLowerCase().split('?')[0].endsWith('.pdf')) {
    fs.mkdirSync('.tmp/dams', { recursive: true });
    fs.writeFileSync(`.tmp/dams/${key}.pdf`, Buffer.from(await r.arrayBuffer()));
    return (pages[key] = norm(execFileSync('pdftotext', [`.tmp/dams/${key}.pdf`, '-'], { encoding: 'utf8' })));
  }
  return (pages[key] = norm((await r.text()).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ')));
}
const Q = async (key, quote) => {
  const t = await text(key);
  for (const p of quote.split('...').map((x) => norm(x).replace(/^[,. ]+|[,. ]+$/g, ''))) if (!t.includes(p)) throw Error(`Quote not found on ${key}: ${p.slice(0, 100)}`);
  return { key, quote };
};
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// Each bullet: [our wording, source key, verbatim quote]. Every claim in the summary is one of these.
const DAMS = [
  {
    id: 'anderson', author: '@BuildDesk', title: 'Anderson Dam Seismic Retrofit: Valley Water rebuilds Anderson Dam, about $2.8B',
    description: 'Valley Water awarded the $1.88 billion construction contract for the Anderson Dam Seismic Retrofit Project on July 24, 2026. Crews begin work at the dam in early 2027 and expect about seven years of construction. The total cost is about $2.8 billion.',
    start: '2027-01-01', end: null, conf: 'scheduled', reasoning: 'Valley Water says crews begin construction at the dam in early 2027; the exact day is not published, so the first of the month is used. No completion date is published (only "about seven years"), so none is set.',
    price: 2800000000, tags: ['Proposed', 'Dam', 'Water', 'Seismic Retrofit', 'Morgan Hill'], lat: 37.1699, lon: -121.6256, address: 'Anderson Dam, Morgan Hill, Santa Clara County, California',
    dam: { heightFt: 240, crestLengthFt: 1380, storageAcreFt: 89278, damType: 'embankment', scope: 'safety', owner: 'Valley Water (Santa Clara Valley Water District)', river: 'Coyote Creek', state: 'CA', basis: 'published', sourceUrl: U.nidAnd, note: 'Seismic retrofit: most of the dam and spillway rebuilt, new outlet pipes. Built in 1950. Height 240 ft (NID height; structural height 205 ft), crest 1,380 ft, rockfill/earth: National Inventory of Dams CA00294. Storage is Valley Water\'s 89,278 acre-ft (2018 fact sheet, repeated in its 2024 one-pager); NID and another Valley Water page say 89,073, a third says 90,373.' },
    figs: [['andFacts', '89,278 AF']],
    sections: [
      ['The project', [
        ['Valley Water\'s board awarded the construction contract for the Anderson Dam Seismic Retrofit Project on July 24, 2026.', 'andRel', 'Valley Water reached a major milestone on July 24, 2026, when its Board of Directors awarded the construction contract for the Anderson Dam Seismic Retrofit Project.'],
        ['Crews will rebuild most of the dam and spillway, install new outlet pipes and complete other safety upgrades.', 'andRel', 'They will rebuild most of the dam and spillway, install new outlet pipes, and complete other major safety upgrades.'],
        ['Anderson Reservoir was built in 1950 and is the largest of Valley Water\'s 10 reservoirs.', 'andRel', 'Built in 1950, Anderson Reservoir is the largest of Valley Water\'s 10 reservoirs.'],
      ]],
      ['Why it is being rebuilt', [
        ['In 2020 the Federal Energy Regulatory Commission directed Valley Water to reduce the reservoir to "dead pool" until the seismic upgrades are complete.', 'andTun', 'In 2020, the Federal Energy Regulatory Commission directed Valley Water to reduce Anderson Reservoir to “dead pool,” or as low as possible, until the dam’s seismic upgrades are complete.'],
      ]],
      ['Construction and timeline', [
        ['Crews begin construction at the dam in early 2027.', 'andRel', 'In early 2027, crews will begin construction at the dam.'],
        ['Construction is expected to take about seven years; no completion date is published.', 'andRel', 'Construction is expected to take about seven years.'],
        ['Most precursor projects are finished; the Anderson Dam Tunnel Project is the centerpiece and is covered on its own pin.', 'andRel', 'The centerpiece of that effort is the Anderson Dam Tunnel Project, now in its final stages and on track to be completed later this year.'],
      ]],
      ['Cost', [
        ['The board awarded a $1.88 billion construction contract to Flatiron Dragados Sukut ADSRP Joint Venture.', 'andRel', 'The board awarded the $1.88 billion construction contract to Flatiron Dragados Sukut ADSRP Joint Venture.'],
        ['Valley Water puts the total cost of the retrofit at about $2.8 billion, which is the price on this pin; the $1.88 billion is the contract only.', 'andRel', 'At a total cost of about $2.8 billion'],
      ]],
    ],
    refs: ['andRel', 'andTun'],
  },
  {
    id: 'andersonTunnel', parent: 'anderson', author: '@BuildDesk', title: 'Anderson Dam Tunnel Project: 13-foot outlet tunnel nears completion, Morgan Hill',
    description: 'Valley Water began the Anderson Dam Tunnel in 2021 and finished excavating the 1,700-foot tunnel in 2024. It replaces the dam\'s 4-foot outlet pipe with a 13-foot one and is on track for completion in 2026, ahead of the dam\'s seismic retrofit.',
    start: '2021-01-01', end: '2026-12-31', conf: 'confirmed', reasoning: 'Start is the year Valley Water states (2021, no month published) and the end is its "completion in 2026" target (no day published); bare years are read as the first and last day. Valley Water also says the tunnel will be functional this winter.',
    price: null, tags: ['In Progress', 'Under Construction', 'Dam', 'Water', 'Morgan Hill'], lat: 37.1699, lon: -121.6256, address: 'Anderson Dam, Morgan Hill, Santa Clara County, California',
    dam: { scope: 'outlet', owner: 'Valley Water (Santa Clara Valley Water District)', river: 'Coyote Creek', state: 'CA', basis: 'published', sourceUrl: U.andTun, note: 'Tunnel over 1,700 ft long with a 13-ft-diameter outlet pipe, replacing a 4-ft pipe. Part of the Anderson Dam seismic retrofit programme.' },
    sections: [
      ['The tunnel', [
        ['The new tunnel replaces the dam\'s existing 4-foot-diameter outlet pipe with a new 13-foot-diameter outlet.', 'andRel', 'The new tunnel replaces the dam\'s existing 4-foot-diameter outlet pipe with a new 13-foot-diameter outlet.'],
        ['The larger outlet lets Valley Water release larger flows into Coyote Creek during construction and manage reservoir levels in storms and emergencies.', 'andRel', 'This larger tunnel will allow Valley Water to release larger flows into Coyote Creek during construction and better manage reservoir levels during future storms and emergencies.'],
      ]],
      ['Construction and timeline', [
        ['Construction began in 2021 and excavation of the more than 1,700-foot tunnel finished in 2024.', 'andTun', 'Construction on the tunnel began in 2021, and crews completed excavation of the more than 1,700-foot-long tunnel in 2024.'],
        ['In April 2026 the project was in its final stages and remained on track for completion in 2026.', 'andTun', 'The project remains on track for completion in 2026.'],
        ['Valley Water says the tunnel will be functional this winter.', 'andRel', 'The new tunnel will be functional this winter'],
      ]],
      ['Cost', [
        ['Valley Water\'s pages give no separate cost for the tunnel, so no price is saved; the retrofit as a whole is about $2.8 billion.', 'andRel', 'At a total cost of about $2.8 billion'],
      ]],
    ],
    refs: ['andTun', 'andRel'],
  },
  {
    id: 'gross', author: '@BuildDesk', title: 'Gross Dam raise: Denver Water tops out the 471-foot Gross Reservoir expansion, Colorado',
    description: 'Denver Water\'s crews placed the last roller-compacted concrete on Gross Dam on June 3, 2026, raising it to 470 feet above the valley floor; a final foot of conventional concrete brings it to 471 feet. The 10th Circuit cleared the project to finish and fill the reservoir on September 15, 2026.',
    start: '2024-03-20', end: '2027-06-08', conf: 'estimated', reasoning: 'Denver Water says dam raising began "in the spring of 2024" (no day; the first day of spring is used) and, on June 8, 2026, that remaining work will take "another year" (so about June 2027). Both are approximations.',
    price: null, tags: ['In Progress', 'Under Construction', 'Dam', 'Water', 'Boulder County'], lat: 39.9533, lon: -105.3633, address: 'Gross Dam, Gross Reservoir, Boulder County, Colorado',
    dam: { heightFt: 471, crestLengthFt: 2040, damType: 'rcc', scope: 'raise', owner: 'Denver Water', state: 'CO', basis: 'published', sourceUrl: U.grossFacts, note: 'Reached 470 ft on 2026-06-03; 471 ft once a final foot of conventional concrete is added (the old dam was 340 ft high and 1,050 ft along the crest). Adds about 25 billion gallons of storage (acre-feet not stated on the pages read). Denver Water says it will be the tallest dam in Colorado.' },
    figs: [['grossFacts', 'The new dam will be 131 feet higher (a total of 471 feet high) and almost twice as long (2,040 feet) across the crest.'], ['grossFacts', 'The current dam is 340 feet high, 1,050 feet long across the crest']],
    sections: [
      ['The raise', [
        ['Workers placed the final layer of roller-compacted concrete at 3 a.m. on June 3, 2026, raising the dam to 470 feet above the valley floor.', 'grossMs', 'Workers placed the final layer of roller-compacted concrete at 3 a.m., raising the dam’s height to 470 feet above the valley floor.'],
        ['A final foot of conventional concrete will bring the dam to its completed height of 471 feet.', 'grossMs', 'Crews will add another foot of conventional concrete to the top of the dam over the next year, which will bring the dam to its final height of 471 feet.'],
        ['The raise took nearly 800,000 cubic yards of roller-compacted and conventional concrete.', 'grossMs', 'In all, it took nearly 800,000 cubic yards of both roller-compacted and conventional concrete to raise the dam.'],
        ['The expanded reservoir can hold an additional 25 billion gallons of water.', 'grossQa', 'The expanded reservoir is capable of holding an additional 25 billion gallons of water.'],
      ]],
      ['Construction and timeline', [
        ['Dam-raising construction began in the spring of 2024.', 'grossMs', 'Dam raising construction began in the spring of 2024.'],
        ['Remaining work on the dam is expected to take another year.', 'grossMs', 'Remaining work on the dam is expected to take another year'],
        ['The reservoir begins to fill to its new capacity in 2027.', 'grossAbout', 'When the reservoir begins to fill to its new, increased capacity in 2027'],
        ['On September 15, 2026 the 10th Circuit lifted a lower court\'s injunction, so Denver Water can finish the expansion and fill the reservoir.', 'grossCourt', 'Denver Water can finish its Gross Dam expansion and fill the controversial reservoir in western Boulder County, the 10th U.S. Circuit Court of Appeals ruled Tuesday'],
      ]],
      ['Cost', [
        ['The December 2021 construction contract was $531 million and has increased to just under $602 million through budget amendments in 2023 and 2026; that is a contract figure, not a total project cost, so no price is saved.', 'grossAbout', 'the original $531 million figure has increased to just under $602 million through budget amendments approved in 2023 and 2026'],
      ]],
    ],
    refs: ['grossMs', 'grossAbout', 'grossQa', 'grossCourt'],
  },
  {
    id: 'rough', author: '@BuildDesk', title: 'Rough River Dam Safety Modification Phase 2: new outlet works and cutoff wall, Kentucky',
    description: 'The Army Corps of Engineers Louisville District broke ground on Phase 2 of the Rough River Dam Safety Modification on July 21, 2026: a new outlet works and a full-depth cutoff wall. The Phase 2 contract is expected to total about $655 million, and the Corps estimates the whole project at up to $891 million.',
    start: '2026-07-21', end: null, conf: 'confirmed', reasoning: 'The Corps held the Phase 2 groundbreaking on July 21, 2026. It expects about six to eight years of work, so no completion date is set.',
    price: 655000000, tags: ['In Progress', 'Under Construction', 'Dam', 'Dam Safety', 'Kentucky'], lat: 37.6, lon: -86.49, address: 'Rough River Dam, Falls of Rough, Breckinridge County, Kentucky',
    dam: { heightFt: 132, crestLengthFt: 1590, storageAcreFt: 334400, damType: 'earthfill', scope: 'safety', owner: 'U.S. Army Corps of Engineers, Louisville District', river: 'Rough River', state: 'KY', basis: 'published', sourceUrl: U.nidRough, note: 'Existing dam per the National Inventory of Dams KY03012: 132 ft high, 1,590 ft long, earth, completed 1959, 334,400 acre-ft maximum storage. Phase 2 adds a cutoff wall 75 to 180 ft deep and new outlet works. Price is the expected total Phase 2 contract value (base about $320M plus options).' },
    sections: [
      ['The project', [
        ['Phase 2 of the Rough River Dam Safety Modification project will repair the high-risk dam; the Corps puts the whole project at up to $891 million.', 'roughGb', 'a critical mega-project with an estimated total project cost of up to $891 million that will repair the high-risk dam and provide permanent flood risk reduction for downstream communities'],
        ['Phase 2 builds a new outlet works and a full-depth cutoff wall across the dam.', 'roughGb', 'will include construction of a new outlet works and a full-depth cutoff wall across the dam'],
        ['The cutoff wall will run across the crest at depths from 75 to 180 feet.', 'roughGb', 'the cutoff wall will be constructed across the crest of the dam varying in depth from 75 to 180 feet'],
        ['The project stems from a dam safety evaluation that found unacceptable risk in the dam\'s foundation.', 'roughGb', 'The project stems from a dam safety evaluation that identified unacceptable risk associated with the foundation of the dam.'],
      ]],
      ['Construction and timeline', [
        ['The Corps and officials broke ground on Phase 2 on July 21, 2026.', 'roughGb', 'joined local, state and federal officials July 21 to break ground on Phase 2 of the Rough River Dam Safety Modification project'],
        ['The work is anticipated to take approximately six to eight years.', 'roughGb', 'The work is anticipated to take approximately six to eight years to complete.'],
        ['Initial risk reduction measures were completed in 2017 during Phase 1, but monitoring shows foundation deterioration continues.', 'roughGb', 'initial risk reduction measures were completed in 2017 during Phase 1 of the project, ongoing monitoring has shown that foundation deterioration continues'],
      ]],
      ['Cost', [
        ['The Phase 2 base contract of $320 million went to Thalle-Bauer LLC on December 18, 2025; the total contract value is expected to be around $655 million at completion, the price on this pin.', 'roughAward', 'This is a base and option contract with the total contract value expected to be around $655M at contract completion.'],
      ]],
    ],
    refs: ['roughGb', 'roughAward'],
  },
  {
    id: 'hanson', author: '@BuildDesk', title: 'Howard A. Hanson Dam Additional Water Storage: $691M fish passage facility, Washington',
    description: 'FlatironDragados and Aecon finalized a $691 million contract with the Army Corps of Engineers Seattle District on March 26, 2026 for the fish passage facility at Howard A. Hanson Dam on the Green River. Construction was expected to begin in the second quarter of 2026.',
    start: '2026-03-26', end: null, conf: 'confirmed', reasoning: 'Dated to the contract finalization the source reports. The release says construction was expected to begin in the second quarter of 2026; no groundbreaking was found, so the pin carries no status tag and no completion date.',
    price: 691000000, tags: ['Dam', 'Water', 'Fish Passage', 'Washington'], lat: 47.28, lon: -121.79, address: 'Howard A. Hanson Dam, Green River, King County, Washington',
    dam: { heightFt: 235, crestLengthFt: 500, storageAcreFt: 136700, damType: 'embankment', scope: 'outlet', owner: 'U.S. Army Corps of Engineers, Seattle District', river: 'Green River', state: 'WA', basis: 'published', sourceUrl: U.nidHanson, note: 'Existing dam per the National Inventory of Dams WA00298: 235 ft high, 500 ft long, rockfill/earth, completed 1962, 136,700 acre-ft maximum storage (other sources give about 106,000 acre-ft total capacity). Fish passage facility with fixed multiport collector, steep slope bypass, deceleration tunnel and outfall stilling basin; part of the Additional Water Storage Project.' },
    sections: [
      ['The project', [
        ['The Additional Water Storage Fish Passage Facility is at Howard A. Hanson Dam in Ravensdale, Washington, about 35 miles southeast of downtown Seattle.', 'hanson', 'to deliver the Howard A. Hanson Dam Additional Water Storage Fish Passage Facility in Ravensdale, Washington'],
        ['The facility includes a fixed multiport collector, steep slope bypass, deceleration tunnel and outfall stilling basin structures.', 'hanson', 'The facility will include a fixed multiport collector, steep slope bypass, deceleration tunnel and outfall stilling basin structures.'],
        ['The Corps says the project gives salmon access to nearly half of the Green River habitat above the dam.', 'hanson', 'providing salmon access to nearly half of the Green River habitat above the dam'],
      ]],
      ['Construction and timeline', [
        ['Construction was expected to begin in the second quarter of 2026; no later source was read confirming the start.', 'hanson', 'Construction is expected to begin in the second quarter of 2026.'],
      ]],
      ['Cost', [
        ['FlatironDragados and Aecon finalized a $691 million contract with the Corps\' Seattle District.', 'hanson', 'FlatironDragados and joint venture partner Aecon have finalized a $691 million contract with the U.S. Army Corps of Engineers, Seattle District'],
      ]],
    ],
    refs: ['hanson'],
  },
  {
    id: 'prado', author: '@BuildDesk', title: 'Prado Dam Spillway Modification: $1.13B Barnard contract, Santa Ana River, California',
    description: 'The Army Corps of Engineers awarded Barnard Construction a $1.13 billion contract for the Prado Dam Spillway Modification Project: a labyrinth-style spillway control structure, rebuilt chute walls and slabs, and a 20-foot higher spillway crest. Significant construction is expected to begin in spring 2027 and continue through 2033.',
    start: '2027-03-20', end: '2033-12-31', conf: 'scheduled', reasoning: 'The source says significant construction begins in spring 2027 (no day; the first day of spring is used) and continues through 2033 (year only; the last day is used).',
    price: 1130000000, tags: ['Proposed', 'Dam', 'Dam Safety', 'Flood Control', 'Corona'], lat: 33.8929, lon: -117.646, address: 'Prado Dam, Santa Ana River, Corona, California',
    dam: { storageAcreFt: 362000, damType: 'embankment', scope: 'safety', owner: 'U.S. Army Corps of Engineers, Los Angeles District', river: 'Santa Ana River', state: 'CA', basis: 'published', sourceUrl: U.pradoOc, note: 'Storage is the impoundment after the Santa Ana River Project raised the embankment 28.4 ft to elevation 594.4 ft (was 217,000 acre-ft). Phase 2 of this contract raises the spillway crest 20 ft. Dam completed 1941. The NID record (CA10022: 106 ft, 2,280 ft, 295,581 acre-ft) is for the dam before the raise, so no height or crest length is saved here.' },
    figs: [['pradoOc', 'Increasing impoundment from 217,000 acre-feet to 362,000 acre-feet.'], ['pradoOc', 'Raising the existing embankment 28.4 feet to an elevation of 594.4 feet']],
    sections: [
      ['The project', [
        ['Prado Dam, completed in 1941, is a flood-risk management facility on the Santa Ana River protecting about 1.4 million people.', 'prado', 'protecting about 1.4 million people and more than $200 billion in property and infrastructure between the dam and the Pacific Ocean'],
        ['Phase one builds a labyrinth-style spillway control structure and rebuilds all spillway chute walls and slabs.', 'prado', 'the construction of a labyrinth-style spillway control structure, demolition and reconstruction of all spillway chute walls and slabs'],
        ['Phase two raises the spillway crest by 20 feet to match a 2005 main dam embankment raise.', 'prado', 'The second phase raises the spillway’s crest by 20 feet to match the elevation of a 2005 main dam embankment raise.'],
      ]],
      ['Construction and timeline', [
        ['Significant construction is expected to begin in spring 2027 and continue through 2033.', 'prado', 'Significant construction is expected to begin in spring 2027 and continue through 2033.'],
        ['The dam stays fully operational during construction.', 'prado', 'The dam will remain fully operational and continue reducing flood risk during construction.'],
      ]],
      ['Cost', [
        ['The Corps awarded a $1.13 billion contract to Barnard Construction Co. Inc. of Bozeman, Montana.', 'prado', 'has awarded a $1.13 billion contract to Barnard Construction Co. Inc.'],
      ]],
    ],
    refs: ['prado'],
  },
  {
    id: 'sites', author: '@BuildDesk', title: 'Sites Reservoir: California\'s largest new reservoir, 1.5 million acre-feet, gets final water right',
    description: 'The State Water Resources Control Board approved the final water right permit for Sites Reservoir, a proposed 1.5 million acre-foot offstream reservoir in Glenn and Colusa counties. The Sites Project Authority schedules construction to begin in 2026 and the reservoir to be operational at the end of 2033.',
    start: '2026-12-31', end: '2033-12-31', conf: 'scheduled', reasoning: 'The Authority says construction is scheduled to begin in 2026 and the reservoir to be operational at the end of 2033; both are years, so the last day of each is used. The water right was approved November 4, 2026 (announced by the Governor).',
    price: null, tags: ['Proposed', 'Dam', 'Reservoir', 'Water', 'Colusa County'], lat: 39.4, lon: -122.33, address: 'Sites Reservoir, Glenn and Colusa Counties, California',
    dam: { heightFt: 310, storageAcreFt: 1500000, scope: 'new', owner: 'Sites Project Authority', state: 'CA', basis: 'planned', sourceUrl: U.sitesFacts, note: 'Height is Golden Gate Dam, approximately 310 ft tall per Reclamation. Offstream reservoir (about 14,000 acres at full capacity) fed from the Sacramento River; up to 372,020 acre-ft of storage space is for environmental uses.' },
    figs: [['sitesFacts', 'Golden Gate Dam, which will be approximately 310 feet tall']],
    sections: [
      ['The project', [
        ['Sites Reservoir is a proposed 1.5 million acre-foot offstream reservoir.', 'sitesAbout', 'Sites Reservoir is a proposed 1.5 million acre foot offstream reservoir.'],
        ['It sits in Glenn and Colusa counties and captures Sacramento River water during eligible high-flow periods.', 'sitesFinal', 'Located in Glenn and Colusa counties, Sites Reservoir is designed to capture water from the Sacramento River during eligible high-flow periods'],
        ['Up to 372,020 acre-feet of storage space is for environmental uses.', 'sitesAbout', 'Provide up to 372,020 acre-feet of storage space for environmental uses'],
      ]],
      ['Approvals, construction and timeline', [
        ['The State Water Board approved the project\'s final water right permit.', 'sitesFinal', 'the State Water Resources Control Board approved the project’s final water right permit'],
        ['Construction is scheduled to begin in 2026 and the reservoir to be operational at the end of 2033.', 'sitesAbout', 'Construction is scheduled to begin in 2026. Sites Reservoir is anticipated to be operational at the end of 2033.'],
      ]],
      ['Funding', [
        ['With added state funding the project is eligible for a total of $1.363 billion in Water Storage Investment Program funding; this is public funding eligibility, not the construction cost, so no price is saved.', 'sitesGov', '$1.363 billion in Water Storage Investment Program (WSIP) funding'],
      ]],
    ],
    refs: ['sitesAbout', 'sitesFinal', 'sitesGov'],
  },
  {
    id: 'goldendale', author: '@EnergyDesk', title: 'Goldendale Energy Storage Project: 1,200 MW pumped storage licensed by FERC, Washington',
    description: 'On January 22, 2026 FERC issued a 40-year license to FFP Project 101, LLC to build and operate the 1,200 MW Goldendale pumped storage project in Klickitat County, Washington, near John Day Dam. Tribes and conservation groups opposed it during licensing.',
    start: '2026-01-22', end: null, conf: 'confirmed', reasoning: 'Dated to the FERC license order. No construction start or completion date was read on an opened page, so the pin carries no status tag.',
    price: null, tags: ['Dam', 'Pumped Storage', 'Hydropower', 'Washington'], lat: 45.72, lon: -120.7, address: 'Goldendale Energy Storage Project, near John Day Dam, Klickitat County, Washington',
    dam: { capacityMw: 1200, scope: 'storage', owner: 'FFP Project 101, LLC', state: 'WA', basis: 'published', sourceUrl: U.gold, note: 'Closed-loop pumped storage between an upper reservoir in the Columbia Hills and a lower reservoir on the former Columbia Gorge Aluminum smelter site.' },
    sections: [
      ['The project', [
        ['FERC issued a 40-year original license to FFP Project 101, LLC for a 1,200-megawatt pumped storage facility.', 'gold', 'issued a 40-year original license to FFP Project 101, LLC (FFP) to construct and operate a 1,200-megawatt pumped storage hydropower facility'],
        ['It moves water between an upper reservoir in the Columbia Hills area and a lower reservoir on and next to the former Columbia Gorge Aluminum smelter site.', 'gold', 'move water between an upper reservoir in the Columbia Hills area and a lower reservoir on and adjacent to the former Columbia Gorge Aluminum smelter site'],
        ['It is a closed-loop system supplied by water purchased from Klickitat County PUD No. 1.', 'gold', 'Designed as a closed-loop system supplied by water purchased from Klickitat County Public Utility District No. 1'],
      ]],
      ['Approvals and opposition', [
        ['Licensing drew extensive comment and opposition from tribes, environmental groups and local stakeholders.', 'gold', 'The licensing process drew extensive comment and opposition from tribes, environmental non-governmental organizations (NGOs), and local stakeholders.'],
      ]],
      ['Timeline and cost', [
        ['No construction start, completion date or construction cost was read on a page opened for this pin, so none is set.', 'gold', 'issued a 40-year original license to FFP Project 101, LLC (FFP) to construct and operate a 1,200-megawatt pumped storage hydropower facility'],
      ]],
    ],
    refs: ['gold'],
  },
];

const summaryHtml = (d, quotes) => d.sections.map(([h, bullets]) => `<h3>${esc(h)}</h3><ul>${bullets.map(([txt, key], i) => `<li>${esc(txt)}<cite data-ref="${U[key]}"></cite></li>`).join('')}</ul>`).join('');
const log = (...a) => console.log(...a);

const ids = {};
for (const d of DAMS) {
  if (only && !only.includes(d.id)) continue;
  // 1. verify every quote
  const checked = [];
  for (const [, bullets] of d.sections) for (const [, key, quote] of bullets) checked.push(await Q(key, quote));
  const references = d.refs.map((k) => ({ url: U[k], title: T[k], confidence: 90, publishedDate: D[k], reasoning: checked.find((c) => c.key === k)?.quote?.slice(0, 280) ?? null })).map((r) => (r.publishedDate ? r : (({ publishedDate, ...x }) => x)(r)));
  for (const [key, quote] of d.figs ?? []) checked.push(await Q(key, quote));
  log(`ok  ${d.id}: ${checked.length} quotes verified`);
  if (!apply) continue;
  let pinId = null;
  const body = {
    title: d.title, description: d.description, sourceUrl: U[d.refs[0]], utcStartDateTime: d.start, utcEndDateTime: d.end ?? undefined, allDay: true,
    dateConfidence: d.conf, dateConfidenceReasoning: d.reasoning, address: d.address, latitude: d.lat, longitude: d.lon,
    ...(d.price ? { price: d.price, priceCurrency: 'USD' } : {}), categories: ['Infrastructure'], tags: d.tags, references, longFormSummary: summaryHtml(d), userName: d.author,
    ...(d.parent && ids[d.parent] ? { parentId: ids[d.parent] } : {}),
  };
  if (!damOnly) {
    const res = await call('POST', '/api/admin/pins', { pins: [body] });
    const r = res.results[0];
    if (r.error) { log(`    create ${d.id}: ${r.error}`); } else { pinId = r.id; log(`    created ${d.id} -> pin ${pinId}`); }
  }
  if (!pinId) {
    // existing pin (re-run or --dam-only): look it up by exact title
    const found = await call('GET', `/api/pins/search?q=${encodeURIComponent(d.title)}`, undefined, true);
    const list = Array.isArray(found) ? found : found?.pins ?? [];
    pinId = list.find((p) => p.title === d.title)?.id ?? null;
    if (pinId) log(`    found ${d.id} -> pin ${pinId}`);
  }
  if (!pinId) { log(`    SKIP ${d.id}: no pin id`); continue; }
  ids[d.id] = pinId;
  const put = await call('PUT', `/api/pins/${pinId}/dam`, d.dam, true);
  log(put?.error ? `    dam ${d.id}: ${put.error}` : `    dam row saved for ${pinId}`);
  await call('POST', '/api/admin/pins/expire', { ids: [pinId] }, true);
}
log(apply ? 'applied' : 'dry run (no writes); add --apply');
if (apply) fs.writeFileSync(`.tmp/dams-2026-11-09-${new URL(base).hostname}.json`, JSON.stringify(ids, null, 2));
