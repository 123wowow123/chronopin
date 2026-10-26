// Reviewed expansion of the 54 people created by the Autopilot import.
// Dry-run by default; content-only updates, never a deployment.
// npx tsx scripts/people/fullProfiles.ts [--apply] [--base https://www.chronopin.com]
import '../env';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { readPerson, type PersonInput } from '@/server/personInput';
import type { PersonProfile, PersonSummary } from '@/lib/people';

const { values } = parseArgs({ options: {
  apply: { type: 'boolean', default: false },
  base: { type: 'string', default: 'http://localhost:3000' },
} });
const base = values.base!.replace(/\/$/, '');
if (!['http://localhost:3000', 'https://www.chronopin.com'].includes(base)) throw new Error('Unsupported API host');
type Entry = { name: string; profile: PersonInput; sourcesChecked: string[]; gaps: string[] };
const catalog = JSON.parse(readFileSync('scripts/people/data/autopilot-full-profiles.json', 'utf8')) as {
  checkedAt: string; profiles: Entry[]; sourceAudit: { url: string; verification: string }[];
};
const work = `.scrape/autopilot-full-profiles-${catalog.checkedAt}/${base.includes('localhost') ? 'local' : 'prod'}`;
mkdirSync(work, { recursive: true });
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
// DB lists have their own ordering; compare their content independently of order.
function canonical(v: unknown): string {
  if (Array.isArray(v)) return JSON.stringify(v.map(canonical).sort());
  if (v && typeof v === 'object') return JSON.stringify(Object.entries(v).filter(([, x]) => x !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, canonical(x)]));
  return JSON.stringify(v);
}
let token = '';
async function call<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`${method} ${path}: HTTP ${response.status}`);
  return response.json() as Promise<T>;
}
function mergeRows<T>(before: T[], additions: T[], key: (r: T) => string): T[] {
  const result = [...before];
  for (const row of additions) {
    const i = result.findIndex(r => key(r) === key(row));
    if (i < 0) result.push(row);
    else result[i] = { ...result[i], ...row };
  }
  return result;
}
function merge(current: PersonProfile, patch: PersonInput): PersonInput {
  const result: Record<string, unknown> = { name: current.name };
  for (const [key, value] of Object.entries(patch)) {
    if (value == null || key === 'name') continue;
    if (!Array.isArray(value)) result[key] = value;
    else if (!['contributions', 'earnings', 'matters', 'researchNotes'].includes(key)) throw new Error(`Unsupported replacement list: ${key}`);
  }
  if (patch.contributions) {
    result.contributions = mergeRows(current.contributions, patch.contributions, r => `${r.kind}|${r.reference}|${r.title}`);
    // New text must not erase an existing separately researched impact assessment.
    for (const row of result.contributions as NonNullable<PersonInput['contributions']>) {
      const old = current.contributions.find(c => c.kind === row.kind && c.title === row.title && c.reference === row.reference);
      if (old?.impact && !row.impact) row.impact = old.impact;
    }
  }
  if (patch.earnings) result.earnings = mergeRows(current.earnings, patch.earnings, r => `${r.year}|${r.kind}|${r.label}`);
  if (patch.matters) result.matters = mergeRows(current.matters, patch.matters, r => `${r.kind}|${r.title}`);
  if (patch.researchNotes) {
    const notes = [...(current.researchNotes ?? [])];
    for (const note of patch.researchNotes) {
      const i = notes.findIndex(n => n.topic === note.topic);
      if (i < 0) notes.push(note);
      else if (!notes[i].note.includes(note.note)) {
        const combined = `${notes[i].note}\n\n${note.note}`;
        if (combined.length > 4000) throw new Error(`Research note requires manual merge: ${current.name}`);
        notes[i] = { ...notes[i], ...note, note: combined, unciteable: notes[i].unciteable };
      }
    }
    result.researchNotes = notes;
  }
  return readPerson(result);
}
function differences(input: PersonInput, current: PersonProfile): string[] {
  const clean = readPerson(current);
  return Object.entries(input).filter(([key, value]) => value != null && canonical(value) !== canonical(clean[key as keyof PersonInput])).map(([key]) => key);
}
async function main() {
  if (catalog.profiles.length !== 54 || new Set(catalog.profiles.map(e => e.name)).size !== 54) throw new Error('Expected the 54 distinct newly imported profiles');
  const sources = new Set(catalog.sourceAudit.filter(s => !s.verification.startsWith('Needs')).map(s => s.url));
  for (const entry of catalog.profiles) {
    const clean = readPerson(entry.profile);
    if (clean.name !== entry.name || !clean.description || clean.description.length < 400 || !clean.contributions?.length) throw new Error(`Incomplete expansion: ${entry.name}`);
    for (const [key, value] of Object.entries(entry.profile)) {
      // Reject dropped rows, truncated prose, unknown fields or normalized-away facts.
      const parsed = clean[key as keyof PersonInput];
      if (Array.isArray(value) && (!Array.isArray(parsed) || value.length !== parsed.length)) throw new Error(`Dropped ${key}: ${entry.name}`);
      if (typeof value === 'string' && parsed !== value) throw new Error(`Invalid ${key}: ${entry.name}`);
    }
    const cited = [...(clean.contributions ?? []), ...(clean.earnings ?? []), ...(clean.matters ?? [])].map(r => r.sourceUrl);
    if (clean.educationSourceUrl) cited.push(clean.educationSourceUrl);
    if (cited.some(url => !url?.startsWith('https://') || !sources.has(url))) throw new Error(`Unaudited source: ${entry.name}: ${cited.filter(u => !u || !sources.has(u)).join(', ')}`);
  }
  if (values.apply) {
    const { ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = process.env;
    if (!email || !password) throw new Error('Missing admin credentials');
    token = (await call<{ token: string }>('/auth/local', 'POST', { email, password })).token;
    if (!token) throw new Error('Login returned no token');
  }
  const index = await call<PersonSummary[]>('/api/people');
  const planned: { entry: Entry; current: PersonProfile; input: PersonInput; fields: string[] }[] = [];
  // Plan and validate every merge before the first write. Never create identities.
  for (const entry of catalog.profiles) {
    const matches = index.filter(p => p.name === entry.name);
    if (matches.length !== 1 || matches[0].id < 1275 || matches[0].id > 1328) throw new Error(`Unexpected identity: ${entry.name}`);
    const current = await call<PersonProfile>(`/api/people/${matches[0].id}`);
    const input = merge(current, entry.profile);
    planned.push({ entry, current, input, fields: differences(input, current) });
  }
  const report = [];
  for (const { entry, current, input, fields } of planned) {
    const row = { name: entry.name, id: current.id, action: fields.length ? 'update' : 'unchanged', fields, beforeHash: hash(current), afterHash: hash(current) };
    if (values.apply && fields.length) {
      const latest = await call<PersonProfile>(`/api/people/${current.id}`);
      if (hash(latest) !== hash(current)) throw new Error(`Concurrent edit: ${entry.name}; re-run to merge`);
      const backup = `${work}/before-${current.id}.json`;
      writeFileSync(backup, JSON.stringify(current, null, 2) + '\n', { flag: 'wx' });
      await call(`/api/people/${current.id}`, 'PUT', input);
      const after = await call<PersonProfile>(`/api/people/${current.id}`);
      const remaining = differences(input, after);
      if (remaining.length) throw new Error(`Saved fields differ for ${entry.name}: ${remaining.join(', ')}`);
      row.afterHash = hash(after);
      writeFileSync(`${work}/after-${current.id}.json`, JSON.stringify(after, null, 2) + '\n');
      console.log(`Updated ${entry.name} (#${current.id}); profile readback verified`);
    }
    if (values.apply) {
      const response = await fetch(`${base}/api/people/${current.id}/wiki?path=page`, { signal: AbortSignal.timeout(60_000) });
      const markdown = await response.text();
      const urls = [...(entry.profile.contributions ?? []), ...(entry.profile.earnings ?? []), ...(entry.profile.matters ?? [])].map(c => c.sourceUrl!);
      if (!response.ok || !markdown.includes(entry.name) || urls.some(url => !markdown.includes(url))) throw new Error(`Compiled wiki source verification failed: ${entry.name}`);
    }
    report.push(row);
    writeFileSync(`${work}/${values.apply ? 'report' : 'dry-run'}.json`, JSON.stringify(report, null, 2) + '\n');
  }
  console.log(JSON.stringify({ base, applied: values.apply, total: report.length, updated: report.filter(r => r.action === 'update').length, unchanged: report.filter(r => r.action === 'unchanged').length }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
