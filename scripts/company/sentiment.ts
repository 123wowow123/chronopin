// Scores how each company pin reads as news for its company (see
// src/server/extract/pinSentiment.ts), for the graph a company search shows.
// Saving a pin scores it; this catches up on pins from before, from while the
// API key had no credit, and whose title or summary changed since. Scores are
// kept in PinSentiment, which `npm run backup:data` saves.
//
//   npm run companies:sentiment                  every pin that needs a score
//   npm run companies:sentiment -- --limit 50    at most 50 of them
//   npm run companies:sentiment -- --dry-run     count them, call nothing
//   npm run companies:sentiment -- --products    read the product of pins scored
//                                                without one (their scores stay)
//
// With no credit on the key, score them by hand instead:
//
//   npm run companies:sentiment -- --export pins.json    what needs a score, and the rubric
//   npm run companies:sentiment -- --apply scores.json   [{ "id": 12, "sentiment": 0.5, "product": "iPhone" }, ...]
//
// With --products, --export lists the pins that need only a product, and
// --apply takes [{ id, product, textHash }] (product "" for none). An applied
// score is only saved while the pin's text is still what was
// exported, so a pin edited in between waits for the next run.
//
//   npm run companies:sentiment -- --prod --token-file <path> [--token-file <path> ...] [--dry-run]
//       prod: asks www.chronopin.com which pins need a score and sends the
//       scores this DB has for the same text (GET/PUT /api/pins/sentiments).
//       A token is an admin's, or a curator's, which scores only its own
//       pins: with several, each score goes with the first token prod takes.

import '../env';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { clampSentiment, PIN_SENTIMENT_PROMPT, scorePinText } from '@/server/extract/pinSentiment';
import PinSentiment, { sameText, shortHash } from '@/server/model/pinSentiment';

const { values: flags } = parseArgs({
  options: {
    limit: { type: 'string' },
    'dry-run': { type: 'boolean' },
    export: { type: 'string' },
    apply: { type: 'string' },
    products: { type: 'boolean' },
    workers: { type: 'string', default: '6' },
    prod: { type: 'boolean', default: false },
    base: { type: 'string', default: 'https://www.chronopin.com' },
    'token-file': { type: 'string', multiple: true },
  },
});

async function run() {
  if (flags.prod) return prod();
  if (flags.products) return products();
  if (flags.apply) {
    const scores = JSON.parse(readFileSync(flags.apply, 'utf8')) as { id: number; sentiment: number; product?: string; textHash?: string }[];
    let saved = 0;
    for (const { id, sentiment, product, textHash } of scores) {
      const context = await PinSentiment.context(id);
      if (!context || typeof sentiment !== 'number' || !Number.isFinite(sentiment)) continue;
      if (textHash && !sameText(context, textHash)) {
        console.log(`pin ${id}: its text changed since the export, skipped`);
        continue;
      }
      // A score given without a product leaves it for --products.
      await PinSentiment.set(id, context, clampSentiment(sentiment), typeof product === 'string' ? product : undefined);
      saved++;
    }
    console.log(`saved ${saved} of ${scores.length}`);
    return;
  }

  const pins = await PinSentiment.unscored(flags.limit ? Number(flags.limit) : 100_000);
  console.log(`${pins.length} pin(s) to score`);
  if (flags.export) {
    writeFileSync(
      flags.export,
      JSON.stringify(
        {
          rubric: PIN_SENTIMENT_PROMPT,
          answer: 'A JSON array of { id, sentiment, product, textHash } for --apply, textHash copied from the pin, product "" for none.',
          pins: await withKnownProducts(pins.map((p) => ({ id: p.id, companyId: p.companyId, company: p.company, title: p.title, summary: p.description ?? '', textHash: shortHash(p) }))),
        },
        null,
        2,
      ),
    );
    console.log(`wrote ${flags.export}`);
    return;
  }
  if (flags['dry-run']) return;

  let scored = 0;
  for (const pin of pins) {
    const score = await scorePinText({ ...pin, products: await PinSentiment.productsOf(pin.companyId) });
    if (!score) {
      console.log(`pin ${pin.id}: not scored`);
      continue;
    }
    await PinSentiment.set(pin.id, pin, score.sentiment, score.product);
    scored++;
  }
  console.log(`scored ${scored} of ${pins.length}`);
}

// The export's pins, each with the product names its company already uses
// (the rest of the export's answers are not in the database yet, so a
// hand-scorer keeps a company's names consistent by reading down the file).
async function withKnownProducts<T extends { companyId: number }>(pins: T[]) {
  const known = new Map<number, string[]>();
  for (const { companyId } of pins) if (!known.has(companyId)) known.set(companyId, await PinSentiment.productsOf(companyId));
  return pins.map((p) => ({ ...p, knownProducts: known.get(p.companyId) }));
}

// Products for pins already scored: the same call, keeping only its product,
// so the graph's scores do not move. One company per worker, oldest pin
// first, so each call sees the names the company's earlier pins were given.
async function products() {
  if (flags.apply) {
    const rows = JSON.parse(readFileSync(flags.apply, 'utf8')) as { id: number; product: string | null; textHash: string }[];
    let saved = 0;
    for (const { id, product, textHash } of rows) {
      if (await PinSentiment.setProduct(id, String(textHash ?? ''), product ?? null)) saved++;
      else console.log(`pin ${id}: its text changed since the export, skipped`);
    }
    console.log(`saved ${saved} of ${rows.length}`);
    return;
  }

  const pins = await PinSentiment.withoutProduct(flags.limit ? Number(flags.limit) : 100_000);
  const companies = Map.groupBy(pins, (p) => p.companyId);
  console.log(`${pins.length} pin(s) from ${companies.size} companies need a product`);
  if (flags.export) {
    writeFileSync(
      flags.export,
      JSON.stringify(
        {
          rubric: PIN_SENTIMENT_PROMPT,
          answer: 'A JSON array of { id, product, textHash } for --products --apply, textHash copied from the pin, product "" for none. Ignore the rubric\'s score.',
          pins: await withKnownProducts(pins.map((p) => ({ id: p.id, companyId: p.companyId, company: p.company, title: p.title, summary: p.description ?? '', textHash: p.textHash }))),
        },
        null,
        2,
      ),
    );
    console.log(`wrote ${flags.export}`);
    return;
  }
  if (flags['dry-run']) return;

  const queue = [...companies.values()];
  let saved = 0;
  let failed = 0;
  const worker = async () => {
    for (let group = queue.shift(); group; group = queue.shift()) {
      for (const pin of group) {
        const score = await scorePinText({ ...pin, products: await PinSentiment.productsOf(pin.companyId) });
        if (!score) failed++;
        else if (await PinSentiment.setProduct(pin.id, pin.textHash, score.product)) saved++;
      }
      console.log(`${group[0].company}: done (${saved} saved, ${failed} failed, ${queue.length} companies left)`);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Number(flags.workers) || 1) }, worker));
  console.log(`read the product of ${saved} of ${pins.length}${failed ? `, ${failed} failed` : ''}`);
}

// Scores for the pins prod lists as needing one, where this DB scored the
// same text (its stored hash starts with prod's short one).
async function prod() {
  if (!flags['token-file']?.length) throw new Error('--prod needs --token-file');
  const headers = flags['token-file'].map((file) => ({ Authorization: `Bearer ${readFileSync(file, 'utf8').trim()}`, 'Content-Type': 'application/json' }));
  const res = await fetch(`${flags.base}/api/pins/sentiments`, { headers: headers[0] });
  if (!res.ok) throw new Error(`GET: ${res.status} ${await res.text()}`);
  const needed = (await res.json()) as { id: number; textHash: string }[];
  const local = new Map((await PinSentiment.getAll()).map((row) => [row.pinId, row]));
  type Score = { id: number; sentiment: number; product?: string; textHash: string };
  const scores: Score[] = [];
  let changed = 0;
  for (const { id, textHash } of needed) {
    const row = local.get(id);
    if (!row) continue;
    if (!row.textHash.startsWith(textHash)) {
      changed++;
      continue;
    }
    // A product read from this text goes too ("" for none); one never read stays unread.
    const product = row.productHash === row.textHash ? (row.product ?? '') : undefined;
    scores.push({ id, sentiment: row.sentiment, ...(product === undefined ? {} : { product }), textHash });
  }
  console.log(`${needed.length} pins on ${flags.base} need a score; ${scores.length} scored here from the same text, ${changed} scored here from other text, ${needed.length - scores.length - changed} not scored here`);
  if (flags['dry-run'] || !scores.length) return;
  let left = scores;
  for (const [t, header] of headers.entries()) {
    const refusedNow: Score[] = [];
    for (let i = 0; i < left.length; i += 200) {
      const batch = left.slice(i, i + 200);
      const put = await fetch(`${flags.base}/api/pins/sentiments`, { method: 'PUT', headers: header, body: JSON.stringify(batch) });
      if (!put.ok) throw new Error(`PUT: ${put.status} ${await put.text()}`);
      const { saved, refused } = (await put.json()) as { saved: number; refused: { id: number; reason: string }[] };
      if (saved) console.log(`Token ${t + 1}: saved ${saved}`);
      for (const r of refused) {
        const score = batch.find((b) => b.id === r.id);
        if (score && r.reason === 'not your pin') refusedNow.push(score);
        else console.log(`pin ${r.id}: ${r.reason}`);
      }
    }
    left = refusedNow;
    if (!left.length) break;
  }
  if (left.length) console.log(`No token could score ${left.length}: ${left.map((s) => s.id).join(', ')}`);
}

run()
  .catch((err) => {
    console.log('companies:sentiment failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
