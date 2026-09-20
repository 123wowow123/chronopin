// Backs the database up to JSON (--save) or loads it from JSON (--seed).
//
//   npm run backup:data     database -> scripts/backup/*.json
//   npm run create:data     scripts/backup/*.json -> an empty, migrated database

import '../env';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import Holidays from 'date-holidays';
import _ from 'lodash';
import * as db from '@/server/db';
import { Comment, Company, CompanyFollow, DateTime, Follow, FullPins, MediumType, User, Users } from '@/server/model';
import AiFeedback from '@/server/model/aiFeedback';
import PinDuplicate from '@/server/model/pinDuplicate';
import CompanyRelation from '@/server/model/companyRelation';
import PinTicker from '@/server/model/pinTicker';
import PinTag from '@/server/model/pinTag';
import { allFlightPaths, restoreFlightPaths } from '@/server/services/pinFlightPath';
import Source from '@/server/model/source';
import log from '@/server/util/log';
import { excludeE2e } from './excludeE2e';
import PinTranslation from '@/server/model/pinTranslation';

const { values: flags } = parseArgs({
  options: {
    save: { type: 'boolean', default: false },
    seed: { type: 'boolean', default: false },
    pinfile: { type: 'string', default: './scripts/backup/seedPins.json' },
    userfile: { type: 'string', default: './scripts/backup/seedUsers.json' },
    commentfile: { type: 'string', default: './scripts/backup/seedComments.json' },
    followfile: { type: 'string', default: './scripts/backup/seedFollows.json' },
    companyfollowfile: { type: 'string', default: './scripts/backup/seedCompanyFollows.json' },
    duplicatefile: { type: 'string', default: './scripts/backup/seedPinDuplicates.json' },
    aifeedbackfile: { type: 'string', default: './scripts/backup/seedAiFeedback.json' },
    sourcefile: { type: 'string', default: './scripts/backup/seedSources.json' },
    stockfile: { type: 'string', default: './scripts/backup/seedStocks.json' },
    tagfile: { type: 'string', default: './scripts/backup/seedTags.json' },
    flightpathfile: { type: 'string', default: './scripts/backup/seedFlightPaths.json' },
    translationfile: { type: 'string', default: './scripts/backup/seedTranslations.json' },
    companyfile: { type: 'string', default: './scripts/backup/seedCompanies.json' },
    aphelionfile: { type: 'string', default: './scripts/backup/aphelion.json' },
    equinoxfile: { type: 'string', default: './scripts/backup/equinox.json' },
    perihelionfile: { type: 'string', default: './scripts/backup/perihelion.json' },
    solsticefile: { type: 'string', default: './scripts/backup/solstice.json' },
  },
});

// Every user column, password hash and salt included: seedUsers.json is
// gitignored for that reason.
const BACKUP_USER_PROPS = [
  'id', 'userName', 'firstName', 'lastName', 'gender', 'locale', 'facebookId', 'googleId',
  'pictureUrl', 'fbUpdatedTime', 'fbVerified', 'googleVerified', 'about', 'email', 'password',
  'role', 'provider', 'salt', 'websiteUrl', 'defaultFilterSpanPreference', 'themePreference', 'localePreference', 'showCardStockPrices',
  'utcCreatedDateTime', 'utcUpdatedDateTime', 'utcDeletedDateTime',
];

// The years to compute holidays for. date-holidays applies today's rules to
// whatever year it is asked for, and Juneteenth (from 2021) is the only one it
// gates by year: ask it for 1900 and it returns a Martin Luther King Jr. Day,
// 39 years before King was born, on the third Monday that the Uniform Monday
// Holiday Act would not fix until 1971. 1986 is the first year the whole set
// is true - the year MLK Day was first observed, and past the 1971 Monday
// shifts and the 1978 return of Veterans Day to 11-11. The rules project
// forward without that problem, so the end matches the astronomy markers in
// scripts/backup, which run to 2100.
const FIRST_HOLIDAY_YEAR = 1986;
const LAST_HOLIDAY_YEAR = 2100;

const readJson = (file: string) => JSON.parse(readFileSync(file, 'utf8'));
const writeJson = (file: string, data: unknown) => writeFileSync(file, JSON.stringify(data, null, 2));

async function saveDB() {
  // Every pin, soft-deleted ones included, however far back it starts.
  const { pins: all } = await FullPins.queryAll();
  // Tickers are in seedStocks.json; the view's copy on each pin is left out.
  // Awards are derived (npm run media:awards puts them back). Tags are in
  // seedTags.json, and the award ones follow the awards. Flight paths are in
  // seedFlightPaths.json. The money on a pin's markets is a reading of the
  // exchanges that createPin does not restore and that goes stale by the day,
  // so it is left out too: `npm run markets:volume -- --apply` reads it again.
  const pins = all.map(
    ({ stocks: _stocks, awards: _awards, tags: _tags, flightPath: _flightPath, marketVolume: _marketVolume, marketVolumeAt: _marketVolumeAt, ...pin }) => pin,
  );
  const data = excludeE2e({
    users: await Users.getAll(BACKUP_USER_PROPS),
    pins,
    companies: await Company.getAll(),
    comments: await Comment.getAll(),
    follows: (await Follow.getAll()).follows,
    companyFollows: await CompanyFollow.getAll(),
  });
  const { dropped } = data;
  if (dropped.users) {
    console.log(`Left out e2e test data: ${dropped.users} user(s), ${dropped.pins} pin(s), ${dropped.companies} company(ies)`);
  }

  console.log('Backup Companies');
  writeJson(flags.companyfile, data.companies);

  console.log('Backup Pins');
  writeJson(flags.pinfile, data.pins);

  console.log('Backup Users');
  writeJson(flags.userfile, data.users);

  console.log('Backup Comments');
  writeJson(flags.commentfile, data.comments);

  console.log('Backup Follows');
  writeJson(flags.followfile, data.follows);

  // Who follows which company (0048).
  console.log('Backup Company Follows');
  writeJson(flags.companyfollowfile, data.companyFollows);

  // Duplicate pairs and decisions (not page views, which only order stacks),
  // for the pins kept above.
  console.log('Backup Pin Duplicates');
  const keptPinIds = new Set(data.pins.map((p) => p.id));
  const duplicates = (await PinDuplicate.getAll()).filter((d) => keptPinIds.has(d.pinId) && keptPinIds.has(d.otherPinId));
  writeJson(flags.duplicatefile, duplicates);

  // What people told the AI a pin is missing, for kept pins by kept users.
  console.log('Backup AI Feedback');
  const keptUserIds = new Set(data.users.map((u) => u.id));
  const feedback = (await AiFeedback.getAll()).filter((f) => keptPinIds.has(f.pinId) && (f.userId == null || keptUserIds.has(f.userId)));
  writeJson(flags.aifeedbackfile, feedback);

  // Link wikis (0026) for the kept pins' links, so a restore does not pay
  // for writing them again. Links only e2e pins cited are left out, and so is
  // each link's fetched text, which can run to a whole transcript: a ready
  // wiki never needs it, and --refetch reads the link again anyway.
  console.log('Backup Sources');
  const { sources, wikis, pinSources, lintFindings, lintScans } = await Source.getAll();
  const keptPinSources = pinSources.filter((ps) => keptPinIds.has(ps.pinId));
  const keptSourceIds = new Set(keptPinSources.map((ps) => ps.sourceId));
  writeJson(flags.sourcefile, {
    sources: sources.filter((s) => keptSourceIds.has(s.id)).map(({ text: _text, ...s }) => s),
    wikis: wikis.filter((w) => keptSourceIds.has(w.sourceId)),
    pinSources: keptPinSources,
    lintFindings: lintFindings.filter(
      (f) => (f.pinId == null || keptPinIds.has(f.pinId)) && (f.sourceId == null || keptSourceIds.has(f.sourceId)),
    ),
    // Contradiction scans are keyed by pin, quality scans by source.
    lintScans: lintScans.filter((s) => (s.check === 'contradiction' ? keptPinIds.has(s.subjectId) : keptSourceIds.has(s.subjectId))),
  });

  // Stock tickers and their price snapshots (0029): a posted price cannot be
  // read again later, so it is kept.
  console.log('Backup Stocks');
  const stocks = await PinTicker.getAll();
  const keptCompanyIds = new Set(data.companies.map((c) => c.id));
  const keptTickerIds = new Set(stocks.tickers.filter((t) => keptPinIds.has(t.pinId)).map((t) => t.id));
  writeJson(flags.stockfile, {
    tickers: stocks.tickers.filter((t) => keptTickerIds.has(t.id)),
    prices: stocks.prices.filter((p) => keptTickerIds.has(p.pinTickerId)),
    relations: (await CompanyRelation.getAll()).filter((r) => keptCompanyIds.has(r.companyId)),
  });

  // Pin tags (0038): the ones typed in the form and the awards pins' text names.
  console.log('Backup Tags');
  writeJson(flags.tagfile, (await PinTag.getAll()).filter((t) => keptPinIds.has(t.pinId)));

  // Flight paths (0049): computed, but regenerating them needs the launch schedule.
  console.log('Backup Flight Paths');
  writeJson(flags.flightpathfile, (await allFlightPaths()).filter((f) => keptPinIds.has(f.pinId)));

  // Pin translations (0044): each costs a Claude call to make again.
  console.log('Backup Translations');
  writeJson(flags.translationfile, (await PinTranslation.getAll()).filter((t) => keptPinIds.has(t.pinId)));

  console.log('Data Backup Complete');
}

async function seedDB() {
  // US federal holidays, computed by date-holidays instead of fetched. The
  // Enrico API this used to call still answers 200 for every year, but its US
  // dataset has rotted down to Juneteenth alone: it seeded 5 holiday markers
  // for the 15 years it was asked about, and an empty list is not an error, so
  // nothing said so. Computing them locally also means seeding needs no
  // network, and can cover every year the timeline shows rather than the 2011
  // onwards that was all Enrico had.
  //
  // Read holiday.date, not holiday.start. date is the calendar date in the
  // country's own zone ('2025-01-01 00:00:00'); start is that midnight as an
  // instant, so it carries an Eastern offset (2025-01-01T05:00:00Z) and would
  // put every marker five hours off the UTC midnight these rows sit on.
  //
  // 'public' leaves out the observances and state-optional days. Dropping
  // substitutes leaves out the day off that moves when a holiday falls on a
  // weekend: a 'Christmas Day (substitute day)' marker on the 24th is
  // administrative rather than an event, and New Year's substitute day sits on
  // 12-31, under the wrong year.
  const holidays = new Holidays('US');
  await Promise.all(
    _.range(FIRST_HOLIDAY_YEAR, LAST_HOLIDAY_YEAR + 1).flatMap((year) =>
      holidays
        .getHolidays(year)
        .filter((holiday) => holiday.type === 'public' && !holiday.substitute)
        .map((holiday) => {
          const [y, m, d] = holiday.date.slice(0, 10).split('-').map(Number);
          return new DateTime({
            title: holiday.name,
            utcStartDateTime: new Date(Date.UTC(y, m - 1, d)),
            alwaysShow: true,
          }).save();
        }),
    ),
  );

  // Aphelion, solstice, equinox and perihelion markers.
  for (const file of [flags.aphelionfile, flags.solsticefile, flags.equinoxfile, flags.perihelionfile]) {
    const dates: any[] = readJson(file);
    await Promise.all(dates.map((d) => new DateTime({ ...d, alwaysShow: true }).save()));
  }

  // Users are restored with their ids, password hashes and salts intact,
  // before anything that references them. seedUsers.json is gitignored (it
  // holds hashes), so a fresh clone falls back to the two admins.
  if (!existsSync(flags.userfile)) {
    log.info(`${flags.userfile} not found, seeding default users`);
    const defaults = [
      { provider: 'facebook', role: 'admin', userName: '@ThePinGang', firstName: 'Ian', lastName: 'Flynn', email: 'flynni2008@gmail.com', password: 'admin', facebookId: '10100470408434696', id: 1 },
      { provider: 'facebook', role: 'admin', userName: '@PrettyGang', firstName: 'Serena', lastName: 'Chen', email: 'chenxikristy@gmail.com', password: 'admin', facebookId: '984663319826', id: 2 },
    ];
    for (const u of defaults) {
      await new User(u).save();
    }
  } else {
    for (const u of readJson(flags.userfile)) {
      await new User(u).restore();
    }
  }

  for (const type of ['image', 'twitter', 'youtube']) {
    await MediumType.create(type);
  }

  // Companies go in with their logos before the pins that name them, so
  // seeding does not look every logo up again. Without the file, pins create
  // their companies as they load.
  if (existsSync(flags.companyfile)) {
    await Company.restore(readJson(flags.companyfile));
  } else {
    log.info(`${flags.companyfile} not found, companies will be created from pins`);
  }

  try {
    await new FullPins(readJson(flags.pinfile)).save();
  } catch (error) {
    log.error('Pins Save Error', JSON.stringify(error));
  }

  // Comments reference Pin/User rows created above, so they load after them.
  try {
    await Comment.restoreAll(readJson(flags.commentfile));
  } catch (error) {
    log.error('Comments Save Error', JSON.stringify(error));
  }

  try {
    await Follow.restore(readJson(flags.followfile));
  } catch (error) {
    log.error('Follows Save Error', JSON.stringify(error));
  }

  if (existsSync(flags.companyfollowfile)) {
    try {
      await CompanyFollow.restore(readJson(flags.companyfollowfile));
    } catch (error) {
      log.error('Company Follows Save Error', JSON.stringify(error));
    }
  }

  if (existsSync(flags.duplicatefile)) {
    try {
      await PinDuplicate.restore(readJson(flags.duplicatefile));
    } catch (error) {
      log.error('Pin Duplicates Save Error', JSON.stringify(error));
    }
  }

  if (existsSync(flags.aifeedbackfile)) {
    try {
      await AiFeedback.restore(readJson(flags.aifeedbackfile));
    } catch (error) {
      log.error('AI Feedback Save Error', JSON.stringify(error));
    }
  }

  if (existsSync(flags.sourcefile)) {
    try {
      await Source.restore(readJson(flags.sourcefile));
    } catch (error) {
      log.error('Sources Save Error', JSON.stringify(error));
    }
  }

  if (existsSync(flags.stockfile)) {
    try {
      const stocks = readJson(flags.stockfile);
      await CompanyRelation.restore(stocks.relations);
      await PinTicker.restore(stocks);
    } catch (error) {
      log.error('Stocks Save Error', JSON.stringify(error));
    }
  }

  if (existsSync(flags.tagfile)) {
    try {
      await PinTag.restore(readJson(flags.tagfile));
    } catch (error) {
      log.error('Tags Save Error', JSON.stringify(error));
    }
  }

  if (existsSync(flags.flightpathfile)) {
    try {
      await restoreFlightPaths(readJson(flags.flightpathfile));
    } catch (error) {
      log.error('Flight Paths Save Error', JSON.stringify(error));
    }
  }

  if (existsSync(flags.translationfile)) {
    try {
      await PinTranslation.restore(readJson(flags.translationfile));
    } catch (error) {
      log.error('Translations Save Error', JSON.stringify(error));
    }
  }

  log.info('Data Load Complete');
}

const run = flags.save ? saveDB : flags.seed ? seedDB : async () => console.log('Pass --save or --seed');

run()
  .catch((err) => {
    console.log(flags.save ? 'Backup err:' : 'Seed err:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
