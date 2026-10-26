import '../scripts/env';
import * as db from '@/server/db';
(async()=>{
  const g:any[] = await db.query(`
    select p.id, p.title, p."utcStartDateTime"::date d
    from "Pin" p
    where p."utcDeletedDateTime" is null
      and p."utcStartDateTime" <= '2026-10-25'
      and not exists (select 1 from "PinCriticReview" c where c."pinId" = p.id)
      and exists (select 1 from "PinTag" t where t."pinId" = p.id and t.name in ('Gaming','Video Games','Video game'))
    order by p."utcStartDateTime" desc limit 50
  `);
  console.log('=== GAMES ===');
  g.forEach(x=>console.log(x.id, x.d.toISOString().slice(0,10), x.title));

  const m:any[] = await db.query(`
    select p.id, p.title, p."utcStartDateTime"::date d
    from "Pin" p
    where p."utcDeletedDateTime" is null
      and p."utcStartDateTime" <= '2026-10-25'
      and not exists (select 1 from "PinCriticReview" c where c."pinId" = p.id)
      and exists (select 1 from "PinTag" t where t."pinId" = p.id and t.name in ('Movies','Movie','Film','TV','Television','Streaming'))
    order by p."utcStartDateTime" desc limit 35
  `);
  console.log('=== MOVIES/TV ===');
  m.forEach(x=>console.log(x.id, x.d.toISOString().slice(0,10), x.title));
  process.exit(0);
})();
