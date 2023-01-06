/**
 * Save / Load Json file from filePath
 */

'use strict';

const fs = require('fs');
const azureBlob = require('../../server/azure-blob');

const Model = require('../../server/model');
const Pins = Model.Pins;

module.exports.save = function(pins, filePath) {
  return fs.writeFileSync(filePath, JSON.stringify(pins.pins, null, 2));
};

module.exports.loadPins = function(filePath) {
  let pinsJSON, pins;
  pinsJSON = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  pins = new Pins(pinsJSON);
  return pins;
};
