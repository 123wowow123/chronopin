'use strict';

require('@babel/register');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const args = require('args');
const seed = require('./seed');
const { SearchPin } = require('../../server/model');
const log = require('../../server/util/log');

args
    //.option('save', 'Save search into JSON', false)
    .option('seed', 'Seed search from JSON', false)
    .option('reset', 'Empty the FAISS search index', false)
    .option('pinfile', 'Pin file path to be used for opporation', './scripts/backup/seedPins.json')
    .option('aphelionfile', 'Aphelion file path to be used for opporation', './scripts/backup/aphelion.json')
    .option('equinoxfile', 'Equinox file path to be used for opporation', './scripts/backup/equinox.json')
    .option('perihelionfile', 'Perihelion file path to be used for opporation', './scripts/backup/perihelion.json')
    .option('solsticefile', 'Solstice file path to be used for opporation', './scripts/backup/solstice.json');

const flags = args.parse(process.argv);
const cp = require('../../server/db');

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

    if (opt.reset) {
        promise = promise
            .then(t => {
                return SearchPin.resetIndex()
                    .then(res => log.success('FAISS index reset', JSON.stringify(res)));
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
    return promise;

}
