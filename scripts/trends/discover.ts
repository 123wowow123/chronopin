// What the world is searching for today, as pin candidates, from Google
// Trends' daily RSS (trends.google.com/trending/rss, free, no key). The
// reading and scoring live in src/server/jobs/trends.ts, shared with the
// daily jobs; this prints them.
//
// This job does NOT post pins, and that is deliberate. Every other job in the
// roster reads a calendar - a fixture list, a launch manifest, a trial
// registry - and a calendar row already is a dated event. A trending search
// term is not an event: it is a crowd looking at something, and on a Sunday in
// the NFL season nine of the ten US terms are that afternoon's games. Measured
// across six geos on 2026-09-20, about 85% of terms were same-day sport,
// lottery numbers, weather or a celebrity's name with no dated event behind
// it at all.
//
// What survives the filter is worth a look, because it is the one source here
// that finds a subject nobody thought to schedule: a car unveiled this
// morning, a policy that takes effect next year, a sequel that just got a
// date. So the job's output is a ranked candidate list with each term's news
// links, for a session to scrape through the normal pipeline.
//
//   npm run trends:discover
//   npm run trends:discover -- --geo US,GB,JP      pick the geographies
//   npm run trends:discover -- --all               skip the noise filter
//   npm run trends:discover -- --json              machine-readable output

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { trendCandidates } from '@/server/jobs/trends';

const { values: flags } = parseArgs({
  options: {
    geo: { type: 'string', default: 'US,GB,JP,DE,IN,BR,AU,CA,FR,KR' },
    all: { type: 'boolean', default: false },
    json: { type: 'boolean', default: false },
    'min-traffic': { type: 'string', default: '0' },
  },
});

async function run() {
  const geos = flags.geo!.split(',').map((g) => g.trim()).filter(Boolean);
  const { total, candidates } = await trendCandidates({ geos, all: flags.all, minTraffic: Number(flags['min-traffic']) });
  console.log(`${total} trending terms across ${geos.length} geographies`);
  console.log(`${candidates.length} survive the filter (${total - candidates.length} dropped as same-day noise or repeats)\n`);
  if (flags.json) {
    console.log(JSON.stringify(candidates, null, 2));
  } else {
    for (const t of candidates) {
      console.log(`${String(t.traffic).padStart(7)} +${t.score}  [${t.geo}] ${t.term}${t.coveredByPin ? `  — already pin ${t.coveredByPin}` : ''}`);
      for (const n of t.news.slice(0, 3)) console.log(`         ${n.source}: ${n.title.slice(0, 90)}\n         ${n.url}`);
      console.log();
    }
  }
  console.log(`${candidates.filter((t) => !t.coveredByPin).length} candidate(s) not already covered by a pin`);
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
