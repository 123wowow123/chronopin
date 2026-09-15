// Backs the database up to JSON (--save) or loads it from JSON (--seed).
//
//   npm run backup:data     database -> scripts/backup/*.json
//   npm run create:data     scripts/backup/*.json -> an empty, migrated database

import '../env';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import _ from 'lodash';
import * as db from '@/server/db';
import { Comment, Company, DateTime, Follow, FullPins, MediumType, User, Users } from '@/server/model';
import PinDuplicate from '@/server/model/pinDuplicate';
import { fetchJson } from '@/server/util/fetchJson';
import log from '@/server/util/log';
import { excludeE2e } from './excludeE2e';

const { values: flags } = parseArgs({
  options: {
    save: { type: 'boolean', default: false },
    seed: { type: 'boolean', default: false },
    pinfile: { type: 'string', default: './scripts/backup/seedPins.json' },
    userfile: { type: 'string', default: './scripts/backup/seedUsers.json' },
    commentfile: { type: 'string', default: './scripts/backup/seedComments.json' },
    followfile: { type: 'string', default: './scripts/backup/seedFollows.json' },
    duplicatefile: { type: 'string', default: './scripts/backup/seedPinDuplicates.json' },
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
  'role', 'provider', 'salt', 'websiteUrl', 'defaultFilterSpanPreference', 'themePreference',
  'utcCreatedDateTime', 'utcUpdatedDateTime', 'utcDeletedDateTime',
];

const readJson = (file: string) => JSON.parse(readFileSync(file, 'utf8'));
const writeJson = (file: string, data: unknown) => writeFileSync(file, JSON.stringify(data, null, 2));

async function saveDB() {
  // No limit: back up every pin, soft-deleted ones included.
  const { pins } = await FullPins.queryForwardByDate(new Date(0), 0, 2147483647);
  const data = excludeE2e({
    users: await Users.getAll(BACKUP_USER_PROPS),
    pins,
    companies: await Company.getAll(),
    comments: await Comment.getAll(),
    follows: (await Follow.getAll()).follows,
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

  // Duplicate pairs and decisions (not page views, which only order stacks),
  // for the pins kept above.
  console.log('Backup Pin Duplicates');
  const keptPinIds = new Set(data.pins.map((p) => p.id));
  const duplicates = (await PinDuplicate.getAll()).filter((d) => keptPinIds.has(d.pinId) && keptPinIds.has(d.otherPinId));
  writeJson(flags.duplicatefile, duplicates);

  console.log('Data Backup Complete');
}

async function seedDB() {
  // US public holidays, from the Enrico API (it covers 2011 onward).
  const holidayBaseUrl = 'http://kayaposoft.com/enrico/json/v1.0/';
  await Promise.all(
    _.range(2011, 2026).map(async (year) => {
      const holidays = await fetchJson<any[]>(`${holidayBaseUrl}?action=getPublicHolidaysForYear&year=${year}&country=usa`);
      await Promise.all(
        holidays.map((holiday) =>
          new DateTime({
            title: holiday.englishName,
            description: holiday.note,
            utcStartDateTime: new Date(Date.UTC(holiday.date.year, holiday.date.month - 1, holiday.date.day)),
            alwaysShow: true,
          }).save(),
        ),
      );
    }),
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

  if (existsSync(flags.duplicatefile)) {
    try {
      await PinDuplicate.restore(readJson(flags.duplicatefile));
    } catch (error) {
      log.error('Pin Duplicates Save Error', JSON.stringify(error));
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
