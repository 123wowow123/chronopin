import '../scripts/env';
import * as db from '@/server/db';
(async()=>{
const c:any[]=await db.query(`select column_name from information_schema.columns where table_name='Pin' and (column_name ilike '%tag%' or column_name ilike '%categ%')`);console.log(c);
const t:any[]=await db.query(`select table_name from information_schema.tables where table_name ilike '%tag%'`);console.log(t);
const v:any[]=await db.query(`select id,title,"utcStartDateTime"::date d from "Pin" where title ilike '%valheim%' or title ilike '%slay the spire%' limit 5`);console.log(v);
process.exit(0)})();
