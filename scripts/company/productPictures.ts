// Finds pictures for company product lines none of whose pins has one, for
// the Major products panel (0079; src/server/productPicture.ts: Wikipedia's
// lead image, then Google image search when GOOGLE_SEARCH_API_KEY and
// GOOGLE_SEARCH_ENGINE_ID are set). Every lookup runs here, on the dev machine.
//
//   npm run products:pictures                        local DB: products never looked up
//   npm run products:pictures -- --retry             and the ones looked up and not found
//   npm run products:pictures -- --company-id 12     one company
//   npm run products:pictures -- --dry-run           list what it would store
//   npm run products:pictures -- --prod --token-file <path>
//       prod: asks www.chronopin.com which are missing, looks them up here and
//       sends back only the URLs. The token is an admin's, or a curator's (then
//       only products that curator has pinned are stored).
//
// A miss is recorded only when every source was tried, so products Wikipedia
// has nothing for are looked up again once a Google key is set. Local runs:
// then `npm run backup:data`.

import '../env';
import { readFileSync } from 'node:fs';
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
    'token-file': { type: 'string' },
    delay: { type: 'string', default: '1' },
  },
});
const DELAY_MS = Number(flags.delay) * 1000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const companyId = flags['company-id'] ? Number(flags['company-id']) : undefined;

type Result = { companyId: number; product: string; pictureUrl: string | null; source: string | null; pageUrl: string | null };

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
  if (!flags['token-file']) throw new Error('--prod needs --token-file');
  const headers = { Authorization: `Bearer ${readFileSync(flags['token-file'], 'utf8').trim()}`, 'Content-Type': 'application/json' };
  const query = new URLSearchParams({ ...(companyId ? { companyId: String(companyId) } : {}), ...(flags.retry ? { retry: '1' } : {}) });
  const res = await fetch(`${flags.base}/api/products/pictures?${query}`, { headers });
  if (!res.ok) throw new Error(`GET missing: ${res.status} ${await res.text()}`);
  const products = (await res.json()) as ProductNeedingPicture[];
  console.log(`${products.length} products on ${flags.base} need a picture`);
  const results = await lookUp(products);
  if (flags['dry-run'] || !results.length) return;
  for (let i = 0; i < results.length; i += 50) {
    const put = await fetch(`${flags.base}/api/products/pictures`, { method: 'PUT', headers, body: JSON.stringify(results.slice(i, i + 50)) });
    if (!put.ok) throw new Error(`PUT: ${put.status} ${await put.text()}`);
    const { saved, refused } = (await put.json()) as { saved: number; refused: unknown[] };
    console.log(`Stored ${saved}${refused.length ? `, refused ${refused.length}: ${JSON.stringify(refused)}` : ''}`);
  }
}

async function local() {
  const products = await ProductPicture.needing({ companyId, retry: flags.retry });
  console.log(`${products.length} products need a picture`);
  const results = await lookUp(products);
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
