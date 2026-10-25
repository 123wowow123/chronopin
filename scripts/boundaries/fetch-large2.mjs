// Cache reviewed source files; no database writes. Remove cache for fresh research.
import fs from 'node:fs';
const root = '.scrape/boundaries';
fs.mkdirSync(root, { recursive: true });
const cecDirectory = encodeURIComponent('第11屆立法委員選舉區範圍');
const sources = [
  ['tw-cities-2024-ncdr.zip', 'https://alerts.ncdr.nat.gov.tw/web/StaticFile/Document/city_113.shp(utf8).zip'],
  ['tw-villages-2024-ncdr.zip', 'https://alerts.ncdr.nat.gov.tw/web/StaticFile/Document/village_113.shp(utf8).zip'],
  ['taiwan-districts.csv', `https://data.cec.gov.tw/${cecDirectory}/${encodeURIComponent('立法委員選舉區範圍.csv')}`],
  ['peru-provinces-2020.geojson', 'https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/PER/ADM2/geoBoundaries-PER-ADM2.geojson'],
  ['australia-niafed-full.geojson', 'https://services1.arcgis.com/gtRkYQyUQLMTM1uS/arcgis/rest/services/NIAFED_v20200623/FeatureServer/0/query?' + new URLSearchParams({ where: '1=1', outFields: '*', outSR: '4326', f: 'geojson' })],
];
for (const [file, url] of sources) {
  const path = `${root}/${file}`;
  if (fs.existsSync(path)) continue;
  const response = await fetch(url, { signal: AbortSignal.timeout(180000) });
  if (!response.ok) throw new Error(`Source ${response.status}: ${file}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (file.endsWith('.zip') && bytes.subarray(0, 2).toString() !== 'PK') throw new Error('Not a ZIP archive: ' + file);
  if (file.endsWith('.geojson')) {
    const data = JSON.parse(bytes.toString());
    const count = file.startsWith('australia') ? 1 : 196;
    if (data.features?.length !== count || data.exceededTransferLimit) throw new Error('Incomplete collection: ' + file);
  }
  fs.writeFileSync(path, bytes);
}
console.log('NCDR, CEC, IGN/OCHA and DCCEEW source files cached; run the reviewed preparation scripts.');
