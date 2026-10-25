// Replay explicitly researched native generation/storage profiles after research.mjs.
// node --env-file=.env.local scripts/construction/power.mjs --manifest path [--dry-run]
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

const index = process.argv.indexOf('--manifest');
if (index < 0 || !process.argv[index + 1]) throw Error('--manifest is required');
const path = process.argv[index + 1];
const report = JSON.parse(await fs.readFile(path, 'utf8'));
const dry = process.argv.includes('--dry-run');
const same = (actual, expected) => actual && Object.entries(expected).every(([key, value]) => actual[key] === value);
const hash = (row) => createHash('sha256').update(JSON.stringify(row, Object.keys(row).sort())).digest('hex');

for (const env of report.environments) {
  const profiles = env.pins.filter((entry) => report.research.find((r) => r.id === entry.id)?.power);
  if (!profiles.length) continue;
  const base = env.base.startsWith('https:') ? process.env.PRODUCTION_API_TRANSPORT || env.base : env.base;
  let token;
  const call = async (method, route, body) => {
    const response = await fetch(base + route, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) throw Error(`${env.base} ${method} ${route}: ${response.status}`);
    return response.status === 204 ? null : response.json();
  };
  ({ token } = await call('POST', '/auth/local', { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }));
  for (const entry of profiles) {
    const research = report.research.find((r) => r.id === entry.id);
    const { power, expectedPower, removeCalculatedEnergy } = research;
    if (!(power.megawatts > 0) || !['generation', 'storage'].includes(power.kind) || power.note.length > 500 ||
        !research.sources.some((source) => source.url === power.sourceUrl && source.quote)) throw Error(`Invalid generation evidence ${entry.id}`);
    const { rows } = await call('GET', `/api/admin/db/Pin?id=${entry.id}`);
    if (rows.length !== 1 || rows[0].userId !== entry.expectedAuthorId ||
        hash(rows[0]) !== (entry.savedPinSha256 || entry.expectedPinSha256)) throw Error(`Pin changed ${entry.id}`);
    const current = await call('GET', `/api/pins/${entry.id}/power`);
    const energy = await call('GET', `/api/pins/${entry.id}/energy`);
    if (!same(current, power) && !same(current, expectedPower)) throw Error(`Conflicting power edit ${entry.id}`);
    if (removeCalculatedEnergy && energy &&
        (removeCalculatedEnergy.basis !== 'calculated' || !same(energy, removeCalculatedEnergy))) throw Error(`Conflicting energy edit ${entry.id}`);
    if (dry) { console.log(env.base, entry.id, 'native power and calculated-energy guards validated'); continue; }
    const receipt = `${report.snapshotDirectory}/${new URL(env.base).hostname}-${entry.id}-power-before.json`;
    await fs.writeFile(receipt, JSON.stringify({ power: current, energy }, null, 2) + '\n', { flag: 'wx' }).catch((error) => { if (error.code !== 'EEXIST') throw error; });
    if (!same(current, power)) await call('PUT', `/api/pins/${entry.id}/power`, power);
    // Remove only the exact obsolete usage calculation; no annual generation is invented.
    if (removeCalculatedEnergy && energy) await call('DELETE', `/api/pins/${entry.id}/energy`);
    const saved = await call('GET', `/api/pins/${entry.id}/power`);
    if (!same(saved, power) || (removeCalculatedEnergy && await call('GET', `/api/pins/${entry.id}/energy`))) throw Error(`Generation verification failed ${entry.id}`);
    const { rows: after } = await call('GET', `/api/admin/db/Pin?id=${entry.id}`);
    if (hash(after[0]) !== hash(rows[0])) throw Error(`Power API changed Pin metadata ${entry.id}`);
    entry.powerVerified = true;
    entry.power = saved;
    entry.obsoleteCalculatedEnergyRemoved = Boolean(removeCalculatedEnergy);
    await fs.writeFile(path, JSON.stringify(report, null, 2) + '\n');
    console.log(env.base, entry.id, power.megawatts, `MW ${power.kind} saved and verified`);
  }
}
