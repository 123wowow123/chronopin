import '../scripts/env';
import * as db from '@/server/db';
(async()=>{
  const music:any[] = await db.query(`
    select p.id, p.title, p."utcStartDateTime"::date d
    from "Pin" p
    where p."utcDeletedDateTime" is null and p."utcStartDateTime" <= '2026-10-15'
      and not exists (select 1 from "PinCriticReview" c where c."pinId" = p.id)
      and exists (select 1 from "PinTag" t where t."pinId" = p.id and t.name in ('Music','Album','Albums'))
      and (p.title ilike '%album%' or p.title ilike '%releases%' or p.title ilike '%review%' or p.id < 500)
    order by p.id asc limit 35
  `);
  console.log('=== MUSIC ===');
  music.forEach(x=>console.log(x.id, x.d.toISOString().slice(0,10), x.title));

  const comp:any[] = await db.query(`
    select p.id, p.title, p."utcStartDateTime"::date d
    from "Pin" p
    where p."utcDeletedDateTime" is null and p."utcStartDateTime" <= '2026-10-15'
      and not exists (select 1 from "PinCriticReview" c where c."pinId" = p.id)
      and exists (select 1 from "PinTag" t where t."pinId" = p.id and t.name in ('Computing','Consumer Tech','Hardware','Smartphones','Laptops'))
      and p.id < 4500
    order by p.id asc limit 35
  `);
  console.log('=== COMPUTING ===');
  comp.forEach(x=>console.log(x.id, x.d.toISOString().slice(0,10), x.title));

  const fash:any[] = await db.query(`
    select p.id, p.title, p."utcStartDateTime"::date d
    from "Pin" p
    where p."utcDeletedDateTime" is null and p."utcStartDateTime" <= '2026-10-15'
      and not exists (select 1 from "PinCriticReview" c where c."pinId" = p.id)
      and exists (select 1 from "PinTag" t where t."pinId" = p.id and t.name in ('Fashion','Sneakers','Watches','Luxury'))
      and p.id < 4500
    order by p.id asc limit 35
  `);
  console.log('=== FASHION ===');
  fash.forEach(x=>console.log(x.id, x.d.toISOString().slice(0,10), x.title));
  process.exit(0);
})();
