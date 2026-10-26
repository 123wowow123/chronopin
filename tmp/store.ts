import '../scripts/env';
import * as db from '@/server/db';
import { readFileSync } from 'node:fs';
const f=process.argv[2];const items:any[]=JSON.parse(readFileSync(f,'utf8'));
(async()=>{const g:Record<number,any[]>={};items.forEach(o=>(g[o.pinId]??=[]).push(o));
for(const id in g){
 const bad=g[id].filter(o=>o.quote.length>300||!/^https:/.test(o.url)||o.sentiment<-1||o.sentiment>1);if(bad.length){console.log('skip invalid',id);continue}
 const ex:any[]=await db.query(`select reviews from "PinCriticReview" where "pinId"=$1`,[id]);
 const cur:any[]=ex[0]?(typeof ex[0].reviews==='string'?JSON.parse(ex[0].reviews):ex[0].reviews):[];
 const m=new Map(cur.map(r=>[r.url,r]));g[id].forEach(o=>m.set(o.url,{url:o.url,title:o.title,publishedDate:o.publishedDate,quote:o.quote,sentiment:o.sentiment}));
 const rv=[...m.values()].slice(0,8);
 await db.query(`insert into "PinCriticReview"("pinId",reviews,source,basis) values($1,$2::jsonb,'session','Browser-read critic reviews, 2026-10-25') on conflict("pinId") do update set reviews=excluded.reviews,"checkedAt"=now()`,[id,JSON.stringify(rv)]);
 console.log(id,rv.length)}
process.exit(0)})();
