// Fills the person pages (0150) from keyless public sources, on the dev
// machine. Each step is separate and safe to run again.
//
//   npm run people:import -- --congress     every sitting senator and representative (GovTrack)
//   npm run people:import -- --enrich       Wikidata: Wikipedia link, portrait, religion, birth/death
//   npm run people:import -- --tenure       when each member's unbroken service began (Wikidata terms)
//   npm run people:import -- --education    the highest degree Wikidata records (P512), for the radar's education axis
//   npm run people:import -- --education-wiki  degrees from each Wikipedia infobox ("(BA)", "(JD)") where Wikidata has none
//   npm run people:import -- --salary-former  the statutory salary of the last year in office, for former members with none
//   npm run people:import -- --salary-current the statutory salary of the current year, for sitting members with none
//   npm run people:import -- --former       former presidents and vice presidents, and members of Congress who
//                                                left since 2015 (Wikidata P39 terms; skips anyone still serving)
//   npm run people:import -- --salary       salary tile per year served since 2009 (CRS pay tables)
//   npm run people:import -- --laws         sponsored bills that became law (Congress.gov;
//                                                set CONGRESS_API_KEY - DEMO_KEY allows ~10 calls an hour)
//   add --limit N to take the first N, --dry-run to print without saving
//
// Only what a source states is stored, with its URL. Religion, weight and
// health are never guessed: Wikidata's religion (P140) is stored with the
// Wikidata entity as its source. Then `npm run backup:data`.

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import Person from '@/server/model/person';
import {
  govtrackId,
  lawContribution,
  memberName,
  officeLabel,
  partyLabel,
  religionLabel,
  roleOf,
  salaryEarnings,
  tenureStart,
  CONGRESS_PAY_SOURCE,
  STATES,
  type CongressBill,
  type GovTrackRole,
} from '@/server/personSources';
import { educationLevelOf, type PersonEarning } from '@/lib/people';

const { values: flags } = parseArgs({
  options: {
    congress: { type: 'boolean', default: false },
    enrich: { type: 'boolean', default: false },
    salary: { type: 'boolean', default: false },
    tenure: { type: 'boolean', default: false },
    former: { type: 'boolean', default: false },
    education: { type: 'boolean', default: false },
    'education-wiki': { type: 'boolean', default: false },
    'salary-current': { type: 'boolean', default: false },
    'salary-former': { type: 'boolean', default: false },
    laws: { type: 'boolean', default: false },
    limit: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
  },
});
const limit = flags.limit ? Number(flags.limit) : Infinity;
const dry = flags['dry-run'];
const UA = 'Chronopin/1.0 (https://www.chronopin.com; person pages)';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson<T = any>(url: string, init: RequestInit = {}, tries = 3): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const res = await fetch(url, { ...init, headers: { 'User-Agent': UA, Accept: 'application/json', ...(init.headers ?? {}) }, signal: AbortSignal.timeout(60_000) });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return (await res.json()) as T;
    } catch (err) {
      if (attempt >= tries) throw err;
      await sleep(2000 * attempt);
    }
  }
}

// ---- --congress: every current member from GovTrack ----------------------
async function congress() {
  const body = await getJson<{ objects: GovTrackRole[] }>('https://www.govtrack.us/api/v2/role?current=true&limit=700&format=json');
  let n = 0;
  for (const role of body.objects.slice(0, limit)) {
    const p = role.person;
    // GovTrack's current roles also list the President and Vice President.
    if (!p.bioguideid || (role.role_type !== 'senator' && role.role_type !== 'representative')) continue;
    const input = {
      name: memberName(p),
      role: roleOf(role),
      office: officeLabel(role),
      jurisdiction: STATES[role.state] ?? role.state,
      party: role.party,
      birthDate: p.birthday,
      bioguideId: p.bioguideid,
      govtrackId: govtrackId(p.link),
      websiteUrl: role.website ?? null,
    };
    if (dry) console.log(input.name, '-', input.office, `(${input.party})`);
    else await Person.save(input);
    n += 1;
  }
  console.log(`${n} members ${dry ? 'read' : 'saved'}`);
}

// ---- --enrich: Wikidata by bioguide id ------------------------------------
type Binding = Record<string, { value: string } | undefined>;

async function enrich() {
  const rows = await db.query<{ id: number; name: string; bioguideId: string }>(
    `SELECT "id", "name", "bioguideId" FROM "Person" WHERE "bioguideId" IS NOT NULL ORDER BY "id"`,
  );
  const todo = rows.slice(0, limit);
  const CHUNK = 80;
  let updated = 0;
  for (let i = 0; i < todo.length; i += CHUNK) {
    const chunk = todo.slice(i, i + CHUNK);
    const values = chunk.map((r) => `"${r.bioguideId}"`).join(' ');
    const query = `SELECT ?bio ?p ?article ?religionLabel ?image WHERE {
      VALUES ?bio { ${values} }
      ?p wdt:P1157 ?bio.
      OPTIONAL { ?article schema:about ?p; schema:isPartOf <https://en.wikipedia.org/>. }
      OPTIONAL { ?p wdt:P140 ?religion. }
      OPTIONAL { ?p wdt:P18 ?image. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }`;
    const res = await getJson<{ results: { bindings: Binding[] } }>(
      `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`,
      { headers: { Accept: 'application/sparql-results+json' } },
    );
    const byBio = new Map<string, Binding[]>();
    for (const b of res.results.bindings) {
      const bio = b.bio?.value;
      if (bio) byBio.set(bio, [...(byBio.get(bio) ?? []), b]);
    }
    for (const r of chunk) {
      const found = byBio.get(r.bioguideId);
      if (!found?.length) continue;
      const first = found[0];
      const qid = /Q\d+$/.exec(first.p?.value ?? '')?.[0] ?? null;
      const religion = religionLabel([...new Set(found.map((b) => b.religionLabel?.value).filter((v): v is string => !!v))]);
      const file = found.map((b) => b.image?.value).find(Boolean);
      const fileName = file ? decodeURIComponent(file.split('/Special:FilePath/')[1] ?? '') : '';
      const input = {
        name: r.name,
        wikidataId: qid,
        wikiUrl: found.map((b) => b.article?.value).find(Boolean) ?? null,
        religion,
        religionSourceUrl: religion && qid ? `https://www.wikidata.org/wiki/${qid}` : null,
        photoUrl: fileName ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=480` : null,
        photoCredit: fileName ? `Wikimedia Commons, File:${fileName}` : null,
        bioguideId: r.bioguideId,
      };
      if (dry) console.log(r.name, input.wikidataId, input.religion ?? '-', input.photoUrl ? 'photo' : '-');
      else await Person.save(input, r.id);
      updated += 1;
    }
    await sleep(1500);
  }
  console.log(`${updated} of ${todo.length} matched on Wikidata`);
}

// ---- --tenure: the start of each member's unbroken service in their chamber ---
async function tenure() {
  const rows = await db.query<{ id: number; name: string; role: string; bioguideId: string }>(
    `SELECT "id", "name", "role", "bioguideId" FROM "Person" WHERE "bioguideId" IS NOT NULL AND "role" IN ('senator', 'representative') ORDER BY "id"`,
  );
  const todo = rows.slice(0, limit);
  const CHUNK = 60;
  let set = 0;
  for (let i = 0; i < todo.length; i += CHUNK) {
    const chunk = todo.slice(i, i + CHUNK);
    const query = `SELECT ?bio ?pos ?start ?end WHERE {
      VALUES ?bio { ${chunk.map((r) => `"${r.bioguideId}"`).join(' ')} }
      ?p wdt:P1157 ?bio. ?p p:P39 ?s. ?s ps:P39 ?pos.
      VALUES ?pos { wd:Q4416090 wd:Q13218630 }
      ?s pq:P580 ?start. OPTIONAL { ?s pq:P582 ?end }
    }`;
    const res = await getJson<{ results: { bindings: Binding[] } }>(
      `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`,
      { headers: { Accept: 'application/sparql-results+json' } },
    );
    for (const r of chunk) {
      const pos = r.role === 'senator' ? 'Q4416090' : 'Q13218630';
      const terms = res.results.bindings
        .filter((b) => b.bio?.value === r.bioguideId && b.pos?.value.endsWith(pos))
        .map((b) => ({ start: b.start!.value.slice(0, 10), end: b.end ? b.end.value.slice(0, 10) : null }));
      const start = tenureStart(terms);
      if (!start) continue;
      if (dry) console.log(r.name, start);
      else await Person.save({ name: r.name, inOfficeSince: start }, r.id);
      set += 1;
    }
    await sleep(1500);
  }
  console.log(`${set} of ${todo.length} tenures ${dry ? 'read' : 'saved'}`);
}

// ---- --education: the highest degree recorded, for the radar ----------------
async function education() {
  const rows = await db.query<{ id: number; wikiUrl: string }>(
    `SELECT "id", "wikiUrl" FROM "Person" WHERE "wikiUrl" LIKE 'https://en.wikipedia.org/wiki/%' ORDER BY "id"`,
  );
  const todo = rows.slice(0, limit);
  const CHUNK = 60;
  let set = 0;
  for (let i = 0; i < todo.length; i += CHUNK) {
    const chunk = todo.slice(i, i + CHUNK);
    const query = `SELECT ?article ?p ?degreeLabel WHERE {
      VALUES ?article { ${chunk.map((r) => `<${r.wikiUrl}>`).join(' ')} }
      ?article schema:about ?p; schema:isPartOf <https://en.wikipedia.org/>.
      ?p wdt:P512 ?degree.
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }`;
    const res = await getJson<{ results: { bindings: Binding[] } }>(
      `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`,
      { headers: { Accept: 'application/sparql-results+json' } },
    );
    const by = new Map<string, { qid: string; degrees: Set<string> }>();
    for (const b of res.results.bindings) {
      const url = b.article?.value;
      const label = b.degreeLabel?.value;
      if (!url || !label || /^Q\d+$/.test(label)) continue;
      const entry = by.get(url) ?? { qid: /Q\d+$/.exec(b.p?.value ?? '')?.[0] ?? '', degrees: new Set<string>() };
      entry.degrees.add(label);
      by.set(url, entry);
    }
    for (const r of chunk) {
      const found = by.get(r.wikiUrl);
      if (!found?.qid) continue;
      const levels = [...found.degrees].map((d) => ({ d, level: educationLevelOf(d) })).filter((x): x is { d: string; level: number } => x.level != null);
      if (!levels.length) continue;
      const level = Math.max(...levels.map((x) => x.level));
      const note = levels.map((x) => x.d).join('; ');
      if (dry) console.log(r.wikiUrl.split('/').pop(), level, note);
      else await Person.setEducation(r.id, level, note, `https://www.wikidata.org/wiki/${found.qid}`);
      set += 1;
    }
    await sleep(1500);
  }
  console.log(`${set} of ${todo.length} with a recorded degree ${dry ? 'read' : 'saved'}`);
}

// ---- --education-wiki: degrees in the Wikipedia infobox ----------------------
// An infobox lists "alma_mater = [[Harvard University]] (BA)<br>[[Yale Law
// School]] (JD)". Only a degree inside the parentheses, or spelled out
// ("Juris Doctor"), counts, so a name or a place is never read as a degree.
export function infoboxDegrees(wikitext: string): string[] {
  const fields = [...wikitext.matchAll(/\|\s*(?:alma_?mater|education)\s*=([\s\S]*?)(?=\n\s*\|\s*[a-z_0-9 ]+\s*=|\n\}\})/gi)].map((m) => m[1]);
  const out = new Set<string>();
  for (const raw of fields) {
    const text = raw
      .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
      .replace(/<ref[\s\S]*?(?:<\/ref>|\/>)/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\{\{[^}]*\}\}/g, ' ');
    for (const m of text.matchAll(/\(([^()]{1,40})\)/g)) {
      for (const part of m[1].split(/[,;/&]|\band\b/)) {
        const d = part.trim().replace(/\.$/, '');
        if (d && educationLevelOf(d) != null) out.add(d);
      }
    }
    for (const m of text.matchAll(/\b(Bachelor of [A-Z][a-z]+(?: [A-Z][a-z]+)?|Master of [A-Z][a-z]+(?: [A-Z][a-z]+)?|Juris Doctor|Doctor of [A-Z][a-z]+(?: [A-Z][a-z]+)?|Associate (?:of|in) [A-Z][a-z]+)\b/g)) {
      if (educationLevelOf(m[1]) != null) out.add(m[1]);
    }
  }
  return [...out];
}

// The lead section of an article as wikitext (it holds the infobox), by the
// raw endpoint - a fraction of the parse API's cost. A redirect is followed once.
async function leadWikitext(title: string, depth = 0): Promise<string> {
  const url = `https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(title)}&action=raw&section=0`;
  for (let attempt = 1; ; attempt += 1) {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30_000) });
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= 3) throw new Error(`HTTP ${res.status}`);
      await sleep(1500 * attempt);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const redirect = /^\s*#redirect\s*\[\[([^\]|#]+)/i.exec(text);
    return redirect && depth < 1 ? leadWikitext(redirect[1].trim(), depth + 1) : text;
  }
}

async function educationWiki() {
  const rows = await db.query<{ id: number; wikiUrl: string }>(
    `SELECT "id", "wikiUrl" FROM "Person" WHERE "educationLevel" IS NULL AND "wikiUrl" LIKE 'https://en.wikipedia.org/wiki/%' ORDER BY "id"`,
  );
  const todo = rows.slice(0, limit);
  let set = 0;
  let n = 0;
  // A few requests at a time: one by one is several seconds each against the
  // API, and a handful in parallel is within what Wikimedia asks of clients.
  const queue = [...todo];
  const work = async () => {
    for (let r = queue.shift(); r; r = queue.shift()) {
      n += 1;
      const title = decodeURIComponent(r.wikiUrl.slice('https://en.wikipedia.org/wiki/'.length));
      try {
        const degrees = infoboxDegrees(await leadWikitext(title));
        const levels = degrees.map((d) => educationLevelOf(d)).filter((l): l is number => l != null);
        if (levels.length) {
          const level = Math.max(...levels);
          if (dry) console.log(title, level, degrees.join('; '));
          else await Person.setEducation(r.id, level, degrees.join('; '), r.wikiUrl);
          set += 1;
        }
      } catch (err) {
        console.log(`${title}: ${(err as Error).message}`);
      }
      await sleep(700);
      if (n % 100 === 0) console.log(`${n}/${todo.length} read, ${set} with a degree`);
    }
  };
  // Two workers and a pause between pages: six in parallel drew HTTP 429 from
  // Wikipedia for most of a run (2026-10-10).
  await Promise.all(Array.from({ length: 2 }, work));
  console.log(`${set} of ${todo.length} with a degree in the infobox ${dry ? 'read' : 'saved'}`);
}

// ---- --salary-current: this year's statutory salary for sitting members ------
// Without GovTrack's terms (--salary), the one year every sitting member is
// certain of is the current one: $174,000, or the leadership rate that the
// hand-researched profiles already carry for them.
async function salaryCurrent() {
  const year = new Date().getUTCFullYear();
  const people = await db.query<{ id: number; name: string }>(
    `SELECT "p"."id", "p"."name" FROM "Person" AS "p"
     WHERE "p"."role" IN ('senator', 'representative') AND "p"."leftOfficeDate" IS NULL AND "p"."deathDate" IS NULL
       AND NOT EXISTS (SELECT 1 FROM "PersonEarning" "e" WHERE "e"."personId" = "p"."id" AND "e"."year" = $1 AND "e"."kind" = 'salary')
     ORDER BY "p"."id"`,
    [year],
  );
  let n = 0;
  for (const p of people.slice(0, limit)) {
    const profile = await Person.profile(p.id);
    if (!profile) continue;
    const line: PersonEarning = {
      year,
      kind: 'salary',
      label: profile.role === 'senator' ? 'Senate salary' : 'House salary',
      amount: 174_000,
      amountLow: null,
      amountHigh: null,
      currency: 'USD',
      sourceUrl: CONGRESS_PAY_SOURCE,
      note: 'The statutory rate for a Member of Congress (CRS 97-1011).',
    };
    if (dry) console.log(p.name, year, line.amount);
    else await Person.save({ name: p.name, earnings: [...profile.earnings, line] }, p.id);
    n += 1;
  }
  console.log(`${n} salary lines ${dry ? 'read' : 'saved'}`);
}

// ---- --salary-former: the salary of a former member's last year in office -----
// A member who left office since 2015 drew the statutory $174,000 (unchanged
// since 2009) in each year served, so their last full year in office has a
// documented salary even when no disclosure was read. A member who left on or
// before 3 January served none of that calendar year, so the year before is
// used. Leadership posts paid more; those profiles are hand-researched and
// already carry a salary line, so a person with any salary line is skipped.
async function salaryFormer() {
  const people = await db.query<{ id: number; name: string; role: string; left: string }>(
    `SELECT "p"."id", "p"."name", "p"."role", "p"."leftOfficeDate"::text AS "left" FROM "Person" AS "p"
     WHERE "p"."role" IN ('senator', 'representative') AND "p"."leftOfficeDate" >= '2015-01-03' AND "p"."deathDate" IS NULL
       AND NOT EXISTS (SELECT 1 FROM "PersonEarning" "e" WHERE "e"."personId" = "p"."id" AND "e"."kind" = 'salary')
     ORDER BY "p"."id"`,
  );
  let n = 0;
  for (const p of people.slice(0, limit)) {
    const profile = await Person.profile(p.id);
    if (!profile) continue;
    const left = new Date(`${p.left}T00:00:00Z`);
    const year = left.getUTCMonth() === 0 && left.getUTCDate() <= 3 ? left.getUTCFullYear() - 1 : left.getUTCFullYear();
    const line: PersonEarning = {
      year,
      kind: 'salary',
      label: profile.role === 'senator' ? 'Senate salary' : 'House salary',
      amount: 174_000,
      amountLow: null,
      amountHigh: null,
      currency: 'USD',
      sourceUrl: CONGRESS_PAY_SOURCE,
      note: 'The statutory rate for a Member of Congress (CRS 97-1011), the last year in office.',
    };
    if (dry) console.log(p.name, year);
    else await Person.save({ name: p.name, earnings: [...profile.earnings, line] }, p.id);
    n += 1;
  }
  console.log(`${n} former-member salary lines ${dry ? 'read' : 'saved'}`);
}

// ---- --former: presidents, vice presidents and recently retired members ------
const iso = (v?: string) => (v ? v.slice(0, 10) : null);
const commons = (file?: string) => {
  const name = file ? decodeURIComponent(file.split('/Special:FilePath/')[1] ?? '') : '';
  return name ? { photoUrl: `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(name)}?width=480`, photoCredit: `Wikimedia Commons, File:${name}` } : {};
};

type Held = { qid: string; label: string; pos: string; start: string | null; end: string | null; birth: string | null; death: string | null; party: string | null; religions: string[]; image?: string; article: string | null; bio: string | null; seat: string | null };

async function wikidataHeld(positions: string[], endFrom: string | null): Promise<Held[]> {
  const filter = endFrom ? `?s pq:P582 ?end. FILTER(?end >= "${endFrom}T00:00:00Z"^^xsd:dateTime)` : `OPTIONAL { ?s pq:P582 ?end }`;
  const query = `SELECT ?p ?pLabel ?pos ?start ?end ?birth ?death ?partyLabel ?religionLabel ?image ?article ?bio ?seatLabel WHERE {
    VALUES ?pos { ${positions.map((q) => `wd:${q}`).join(' ')} }
    ?p wdt:P31 wd:Q5; p:P39 ?s. ?s ps:P39 ?pos. ${filter}
    OPTIONAL { ?s pq:P580 ?start } OPTIONAL { ?s pq:P768 ?seat }
    OPTIONAL { ?p wdt:P569 ?birth } OPTIONAL { ?p wdt:P570 ?death } OPTIONAL { ?p wdt:P102 ?party }
    OPTIONAL { ?p wdt:P140 ?religion } OPTIONAL { ?p wdt:P18 ?image } OPTIONAL { ?p wdt:P1157 ?bio }
    OPTIONAL { ?article schema:about ?p; schema:isPartOf <https://en.wikipedia.org/>. }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  }`;
  const res = await getJson<{ results: { bindings: Binding[] } }>(
    `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`,
    { headers: { Accept: 'application/sparql-results+json' } },
  );
  return res.results.bindings.map((b) => ({
    qid: /Q\d+$/.exec(b.p?.value ?? '')?.[0] ?? '',
    label: b.pLabel?.value ?? '',
    pos: /Q\d+$/.exec(b.pos?.value ?? '')?.[0] ?? '',
    start: iso(b.start?.value),
    end: iso(b.end?.value),
    birth: iso(b.birth?.value),
    death: iso(b.death?.value),
    party: b.partyLabel?.value ?? null,
    religions: b.religionLabel?.value ? [b.religionLabel.value] : [],
    image: b.image?.value,
    article: b.article?.value ?? null,
    bio: b.bio?.value ?? null,
    seat: b.seatLabel?.value && !/^Q\d+$/.test(b.seatLabel.value) ? b.seatLabel.value : null,
  }));
}

function groupHeld(rows: Held[]): Map<string, Held[]> {
  const by = new Map<string, Held[]>();
  for (const r of rows) if (r.qid && !/^Q\d+$/.test(r.label)) by.set(r.qid, [...(by.get(r.qid) ?? []), r]);
  return by;
}

async function former() {
  // Anyone already here - by Congress id, Wikidata id or Wikipedia article - is
  // left alone: a sitting governor who was once a representative is not a
  // former officeholder.
  const existing = await db.query<{ bioguideId: string | null; wikidataId: string | null; wikiUrl: string | null }>(`SELECT "bioguideId", "wikidataId", "wikiUrl" FROM "Person"`);
  const known = new Set(existing.flatMap((r) => [r.bioguideId, r.wikidataId, r.wikiUrl]).filter((v): v is string => !!v));
  let n = 0;
  const save = async (input: Parameters<typeof Person.save>[0], label: string) => {
    if (dry) console.log(label);
    else await Person.save(input);
    n += 1;
  };

  // Presidents and vice presidents: every one, from the first to the last
  // who has left. Anyone with an open-ended term is still serving.
  const execs = groupHeld(await wikidataHeld(['Q11696', 'Q11699'], null));
  for (const [qid, rows] of execs) {
    if (rows.some((r) => r.end == null)) continue;
    if (known.has(qid) || (rows[0].article && known.has(rows[0].article))) continue;
    const president = rows.filter((r) => r.pos === 'Q11696');
    const terms = president.length ? president : rows;
    const first = rows[0];
    const religion = religionLabel([...new Set(rows.flatMap((r) => r.religions))]);
    const office = president.length ? 'President of the United States' : 'Vice President of the United States';
    const starts = terms.map((t) => t.start).filter((d): d is string => !!d).sort();
    const ends = terms.map((t) => t.end).filter((d): d is string => !!d).sort();
    await save(
      {
        name: first.label,
        role: president.length ? 'president' : 'vice-president',
        office: `Former ${office}`,
        jurisdiction: 'United States',
        party: partyLabel(first.party),
        birthDate: first.birth,
        deathDate: first.death,
        inOfficeSince: starts[0] ?? null,
        leftOfficeDate: ends[ends.length - 1] ?? null,
        religion,
        religionSourceUrl: religion ? `https://www.wikidata.org/wiki/${qid}` : null,
        wikiUrl: first.article,
        wikidataId: qid,
        ...commons(first.image),
      },
      `${first.label} - ${office}`,
    );
  }

  // Members of Congress who left since 2015, in slices to keep each query small.
  for (const [from, to] of [['2015-01-01', '2018-12-31'], ['2019-01-01', '2021-12-31'], ['2022-01-01', '2023-12-31'], ['2024-01-01', '2026-12-31']]) {
    const rows = (await wikidataHeld(['Q4416090', 'Q13218630'], from)).filter((r) => r.end && r.end <= to);
    for (const [qid, held] of groupHeld(rows)) {
      const bio = held.find((h) => h.bio)?.bio ?? null;
      if ((bio && known.has(bio)) || known.has(qid) || (held[0].article && known.has(held[0].article))) continue;
      const senate = held.some((h) => h.pos === 'Q4416090');
      const chamber = senate ? 'Q4416090' : 'Q13218630';
      const terms = held.filter((h) => h.pos === chamber).map((h) => ({ start: h.start ?? '', end: h.end }));
      const ends = terms.map((t) => t.end).filter((d): d is string => !!d).sort();
      const first = held[0];
      const religion = religionLabel([...new Set(held.flatMap((r) => r.religions))]);
      await save(
        {
          name: first.label,
          role: senate ? 'senator' : 'representative',
          office: senate ? 'Former United States Senator' : 'Former United States Representative',
          jurisdiction: held.find((h) => h.seat)?.seat ?? null,
          party: partyLabel(first.party),
          birthDate: first.birth,
          deathDate: first.death,
          inOfficeSince: tenureStart(terms),
          leftOfficeDate: ends[ends.length - 1] ?? null,
          religion,
          religionSourceUrl: religion ? `https://www.wikidata.org/wiki/${qid}` : null,
          wikiUrl: first.article,
          wikidataId: qid,
          bioguideId: bio,
          ...commons(first.image),
        },
        `${first.label} - ${senate ? 'Senator' : 'Representative'} to ${ends[ends.length - 1]}`,
      );
    }
    await sleep(2000);
  }
  console.log(`${n} former officeholders ${dry ? 'read' : 'saved'}`);
}

// ---- --salary: the statutory salary, a tile for each year served ------------
async function salary() {
  const people = await db.query<{ id: number; name: string; bioguideId: string }>(
    `SELECT "id", "name", "bioguideId" FROM "Person" WHERE "bioguideId" IS NOT NULL AND "role" IN ('senator', 'representative') ORDER BY "id"`,
  );
  const wanted = new Set(people.map((p) => p.bioguideId));
  // Every term that ended in 2009 or later (a sitting member's earlier terms
  // included), paged: one request for a member would be 500 requests.
  const terms = new Map<string, GovTrackRole[]>();
  for (let offset = 0; ; offset += 500) {
    const page = await getJson<{ objects: GovTrackRole[]; meta: { total_count: number } }>(
      `https://www.govtrack.us/api/v2/role?enddate__gte=2009-01-01&limit=500&offset=${offset}&format=json`,
    );
    for (const role of page.objects) {
      const id = role.person.bioguideid;
      if (id && wanted.has(id)) terms.set(id, [...(terms.get(id) ?? []), role]);
    }
    if (offset + 500 >= page.meta.total_count) break;
    await sleep(500);
  }
  const year = new Date().getUTCFullYear();
  let saved = 0;
  for (const p of people.slice(0, limit)) {
    const lines = salaryEarnings(terms.get(p.bioguideId) ?? [], year);
    if (!lines.length) continue;
    const current = await Person.profile(p.id);
    // Keep every line that is not a salary line from this table (outside
    // income found by hand stays); replace the table's own.
    const kept: PersonEarning[] = (current?.earnings ?? []).filter((e) => !(e.kind === 'salary' && e.sourceUrl === CONGRESS_PAY_SOURCE));
    if (dry) console.log(p.name, `${lines.length} years`, lines[0].amount);
    else await Person.save({ name: p.name, earnings: [...kept, ...lines] }, p.id);
    saved += 1;
  }
  console.log(`${saved} salary histories ${dry ? 'read' : 'saved'}`);
}

// ---- --laws: sponsored bills that became law (Congress.gov) ------------------
async function laws() {
  const key = process.env.CONGRESS_API_KEY || 'DEMO_KEY';
  if (key === 'DEMO_KEY') console.log('CONGRESS_API_KEY is not set: DEMO_KEY allows about 10 requests an hour. A free key: https://api.congress.gov/sign-up/');
  const people = await db.query<{ id: number; name: string; bioguideId: string }>(
    `SELECT "p"."id", "p"."name", "p"."bioguideId" FROM "Person" AS "p"
     WHERE "p"."bioguideId" IS NOT NULL AND "p"."utcLawsCheckedDateTime" IS NULL
     ORDER BY "p"."id"`,
  );
  let done = 0;
  for (const p of people.slice(0, limit)) {
    const found: ReturnType<typeof lawContribution>[] = [];
    let url: string | null = `https://api.congress.gov/v3/member/${p.bioguideId}/sponsored-legislation?limit=250&format=json&api_key=${key}`;
    try {
      while (url) {
        const page: { sponsoredLegislation: CongressBill[]; pagination: { next?: string } } = await getJson(url);
        for (const bill of page.sponsoredLegislation) found.push(lawContribution(bill));
        url = page.pagination.next ? `${page.pagination.next}&api_key=${key}` : null;
        await sleep(key === 'DEMO_KEY' ? 400 : 120);
      }
    } catch (err) {
      console.log(`${p.name}: stopped (${(err as Error).message}); run again to continue`);
      break;
    }
    const list = found.filter((c): c is NonNullable<typeof c> => !!c);
    if (dry) console.log(p.name, `${list.length} laws`);
    else {
      if (list.length) await Person.save({ name: p.name, contributions: list }, p.id);
      // Recorded as looked up: a member with no enacted bill is not re-read every run.
      await db.query(`UPDATE "Person" SET "utcLawsCheckedDateTime" = now() WHERE "id" = $1`, [p.id]);
    }
    done += 1;
  }
  console.log(`${done} members read`);
}

async function main() {
  if (!flags.congress && !flags.enrich && !flags.tenure && !flags.former && !flags.education && !flags['education-wiki'] && !flags['salary-current'] && !flags['salary-former'] && !flags.salary && !flags.laws) {
    console.log('Nothing to do: pass --congress, --enrich, --tenure, --former, --education, --salary or --laws');
    return;
  }
  if (flags.congress) await congress();
  if (flags.enrich) await enrich();
  if (flags.education) await education();
  if (flags['education-wiki']) await educationWiki();
  if (flags['salary-current']) await salaryCurrent();
  if (flags['salary-former']) await salaryFormer();
  if (flags.former) await former();
  if (flags.tenure) await tenure();
  if (flags.salary) await salary();
  if (flags.laws) await laws();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
