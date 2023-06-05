/**
 * Populate DB with sample data
 */

'use strict';

const azureBlob = require('../../server/image');

let cp,
  Request;

// Setup
module.exports.setup = function (opt) {
  cp = opt.cp;
  Request = cp.Request;
  return this;
};

module.exports.execute = function () {
  return Promise.resolve('Begin Image Execute')
    .then(() => {
      console.log('Update Images Properties');
      return azureBlob.updateThumbProperties();
    })
    .then(() => {
      console.log('Update Images Properties Complete');
    })
    .catch((err) => {
      console.log('Update Images Properties err:', err);
    });
}
