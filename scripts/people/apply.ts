// Saves hand-researched person profiles, and sends the local ones to
// production. Every figure in a file must carry its source URL
// (src/server/personInput.ts drops health and religion without one, and a
// weight without one).
//
//   npm run people:apply -- profiles.json            local DB: an array of profiles
//   npm run people:apply -- profiles.json --dry-run  read and validate, save nothing
//   npm run people:apply -- --prod --token-file <admin token file> [--only slug,slug]
//       POST each local person (with earnings, contributions, property,
//       trips, matters, researched phases, the degree and the research notes)
//       to www.chronopin.com/api/people - an admin token is needed
//
// A profile: { name, role, office, jurisdiction, party, birthDate, religion,
// religionSourceUrl, weightKg, weightAsOf, weightSourceUrl, health, healthAsOf,
// healthSourceUrl, photoUrl, photoCredit, wikiUrl, earnings: [...],
// contributions: [...], properties: [...], trips: [...] }. Lists given replace
// what is stored; fields left out keep it. Then `npm run backup:data`.

import '../env';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import Person from '@/server/model/person';
import { readPerson } from '@/server/personInput';

const { values: flags, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    'dry-run': { type: 'boolean', default: false },
    prod: { type: 'boolean', default: false },
    base: { type: 'string', default: 'https://www.chronopin.com' },
    'token-file': { type: 'string' },
    only: { type: 'string' },
  },
});

async function applyFile(path: string) {
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(raw)) throw new Error('Expected a JSON array of profiles');
  let saved = 0;
  for (const entry of raw) {
    const input = readPerson(entry);
    const counts = `${input.earnings?.length ?? '-'} earnings, ${input.contributions?.length ?? '-'} contributions, ${input.properties?.length ?? '-'} properties, ${input.trips?.length ?? '-'} trips`;
    if (flags['dry-run']) console.log(`${input.name}: ${counts}`);
    else {
      const id = await Person.save(input);
      console.log(`${input.name} (#${id}): ${counts}`);
    }
    saved += 1;
  }
  console.log(`${saved} profiles ${flags['dry-run'] ? 'checked' : 'saved'}`);
}

async function sendToProd() {
  if (!flags['token-file']) throw new Error('--prod needs --token-file');
  const headers = { Authorization: `Bearer ${readFileSync(flags['token-file'], 'utf8').trim()}`, 'Content-Type': 'application/json' };
  const only = flags.only ? new Set(flags.only.split(',').map((s) => s.trim())) : null;
  const people = (await Person.list()).filter((p) => !only || only.has(p.slug));
  for (const p of people) {
    const profile = await Person.profile(p.id);
    const ids = (await db.query<{ bioguideId: string | null; govtrackId: number | null; wikidataId: string | null }>(
      `SELECT "bioguideId", "govtrackId", "wikidataId" FROM "Person" WHERE "id" = $1`,
      [p.id],
    ))[0];
    if (flags['dry-run']) {
      console.log(`${p.name}: would send`);
      continue;
    }
    const res = await fetch(`${flags.base}/api/people`, { method: 'POST', headers, body: JSON.stringify({ ...profile, ...ids }) });
    console.log(`${p.name}: ${res.status}`);
    if (!res.ok) throw new Error(await res.text());
  }
}

(flags.prod ? sendToProd() : positionals[0] ? applyFile(positionals[0]) : Promise.reject(new Error('Pass a profiles file, or --prod')))
  .catch((err) => {
    console.error(err.message ?? err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
