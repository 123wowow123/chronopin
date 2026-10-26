import '../scripts/env';
import * as db from '@/server/db';
(async()=>{
  const comp:any[] = await db.query(`
    select p.id, p.title, p."utcStartDateTime"::date d
    from "Pin" p
    where p."utcDeletedDateTime" is null and p."utcStartDateTime" <= '2026-10-15'
      and not exists (select 1 from "PinCriticReview" c where c."pinId" = p.id)
      and (p.id < 450 or p.title ilike '%iphone%' or p.title ilike '%pixel%' or p.title ilike '%macbook%' or p.title ilike '%galaxy s%' or p.title ilike '%ipad%' or p.title ilike '%airpods%' or p.title ilike '%rtx %' or p.title ilike '%vision pro%')
      and not exists (select 1 from "PinTag" t where t."pinId" = p.id and t.name in ('Gaming','Movies','Music'))
    order by p.id asc limit 50
  `);
  console.log('=== GADGETS / EARLY PINS ===');
  comp.forEach(x=>console.log(x.id, x.d.toISOString().slice(0,10), x.title));
  process.exit(0);
})();
