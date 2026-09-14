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

import pg from 'pg';
import config from './config';

// numeric (e.g. price DECIMAL(18,2)) arrives as a string by default, to avoid
// losing precision; the app has always treated these as plain numbers.
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value: string | null) =>
  value === null ? null : parseFloat(value),
);
// COUNT(*) is bigint, also a string by default. Counts here fit in a number.
pg.types.setTypeParser(pg.types.builtins.INT8, (value: string | null) =>
  value === null ? null : parseInt(value, 10),
);

export type Row = Record<string, any>;
export type QueryFn = <T extends Row = Row>(text: string, params?: unknown[]) => Promise<T[]>;

// Next.js dev reloads server modules on every edit; keeping the pool on
// globalThis stops each reload from opening another ten connections.
const globalForPool = globalThis as unknown as { __chronopinPool?: pg.Pool | null };

export function getPool(): pg.Pool {
  if (!globalForPool.__chronopinPool) {
    if (!config.database.url) {
      throw new Error('DATABASE_URL is not configured');
    }
    const pool = new pg.Pool({
      connectionString: config.database.url,
      ...config.database.pool,
    });
    // An idle client losing its connection must not crash the process; the
    // pool replaces it on the next checkout.
    pool.on('error', (err) => {
      console.log('PostgreSQL idle client error:', err.message);
    });
    globalForPool.__chronopinPool = pool;
  }
  return globalForPool.__chronopinPool;
}

export function queryResult<T extends Row = Row>(text: string, params?: unknown[]) {
  return getPool().query<T>(text, params);
}

export const query: QueryFn = <T extends Row = Row>(text: string, params?: unknown[]) =>
  queryResult<T>(text, params).then((res) => res.rows);

export async function transaction<T>(run: (query: QueryFn) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  const clientQuery: QueryFn = (text, params) => client.query(text, params).then((res) => res.rows);
  try {
    await client.query('BEGIN');
    const result = await run(clientQuery);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export function closeConnection(): Promise<void> {
  const ending = globalForPool.__chronopinPool;
  if (ending) {
    globalForPool.__chronopinPool = null;
    console.log('DB connection closed');
    return ending.end();
  }
  return Promise.resolve();
}
