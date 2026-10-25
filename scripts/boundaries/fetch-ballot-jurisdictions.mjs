// Download reviewed government geometry to ignored cache. No database writes.
import fs from 'node:fs';
const root = '.scrape/boundaries';
fs.mkdirSync(root, { recursive: true });
const census = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/';
const sources = [
  ['large-states2026.geojson', census + 'State_County/MapServer/0', "STATE IN ('06','36','29','32','51','16')", 'GEOID,NAME', 6, true],
  ['large-places2025.geojson', census + 'Places_CouSub_ConCity_SubMCD/MapServer/18', "GEOID IN ('2507000','3651000','0644000','0666000','0667000')", 'GEOID,NAME', 5, true],
  ['large-places2026.geojson', census + 'Places_CouSub_ConCity_SubMCD/MapServer/4', "GEOID IN ('3651000','0644000','0666000','0667000')", 'GEOID,NAME', 4, true],
  ['large-places2026-full.geojson', census + 'Places_CouSub_ConCity_SubMCD/MapServer/4', "GEOID IN ('0644000','0666000')", 'GEOID,NAME', 2, false],
  ['large-counties2026.geojson', census + 'State_County/MapServer/1', "GEOID IN ('06073','06001','06013','06075','06081','06085')", 'GEOID,NAME', 6, true],
  ['large-canada-cities.geojson', 'https://geo.statcan.gc.ca/geo_wa/rest/services/2021/Digital_boundary_files/MapServer/9', "CSDUID IN ('3520005','3506008','5915022')", 'CSDUID,CSDNAME', 3, true],
];
for (const [file, base, where, fields, count, overview] of sources) {
  const path = `${root}/${file}`;
  let data;
  if (fs.existsSync(path)) data = JSON.parse(fs.readFileSync(path, 'utf8'));
  else {
    const q = new URLSearchParams({ where, outFields: fields, outSR: '4326', f: 'geojson', ...(overview ? { maxAllowableOffset: '0.001' } : {}) });
    const response = await fetch(base + '/query?' + q, { signal: AbortSignal.timeout(45000) });
    if (!response.ok) throw new Error(`Source ${response.status}: ${file}`);
    data = await response.json();
  }
  if (data.features?.length !== count || data.exceededTransferLimit) throw new Error(`Incomplete source: ${file}`);
  fs.writeFileSync(path, JSON.stringify(data));
}
for (const [file, url] of [
  ['us-states-2024.zip', 'https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_us_state_500k.zip'],
  ['bih-round2.geojson', 'https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/90a1d52/releaseData/gbOpen/BIH/ADM1/geoBoundaries-BIH-ADM1.geojson'],
]) {
  if (fs.existsSync(`${root}/${file}`)) continue;
  const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`Source ${response.status}: ${file}`);
  fs.writeFileSync(`${root}/${file}`, Buffer.from(await response.arrayBuffer()));
}
console.log('Reviewed sources cached; run prepare-ballot-jurisdictions.py and prepare-bosnia-presidency.py.');
// Cache is a reviewed snapshot. Remove it explicitly before a fresh source review.
