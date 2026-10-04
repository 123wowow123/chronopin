// Link wikis for a server whose Anthropic key has no credit - or for any pin
// posted from this machine - written in a Claude Code session here and sent to
// the server over the admin API (src/server/services/prebuiltWikis.ts), so the
// server fetches no page and calls no model. Every heavy step runs on this
// machine; the server stores the finished wiki.
//
//   npm run wiki:prod -- export --out DIR --pending [--pin 5777,5732] [--limit 50]
//       the links the server has pending (GET /api/admin/source-wikis)
//   npm run wiki:prod -- export --out DIR --drafts DIR_OR_FILE...
//       the links of pin drafts (sourceUrl + references) not yet posted
//   npm run wiki:prod -- export --out DIR --links FILE
//       the links in FILE: a JSON array of urls or { url, kind?, title? }, or one url a line
//   npm run wiki:prod -- attach --dir DIR --drafts DIR_OR_FILE... [--by claude-code/claude-opus-5]
//       writes each draft's `sourceWikis` from the answers, so POST /api/admin/pins
//       saves the wikis with the pin and runs no wiki pipeline
//   npm run wiki:prod -- push --dir DIR [--by ...] [--rewrite] [--dry-run]
//       sends the answers for pending links (POST /api/admin/source-wikis)
//
// export writes DIR/prompts.md (the app's wiki prompts and schemas),
// DIR/wikis/<n>.json (a link to write up, its text in parts when long),
// DIR/text/<n>.json (the page text, sent along so the server can recheck it),
// DIR/index.json (n -> link) and DIR/blocked/<n>.txt (links that would not
// read). Answers go in DIR/results/wikis/<n>.json, in the shape wiki:apply
// takes: one page, or { parts: [...], root: {...} }.
//
// --base URL (default $CHRONOPIN_URL or https://www.chronopin.com) picks the
// server. The admin login for production is .scrape/admin.token (another server
// keeps .scrape/admin-<host>.token), refreshed from ADMIN_EMAIL / ADMIN_PASSWORD
// in .env.local when it has expired.

import '../env';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { sourceKind, type SourceKind } from '@/lib/sourceKind';
import { pageSchema, partContent, ROOT_PROMPT, splitText, WIKI_PROMPT, wikiHeader } from '@/server/extract/wiki';
import Source, { sourceKey } from '@/server/model/source';
import { fetchSourceText } from '@/server/scrape/sourceText';
import { isWikiPage, MAX_PREBUILT_WIKIS } from '@/server/services/prebuiltWikis';

const { positionals, values: flags } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: 'string' },
    dir: { type: 'string' },
    base: { type: 'string' },
    by: { type: 'string', default: 'claude-code/claude-opus-5' },
    pending: { type: 'boolean', default: false },
    pin: { type: 'string' },
    limit: { type: 'string' },
    links: { type: 'string' },
    drafts: { type: 'string', multiple: true },
    rewrite: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
  },
});
// parseArgs hands a repeated --drafts one value each; further paths follow it.
const draftPaths = [...(flags.drafts ?? []), ...positionals.slice(1)];

const BASE = (flags.base ?? process.env.CHRONOPIN_URL ?? 'https://www.chronopin.com').replace(/\/$/, '');
// The production login is the one run_prod.py shares; another server (a local
// dev one, say) keeps its own, so logging in there never replaces it.
const { host } = new URL(BASE);
const TOKEN_FILE = path.resolve(host === 'www.chronopin.com' ? '.scrape/admin.token' : `.scrape/admin-${host.replace(/\W+/g, '_')}.token`);

type Link = { url: string; kind: SourceKind; title?: string | null; pinIds?: number[] };
type Index = Record<string, Link>;

async function call(method: string, route: string, token?: string, body?: unknown) {
  const res = await fetch(BASE + route, {
    method,
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'chronopin-wiki/1.0', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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

async function adminToken(): Promise<string> {
  const kept = existsSync(TOKEN_FILE) ? readFileSync(TOKEN_FILE, 'utf8').trim() : '';
  if (kept && (await call('GET', '/api/users/me', kept)).status === 200) return kept;
  const { ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = process.env;
  if (!email || !password) throw new Error('no valid .scrape/admin.token, and ADMIN_EMAIL / ADMIN_PASSWORD are not in .env.local');
  const { status, data } = await call('POST', '/auth/local', undefined, { email, password });
  if (status !== 200 || !data?.token) throw new Error(`admin login failed: ${status}`);
  mkdirSync(path.dirname(TOKEN_FILE), { recursive: true });
  writeFileSync(TOKEN_FILE, data.token, { mode: 0o600 });
  return data.token;
}

const readJson = (file: string) => JSON.parse(readFileSync(file, 'utf8'));
const writeJson = (file: string, data: unknown) => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2));
};

// The draft files named: a file, or every .json under a directory.
function draftFiles(): string[] {
  if (!draftPaths.length) throw new Error('--drafts DIR_OR_FILE... is required');
  return draftPaths.flatMap((p) =>
    statSync(p).isDirectory()
      ? readdirSync(p).filter((f) => f.endsWith('.json')).sort().map((f) => path.join(p, f))
      : [p],
  );
}

// A draft's links: its sourceUrl, then its references, once each.
function draftLinks(draft: { sourceUrl?: string; references?: { url?: string }[] }): Link[] {
  const seen = new Set<string>();
  const links: Link[] = [];
  for (const url of [draft.sourceUrl, ...(draft.references ?? []).map((r) => r.url)]) {
    const key = sourceKey(url);
    if (!url || !key || seen.has(key)) continue;
    seen.add(key);
    links.push({ url: url.trim(), kind: sourceKind(url) });
  }
  return links;
}

// The text a link's wiki is written from: what this machine's database already
// holds, else a fresh read here (headless Chromium for most pages).
async function textOf(link: Link): Promise<{ text: string; title?: string }> {
  try {
    const kept = await Source.findByUrl(link.url);
    if (kept?.text) return { text: kept.text, title: kept.title ?? undefined };
  } catch {
    // no local database: read the page
  }
  const fetched = await fetchSourceText(link.url, link.kind);
  return { text: fetched.text, title: fetched.title ?? link.title ?? undefined };
}

async function exportJobs() {
  if (!flags.out) throw new Error('--out DIR is required');
  if (!flags.pending && !flags.links && !draftPaths.length) throw new Error('export needs --pending, --links FILE or --drafts');
  const out = path.resolve(flags.out);
  const limit = flags.limit ? Number(flags.limit) : 1000;
  const links: Link[] = [];
  if (flags.pending) {
    const token = await adminToken();
    const pins = flags.pin ? flags.pin.split(',').map(Number).filter(Boolean) : [undefined];
    for (const pinId of pins) {
      for (let offset = 0; links.length < limit; offset += 200) {
        const { status, data } = await call('GET', `/api/admin/source-wikis?limit=${Math.min(200, limit)}&offset=${offset}${pinId ? `&pinId=${pinId}` : ''}`, token);
        if (status !== 200) throw new Error(`GET /api/admin/source-wikis answered ${status}: ${JSON.stringify(data).slice(0, 200)}`);
        for (const s of data.sources) if (!links.some((l) => l.url === s.url)) links.push({ url: s.url, kind: s.kind, title: s.title, pinIds: s.pinIds });
        if (offset + 200 >= data.total) break;
      }
    }
  } else if (flags.links) {
    const raw = readFileSync(flags.links, 'utf8').trim();
    const listed: (string | Partial<Link>)[] = raw.startsWith('[') ? JSON.parse(raw) : raw.split('\n').map((l) => l.trim()).filter(Boolean);
    for (const item of listed) {
      const { url, kind, title } = typeof item === 'string' ? ({ url: item } as Partial<Link>) : item;
      if (url && sourceKey(url) && !links.some((l) => sourceKey(l.url) === sourceKey(url))) links.push({ url, kind: kind ?? sourceKind(url), title });
    }
  } else {
    for (const file of draftFiles()) {
      for (const link of draftLinks(readJson(file))) if (!links.some((l) => sourceKey(l.url) === sourceKey(link.url))) links.push(link);
    }
  }
  mkdirSync(out, { recursive: true });
  const index: Index = {};
  let n = 0;
  let written = 0;
  for (const link of links.slice(0, limit)) {
    n++;
    index[n] = link;
    try {
      const { text, title } = await textOf(link);
      const header = wikiHeader(link.url, link.kind, title ?? link.title);
      const parts = splitText(text);
      writeJson(path.join(out, 'text', `${n}.json`), { url: link.url, title: title ?? link.title ?? null, text });
      writeJson(path.join(out, 'wikis', `${n}.json`), {
        n,
        url: link.url,
        kind: link.kind,
        parts: parts.map((part, i) => partContent(header, part, i, parts.length)),
        answer:
          parts.length === 1
            ? `results/wikis/${n}.json = one page (schema: wiki page with topics and lastModified)`
            : `results/wikis/${n}.json = { parts: [one page per part, with topics], root: main page written from the parts (ROOT prompt, with lastModified) }`,
      });
      written++;
    } catch (err) {
      mkdirSync(path.join(out, 'blocked'), { recursive: true });
      writeFileSync(path.join(out, 'blocked', `${n}.txt`), `${link.url}\n${(err as Error).message}\n`);
      console.log(`link ${n}: could not read ${link.url} - ${(err as Error).message}`);
    }
  }
  writeJson(path.join(out, 'index.json'), index);
  writeFileSync(
    path.join(out, 'prompts.md'),
    [
      '# Wiki jobs',
      '',
      'Answer each wikis/<n>.json as the app would: follow the system prompt and return exactly the JSON its schema describes, one file per link under results/wikis/.',
      '',
      'System prompt for each part:',
      '',
      '```text', WIKI_PROMPT, '```',
      '',
      'Schema for a one-part link (the whole answer), and for each part of a longer one (drop lastModified there):',
      '',
      '```json', JSON.stringify(pageSchema({ topics: true, root: true }), null, 2), '```',
      '',
      'For a link in parts, the main page is written from the part pages with this system prompt, and the answer is { "parts": [...], "root": {...} }:',
      '',
      '```text', ROOT_PROMPT, '```',
      '',
      '```json', JSON.stringify(pageSchema({ topics: false, root: true }), null, 2), '```',
      '',
    ].join('\n'),
  );
  console.log(`${written} wiki job(s) of ${links.length} link(s) written to ${out}`);
}

type Answer = { url: string; kind: SourceKind; title?: string; text?: string; generatedBy: string; wiki: unknown };

// Every answered link in DIR, by n: the wiki, and the text it was written from.
function answers(dir: string): Map<number, Answer> {
  const index: Index = readJson(path.join(dir, 'index.json'));
  const folder = path.join(dir, 'results', 'wikis');
  const found = new Map<number, Answer>();
  if (!existsSync(folder)) return found;
  for (const file of readdirSync(folder).filter((f) => f.endsWith('.json'))) {
    const n = Number(path.basename(file, '.json'));
    const link = index[n];
    if (!link) {
      console.log(`results/wikis/${file}: no link ${n} in index.json - skipped`);
      continue;
    }
    const data = readJson(path.join(folder, file));
    const parts: unknown[] = data.parts ?? [data];
    if (!parts.every(isWikiPage) || (data.root !== undefined && !isWikiPage(data.root)) || (parts.length > 1 && !data.root)) {
      console.log(`results/wikis/${file}: not in the wiki page schema - skipped`);
      continue;
    }
    const textFile = path.join(dir, 'text', `${n}.json`);
    const kept = existsSync(textFile) ? readJson(textFile) : undefined;
    found.set(n, {
      url: link.url,
      kind: link.kind,
      title: kept?.title ?? link.title ?? undefined,
      text: kept?.text,
      generatedBy: flags.by!,
      wiki: data.parts ? { parts: data.parts, root: data.root } : data,
    });
  }
  return found;
}

async function attach() {
  if (!flags.dir) throw new Error('--dir DIR is required');
  const dir = path.resolve(flags.dir);
  const byKey = new Map([...answers(dir).values()].map((a) => [sourceKey(a.url), a]));
  let attached = 0;
  for (const file of draftFiles()) {
    const draft = readJson(file);
    const wikis = draftLinks(draft).flatMap((link) => byKey.get(sourceKey(link.url)) ?? []);
    const missing = draftLinks(draft).length - wikis.length;
    if (wikis.length > MAX_PREBUILT_WIKIS) throw new Error(`${file}: ${wikis.length} wikis, at most ${MAX_PREBUILT_WIKIS} per pin`);
    if (wikis.length) draft.sourceWikis = wikis;
    else delete draft.sourceWikis;
    writeJson(file, draft);
    attached += wikis.length;
    console.log(`${path.basename(file)}: ${wikis.length} wiki(s) attached${missing ? `, ${missing} link(s) without one` : ''}`);
  }
  console.log(`${attached} wiki(s) attached`);
}

async function push() {
  if (!flags.dir) throw new Error('--dir DIR is required');
  const found = [...answers(path.resolve(flags.dir)).values()];
  console.log(`${found.length} answered link(s)`);
  if (flags['dry-run'] || !found.length) return;
  const token = await adminToken();
  const tally: Record<string, number> = {};
  for (let i = 0; i < found.length; i += MAX_PREBUILT_WIKIS) {
    const { status, data } = await call('POST', '/api/admin/source-wikis', token, { wikis: found.slice(i, i + MAX_PREBUILT_WIKIS), rewrite: flags.rewrite });
    if (status !== 200) throw new Error(`POST /api/admin/source-wikis answered ${status}: ${JSON.stringify(data).slice(0, 300)}`);
    for (const r of data.results as { url: string; status: string; message?: string }[]) {
      tally[r.status] = (tally[r.status] ?? 0) + 1;
      if (r.status !== 'saved') console.log(`${r.status}: ${r.url}${r.message ? ` - ${r.message}` : ''}`);
    }
    console.log(`${Math.min(i + MAX_PREBUILT_WIKIS, found.length)}/${found.length} sent`);
  }
  console.log(Object.entries(tally).map(([k, v]) => `${v} ${k}`).join(', '));
}

const commands: Record<string, () => Promise<void>> = { export: exportJobs, attach, push };

(async () => {
  const run = commands[positionals[0]];
  if (!run) throw new Error(`usage: wiki:prod -- ${Object.keys(commands).join(' | ')} (see the top of scripts/wiki/prod.ts)`);
  await run();
})()
  .catch((err) => {
    console.log('wiki:prod failed:', (err as Error).message);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
