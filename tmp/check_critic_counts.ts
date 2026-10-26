import '../scripts/env';
import * as db from '@/server/db';
(async()=>{
  const r:any[] = await db.query(`
    select c."pinId", p.title, jsonb_array_length(c.reviews) n
    from "PinCriticReview" c join "Pin" p on p.id = c."pinId"
    order by c."pinId"
  `);
  console.log('Total PinCriticReview rows:', r.length, 'Total reviews:', r.reduce((s,x)=>s+x.n,0));
  process.exit(0);
})();
