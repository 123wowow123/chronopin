// Fills or empties the FAISS search index.
//
//   npm run delete:search:pins    empty the index
//   npm run create:search         index every pin in seedPins.json
//   npm run search:refresh        both
//   npm run search:refresh:db     both, from the database's live pins instead
//                                 (after db:pull-prod, whose pins seedPins.json lacks)

import '../env';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { SearchPin } from '@/server/model';
import log from '@/server/util/log';

const { values: flags } = parseArgs({
  options: {
    seed: { type: 'boolean', default: false },
    db: { type: 'boolean', default: false },
    reset: { type: 'boolean', default: false },
    pinfile: { type: 'string', default: './scripts/backup/seedPins.json' },
  },
});

async function run() {
  if (flags.reset) {
    const res = await SearchPin.resetIndex();
    log.success('FAISS index reset', JSON.stringify(res));
  }

  if (flags.seed || flags.db) {
    const pins: any[] = flags.db
      ? await db.query(`SELECT "id", "title", "description" FROM "Pin" WHERE "utcDeletedDateTime" IS NULL ORDER BY "id"`)
      : JSON.parse(readFileSync(flags.pinfile, 'utf8'));
    try {
      for (const pin of pins) {
        await new SearchPin(pin).save();
      }
      log.success(`Indexed ${pins.length} pins`);
    } catch (err) {
      log.error('Create Failed', (err as Error).message);
      process.exitCode = 1;
    }
    log.info('Search Data Load Complete');
  }
}

run()
  .catch((err) => {
    log.error('search script failed:', (err as Error).message);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
