// Download the reviewed source catalog to ignored cache; makes no database writes.
// node scripts/boundaries/fetch-us-redraws.mjs
// Then run prepare-us-redraws.py (pyshp, pyproj, shapely in a temporary venv).
import fs from 'node:fs';
const root = '.scrape/boundaries';
fs.mkdirSync(root, { recursive: true });
const catalog = JSON.parse(fs.readFileSync('scripts/boundaries/us-redraw-sources-2026-10-25.json', 'utf8'));
async function download(url, filename) {
  if (new URL(url).protocol !== 'https:') throw new Error('HTTPS source required');
  const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`Download ${response.status}: ${url}`);
  fs.writeFileSync(`${root}/${filename}`, Buffer.from(await response.arrayBuffer()));
}
await Promise.all([
  ['us119-redraw.geojson', catalog.beforeSourceUrl, 'CD119'],
  ['us120-redraw.geojson', catalog.afterCensusSourceUrl, 'CD120'],
].map(async ([filename, base, code]) => {
  const url = `${base}/query?${new URLSearchParams({
    where: `STATE NOT IN ('60','66','69','72','78','11') AND ${code}<>'ZZ'`,
    outFields: `GEOID,NAME,STATE,CDSESSN,${code}`, outSR: '4326', maxAllowableOffset: '0.002', f: 'geojson',
  })}`;
  await download(url, filename);
  const json = JSON.parse(fs.readFileSync(`${root}/${filename}`, 'utf8'));
  if (json.exceededTransferLimit || json.features?.length !== 435 || new Set(json.features.map((f) => f.properties.GEOID)).size !== 435) throw new Error(`Incomplete district snapshot: ${filename}`);
}));
await Promise.all(catalog.states.filter((state) => state.downloadUrl).map(async (state) => {
  await download(state.downloadUrl, `${state.id}-official.zip`);
}));
console.log('Downloaded two 435-district snapshots and four official state archives. Recheck plan status before applying.');
