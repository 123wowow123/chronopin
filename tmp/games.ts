import '../scripts/env';
import * as db from '@/server/db';
(async()=>{
const r:any[]=await db.query(`select p.id,p.title,p."utcStartDateTime"::date d,coalesce(jsonb_array_length(c.reviews),0) n from "Pin" p left join "PinCriticReview" c on c."pinId"=p.id where p."utcDeletedDateTime" is null and exists(select 1 from "PinTag" t where t."pinId"=p.id and t.name in ('Gaming','Video Games','Video game')) and coalesce(jsonb_array_length(c.reviews),0)<3 order by p."utcStartDateTime" desc limit 60`).catch(async e=>{console.log(e.message);return []});
r.forEach(x=>console.log(x.id,x.d,x.n,x.title.slice(0,80)));console.log(r.length);process.exit(0)})();
