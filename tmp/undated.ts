import '../scripts/env';
import * as db from '@/server/db';
const T=['PinTaste','PinCarPerf','PinGasCarPerf','PinAircraftPerf','PinLlmPerf','PinVideoPerf','PinHotel','PinDining'];
(async()=>{
 const out:any[]=[];
 for(const t of T){
  const r:any=await (db as any).query(`select "pinId", reviews from "${t}" where reviews is not null`);
  for(const row of (r.rows??r)){ const rv=typeof row.reviews==='string'?JSON.parse(row.reviews):row.reviews; (rv||[]).forEach((x:any,i:number)=>{ if(x.url&&!x.publishedDate) out.push({t,pinId:row.pinId,i,url:x.url,title:x.title}); }); }
 }
 console.log(out.length); const by:any={}; out.forEach(o=>{const h=new URL(o.url).hostname;by[h]=(by[h]||0)+1});
 console.log(Object.entries(by).sort((a:any,b:any)=>b[1]-a[1]).slice(0,25));
 (await import('node:fs')).writeFileSync('tmp/undated.json',JSON.stringify(out));
 process.exit(0);
})();
