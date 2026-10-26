import '../scripts/env';
import * as db from '@/server/db';
(async()=>{
const c:any[]=await db.query(`select column_name from information_schema.columns where table_name='PinTag'`);console.log(c.map(x=>x.column_name));
const t:any[]=await db.query(`select * from "PinTagView" where "pinId"=5454 limit 5`).catch(e=>[e.message]);console.log(t);
process.exit(0)})();
