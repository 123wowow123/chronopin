'use strict';

require('babel-register');

const args = require('args');
const extend = require('extend');

args
  .option('file', 'File path to be used for opporation', './scripts/data/backup/seedPins.json');

const flags = args.parse(process.argv)

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Setup
const jsonFile = require('./jsonFile');
const remediate = require('./remediate');

execute()
  .then(arg => {
    //process.exit();
  })
  .catch(arg => {
    //process.exit();
  });

function execute() {
  return Promise.resolve('Begin Remediation')
    .then(() => {
      let pins;
      pins = jsonFile.list(flags.file);
      pins = remediate.remediateDate(pins);
      return jsonFile.save(pins, flags.file);
    })
    .then(() => {
      console.log('Data Remediation Complete');
    })
    .catch((err) => {
      console.log('Remediation err:', err);
    });
}
