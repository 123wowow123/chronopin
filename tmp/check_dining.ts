import '../scripts/env';
import * as db from '@/server/db';
(async()=>{
  const r:any[] = await db.query(`
    select t."pinId", p.title, coalesce(jsonb_array_length(t.reviews),0) n, t.reviews
    from "PinDining" t join "Pin" p on p.id = t."pinId"
    where p."utcDeletedDateTime" is null and coalesce(jsonb_array_length(t.reviews),0) < 3
    order by t."pinId"
  `);
  r.forEach(x=>console.log(x.pinId, `(${x.n})`, x.title, (x.reviews||[]).map((rv:any)=>rv.url)));
  process.exit(0);
})();
