// Saves a pin's telemetry tiles (PinPerf tables with display: 'tiles') from a JSON file:
//   ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/models/savePerfTiles.mjs scripts/models/pin-2834-telemetry.json [base]
// The pin's author or an admin signs in. base defaults to https://www.chronopin.com.
import { readFileSync } from 'node:fs';

const [file, base = 'https://www.chronopin.com'] = process.argv.slice(2);
const { pinId, tables } = JSON.parse(readFileSync(file, 'utf8'));
const call = async (method, path, body, token) => {
  const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body && JSON.stringify(body) });
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
};
const { token } = await call('POST', '/auth/local', { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
const saved = await call('PUT', `/api/pins/${pinId}/performance`, { tables }, token);
const tiled = saved.tables.filter((t) => t.display === 'tiles').length;
console.log(`pin ${pinId}: ${saved.tables.length} tables, ${tiled} as tiles`);
if (tiled !== tables.filter((t) => t.display === 'tiles').length) console.warn('display: tiles was dropped - the server is not running the tile code yet');
