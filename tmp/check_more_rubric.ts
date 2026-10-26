import '../scripts/env';
import * as db from '@/server/db';
(async()=>{
  for (const t of ['PinLlmPerf','PinGasCarPerf','PinAircraftPerf','PinCarPerf','PinVideoPerf']) {
    const r:any[] = await db.query(`
      select t."pinId", p.title, coalesce(jsonb_array_length(t.reviews),0) n, t.reviews
      from "${t}" t join "Pin" p on p.id = t."pinId"
      where p."utcDeletedDateTime" is null and coalesce(jsonb_array_length(t.reviews),0) < 3
      order by t."pinId" limit 15
    `);
    console.log('=== ' + t + ' ===');
    r.forEach(x=>console.log(x.pinId, `(${x.n})`, x.title.slice(0,55), (x.reviews||[]).map((rv:any)=>new URL(rv.url).hostname)));
  }
  process.exit(0);
})();
