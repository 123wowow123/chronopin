// Sends the dining rubrics in scripts/restaurants/diningRubric.json to a
// running server (production by default) through its API: the rubric, the
// pages it was read from as references, and their wikis. The list's pin ids
// are this machine's, so each pin is found on the server by its sourceUrl
// (GET /api/admin/db/Pin?sourceUrl=...); one that is missing or ambiguous is
// skipped and reported.
//
// Sign-in is flynni2008@gmail.com with a password typed at the prompt (not
// echoed, not stored, never an argument or an env var); the token is kept for
// the run only.
//
//   npm run restaurants:dining:prod                      all entries to www.chronopin.com
//   npm run restaurants:dining:prod -- --dry             find the pins, send nothing
//   npm run restaurants:dining:prod -- --base http://localhost:3000
//
// Needs migration 0170 applied on the server (deploys run it).

import '../env';
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';

const { values: flags } = parseArgs({ options: { dry: { type: 'boolean', default: false }, base: { type: 'string' }, file: { type: 'string' } } });
const BASE = (flags.base ?? 'https://www.chronopin.com').replace(/\/$/, '');
const EMAIL = 'flynni2008@gmail.com';

type Source = { url: string; title?: string; reasoning?: string; text?: string; wiki?: Record<string, unknown> };
type Entry = { pinId: number; scores: Record<string, unknown>; basis?: string | null; sourceUrl?: string | null; reviews?: unknown; sources?: Source[] };

async function call(method: string, route: string, token?: string, body?: unknown) {
  const res = await fetch(BASE + route, {
    method,
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'chronopin-dining/1.0', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data: any = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // not JSON: the status and the start of the text say enough
  }
  return { status: res.status, data };
}

// A line from the terminal with the typed characters hidden.
function askPassword(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const write = (rl as any)._writeToOutput;
    process.stdout.write(prompt);
    (rl as any)._writeToOutput = (s: string) => {
      if (s.includes('\n') || s.includes('\r')) write.call(rl, s);
    };
    rl.question('', (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

async function run() {
  const entries: Entry[] = JSON.parse(readFileSync(flags.file ?? new URL('./diningRubric.json', import.meta.url), 'utf8'));
  if (!process.stdin.isTTY) throw new Error('Run this from an interactive terminal: it asks for the password.');
  const password = await askPassword(`Password for ${EMAIL} on ${BASE}: `);
  const login = await call('POST', '/auth/local', undefined, { email: EMAIL, password });
  if (login.status !== 200 || !login.data?.token) throw new Error(`sign-in failed: ${login.status}`);
  const token: string = login.data.token;

  let sent = 0;
  const problems: string[] = [];
  for (const entry of entries) {
    const [local] = await db.query<{ sourceUrl: string; title: string }>(`SELECT "sourceUrl", "title" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [entry.pinId]);
    if (!local?.sourceUrl) {
      problems.push(`local pin ${entry.pinId}: not found or has no sourceUrl`);
      continue;
    }
    const found = await call('GET', `/api/admin/db/Pin?sourceUrl=${encodeURIComponent(local.sourceUrl)}&utcDeletedDateTime.null=true&limit=5`, token);
    const rows: { id: number }[] = found.data?.rows ?? [];
    if (found.status !== 200 || rows.length !== 1) {
      problems.push(`${local.title}: ${rows.length} pins on the server with that sourceUrl (status ${found.status}), skipped`);
      continue;
    }
    const id = rows[0].id;
    console.log(`${local.title}: local ${entry.pinId} -> ${BASE} pin ${id}`);
    if (flags.dry) continue;

    const body = { ...entry.scores, ...(entry.reviews === undefined ? {} : { reviews: entry.reviews }), source: 'session', basis: entry.basis ?? null, sourceUrl: entry.sourceUrl ?? null };
    const put = await call('PUT', `/api/pins/${id}/dining`, token, body);
    if (put.status !== 200) {
      problems.push(`${local.title}: rubric PUT answered ${put.status} ${JSON.stringify(put.data).slice(0, 200)}`);
      continue;
    }
    const sources = entry.sources ?? [];
    if (sources.length) {
      const refs = await call('POST', `/api/pins/${id}/references`, token, {
        references: sources.map((s) => ({ url: s.url, title: s.title, confidence: 90, reasoning: s.reasoning })),
      });
      if (![200, 201].includes(refs.status)) problems.push(`${local.title}: references POST answered ${refs.status} ${JSON.stringify(refs.data).slice(0, 200)}`);
      const wikis = sources
        .filter((s) => s.wiki)
        .map((s) => ({ url: s.url, title: s.title, text: s.text, generatedBy: 'claude-code/claude-sonnet-5-5', wiki: s.wiki }));
      if (wikis.length) {
        const saved = await call('POST', '/api/admin/source-wikis', token, { wikis });
        for (const r of saved.data?.results ?? []) console.log(`  wiki ${r.status}: ${r.url}${r.message ? ` (${r.message})` : ''}`);
        if (saved.status !== 200) problems.push(`${local.title}: wikis POST answered ${saved.status}`);
      }
    }
    sent++;
  }
  for (const line of problems) console.log(`problem: ${line}`);
  console.log(`${entries.length} entries: ${flags.dry ? 'dry run' : `${sent} sent`}, ${problems.length} problems`);
  return problems.length ? 1 : 0;
}
run()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  });
