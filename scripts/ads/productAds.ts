// Standalone product ads: stock | add <Amazon URL> [category ...] | list | check [--all]
import '../env';
import { readFileSync } from 'node:fs';
import * as db from '@/server/db';
import ProductAd from '@/server/model/productAd';

const [command, ...args] = process.argv.slice(2);
async function run() {
  if (command === 'stock') {
    // Snapshot ranks stay in this research file, never in ad copy. Every
    // candidate is re-read and vetted before it can be advertised.
    const catalog = JSON.parse(readFileSync(new URL('./products.json', import.meta.url), 'utf8')) as { products: { url: string; categories: string[] }[] };
    for (const product of catalog.products) {
      const result = await ProductAd.add(product.url, product.categories);
      console.log(JSON.stringify({ url: product.url, ...result }, null, 2));
      if ('rejected' in result) process.exitCode = 1;
    }
  } else if (command === 'add' && args[0]) {
    const result = await ProductAd.add(args[0], args.slice(1));
    console.log(JSON.stringify(result, null, 2));
    if ('rejected' in result) process.exitCode = 1;
  } else if (command === 'list') {
    console.table(await ProductAd.list());
  } else if (command === 'check') {
    console.log(JSON.stringify(await ProductAd.check({ all: args.includes('--all') }), null, 2));
  } else {
    throw new Error('Usage: ads:products stock | add <url> [category ...] | list | check [--all]');
  }
}
run().catch((err) => { console.error(err.message); process.exitCode = 1; }).finally(() => db.closeConnection());
