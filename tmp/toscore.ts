import '../scripts/env';
import * as db from '@/server/db';
import { readFileSync, writeFileSync } from 'node:fs';
const map:Record<string,string>=JSON.parse(readFileSync('tmp/dates-final.json','utf8'));
const T=['PinTaste','PinCarPerf','PinGasCarPerf','PinAircraftPerf','PinLlmPerf','PinVideoPerf','PinHotel','PinDining'];
(async()=>{const out:any[]=[];
for(const t of T){const rows:any[]=await db.query(`select "pinId",reviews from "${t}"`);
 for(const r of rows){const rv=typeof r.reviews==='string'?JSON.parse(r.reviews):r.reviews;(rv||[]).forEach((x:any,i:number)=>{if(x.url&&map[x.url.trim()]&&x.sentiment==null)out.push({k:out.length,t,pinId:r.pinId,i,q:x.quote})})}}
writeFileSync('tmp/toscore.json',JSON.stringify(out));
out.forEach(o=>console.log(o.k,'|',(o.q||'').slice(0,230)));process.exit(0)})();
