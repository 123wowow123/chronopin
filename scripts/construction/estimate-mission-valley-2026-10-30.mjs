// Adds a sourced cost estimate with its working to Millennium Mission Valley (pin 20653).
// node scripts/construction/estimate-mission-valley-2026-10-30.mjs [--base https://www.chronopin.com] [--apply]
import fs from 'node:fs';
const args = process.argv.slice(2);
const base = (args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://127.0.0.1:3000').replace(/\/$/, '');
if (!['http://127.0.0.1:3000', 'https://www.chronopin.com'].includes(base)) throw Error('Known hosts only.');
const apply = args.includes('--apply');
const token = fs.readFileSync(base.startsWith('https') ? '.scrape/admin.token' : '.scrape/admin-local.token', 'utf8').trim();
const ID = 20653;
const call = async (method, path, body) => {
  const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), redirect: 'error' });
  const t = await r.text();
  if (!r.ok) throw Error(`${method} ${path}: ${r.status} ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : null;
};

const BISNOW = 'https://www.bisnow.com/news/san-diego/multifamily/the-ups-and-downs-of-developing-multifamily-projects-in-san-dieg-66747';
const RENTV = 'https://www.rentv.com/content/southerncalifornia/sandiego/news/20531';
const SDMAG = 'https://sandiegomagazine.com/neighborhoods/more-large-scale-housing-in-mission-valley-gaslamp-gets-new-rooftop-bar/article_15e5a608-b46e-5084-8628-719c962725d6.html';
const BERK = 'https://www.berkadia.com/news/metro-mission-valley-san-diego-ca-sold-by-berkadia-2026/';
const bisnow = { url: BISNOW, title: 'The Ups And Downs Of Developing Multifamily Projects In San Diego (Bisnow)', publishedDate: '2016-10-25', quote: 'He said construction of multifamily in LA is $ 240/SF and $230/SF in San Diego.' };
const bisnow2 = { ...bisnow, quote: 'which was contracted for $283/SF.' };
const rentv = { url: RENTV, title: 'The Dinerstein Companies Looking to Move Forward with 300-Unit Res Community in San Diego\'s Mission Valley (REntv)', publishedDate: null, quote: 'Millennium Mission Valley is a high-density project comprised of 291 contemporary apartment homes, 14 shopkeeper live-work units and over 9k sf of retail space.' };
const sdmag = { url: SDMAG, title: 'Five-acre apartment, retail complex coming to Mission Valley (San Diego Magazine)', publishedDate: '2015-10-31', quote: 'recently broke ground and will bring roughly 300 new apartments, 9,000 square feet of retail space, and a public plaza' };
const berk = { url: BERK, title: 'Metro Mission Valley sold by Berkadia (2026)', publishedDate: null, quote: 'the property has a mix of studio, one-, and two-bedroom units' };

const units = 305, retail = 9000, sizeLo = 700, sizeHi = 850, rateLo = 230, rateHi = 283;
const areaLo = units * sizeLo + retail, areaHi = units * sizeHi + retail;
const costLo = areaLo * rateLo, costHi = areaHi * rateHi;
const mid = Math.round((costLo + costHi) / 2 / 100000) * 100000;
const fmt = (n) => n.toLocaleString('en-US');
const M = (n) => `$${(n / 1e6).toFixed(1)} million`;
if (mid !== 63500000) throw Error(`unexpected midpoint ${mid}`);

const breakdown = [
  { kind: 'sourced', label: 'Residential units', value: '305', note: '291 apartment homes plus 14 shopkeeper live-work units.', source: rentv },
  { kind: 'assumption', label: 'Average unit size', value: `${sizeLo}–${sizeHi} sq ft`, note: 'The building\'s floor area is not published, only that it mixes studio, one- and two-bedroom units. This range is a judgment for that mix (mostly one-bedrooms), not a measured figure; it is the largest source of uncertainty.', source: berk },
  { kind: 'sourced', label: 'Retail space', value: '9,000 sq ft', note: 'Added to the residential area.', source: sdmag },
  { kind: 'result', label: 'Estimated building area', value: `${fmt(areaLo)}–${fmt(areaHi)} sq ft`, note: `Low: 305 × ${sizeLo} + 9,000 = ${fmt(areaLo)}. High: 305 × ${sizeHi} + 9,000 = ${fmt(areaHi)}.` },
  { kind: 'sourced', label: 'Low cost benchmark', value: `$${rateLo} per sq ft`, note: 'San Diego multifamily construction as quoted in October 2016, as the project was starting.', source: bisnow },
  { kind: 'sourced', label: 'High cost benchmark', value: `$${rateHi} per sq ft`, note: 'A wood-over-concrete podium building at 11th Avenue and F Street, Downtown San Diego, contracted at this rate.', source: bisnow2 },
  { kind: 'result', label: 'Cost range', value: `${M(costLo)} – ${M(costHi)}`, note: `Low: ${fmt(areaLo)} × $${rateLo} = $${fmt(costLo)}. High: ${fmt(areaHi)} × $${rateHi} = $${fmt(costHi)}.` },
  { kind: 'result', label: 'Figure used for the price', value: M(mid), note: `Midpoint of the range ($${fmt((costLo + costHi) / 2)}) rounded to the nearest $0.1 million. About $${fmt(Math.round(mid / units / 1000) * 1000)} per unit.` },
  { kind: 'assumption', label: 'Not included', value: 'Land, soft costs, financing', note: 'Land, design and permit fees, financing and developer profit are excluded, so this is a building cost, not a project budget or value. The 2016 benchmarks are not adjusted for cost changes, and it is unclear whether they are per gross or per rentable square foot. No construction budget was ever published for this project.' },
];
const metric = {
  key: 'investment', basis: 'planned', label: 'Estimated construction cost',
  value: `About ${M(mid)} (range ${M(costLo)}–${M(costHi)}): about ${fmt(areaLo)}–${fmt(areaHi)} sq ft at $${rateLo}–$${rateHi} per sq ft. An estimate, not a published budget; excludes land, soft costs and financing.`,
  source: bisnow, breakdown,
};

const li = (text, ...cites) => `<li>${text}${cites.map((c) => `<cite data-ref="${c}"></cite>`).join('')}</li>`;
const costHtml = `<h3>Estimated cost</h3><p>No construction budget was ever published, so the price on this pin is an estimate built from published benchmarks, not a reported figure. The working:</p><ul>`
  + li('Quantity: 305 residential units (291 apartments plus 14 live-work units) and about 9,000 sq ft of retail.', RENTV, SDMAG)
  + li(`Building area is not published. Assuming an average of ${sizeLo}–${sizeHi} sq ft per unit for the studio, one- and two-bedroom mix gives about ${fmt(areaLo)}–${fmt(areaHi)} sq ft including retail. This is a judgment and the largest source of uncertainty.`, BERK)
  + li(`Benchmark, low: Richman Group's Luke Daniels put San Diego multifamily construction at $${rateLo}/SF in October 2016.`, BISNOW)
  + li(`Benchmark, high: he said a podium building Downtown was contracted for $${rateHi}/SF.`, BISNOW)
  + li(`Range: ${fmt(areaLo)} × $${rateLo} = ${M(costLo)} to ${fmt(areaHi)} × $${rateHi} = ${M(costHi)}. The midpoint, about ${M(mid)}, is used as the price.`)
  + li('Excluded: land, design and permit fees, financing and developer profit. The benchmarks are 2016 figures with no cost-change adjustment. The reported $140 million sale price includes land and profit and is not a construction cost.', 'https://www.dinersteincos.com/press/dinerstein-cos-local-projects')
  + '</ul>';

const pin = await call('GET', `/api/pins/${ID}`);
if (!pin.title.startsWith('Millennium Mission Valley')) throw Error('identity mismatch');
const oldCost = /<h3>Cost<\/h3>.*?<cite data-ref="https:\/\/www\.dinersteincos\.com\/press\/dinerstein-cos-local-projects"><\/cite>/s;
if (!oldCost.test(pin.longFormSummary)) throw Error('old Cost section not found');
const longFormSummary = pin.longFormSummary.replace(oldCost, () => costHtml);

const factory = await call('GET', `/api/pins/${ID}/factory`);
delete factory.checkedAt;
factory.metrics = [...factory.metrics.filter((m) => m.key !== 'investment'), metric];
console.log(base, 'metrics', factory.metrics.length, 'price', mid);
if (!apply) process.exit(0);

const { rows: refs } = await call('GET', `/api/admin/db/PinReference?pinId=${ID}&limit=1000`);
if (!refs.some((r) => r.url === BISNOW)) {
  await call('POST', '/api/admin/db/PinReference', { pinId: ID, url: BISNOW, title: bisnow.title, publishedDate: '2016-10-25', confidence: 80,
    reasoning: `Cost benchmark for the estimate: “${bisnow.quote}” and a downtown podium building “${bisnow2.quote}”`, addedByUserId: pin.userId });
}
const { rows: [row] } = await call('GET', `/api/admin/db/Pin?id=${ID}`);
const q = new URLSearchParams({ id: String(ID), userId: String(pin.userId), title: row.title });
q.set(row.price === null ? 'price.null' : 'price', String(row.price));
const { rows: done } = await call('PATCH', `/api/admin/db/Pin?${q}`, { price: mid, priceCurrency: 'USD', longFormSummary });
if (done.length !== 1) throw Error('concurrent edit');
await call('PUT', `/api/pins/${ID}/factory`, factory);
const after = await call('GET', `/api/pins/${ID}`);
const f2 = await call('GET', `/api/pins/${ID}/factory`);
console.log('saved price', after.price, after.priceCurrency, 'breakdown lines', f2.metrics.find((m) => m.key === 'investment')?.breakdown?.length, 'author', after.user.userName);
