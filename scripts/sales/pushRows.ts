// One-off: replaces pins' sales rows from a JSON file {pinId: figures[]} locally and on production.
import '../env';
import { readFileSync } from 'node:fs';
import { savePinSales } from '../../src/server/jobs/productSales';
import { pushPinSales } from '../../src/server/jobs/pinApi';
const data: Record<string, any[]> = JSON.parse(readFileSync(process.argv[2], 'utf8'));
for (const [id, figures] of Object.entries(data)) {
  if (figures.length < 1) { console.log(id, 'skipped, <2 rows'); continue; }
  try {
    await savePinSales(Number(id), figures);
    console.log(id, figures.length, await pushPinSales(Number(id), figures).catch((e) => `PROD FAIL ${e.message}`));
  } catch (e: any) { console.log(id, 'FAIL', e.message); }
}
