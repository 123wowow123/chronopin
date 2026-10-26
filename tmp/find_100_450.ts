import '../scripts/env';
import * as db from '@/server/db';
(async()=>{
  const r:any[] = await db.query(`
    select p.id, p.title, p."utcStartDateTime"::date d
    from "Pin" p
    where p."utcDeletedDateTime" is null and p.id between 100 and 450
      and not exists (select 1 from "PinCriticReview" c where c."pinId" = p.id)
    order by p.id asc
  `);
  r.forEach(x=>console.log(x.id, x.d.toISOString().slice(0,10), x.title));
  process.exit(0);
})();
