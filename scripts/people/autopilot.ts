// Replays the reviewed public Autopilot people catalog through the admin APIs.
// Dry-run by default. Content updates do not require an application deployment.
//   npx tsx scripts/people/autopilot.ts [--apply] [--base https://www.chronopin.com]
import '../env';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { readPerson, type PersonInput } from '@/server/personInput';
import type { PersonProfile, PersonSummary } from '@/lib/people';

const { values } = parseArgs({ options: {
  apply: { type: 'boolean', default: false },
  base: { type: 'string', default: 'http://localhost:3000' },
  file: { type: 'string', default: 'scripts/people/data/autopilot.json' },
} });
const base = values.base!.replace(/\/$/, '');
if (!['http://localhost:3000', 'https://www.chronopin.com'].includes(base)) throw new Error('Unsupported API host');
type Entry = { name: string; aliases: string[]; profile: PersonInput; autopilotSources: string[] };
const catalog = JSON.parse(readFileSync(values.file!, 'utf8')) as { checkedAt: string; profiles: Entry[] };
const work = `.scrape/autopilot-people-${catalog.checkedAt}/${base.includes('localhost') ? 'local' : 'prod'}`;
mkdirSync(work, { recursive: true });
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
let token = '';
async function call<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`${method} ${path}: HTTP ${response.status}`);
  return response.json() as Promise<T>;
}
async function login() {
  const { ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = process.env;
  if (!email || !password) throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required for --apply');
  const result = await call<{ token: string }>('/auth/local', 'POST', { email, password });
  if (!result.token) throw new Error('Admin login returned no token');
  token = result.token;
}
function merge(current: PersonProfile | null, addition: PersonInput): PersonInput {
  // Only fill missing scalar facts. Existing dates, offices, descriptions,
  // authored phases, financial records and legal records remain authoritative.
  const result: Record<string, unknown> = { name: addition.name };
  for (const [key, value] of Object.entries(addition)) {
    if (['name', 'contributions', 'researchNotes'].includes(key) || value == null) continue;
    if (Array.isArray(value)) throw new Error(`Unexpected replacement list: ${key}`);
    if (!current || current[key as keyof PersonProfile] == null || current[key as keyof PersonProfile] === '') result[key] = value;
  }
  const contributions = [...(current?.contributions ?? [])];
  for (const row of addition.contributions ?? []) {
    const index = contributions.findIndex(c => c.kind === row.kind && c.title === row.title && c.reference === row.reference);
    if (index < 0) contributions.push(row);
    // A reviewed record already present is retained, rather than overwritten.
  }
  if (addition.contributions) result.contributions = contributions;
  const notes = [...(current?.researchNotes ?? [])];
  for (const note of addition.researchNotes ?? []) {
    const index = notes.findIndex(n => n.topic === note.topic);
    if (index < 0) notes.push(note);
    else if (!notes[index].note.includes(note.note)) {
      const combined = `${notes[index].note}\n\n${note.note}`;
      if (combined.length > 4000) throw new Error(`${addition.name}: existing research note needs manual merge`);
      notes[index] = { ...notes[index], note: combined };
    }
  }
  if (addition.researchNotes) result.researchNotes = notes.sort((a, b) => a.topic.localeCompare(b.topic));
  return readPerson(result);
}
async function main() {
  const names = new Set<string>();
  // Validate the entire researched catalog before authenticating or saving.
  for (const entry of catalog.profiles) {
    if (names.has(entry.name)) throw new Error(`Duplicate catalog identity: ${entry.name}`);
    names.add(entry.name);
    const clean = readPerson(entry.profile);
    if (entry.profile.photoUrl && (!clean.photoUrl || !entry.profile.photoUrl.startsWith('https://chronopin.blob.core.windows.net/'))) {
      throw new Error(`Profile image must use verified public Azure storage: ${entry.name}`);
    }
    if (clean.name !== entry.name || !(clean.contributions?.length)) throw new Error(`Incomplete catalog entry: ${entry.name}`);
    if (clean.contributions.some(c => !c.sourceUrl)) throw new Error(`Unsourced contribution: ${entry.name}`);
  }
  if (values.apply) await login();
  const index = await call<PersonSummary[]>('/api/people');
  const report: { name: string; action: string; id?: number; beforeHash?: string; afterHash?: string }[] = [];
  for (const entry of catalog.profiles) {
    // Deliberately do not match aliases: Steve Cohen the congressman is not
    // Steven A. Cohen the investor. Canonical names were resolved in research.
    const matches = index.filter(p => p.name === entry.name);
    if (matches.length > 1) throw new Error(`Ambiguous existing identity: ${entry.name}`);
    const existing = matches[0];
    const current = existing ? await call<PersonProfile>(`/api/people/${existing.id}`) : null;
    const input = merge(current, entry.profile);
    const normalizedCurrent = current ? readPerson(current) : null;
    const changed = !normalizedCurrent || Object.entries(input).some(([key, value]) => {
      if (value == null) return false; // readPerson fills absent scalars with null.
      return JSON.stringify(value) !== JSON.stringify(normalizedCurrent[key as keyof PersonInput]);
    });
    if (!changed) { report.push({ name: entry.name, action: 'unchanged', id: existing.id }); continue; }
    const action = existing ? 'update' : 'create';
    if (!values.apply) { report.push({ name: entry.name, action }); continue; }
    if (current) {
      writeFileSync(`${work}/before-${current.id}.json`, JSON.stringify(current, null, 2) + '\n');
      const latest = await call<PersonProfile>(`/api/people/${current.id}`);
      if (hash(latest) !== hash(current)) throw new Error(`Concurrent edit: ${entry.name}; re-run to merge fresh data`);
    }
    const saved = await call<{ id: number }>(existing ? `/api/people/${existing.id}` : '/api/people', existing ? 'PUT' : 'POST', input);
    if (existing && saved.id !== existing.id) throw new Error(`Identity changed: ${entry.name}`);
    const after = await call<PersonProfile>(`/api/people/${saved.id}`);
    const cleanAfter = readPerson(after);
    for (const [key, value] of Object.entries(input)) {
      if (value == null) continue;
      if (JSON.stringify(value) !== JSON.stringify(cleanAfter[key as keyof PersonInput])) throw new Error(`Saved ${key} differs: ${entry.name}`);
    }
    // Confirm that the compiled wiki backing the actual detail page includes
    // every added source, rather than trusting the mutation response alone.
    const wiki = await fetch(`${base}/api/people/${saved.id}/wiki?path=page`, { signal: AbortSignal.timeout(60_000) });
    const markdown = await wiki.text();
    if (!wiki.ok || !markdown.includes(entry.name) || entry.profile.contributions!.some(c => !markdown.includes(c.sourceUrl!))) throw new Error(`Compiled wiki verification failed: ${entry.name}`);
    writeFileSync(`${work}/after-${saved.id}.json`, JSON.stringify(after, null, 2) + '\n');
    report.push({ name: entry.name, action, id: saved.id, ...(current ? { beforeHash: hash(current) } : {}), afterHash: hash(after) });
    writeFileSync(`${work}/report.json`, JSON.stringify(report, null, 2) + '\n');
    console.log(`${action} ${entry.name} (#${saved.id}) — verified profile and wiki`);
  }
  const finalIndex = await call<PersonSummary[]>('/api/people');
  if (values.apply && catalog.profiles.some(e => !finalIndex.some(p => p.name === e.name))) throw new Error('Directory coverage verification failed');
  writeFileSync(`${work}/${values.apply ? 'report' : 'dry-run'}.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ base, applied: values.apply, total: report.length, created: report.filter(p => p.action === 'create').length, updated: report.filter(p => p.action === 'update').length, unchanged: report.filter(p => p.action === 'unchanged').length }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
