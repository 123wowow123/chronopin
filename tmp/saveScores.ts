import '../scripts/env';
import * as db from '@/server/db';
import { readFileSync } from 'node:fs';
const items:any[]=JSON.parse(readFileSync('tmp/toscore.json','utf8'));const sc=JSON.parse(readFileSync('tmp/scores.json','utf8'));
(async()=>{const g:Record<string,any[]>={};items.forEach(o=>(g[o.t+':'+o.pinId]??=[]).push(o));let n=0;
for(const k in g){const [t,id]=k.split(':');const r:any[]=await db.query(`select reviews from "${t}" where "pinId"=$1`,[id]);
 const rv=typeof r[0].reviews==='string'?JSON.parse(r[0].reviews):r[0].reviews;
 for(const o of g[k]){const v=sc[o.k];if(v==null||rv[o.i].quote!==o.q)continue;rv[o.i].sentiment=v;n++}
 await db.query(`update "${t}" set reviews=$1::jsonb where "pinId"=$2`,[JSON.stringify(rv),id])}
console.log('scored',n,'of',items.length);process.exit(0)})();
