'use strict';
require('babel-register');
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
const fs = require('fs');
const cp = require('../../server/sqlConnectionPool');
const mssql = require('mssql');

cp.getConnection()
  .then(conn => new mssql.Request(conn).query(
    "SELECT id, title, description, sourceUrl, longFormSummary FROM [dbo].[Pin] WHERE utcDeletedDateTime IS NULL ORDER BY id"
  ))
  .then(res => {
    fs.writeFileSync(process.argv[2], JSON.stringify(res.recordset, null, 2));
    console.log('Wrote', res.recordset.length, 'pins to', process.argv[2]);
  })
  .catch(err => console.log('ERROR', err))
  .finally(() => cp.closeConnection());
