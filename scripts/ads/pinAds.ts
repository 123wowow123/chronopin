// Pin ads (0112) by hand, as the 6am/6pm pinAds job task does them.
//
//   npm run ads:pin -- add <pinId> <amazon.com product link>   read it, add it if it clears the bar
//   npm run ads:pin -- check [--all]                           read the listings again, mark the broken ones
//   npm run ads:pin -- list <pinId>                            a pin's ads

import '../env';
import * as db from '@/server/db';
import PinAd from '@/server/model/pinAd';

const [command, ...args] = process.argv.slice(2);

async function run() {
  if (command === 'add' && args[0] && args[1]) {
    console.log(JSON.stringify(await PinAd.add(Number(args[0]), args[1]), null, 2));
  } else if (command === 'check') {
    console.log(JSON.stringify(await PinAd.check({ all: args.includes('--all') }), null, 2));
  } else if (command === 'list' && args[0]) {
    console.table(await PinAd.forPin(Number(args[0])));
  } else {
    throw new Error('Usage: ads:pin add <pinId> <url> | check [--all] | list <pinId>');
  }
}

run()
  .catch((err) => {
    console.log(err.message ?? err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
