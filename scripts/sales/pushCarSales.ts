// One-off: saves researched car sales rows (scratchpad *.out.json, quotes pre-verified in chk.json)
// locally and on production by sourceUrl. Usage: tsx scripts/sales/pushCarSales.ts DIR [--limit N] [--prod]
import '../env';
import { readFileSync, readdirSync } from 'node:fs';
import { savePinSales } from '../../src/server/jobs/productSales';
import { pushPinSales } from '../../src/server/jobs/pinApi';

const dir = process.argv[2];
const limit = Number(process.argv[process.argv.indexOf('--limit') + 1]) || Infinity;
const chk: [number, { sourceUrl: string; quote: string }, string][] = JSON.parse(readFileSync(`${dir}/chk.json`, 'utf8'));
const ok = new Set(chk.filter((c) => c[2] === 'ok').map((c) => `${c[0]}|${c[1].sourceUrl}|${c[1].quote}`));
let n = 0, rows = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith('.out.json')).sort()) {
  for (const p of JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')).pins) {
    const figures = p.figures.filter((g: any) => ok.has(`${p.pinId}|${g.sourceUrl}|${g.quote}`));
    if (figures.length < 2 || n >= limit) continue;
    try {
      await savePinSales(p.pinId, figures);
      const prod = await pushPinSales(p.pinId, figures).catch((e) => `PROD FAIL ${e.message}`);
      console.log(p.pinId, figures.length, prod);
      n++; rows += figures.length;
    } catch (e: any) { console.log(p.pinId, 'FAIL', e.message); }
  }
}
console.log('pins', n, 'rows', rows);
