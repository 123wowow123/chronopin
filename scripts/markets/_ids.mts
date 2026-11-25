import * as db from '../../src/server/db';
console.log((await db.query<any>(`select "pinId", count(*) c, max("kind") k from "PinOutcomePhoto" group by 1 order by 1`)).map((r) => `${r.pinId}:${r.c}${r.k}`).join(' ')); process.exit(0);
