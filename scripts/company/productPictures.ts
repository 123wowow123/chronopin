// Finds pictures for company product lines none of whose pins has one, for
// the Major products panel (0079; src/server/productPicture.ts: Wikipedia's
// lead image, then Google image search when GOOGLE_SEARCH_API_KEY and
// GOOGLE_SEARCH_ENGINE_ID are set). Every lookup runs here, on the dev machine.
//
//   npm run products:pictures                        local DB: products never looked up
//   npm run products:pictures -- --retry             and the ones looked up and not found
//   npm run products:pictures -- --company-id 12     one company
//   npm run products:pictures -- --dry-run           list what it would store
//   npm run products:pictures -- --prod --token-file <path> [--token-file <path> ...]
//       prod: asks www.chronopin.com which are missing, looks them up here and
//       sends back only the URLs. A token is an admin's, or a curator's, which
//       stores only products that curator has pinned: with several, each
//       picture goes with the first token prod takes it from.
//
// The session is the fallback (as for sentiment with no credit): what the
// sources miss goes to a file, the session finds each one by hand (the
// product's own page or press image, viewed before it is kept) and sends
// them back:
//
//   npm run products:pictures -- [--prod ...] --export misses.json
//   npm run products:pictures -- [--prod ...] --apply found.json
//       found.json: [{ companyId, product, pictureUrl, pageUrl }]
//
// A miss is recorded only when every source was tried, so products Wikipedia
// has nothing for are looked up again once a Google key is set. Local runs:
// then `npm run backup:data`.

import '../env';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import ProductPicture, { type ProductNeedingPicture } from '@/server/model/productPicture';
import { findProductPicture, googleSearchConfigured } from '@/server/productPicture';

const { values: flags } = parseArgs({
  options: {
    retry: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
    'company-id': { type: 'string' },
    prod: { type: 'boolean', default: false },
    base: { type: 'string', default: 'https://www.chronopin.com' },
    'token-file': { type: 'string', multiple: true },
    export: { type: 'string' },
    apply: { type: 'string' },
    delay: { type: 'string', default: '1' },
  },
});
const DELAY_MS = Number(flags.delay) * 1000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const companyId = flags['company-id'] ? Number(flags['company-id']) : undefined;

type Result = { companyId: number; product: string; pictureUrl: string | null; source: string | null; pageUrl: string | null };

// The session's own finds, from --apply, in place of a lookup.
function applied(): Result[] {
  const rows = JSON.parse(readFileSync(flags.apply!, 'utf8')) as Partial<Result>[];
  return rows
    .filter((r) => r.companyId && r.product && r.pictureUrl)
    .map((r) => ({ companyId: r.companyId!, product: r.product!, pictureUrl: r.pictureUrl!, source: 'hand', pageUrl: r.pageUrl ?? null }));
}

// What the sources missed, for the session to find by hand.
function exportMisses(products: ProductNeedingPicture[], results: Result[]) {
  if (!flags.export) return;
  const found = new Set(results.filter((r) => r.pictureUrl).map((r) => `${r.companyId}:${r.product.toLowerCase()}`));
  const misses = products
    .filter((p) => !found.has(`${p.companyId}:${p.product.toLowerCase()}`))
    .map(({ companyId, company, product }) => ({ companyId, company, product, pictureUrl: null, pageUrl: null }));
  writeFileSync(flags.export, JSON.stringify(misses, null, 2) + '\n');
  console.log(`${misses.length} misses written to ${flags.export}`);
}

async function lookUp(products: ProductNeedingPicture[]): Promise<Result[]> {
  if (!googleSearchConfigured()) console.log('No Google search key: Wikipedia only, and its misses are not recorded.');
  const results: Result[] = [];
  for (const [i, { companyId, company, product }] of products.entries()) {
    const { found, searched } = await findProductPicture(company, product);
    console.log(`${i + 1}/${products.length} ${company} / ${product}: ${found ? `${found.source} ${found.pageUrl}` : searched ? 'none found' : 'none (not recorded)'}`);
    if (found || searched) results.push({ companyId, product, pictureUrl: found?.pictureUrl ?? null, source: found?.source ?? null, pageUrl: found?.pageUrl || null });
    await sleep(DELAY_MS);
  }
  return results;
}

async function prod() {
  if (!flags['token-file']?.length) throw new Error('--prod needs --token-file');
  const headers = flags['token-file'].map((file) => ({ Authorization: `Bearer ${readFileSync(file, 'utf8').trim()}`, 'Content-Type': 'application/json' }));
  let results: Result[];
  if (flags.apply) {
    results = applied();
  } else {
    const query = new URLSearchParams({ ...(companyId ? { companyId: String(companyId) } : {}), ...(flags.retry ? { retry: '1' } : {}) });
    const res = await fetch(`${flags.base}/api/products/pictures?${query}`, { headers: headers[0] });
    if (!res.ok) throw new Error(`GET missing: ${res.status} ${await res.text()}`);
    const products = (await res.json()) as ProductNeedingPicture[];
    console.log(`${products.length} products on ${flags.base} need a picture`);
    results = await lookUp(products);
    exportMisses(products, results);
  }
  if (flags['dry-run'] || !results.length) return;
  // Each token in turn takes what the ones before it were refused.
  let left = results;
  for (const [t, header] of headers.entries()) {
    const refusedNow: Result[] = [];
    for (let i = 0; i < left.length; i += 50) {
      const batch = left.slice(i, i + 50);
      const put = await fetch(`${flags.base}/api/products/pictures`, { method: 'PUT', headers: header, body: JSON.stringify(batch) });
      if (!put.ok) throw new Error(`PUT: ${put.status} ${await put.text()}`);
      const { saved, refused } = (await put.json()) as { saved: number; refused: { companyId: number; product: string; reason: string }[] };
      if (saved) console.log(`Token ${t + 1}: stored ${saved}`);
      for (const r of refused) {
        const row = batch.find((b) => b.companyId === r.companyId && b.product === r.product);
        if (row && r.reason === 'not your product') refusedNow.push(row);
        else console.log(`Refused ${r.companyId} / ${r.product}: ${r.reason}`);
      }
    }
    left = refusedNow;
    if (!left.length) break;
  }
  if (left.length) console.log(`No token could store ${left.length}: ${left.map((r) => r.product).join(', ')}`);
}

async function local() {
  if (flags.apply) {
    const results = applied();
    if (!flags['dry-run']) for (const result of results) await ProductPicture.set(result);
    console.log(`Stored ${results.length} pictures found by hand`);
    return;
  }
  const products = await ProductPicture.needing({ companyId, retry: flags.retry });
  console.log(`${products.length} products need a picture`);
  const results = await lookUp(products);
  exportMisses(products, results);
  if (flags['dry-run']) return;
  for (const result of results) await ProductPicture.set(result);
  console.log(`Stored ${results.filter((r) => r.pictureUrl).length} pictures, ${results.filter((r) => !r.pictureUrl).length} misses`);
}

(flags.prod ? prod() : local())
  .catch((err) => {
    console.log('Product pictures err:', err.message ?? err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
