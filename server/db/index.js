'use strict';

// PostgreSQL access for the models and scripts: one shared pool, created on
// first use.
//
//   db.query(sql, params)        -> Promise of the rows
//   db.queryResult(sql, params)  -> Promise of the full pg result (rowCount...)
//   db.transaction(run)          -> run(query) inside BEGIN/COMMIT, rolled
//                                   back if the promise it returns rejects
//   db.closeConnection()         -> ends the pool, for scripts
//
// Parameters are positional ($1, $2...). Identifiers in SQL are double-quoted
// camelCase, so rows come back with the property names the models use.

const pg = require('pg');
const config = require('../config/environment');

// numeric (e.g. price DECIMAL(18,2)) arrives as a string by default, to avoid
// losing precision; the app has always treated these as plain numbers.
pg.types.setTypeParser(pg.types.builtins.NUMERIC, value => value === null ? null : parseFloat(value));
// COUNT(*) is bigint, also a string by default. Counts here fit in a number.
pg.types.setTypeParser(pg.types.builtins.INT8, value => value === null ? null : parseInt(value, 10));

let pool = null;

function getPool() {
  if (!pool) {
    if (!config.database || !config.database.url) {
      throw new Error('DATABASE_URL is not configured');
    }
    pool = new pg.Pool(Object.assign({
      connectionString: config.database.url
    }, config.database.pool));
    // An idle client losing its connection must not crash the process; the
    // pool replaces it on the next checkout.
    pool.on('error', err => {
      console.log('PostgreSQL idle client error:', err.message);
    });
  }
  return pool;
}

function queryResult(text, params) {
  return getPool().query(text, params);
}

function query(text, params) {
  return queryResult(text, params).then(res => res.rows);
}

function transaction(run) {
  return getPool().connect()
    .then(client => {
      const clientQuery = (text, params) => client.query(text, params).then(res => res.rows);
      return client.query('BEGIN')
        .then(() => run(clientQuery))
        .then(result => client.query('COMMIT').then(() => result))
        .catch(err => client.query('ROLLBACK')
          .catch(() => undefined)
          .then(() => { throw err; }))
        .finally(() => client.release());
    });
}

function closeConnection() {
  if (pool) {
    const ending = pool;
    pool = null;
    console.log('DB connection closed');
    return ending.end();
  }
  return Promise.resolve();
}

module.exports = {
  getPool,
  query,
  queryResult,
  transaction,
  closeConnection
};
