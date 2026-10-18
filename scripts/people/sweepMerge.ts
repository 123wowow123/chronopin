// Matches official-list sweeps (House Ethics press releases, OCC/OCE
// referrals, DOJ prosecutions, the House's own discipline list) to the people
// in the database and writes two files people:radar / people:notes read:
//
//   npm run people:sweep -- --out <dir> sweeps/ethics.json sweeps/oce.json ...
//
//   <dir>/sweep-matters.json  [{ id, name, mattersChecked, matters, note }]
//   <dir>/sweep-unmatched.json names no one in the database matched
//   <dir>/sweep-ambiguous.json names that matched several people
//
// A sweep entry is { name, state?, matter: { title, kind, status, authority,
// filedDate, resolvedDate, penalty, summary, sourceUrl, evidenceQuote } }.
// Only matters with an outcome are written (a review still open, or an
// extension notice, is not a matter yet); a charge from DOJ is kept. The note
// says which lists were swept and what the sweep found for the person, and is
// appended to a note an earlier search left for the same topic.

import '../env';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';

const { values: flags, positionals } = parseArgs({ allowPositionals: true, options: { out: { type: 'string' }, date: { type: 'string' } } });

const STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia', PR: 'Puerto Rico', GU: 'Guam', VI: 'Virgin Islands', AS: 'American Samoa', MP: 'Northern Mariana',
};
const SUFFIX = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'v']);
// Common short forms: a published first name against the one the person page uses.
const NICK: Record<string, string> = { steve: 'stephen', steven: 'stephen', louis: 'louie', madeline: 'madeleine', stefan: 'stephen', bill: 'william', billy: 'william', bob: 'robert', bobby: 'robert', rob: 'robert', dick: 'richard', rick: 'richard', jim: 'james', jimmy: 'james', joe: 'joseph', mike: 'michael', tom: 'thomas', tim: 'timothy', ted: 'edward', ed: 'edward', dave: 'david', dan: 'daniel', chris: 'christopher', matt: 'matthew', tony: 'anthony', andy: 'andrew', greg: 'gregory', pete: 'peter', ken: 'kenneth', jeff: 'jeffrey', chuck: 'charles', charlie: 'charles', randy: 'randall', ron: 'ronald', don: 'donald', larry: 'lawrence', sam: 'samuel', ben: 'benjamin', nick: 'nicholas', pat: 'patrick', jack: 'john', johnny: 'john', jon: 'jonathan', hank: 'henry', bud: 'howard', jerry: 'gerald', vern: 'vernon', mo: 'maurice' };

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/[‘’ʻ`´]/g, "'").toLowerCase();
function parts(name: string) {
  const nick = [...name.matchAll(/["“”]([^"“”]+)["“”]/g)].map((m) => fold(m[1]).replace(/[^a-z]/g, ''));
  const tokens = fold(name.replace(/["“”][^"“”]+["“”]/g, ' '))
    .replace(/[.,]/g, ' ')
    .split(/[\s]+/)
    .map((t) => t.replace(/'/g, ''))
    .filter((t) => t && !SUFFIX.has(t.replace(/\./g, '')));
  const last = tokens.at(-1) ?? '';
  const first = tokens[0] ?? '';
  return { first, last, tokens, nick };
}
const canon = (f: string) => NICK[f] ?? f;
function matches(a: ReturnType<typeof parts>, b: ReturnType<typeof parts>): boolean {
  if (a.last !== b.last) return false;
  const af = [a.first, ...a.nick].map(canon);
  const bf = [b.first, ...b.nick].map(canon);
  if (af.some((x) => bf.includes(x))) return true;
  // One first name is a prefix or initial of the other (Pete / Peter, J. / John).
  return af.some((x) => bf.some((y) => x.length >= 1 && y.length >= 1 && (x.startsWith(y) || y.startsWith(x)) && Math.min(x.length, y.length) >= (x.length === 1 || y.length === 1 ? 1 : 3)));
}

type Sweep = { name: string; state?: string | null; matter: Record<string, unknown> };
const RESOLVED = new Set(['convicted', 'pleaded-guilty', 'acquitted', 'dismissed', 'closed-no-action', 'settled', 'found-liable', 'sanctioned', 'findings-issued', 'pardoned', 'overturned']);

async function main() {
  const out = flags.out;
  if (!out) throw new Error('--out <dir> is required');
  mkdirSync(out, { recursive: true });
  const date = flags.date ?? new Date().toISOString().slice(0, 10);
  const people = await db.query<{ id: number; name: string; role: string; jurisdiction: string | null; office: string | null }>(
    `SELECT "id", "name", "role", "jurisdiction", "office" FROM "Person"`,
  );
  const indexed = people.map((p) => ({ ...p, p: parts(p.name) }));
  const byLast = new Map<string, typeof indexed>();
  for (const p of indexed) byLast.set(p.p.last, [...(byLast.get(p.p.last) ?? []), p]);

  const perPerson = new Map<number, { name: string; matters: Record<string, unknown>[]; seen: Set<string>; lists: Set<string>; open: number }>();
  const unmatched = new Map<string, number>();
  const ambiguous: { name: string; state: string | null; candidates: string[] }[] = [];
  let entries = 0;
  for (const file of positionals) {
    const list = path.basename(file).replace(/\.json$/, '');
    for (const e of JSON.parse(readFileSync(file, 'utf8')) as Sweep[]) {
      entries += 1;
      const want = parts(e.name);
      let cands = (byLast.get(want.last) ?? []).filter((c) => matches(want, c.p));
      if (cands.length > 1 && e.state) {
        const st = STATES[e.state] ?? e.state;
        const narrowed = cands.filter((c) => `${c.jurisdiction ?? ''} ${c.office ?? ''}`.includes(st));
        if (narrowed.length) cands = narrowed;
      }
      if (cands.length > 1) {
        // The fullest name wins: a published middle name or a nickname that equals the stored one.
        const exact = cands.filter((c) => c.p.tokens.join(' ') === want.tokens.join(' '));
        if (exact.length === 1) cands = exact;
      }
      if (cands.length !== 1) {
        if (cands.length === 0) unmatched.set(e.name, (unmatched.get(e.name) ?? 0) + 1);
        else ambiguous.push({ name: e.name, state: e.state ?? null, candidates: cands.map((c) => `${c.id} ${c.name}`) });
        continue;
      }
      const person = cands[0];
      const slot = perPerson.get(person.id) ?? { name: person.name, matters: [], seen: new Set<string>(), lists: new Set<string>(), open: 0 };
      perPerson.set(person.id, slot);
      slot.lists.add(list);
      const status = String(e.matter.status);
      if (!(RESOLVED.has(status) || (status === 'charged' && list === 'doj'))) {
        slot.open += 1;
        continue;
      }
      const key = `${e.matter.sourceUrl}|${e.matter.title}`;
      if (slot.seen.has(key)) continue;
      slot.seen.add(key);
      // A press-release headline ("Statement of the Chairman and Ranking
      // Member ... Regarding Representative X") says nothing on its own: lead
      // with the neutral one-line summary and keep the headline in the summary.
      const m = { ...e.matter };
      const title = String(m.title ?? '');
      const sum = String(m.summary ?? '').trim();
      if (/^(statement|report|notice|committee|press release|in the matter)/i.test(title) && sum) {
        const lead = sum.length > 220 ? `${sum.slice(0, 217).trimEnd()}...` : sum;
        m.title = lead;
        m.summary = `Official record: ${title}`;
      }
      slot.matters.push(m);
    }
  }

  const result = [...perPerson.entries()]
    .filter(([, v]) => v.matters.length)
    .map(([id, v]) => ({
      id,
      name: v.name,
      mattersChecked: true,
      matters: v.matters,
      note: `Official-list sweep ${date}: ${v.matters.length} matter(s) with an outcome found (${[...v.lists].join(', ')})${v.open ? `; ${v.open} open review(s) or notices not stored until they have an outcome` : ''}.`,
    }));
  writeFileSync(path.join(out, 'sweep-matters.json'), JSON.stringify(result, null, 1));
  writeFileSync(path.join(out, 'sweep-unmatched.json'), JSON.stringify([...unmatched.entries()].map(([name, n]) => ({ name, n })), null, 1));
  writeFileSync(path.join(out, 'sweep-ambiguous.json'), JSON.stringify(ambiguous, null, 1));
  // One note per representative and per anyone the sweeps named: what was
  // swept, and what it found for this person. An earlier individual search's
  // note is kept after it.
  const swept =
    "checked the House Ethics Committee press-release archive (1998-12 to 2026-08, 493 releases), the Office of Congressional Conduct investigations table (referrals 2009-06 to 2026-03), the House's list of expulsions, censures and reprimands (1976-2026), and a best-effort list of DOJ prosecutions of members since 2000";
  const gaps =
    'Not swept: FEC enforcement, state ethics and bar bodies, court dockets outside DOJ cases, and reviews the OCE board dismissed without referral. Open reviews and notices without an outcome are not stored as matters.';
  const prior = new Map(
    (await db.query<{ personId: number; note: string }>(`SELECT "personId", "note" FROM "PersonResearchNote" WHERE "topic" = 'legal'`)).map((r) => [r.personId, r.note]),
  );
  const noteFor = (id: number, name: string) => {
    const v = perPerson.get(id);
    const found = v?.matters.length
      ? `${v.matters.length} matter(s) with an outcome stored (${[...v.lists].join(', ')}).`
      : v
        ? `Named in ${[...v.lists].join(', ')} with no outcome yet (open review or notice only).`
        : 'Not named in any of these lists.';
    const before = prior.get(id) && !/^Official-list sweep/.test(prior.get(id)!) ? ` Earlier search: ${prior.get(id)}` : '';
    return { id, name, note: `Official-list sweep ${date}: ${swept}. ${found} ${gaps}${before}`.slice(0, 3900) };
  };
  const notes = people.filter((p) => p.role === 'representative' || perPerson.has(p.id)).map((p) => noteFor(p.id, p.name));
  writeFileSync(path.join(out, 'sweep-notes.json'), JSON.stringify(notes, null, 1));
  writeFileSync(path.join(out, 'sweep-people.json'), JSON.stringify([...perPerson.entries()].map(([id, v]) => ({ id, name: v.name, lists: [...v.lists], resolved: v.matters.length, open: v.open })), null, 1));
  console.log(`${notes.length} notes; ${entries} entries; ${perPerson.size} people matched, ${result.length} with a stored matter; ${unmatched.size} unmatched names; ${ambiguous.length} ambiguous`);
}

main()
  .catch((err) => {
    console.error(err.message ?? err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
