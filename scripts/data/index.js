'use strict';

require('babel-register');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const args = require('args');
const extend = require('extend');
const seed = require('./seed');
const save = require('./save');

args
  .option('save', 'Save database into JSON', false)
  .option('seed', 'Seed database from JSON', false)
  .option('pinfile', 'Pin file path to be used for opporation', './scripts/backup/seedPins.json')
  .option('userfile', 'Pin file path to be used for opporation', './scripts/backup/seedUsers.json')
  .option('aphelionfile', 'Aphelion file path to be used for opporation', './scripts/backup/aphelion.json')
  .option('equinoxfile', 'Equinox file path to be used for opporation', './scripts/backup/equinox.json')
  .option('perihelionfile', 'Perihelion file path to be used for opporation', './scripts/backup/perihelion.json')
  .option('solsticefile', 'Solstice file path to be used for opporation', './scripts/backup/solstice.json');

const flags = args.parse(process.argv);
const cp = require('../../server/sqlConnectionPool');

const saveOpt = {
  cp: cp,
  pinfile: flags.pinfile,
  userfile: flags.userfile,
};

const seedOpt = {
  cp: cp,
  pinfile: flags.pinfile,
  userfile: flags.userfile,
  aphelionfile: flags.aphelionfile,
  equinoxfile: flags.equinoxfile,
  perihelionfile: flags.perihelionfile,
  solsticefile: flags.solsticefile
};

execute(flags)
  .then(arg => {
    //process.exit();
  })
  .catch(arg => {
    //process.exit();
  });

function execute(opt) {
  if (opt.save) {
    return save
      .setup(saveOpt)
      .saveDB();
  } else if (opt.seed) {
    return seed
      .setup(seedOpt)
      .seedDB();
  }
}
