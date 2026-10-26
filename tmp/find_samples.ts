import '../scripts/env';
import * as db from '@/server/db';
(async()=>{
  const T=['PinTaste','PinCarPerf','PinGasCarPerf','PinAircraftPerf','PinLlmPerf','PinVideoPerf','PinHotel','PinDining'];
  console.log('=== RUBRIC < 3 ===');
  for (const t of T) {
    const r:any[] = await db.query(`
      select t."pinId", p.title, coalesce(jsonb_array_length(t.reviews),0) n, t.reviews
      from "${t}" t join "Pin" p on p.id = t."pinId"
      where p."utcDeletedDateTime" is null and coalesce(jsonb_array_length(t.reviews),0) < 3
      order by t."pinId"
    `);
    if (r.length) console.log(t, r.length, r.slice(0,8).map(x=>`${x.pinId}(${x.n}): ${x.title.slice(0,50)}`));
  }
  process.exit(0);
})();
