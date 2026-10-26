import '../scripts/env';
import * as db from '@/server/db';
import { readFileSync } from 'node:fs';
const map:Record<string,string>=JSON.parse(readFileSync('tmp/dates-final.json','utf8'));
const T=['PinTaste','PinCarPerf','PinGasCarPerf','PinAircraftPerf','PinLlmPerf','PinVideoPerf','PinHotel','PinDining'];
(async()=>{let n=0;
for(const t of T){const rows:any[]=await db.query(`select "pinId",reviews from "${t}"`);
 for(const r of rows){const rv=typeof r.reviews==='string'?JSON.parse(r.reviews):r.reviews;if(!rv)continue;let c=0;
  for(const x of rv){if(x.url&&!x.publishedDate&&map[x.url.trim()]){x.publishedDate=map[x.url.trim()];c++}}
  if(c){await db.query(`update "${t}" set reviews=$1::jsonb where "pinId"=$2`,[JSON.stringify(rv),r.pinId]);n+=c}}}
console.log('dated',n);process.exit(0)})();
