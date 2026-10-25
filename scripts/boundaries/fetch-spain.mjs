// Cache reviewed IGN geometry and INE codes. No database writes.
// node scripts/boundaries/fetch-spain.mjs, then prepare-spain.py.
import fs from 'node:fs';
const root = '.scrape/boundaries';
fs.mkdirSync(root, { recursive: true });
async function get(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`Source HTTP ${response.status}: ${url}`);
  return response;
}
const endpoint = 'https://api-features.ign.es/collections/administrativeunit/items?';
const index = await (await get(endpoint + new URLSearchParams({ f: 'json', limit: '10000', nationallevelname: 'Municipio', skipGeometry: 'true' }))).json();
if (index.numberMatched !== 8213 || index.features?.length !== 8213) throw new Error('IGN inventory changed: review before preparing');
fs.writeFileSync(`${root}/spain-ign-municipality-index.json`, JSON.stringify(index));
const codes = Buffer.from(await (await get('https://www.ine.es/daco/daco42/codmun/26codmun.xlsx')).arrayBuffer());
if (codes.subarray(0, 2).toString() !== 'PK') throw new Error('INE did not supply an XLSX file');
fs.writeFileSync(`${root}/spain-2026-ine.xlsx`, codes);
let offset = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (offset < index.numberMatched) {
    const start = offset;
    offset += 100;
    const path = `${root}/spain-ign-round2-${start}.geojson`;
    // Retain the reviewed ignored cache; remove it explicitly for fresh research.
    const page = fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, 'utf8')) : await (await get(endpoint + new URLSearchParams({ f: 'json', limit: '100', offset: String(start), nationallevelname: 'Municipio' }))).json();
    if (page.numberMatched !== 8213 || page.features?.length !== Math.min(100, 8213 - start)) throw new Error(`Incomplete IGN page at ${start}`);
    fs.writeFileSync(path, JSON.stringify(page));
  }
}));
console.log('Cached 8,213 IGN source areas and the INE 2026 code workbook; prepare-spain.py checks exact municipality membership.');
