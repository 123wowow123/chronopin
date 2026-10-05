// Pin ads (0112) by hand, as the 6am/6pm pinAds job task does them.
//
//   npm run ads:pin -- add <pinId> <amazon.com product link>   read it, add it if it clears the bar
//   npm run ads:pin -- movies [--ids 1,2] [--max 3]            merchandise ads for Movie pins with fewer than 2 working ones
//   npm run ads:pin -- check [--all]                           read the listings again, mark the broken ones
//   npm run ads:pin -- list <pinId>                            a pin's ads
//   npm run ads:pin -- titles                                  translate ad titles missing a language (API key)
//   npm run ads:pin -- titles --export <file> [--locale zh,ko]  the titles to translate by hand
//   npm run ads:pin -- titles --apply <file>                    save them: [{ "pinAdId", "locale", "sourceHash", "title" }]

import '../env';
import * as db from '@/server/db';
import { readFileSync, writeFileSync } from 'node:fs';
import { TARGET_LOCALES, type TargetLocale } from '@/server/extract/translate';
import { stockMovieMerchandise } from '@/server/movieMerchandise';
import PinAd from '@/server/model/pinAd';
import PinAdTranslation, { type AdTitleInput } from '@/server/model/pinAdTranslation';

const [command, ...args] = process.argv.slice(2);

async function run() {
  if (command === 'add' && args[0] && args[1]) {
    console.log(JSON.stringify(await PinAd.add(Number(args[0]), args[1]), null, 2));
  } else if (command === 'movies') {
    await movies();
  } else if (command === 'check') {
    console.log(JSON.stringify(await PinAd.check({ all: args.includes('--all') }), null, 2));
  } else if (command === 'list' && args[0]) {
    console.table(await PinAd.forPin(Number(args[0])));
  } else if (command === 'titles') {
    await titles();
  } else {
    throw new Error('Usage: ads:pin add <pinId> <url> | check [--all] | list <pinId> | titles [--export f [--locale zh,ko] | --apply f]');
  }
}

function flag(name: string): string | undefined {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
}

// Film pins' merchandise (src/server/movieMerchandise.ts), the nearest to today first.
async function movies() {
  const ids = flag('--ids')?.split(',').map(Number).filter(Number.isInteger);
  for (const row of await stockMovieMerchandise({ ids, max: Number(flag('--max') ?? 3) })) {
    console.log(`${row.pinId} ${row.title}: ${row.added.length ? row.added.map((a) => `\n    ${a.asin} ${a.title.slice(0, 80)}`).join('') : 'nothing found'}`);
  }
}

async function titles() {
  const apply = flag('--apply');
  if (apply) {
    const { saved, skipped } = await PinAdTranslation.apply(JSON.parse(readFileSync(apply, 'utf8')) as AdTitleInput[]);
    for (const s of skipped) console.log(`skipped ad ${s.pinAdId} ${s.locale}: ${s.reason}`);
    console.log(`saved ${saved} title(s)`);
    return;
  }
  const asked = flag('--locale')?.split(',').map((l) => l.trim());
  const locales = asked ? TARGET_LOCALES.filter((l): l is TargetLocale => asked.includes(l)) : TARGET_LOCALES;
  const out = flag('--export');
  if (out) {
    const todo = await PinAdTranslation.pending(locales);
    writeFileSync(out, JSON.stringify(todo, null, 2));
    console.log(`wrote ${todo.length} ad(s) to ${out}`);
    return;
  }
  console.log(`saved ${await PinAdTranslation.translateMissing({ locales, limit: 100000 })} title(s)`);
}

run()
  .catch((err) => {
    console.log(err.message ?? err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
