// Cache reviewed Census jurisdiction queries; no database writes.
import fs from 'node:fs';
const root = '.scrape/boundaries';
fs.mkdirSync(root, { recursive: true });
const state = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer/';
const legislative = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/0';
const queries = [
  ['electoral-college-states2026.geojson', state + '0', "STATE NOT IN ('60','66','69','72','78')", 'GEOID,NAME,STATE', 51, true],
  ['electoral-college-states2026-full.geojson', state + '0', "STATE IN ('31','40','48','38','27')", 'GEOID,NAME,STATE', 5, false],
  ['electoral-college-districts2026-full.geojson', legislative, "STATE IN ('23','31')", 'GEOID,NAME,STATE,CDSESSN,CD120', 5, false],
  ['large4-bay-counties2026.geojson', state + '1', "GEOID IN ('06001','06013','06075','06081','06085')", 'GEOID,NAME', 5, true],
];
for (const [file, url, where, fields, count, generalised] of queries) {
  const query = new URLSearchParams({ where, outFields: fields, outSR: '4326', f: 'geojson' });
  if (generalised) query.set('maxAllowableOffset', '0.002');
  const response = await fetch(url + '/query?' + query, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw Error(`${file}: HTTP ${response.status}`);
  const data = await response.json();
  if (data.exceededTransferLimit || data.features?.length !== count || new Set(data.features.map(f => f.properties.GEOID)).size !== count) throw Error(`Incomplete source: ${file}`);
  fs.writeFileSync(`${root}/${file}`, JSON.stringify(data));
  console.log(`Cached ${file}: ${count} features`);
}
