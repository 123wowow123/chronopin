// Holiday ads (0121) by hand, as the 6am/6pm holidayAds job task does them.
//
//   npm run ads:holiday -- coverage                       the holidays to stock now and what each price tier has
//   npm run ads:holiday -- fill [--holiday <id>] [--curl]  search Amazon, read what suits, add up to two ads a tier
//   npm run ads:holiday -- add <holiday> <amazon.com link>  read it, add it if it clears the bar
//   npm run ads:holiday -- check [--all]                   read the listings again, mark the broken ones
//   npm run ads:holiday -- list <holiday>                  a holiday's ads
//   npm run ads:holiday -- remove <holiday> <asin>
//
// Amazon answers a search from Node with a stub page more often than it does
// one from curl (the TLS fingerprint), so `--curl` runs the searches through
// curl, which is what to use from a laptop; a server's job just uses fetch.

import '../env';
import { execFileSync } from 'node:child_process';
import * as db from '@/server/db';
import { readSearchPage } from '@/server/amazonSearch';
import HolidayAd, { type SearchFn } from '@/server/model/holidayAd';

const [command, ...args] = process.argv.slice(2);

function flag(name: string): string | undefined {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
}

const curlSearch: SearchFn = async (query) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await new Promise((resolve) => setTimeout(resolve, 4000));
    try {
      const html = execFileSync(
        'curl',
        ['-sL', '--compressed', '-m', '30', '-A', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36', '-H', 'Accept-Language: en-US,en;q=0.9', `https://www.amazon.com/s?k=${encodeURIComponent(query)}`],
        { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
      );
      const hits = readSearchPage(html);
      if (hits.length) return hits;
    } catch {
      // Try again.
    }
  }
  return { unknown: 'no results on page' };
};

async function run() {
  if (command === 'coverage') {
    console.table((await HolidayAd.coverage()).map((h) => ({ ...h, tiers: JSON.stringify(h.tiers), short: h.short.join(',') })));
  } else if (command === 'fill') {
    console.log(JSON.stringify(await HolidayAd.fill({ only: flag('--holiday'), search: args.includes('--curl') ? curlSearch : undefined }), null, 2));
  } else if (command === 'add' && args[0] && args[1]) {
    console.log(JSON.stringify(await HolidayAd.add(args[0], args[1]), null, 2));
  } else if (command === 'check') {
    console.log(JSON.stringify(await HolidayAd.check({ all: args.includes('--all') }), null, 2));
  } else if (command === 'list' && args[0]) {
    console.table(await HolidayAd.forHoliday(args[0]));
  } else if (command === 'remove' && args[0] && args[1]) {
    console.log(await HolidayAd.remove(args[0], args[1]));
  } else {
    throw new Error('Usage: ads:holiday coverage | fill [--holiday id] [--curl] | add <holiday> <url> | check [--all] | list <holiday> | remove <holiday> <asin>');
  }
}

run()
  .catch((err) => {
    console.log(err.message ?? err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
