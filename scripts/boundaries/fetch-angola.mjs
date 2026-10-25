// Cache primary-source current geometry and the reviewed historical reference.
// No database writes. The 2021 reference is never used as the default 2027 map.
import fs from 'node:fs';
const root = '.scrape/boundaries';
fs.mkdirSync(root, { recursive: true });
const current = 'https://services.arcgis.com/iQ1dY19aHwbSDYIF/ArcGIS/rest/services/WB_GAD/FeatureServer/17';
const sources = [
  ['angola-wb-large5.geojson', current + '/query?' + new URLSearchParams({ where: "ISO_A3='AGO'", outFields: '*', outSR: '4326', f: 'geojson' }), 21, 'ADM1CD_t'],
  ['angola-2021-provinces.geojson', 'https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/AGO/ADM1/geoBoundaries-AGO-ADM1.geojson', 18, 'shapeID'],
];
for (const [file, url, count, field] of sources) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw Error(`${file}: HTTP ${response.status}`);
  const data = await response.json();
  if (data.exceededTransferLimit || data.features?.length !== count || new Set(data.features.map(f => f.properties[field])).size !== count) throw Error(`Incomplete source: ${file}`);
  fs.writeFileSync(`${root}/${file}`, JSON.stringify(data));
  console.log(`Cached ${count} provinces: ${file}`);
}
for (const [file, url] of [
  ['wb-large5-layer-17.json', current + '?f=pjson'],
  ['angola-geoboundaries-2021-metadata.json', 'https://www.geoboundaries.org/api/current/gbOpen/AGO/ADM1/'],
]) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw Error(`Metadata HTTP ${response.status}`);
  fs.writeFileSync(`${root}/${file}`, JSON.stringify(await response.json()));
}
