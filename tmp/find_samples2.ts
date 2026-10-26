import '../scripts/env';
import * as db from '@/server/db';
(async()=>{
  const cats = [
    ['Movies/TV', ['Movies','Movie','Film','TV','Television']],
    ['Music', ['Music','Album','Albums','Hip-Hop','Pop','Rock','K-Pop']],
    ['Computing', ['Computing','Hardware','Laptop','Smartphone','Smartphones','GPUs','GPU','Apple','Consumer Tech']],
    ['Fashion', ['Fashion','Sneakers','Luxury','Apparel','Watches']]
  ];
  for (const [label, tags] of cats) {
    const r:any[] = await db.query(`
      select p.id, p.title, p."utcStartDateTime"::date d
      from "Pin" p
      where p."utcDeletedDateTime" is null
        and p."utcStartDateTime" between '2022-01-01' and '2026-10-01'
        and not exists (select 1 from "PinCriticReview" c where c."pinId" = p.id)
        and exists (select 1 from "PinTag" t where t."pinId" = p.id and t.name = any($1))
      order by p."utcStartDateTime" desc limit 25
    `, [tags]);
    console.log('=== ' + label + ' ===');
    r.forEach(x=>console.log(x.id, x.d.toISOString().slice(0,10), x.title));
  }
  process.exit(0);
})();
