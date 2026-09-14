'use strict';

// Copies every table from the old SQL Server database into PostgreSQL, for
// moving off SQL Server. Run once per database, against an empty schema:
//
//   npm run create:db
//   npm run transfer:mssql -- --from "Server=host,1433;Database=chronopin;User Id=...;Password=...;Encrypt=true"
//
// --from defaults to config.mssql.uri (the local SQL Edge container in
// development.js). The target is DATABASE_URL / config.database.url.
//
// Everything is written in one transaction, so a failure leaves the target
// untouched. Ids are kept, so every foreign key still lines up, and each
// identity sequence is moved past the highest id afterwards.
//
// Pin coordinates used to be a " @ lat, lng" suffix on Pin.address. They are
// moved into Pin.location here and stripped from the address, so the address
// is only the place label.
//
// All-day pins were saved at the author's local midnight; they are floored to
// 00:00Z of their day, which the "CK_Pin_allDayUtcMidnight" constraint needs.
//
// SQL Server kept Pin.company/companyWikiUrl as text on each pin. Those become
// "Company" rows here, and each pin gets the matching companyId. Logos are not
// looked up; run npm run companies:logos afterwards.
//
// Not copied: Sessions (everyone signs in again) and Address (never read, and
// holding SQL Server geography values with no PostgreSQL mapping).

require('@babel/register');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const args = require('args');
const mssql = require('mssql');
const config = require('../../../server/config/environment');
const db = require('../../../server/db');
const { normalizeAllDayDates } = require('../../../server/model/pin/shared/dates');

args.option('from', 'SQL Server connection string (ADO form)', config.mssql && config.mssql.uri);
const flags = args.parse(process.argv);

// Parents before children is not required (there are no foreign key
// constraints), but it keeps the log readable.
const TABLES = ['User', 'MediumType', 'Medium', 'Pin', 'PinMedium', 'Merchant', 'Favorite', 'Like', 'Comment', 'DateTime', 'Click'];

const BATCH_SIZE = 200;

// Same shape pin-map used to parse: "Some Place @ 21.7250, 39.1080".
const COORDS = /@\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

let source;

if (!flags.from) {
  console.log('No SQL Server connection string: pass --from or set config.mssql.uri');
  process.exitCode = 1;
} else {
  mssql.connect(flags.from)
    .then(pool => {
      source = pool;
      return assertTargetEmpty();
    })
    .then(() => db.transaction(query => TABLES.reduce(
      (prev, table) => prev.then(() => copyTable(query, table)),
      Promise.resolve()
    ).then(() => resetSequences(query))))
    .then(() => compareCounts())
    .catch(err => {
      console.log('transfer failed:', err.message);
      process.exitCode = 1;
    })
    .finally(() => Promise.all([
      source && source.close(),
      db.closeConnection()
    ]));
}

function assertTargetEmpty() {
  return Promise.all(TABLES.concat('Company').map(table => db.query(`SELECT COUNT(*) AS "count" FROM "${table}"`)
    .then(rows => ({ table, count: rows[0].count }))))
    .then(counts => {
      const filled = counts.filter(c => c.count > 0);
      if (filled.length) {
        throw new Error(`target is not empty (${filled.map(c => `${c.table}: ${c.count}`).join(', ')}); run npm run db:reset first`);
      }
    });
}

function targetColumns(table) {
  return db.query(
    `SELECT column_name AS "name" FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`, [table])
    .then(rows => rows.map(row => row.name));
}

function copyTable(query, table) {
  return Promise.all([
    source.request().query(`SELECT * FROM [dbo].[${table}] ORDER BY [id]`),
    targetColumns(table)
  ]).then(([result, columns]) => {
    const rows = result.recordset.map(row => table === 'Pin' ? normalizeAllDayDates(splitAddress(row)) : row);
    return (table === 'Pin' ? copyCompanies(query, rows) : Promise.resolve())
      .then(() => insertRows(query, table, rows, columns));
  });
}

// Creates a Company per distinct pin company name and sets companyId on the
// rows. Names are matched case-insensitively, as the citext column will.
function copyCompanies(query, rows) {
  const companies = new Map();
  rows.forEach(row => {
    const name = typeof row.company === 'string' ? row.company.trim() : '';
    if (!name) {
      return;
    }
    const key = name.toLowerCase();
    const company = companies.get(key) || { name, wikiUrl: null };
    company.wikiUrl = company.wikiUrl || row.companyWikiUrl || null;
    companies.set(key, company);
  });
  console.log(`Company: creating ${companies.size} rows from pin company names`);

  return Array.from(companies.entries()).reduce((prev, [key, company]) => prev.then(() => query(
    `INSERT INTO "Company" ("name", "wikiUrl") VALUES ($1, $2) RETURNING "id"`, [company.name, company.wikiUrl])
    .then(inserted => { company.id = inserted[0].id; })), Promise.resolve())
    .then(() => rows.forEach(row => {
      const company = typeof row.company === 'string' && companies.get(row.company.trim().toLowerCase());
      row.companyId = company ? company.id : null;
    }));
}

function insertRows(query, table, rows, columns) {
  // Only columns both sides have; "location" is filled from the address.
  const shared = columns.filter(column => rows.length && Object.prototype.hasOwnProperty.call(rows[0], column));
  if (table === 'Pin') {
    shared.push('location');
  }

  const batches = [];
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    batches.push(rows.slice(i, i + BATCH_SIZE));
  }
  console.log(`${table}: copying ${rows.length} rows`);

  return batches.reduce((prev, batch) => prev.then(() => {
    const params = [];
    const values = batch.map(row => '(' + shared.map(column => {
      if (column === 'location') {
        if (row.latitude === null) {
          return 'NULL';
        }
        params.push(row.longitude, row.latitude);
        return `ST_SetSRID(ST_MakePoint($${params.length - 1}, $${params.length}), 4326)::geography`;
      }
      params.push(row[column]);
      return `$${params.length}`;
    }).join(', ') + ')');

    return query(
      `INSERT INTO "${table}" (${shared.map(c => `"${c}"`).join(', ')}) VALUES ${values.join(', ')}`,
      params);
  }), Promise.resolve());
}

function splitAddress(row) {
  const out = Object.assign({}, row, { latitude: null, longitude: null });
  const match = row.address && COORDS.exec(row.address);
  if (!match) {
    return out;
  }
  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);
  if (!isFinite(lat) || !isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return out;
  }
  out.latitude = lat;
  out.longitude = lng;
  out.address = row.address.slice(0, match.index).trim().replace(/[,;]\s*$/, '') || null;
  return out;
}

function resetSequences(query) {
  return TABLES.reduce((prev, table) => prev.then(() => query(
    `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE(MAX("id"), 0) + 1, false) FROM "${table}"`
  )), Promise.resolve());
}

function compareCounts() {
  return TABLES.reduce((prev, table) => prev.then(mismatches => Promise.all([
    source.request().query(`SELECT COUNT(*) AS [count] FROM [dbo].[${table}]`),
    db.query(`SELECT COUNT(*) AS "count" FROM "${table}"`)
  ]).then(([from, to]) => {
    const a = from.recordset[0].count;
    const b = to[0].count;
    console.log(`${table.padEnd(12)} sql server ${String(a).padStart(6)}   postgres ${String(b).padStart(6)}${a === b ? '' : '   MISMATCH'}`);
    return mismatches + (a === b ? 0 : 1);
  })), Promise.resolve(0))
    .then(mismatches => {
      if (mismatches) {
        throw new Error(`${mismatches} table(s) differ`);
      }
      return db.query(`SELECT COUNT(*) FILTER (WHERE "location" IS NOT NULL) AS "withLocation",
                              COUNT(*) FILTER (WHERE "address" LIKE '%@%') AS "addressWithAt"
                       FROM "Pin"`)
        .then(rows => console.log(`Pin locations: ${rows[0].withLocation}; addresses still containing "@": ${rows[0].addressWithAt}`));
    });
}
