// Corrects former members' leave dates and adds former members missing from
// /people, from the congress-legislators dataset (unitedstates.github.io/
// congress-legislators - the Biographical Directory's terms, keyed by bioguide id).
// Wikidata leaves the end date off a member's final term, so `people:import --former`
// either dated them from an older term or skipped them.
//
//   npm run people:terms [-- --apply]     local DB (a dry run without --apply)
//   npm run people:terms -- --apply --prod --token-file <admin token file>
//       POST each correction/addition to www.chronopin.com/api/people (partial update)

import '../env';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import Person from '@/server/model/person';
import { readPerson } from '@/server/personInput';

const { values: flags } = parseArgs({
  options: { apply: { type: 'boolean', default: false }, prod: { type: 'boolean', default: false }, base: { type: 'string', default: 'https://www.chronopin.com' }, 'token-file': { type: 'string' } },
});

const STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia', PR: 'Puerto Rico', GU: 'Guam', VI: 'U.S. Virgin Islands', AS: 'American Samoa', MP: 'Northern Mariana Islands',
};
const PARTY: Record<string, string> = { Democrat: 'Democratic', Republican: 'Republican', Independent: 'Independent' };
const ordinal = (n: number) => `${n}${[11, 12, 13].includes(n % 100) ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
const BASE = 'https://unitedstates.github.io/congress-legislators';

type Term = { type: 'rep' | 'sen'; start: string; end: string; state: string; district?: number; party?: string };
type Legislator = { id: { bioguide: string; wikidata?: string; wikipedia?: string }; name: { first: string; last: string; suffix?: string }; bio: { birthday?: string }; terms: Term[] };

async function main() {
  const get = async (f: string) => (await (await fetch(`${BASE}/${f}`)).json()) as Legislator[];
  const current = await get('legislators-current.json');
  const all = [...(await get('legislators-historical.json')), ...current];
  const sitting = new Set(current.map((x) => x.id.bioguide));
  const rows = await db.query<{ id: number; name: string; role: string; bioguideId: string | null; wikidataId: string | null; wikiUrl: string | null; l: string | null }>(
    `SELECT "id", "name", "role", "bioguideId", "wikidataId", "wikiUrl", "leftOfficeDate"::text AS l FROM "Person"`,
  );
  // Against prod, compare with what prod serves (same ids and names as local after a pull).
  if (flags.prod) {
    const live = (await (await fetch(`${flags.base}/api/people`)).json()) as { id: number; name: string; leftOfficeDate: string | null }[];
    const byId = new Map(live.map((p) => [p.id, p]));
    for (const r of rows) {
      const p = byId.get(r.id);
      r.l = p && p.name === r.name ? p.leftOfficeDate : null;
    }
    // Rows prod lacks are treated as absent so they are sent as additions.
    for (let i = rows.length - 1; i >= 0; i -= 1) if (!byId.has(rows[i].id)) rows.splice(i, 1);
  }
  const wiki = (x: Legislator) => (x.id.wikipedia ? `https://en.wikipedia.org/wiki/${x.id.wikipedia.replace(/ /g, '_')}` : null);
  const days = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86400000;
  const today = new Date().toISOString().slice(0, 10);
  const out: Record<string, unknown>[] = [];

  // A last term that ended well after the stored date.
  const byBio = new Map(all.map((x) => [x.id.bioguide, x]));
  for (const r of rows) {
    if (!r.bioguideId || !r.l || !['representative', 'senator'].includes(r.role) || sitting.has(r.bioguideId)) continue;
    const x = byBio.get(r.bioguideId);
    const end = x?.terms[x.terms.length - 1].end;
    if (x && end && end <= today && days(r.l, end) > 30) out.push({ name: r.name, role: r.role, bioguideId: r.bioguideId, wikidataId: r.wikidataId, leftOfficeDate: end, _was: r.l });
  }
  // Former members since 2015 with no page.
  const ids = new Set(rows.flatMap((r) => [r.bioguideId, r.wikidataId, r.wikiUrl]).filter(Boolean));
  for (const x of all) {
    const last = x.terms[x.terms.length - 1];
    if (last.end < '2015-01-01' || last.end > today || sitting.has(x.id.bioguide)) continue;
    if (ids.has(x.id.bioguide) || (x.id.wikidata && ids.has(x.id.wikidata)) || ids.has(wiki(x))) continue;
    const senate = x.terms.some((t) => t.type === 'sen');
    const chamber = x.terms.filter((t) => t.type === (senate ? 'sen' : 'rep'));
    const seat = senate ? STATES[last.state] : last.district ? `${STATES[last.state]}'s ${ordinal(last.district)} congressional district` : `${STATES[last.state]}'s at-large congressional district`;
    out.push({
      name: `${x.name.first} ${x.name.last}${x.name.suffix ? ` ${x.name.suffix}` : ''}`,
      role: senate ? 'senator' : 'representative',
      office: senate ? 'Former United States Senator' : 'Former United States Representative',
      jurisdiction: seat,
      party: PARTY[last.party ?? ''] ?? last.party ?? null,
      birthDate: x.bio.birthday ?? null,
      inOfficeSince: chamber[0].start,
      leftOfficeDate: last.end,
      wikiUrl: wiki(x),
      wikidataId: x.id.wikidata ?? null,
      bioguideId: x.id.bioguide,
    });
  }

  for (const o of out) console.log(`${o.name}: ${o._was ? `leftOfficeDate ${o._was} -> ${o.leftOfficeDate}` : `new ${o.role}, left ${o.leftOfficeDate}`}`);
  console.log(`${out.length} changes`);
  if (!flags.apply) return;
  const headers = flags.prod ? { Authorization: `Bearer ${readFileSync(flags['token-file']!, 'utf8').trim()}`, 'Content-Type': 'application/json' } : null;
  for (const { _was, ...o } of out) {
    if (!headers) await Person.save(readPerson(o));
    else {
      const res = await fetch(`${flags.base}/api/people`, { method: 'POST', headers, body: JSON.stringify(o) });
      if (!res.ok) throw new Error(`${o.name}: ${res.status} ${await res.text()}`);
    }
  }
  console.log(flags.prod ? 'sent to prod' : 'saved locally');
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => db.closeConnection());
