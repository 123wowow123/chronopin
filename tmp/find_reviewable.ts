import '../scripts/env';
import * as db from '@/server/db';
(async()=>{
  const r:any[] = await db.query(`
    select p.id, p.title, p."utcStartDateTime"::date d
    from "Pin" p
    where p."utcDeletedDateTime" is null
      and p."utcStartDateTime" <= '2026-10-15'
      and not exists (select 1 from "PinCriticReview" c where c."pinId" = p.id)
      and (
        p.title ilike '%review%'
        or p.title ilike '%releases%'
        or p.title ilike '%premieres%'
        or p.title ilike '%opens in theaters%'
        or p.title ilike '%swings into theaters%'
        or p.title ilike '%album%'
      )
      and exists (select 1 from "PinTag" t where t."pinId" = p.id and t.name in ('Movies','Movie','Film','TV','Television','Music','Album','Albums','Computing','Consumer Tech','Fashion','Sneakers'))
    order by p.id asc limit 80
  `);
  r.forEach(x=>console.log(x.id, x.d.toISOString().slice(0,10), x.title));
  process.exit(0);
})();
