import '../scripts/env';
import * as db from '@/server/db';
import { readFileSync } from 'node:fs';
const f=process.argv[2];
const items:any[]=JSON.parse(readFileSync(f,'utf8'));
const ALLOWED=new Set(['PinTaste','PinCarPerf','PinGasCarPerf','PinAircraftPerf','PinLlmPerf','PinVideoPerf','PinHotel','PinDining']);
(async()=>{
  const g:Record<string,any[]>={};
  items.forEach(o=>{ if(ALLOWED.has(o.table)) (g[o.table+':'+o.pinId]??=[]).push(o); });
  for(const k in g){
    const [t,idStr]=k.split(':');
    const id=Number(idStr);
    const bad=g[k].filter(o=>!o.quote||o.quote.length>300||!/^https:/.test(o.url)||o.sentiment<-1||o.sentiment>1);
    if(bad.length){console.log('skip invalid',k,bad.length);continue}
    const ex:any[]=await db.query(`select reviews from "${t}" where "pinId"=$1`,[id]);
    if(!ex[0]){console.log('missing row',k);continue}
    const cur:any[]=typeof ex[0].reviews==='string'?JSON.parse(ex[0].reviews):(ex[0].reviews||[]);
    const m=new Map(cur.map(r=>[r.url,r]));
    g[k].forEach(o=>m.set(o.url,{url:o.url,title:o.title,publishedDate:o.publishedDate||null,quote:o.quote,sentiment:o.sentiment}));
    const rv=[...m.values()].slice(0,6);
    await db.query(`update "${t}" set reviews=$1::jsonb, "checkedAt"=now() where "pinId"=$2`,[JSON.stringify(rv),id]);
    console.log(t,id,cur.length,'->',rv.length);
  }
  process.exit(0);
})();
