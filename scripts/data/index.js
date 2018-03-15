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
  .option('pinfile', 'Pin file path to be used for opporation', './scripts/data/backup/seed.json')
  .option('aphelionfile', 'Aphelion file path to be used for opporation', './scripts/data/backup/aphelion.json')
  .option('equinoxfile', 'Equinox file path to be used for opporation', './scripts/data/backup/equinox.json')
  .option('perihelionfile', 'Perihelion file path to be used for opporation', './scripts/data/backup/perihelion.json')
  .option('solsticefile', 'Solstice file path to be used for opporation', './scripts/data/backup/solstice.json')

const flags = args.parse(process.argv);
const cp = require('../../server/sqlConnectionPool');
const Request = cp.Request;

const saveOpt = {
  cp: cp,
  pinfile: flags.pinfile
};

const seedOpt = {
  cp: cp,
  pinfile: flags.pinfile,
  aphelionfile: flags.aphelionfile,
  equinoxfile: flags.equinoxfile,
  perihelionfile: flags.perihelionfile,
  solsticefile: flags.solsticefile
};

execute()
  .then(arg => {
    //process.exit();
  })
  .catch(arg => {
    //process.exit();
  });

function execute(opt) {
  if (opt && opt.save || flags.save) {
    return save
      .setup(saveOpt)
      .saveDB();
  } else if (opt && opt.seed || flags.seed) {
    return seed
      .setup(seedOpt)
      .seedDB();
  }
}
