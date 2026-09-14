'use strict';
require('@babel/register');
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
const fs = require('fs');
const db = require('../../server/db');

db.query(
  `SELECT "id", "title", "description", "sourceUrl", "longFormSummary" FROM "Pin" WHERE "utcDeletedDateTime" IS NULL ORDER BY "id"`
)
  .then(rows => {
    fs.writeFileSync(process.argv[2], JSON.stringify(rows, null, 2));
    console.log('Wrote', rows.length, 'pins to', process.argv[2]);
  })
  .catch(err => console.log('ERROR', err))
  .finally(() => db.closeConnection());
