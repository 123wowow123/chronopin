/**
 * Populate DB with sample data
 */

'use strict';

const fs = require('fs');
const azureBlob = require('../../server/azure-blob');

const Model = require('../../server/model');
const Pins = Model.Pins;


let cp,
  Request,
  pinFilePath;

// Setup
module.exports.setup = function(saveOpt) {
  cp = saveOpt.cp;
  Request = cp.Request;
  pinFilePath = saveOpt.pinfile;
  return this;
};

module.exports.saveDB = function() {

  return Promise.resolve('Begin Backup')
    .then(() => {
      const fromDateTime = new Date(0),
        userId = 0,
        lastPinId = 0,
        pageSize = 2147483647; // Maximum values for an integer in SQL Server

      return Pins.queryForwardByDate(fromDateTime, userId, lastPinId, pageSize)
        .then(({
          pins
        }) => {
          return fs.writeFileSync(pinFilePath, JSON.stringify(pins, null, 2));
        });
    })
    .then(() => {
      console.log('Data Backup Complete');
    })
    .catch((err) => {
      console.log('Backup err:', err);
    });
}
