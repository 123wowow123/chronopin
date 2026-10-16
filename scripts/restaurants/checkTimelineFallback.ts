// Local PostgreSQL regression fixtures only; temporary tables are rolled back.
import '../env';
import pg from 'pg';
import assert from 'node:assert/strict';
import { restaurantTimelineClause } from '../../src/server/util/restaurantTimeline';
const dbUrl=process.env.DATABASE_URL!;assert(['localhost','127.0.0.1'].includes(new URL(dbUrl).hostname),'Fixtures only run against local database');
const client=new pg.Client({connectionString:dbUrl});await client.connect();
try {
 await client.query('BEGIN');
 await client.query(`CREATE TEMP TABLE "Pin" (id integer PRIMARY KEY,"utcStartDateTime" timestamptz,"allDay" boolean,"utcDeletedDateTime" timestamptz,"utcCreatedDateTime" timestamptz DEFAULT '2026-10-16Z',score integer DEFAULT 100,location geography); CREATE TEMP TABLE "PinTag" ("pinId" integer,name citext)`);
 await client.query(`INSERT INTO "Pin" (id,"utcStartDateTime","allDay") VALUES (1,'2026-11-01Z',true),(2,'2026-11-01T06:30Z',false),(3,'2026-11-02Z',true),(4,'2026-11-02T18:00Z',false),(5,'2026-11-03Z',true),(6,'2026-11-03T18:00Z',false),(7,'2026-11-04Z',true),(8,'2026-11-04T18:00Z',false),(9,'2026-11-05Z',true),(10,'2026-11-05T18:00Z',false); INSERT INTO "PinTag" VALUES (1,'Restaurant'),(3,'Restaurant Special'),(5,'Top Restaurants'),(7,'Restaurant Opening'),(9,'Restaurants'); UPDATE "Pin" SET score=20 WHERE id=4; UPDATE "Pin" SET "utcDeletedDateTime"=now() WHERE id=6; UPDATE "Pin" SET "utcCreatedDateTime"='2026-10-01Z' WHERE id=8; UPDATE "Pin" SET location=ST_GeogFromText('POINT(0 0)') WHERE id=9; UPDATE "Pin" SET location=ST_GeogFromText('POINT(10 10)') WHERE id=10`);
 const eligible=(alias:string)=>`($2::integer IS NULL OR "${alias}".score >= $2) AND ($3::timestamptz IS NULL OR "${alias}"."utcCreatedDateTime" >= $3) AND ($4::text IS NULL OR ST_DWithin("${alias}".location,$4::geography,1000))`;
 async function selected(zone='UTC',min:number|null=70,since:string|null=null,point:string|null=null,cursor:string|null=null){const r=await client.query(`SELECT p.id FROM "Pin" p WHERE p."utcDeletedDateTime" IS NULL AND ${eligible('p')} AND ($5::timestamptz IS NULL OR p."utcStartDateTime"<$5) AND ${restaurantTimelineClause('p','$1',eligible('timelineOther'))} ORDER BY p.id`,[zone,min,since,point,cursor]);return r.rows.map(x=>x.id)}
 assert.deepEqual(await selected(),[2,3,5,8,10]);
 assert.deepEqual(await selected('America/Los_Angeles'),[1,2,3,5,8,10]);
 assert.deepEqual(await selected('UTC',null),[2,4,5,8,10]);
 assert.deepEqual(await selected('UTC',70,'2026-10-10Z'),[2,3,5,7,10]);
 assert.deepEqual(await selected('UTC',70,null,'POINT(0 0)'),[9]);
 assert.deepEqual(await selected('UTC',70,null,null,'2026-11-01T05:00Z'),[]);
 assert.deepEqual(await selected('America/Los_Angeles',70,null,null,'2026-11-01T05:00Z'),[1]);
 await client.query('UPDATE "Pin" SET "allDay"=true WHERE id=2');
 assert(!(await selected('America/Los_Angeles')).includes(1));
 console.log('8 PostgreSQL fixture assertions passed: fallback, confidence, posting window, proximity, deleted pins, local/all-day dates and partial-page cursor; temporary tables rolled back');
} finally {await client.query('ROLLBACK');await client.end()}
