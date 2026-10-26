import '../scripts/env';
import * as db from '@/server/db';
(async()=>{
  const r:any[] = await db.query(`select c."pinId", p.title, c.reviews from "PinCriticReview" c join "Pin" p on p.id = c."pinId" where jsonb_array_length(c.reviews) < 3 order by c."pinId"`);
  for (const x of r) {
    console.log(x.pinId, x.title, x.reviews.map((rv:any)=>rv.url));
  }
  process.exit(0);
})();
