'use strict';

require('babel-register');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const args = require('args');
const map = require('./map');
const seed = require('./seed');
const remove = require('./remove');

args
    //.option('save', 'Save search into JSON', false)
    .option('map', 'Map search from JSON', false)
    .option('seed', 'Seed search from JSON', false)
    .option('delete', 'Delete "pins" search index', false)
    .option('index', 'Delete search index')
    .option('pinMapFilePath', 'Pin file path to be used for opporation', './scripts/backup/pin-map.json')
    .option('pinfile', 'Pin file path to be used for opporation', './scripts/backup/seed.json')
    .option('aphelionfile', 'Aphelion file path to be used for opporation', './scripts/backup/aphelion.json')
    .option('equinoxfile', 'Equinox file path to be used for opporation', './scripts/backup/equinox.json')
    .option('perihelionfile', 'Perihelion file path to be used for opporation', './scripts/backup/perihelion.json')
    .option('solsticefile', 'Solstice file path to be used for opporation', './scripts/backup/solstice.json');

const flags = args.parse(process.argv);
const cp = require('../../server/sqlConnectionPool');

const saveOpt = {
    cp: cp,
    pinfile: flags.pinfile
};

const seedOpt = {
    cp: cp,
    pinMapFilePath: flags.pinMapFilePath,
    pinfile: flags.pinfile,
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
    //   if (opt.save) {
    //     return save
    //       .setup(saveOpt)
    //       .saveDB();
    //   } else 

    let promise = Promise.resolve('begin search opperation');

    if (opt.map) {
        promise = promise
            .then(t => {
                return map
                    .setup(seedOpt)
                    .map();
            });
    }

    if (opt.seed) {
        promise = promise
            .then(t => {
                return seed
                    .setup(seedOpt)
                    .seed();
            });
    }
    // delete 'pins'
    if (opt.delete) {
        promise = promise
            .then(t => {
                return remove
                    .setup(Object.assign({}, seedOpt, { index: opt.index }))
                    .remove();
            });
    }

    return promise;

}
