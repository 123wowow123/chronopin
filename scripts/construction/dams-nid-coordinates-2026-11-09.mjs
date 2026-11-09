// Moves the dam pins' map points to the National Inventory of Dams coordinates (public CSV, read 2026-11-09).
// Whole-pin round trip (GET, set latitude/longitude, PUT) with a diff of the readback; aborts a pin if anything else changed.
//   node scripts/construction/dams-nid-coordinates-2026-11-09.mjs --base URL --token FILE --ids anderson=20919,... [--apply]
import fs from 'node:fs';
const args = process.argv.slice(2);
const arg = (k) => args[args.indexOf(k) + 1];
const base = arg('--base'), token = fs.readFileSync(arg('--token'), 'utf8').trim(), apply = args.includes('--apply');
const ids = Object.fromEntries(arg('--ids').split(',').map((x) => x.split('=')));
// NID ID: CA00294 Anderson, KY03012 Rough River, WA00298 Hanson, CO00247 Gross, CA10022 Prado.
const NID = { anderson: [37.1676, -121.6308], andersonTunnel: [37.1676, -121.6308], gross: [39.948, -105.3579], rough: [37.619751, -86.500907], hanson: [47.278206, -121.786548], prado: [33.89, -117.642111] };
const call = async (method, path, body) => {
  const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, ...(body ? { body: JSON.stringify(body) } : {}), redirect: 'error' });
  const t = await r.text(); if (!r.ok) throw Error(`${method} ${path}: ${r.status} ${t.slice(0, 300)}`); return t ? JSON.parse(t) : null;
};
const strip = (p) => { const { latitude, longitude, utcUpdatedDateTime, viewCount, likeCount, favoriteCount, ...rest } = p; return JSON.stringify(rest, Object.keys(rest).sort()); };
for (const [k, id] of Object.entries(ids)) {
  const [lat, lon] = NID[k];
  const before = await call('GET', `/api/pins/${id}`);
  console.log(`${k} ${id}: ${before.latitude},${before.longitude} -> ${lat},${lon}`);
  if (!apply) continue;
  await call('PUT', `/api/pins/${id}`, { ...before, latitude: lat, longitude: lon });
  const after = await call('GET', `/api/pins/${id}`);
  const same = strip(before) === strip(after);
  console.log(`   readback ${after.latitude},${after.longitude}; other fields unchanged: ${same}`);
  if (!same) { for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) if (JSON.stringify(before[key]) !== JSON.stringify(after[key]) && !['latitude','longitude','utcUpdatedDateTime'].includes(key)) console.log('   DIFF', key, JSON.stringify(before[key])?.slice(0, 120), '=>', JSON.stringify(after[key])?.slice(0, 120)); }
  await call('POST', '/api/admin/pins/expire', { ids: [Number(id)] }).catch(() => {});
}
