'use strict';

const config = require('../config/environment');
const rp = require('request-promise');
const indexPrefix = config.elastiSearch.indexPrefix; //will be empty string on prod
const address = config.elastiSearch.serviceUrl;

function _prefixIndex(index) {
  return `${address}/${indexPrefix}${index}`;
}

// https://docs.microsoft.com/en-us/rest/api/searchservice/?redirectedfrom=MSDN
module.exports.pins = function (searchText) {
  const index = "pins";
  const command = "_search";
  const uri = _prefixIndex(index) + "/" + command;
  const searchFields = ["title", "description", "address"];

  let options = {
    method: 'POST',
    uri: uri,
    body: {
      "query": {
        "multi_match": {
          "query": searchText,
          "fields": searchFields
        }
      }
    },
    json: true // Automatically stringifies the body to JSON
  };

  return rp(options); //////////////////////////// new mapping needed
};

module.exports.upsertPin = function (pin) {
  // Create Pins
  const id = pin.id;

  const index = "pins";
  const command = "_doc";
  const uri = _prefixIndex(index) + "/" + command + "/" + id;

  const options = {
    method: 'PUT',
    uri,
    json: true // Automatically stringifies the body to JSON
  };

  // Create Pins

  //debugger
  const req = Object.assign({}, options, { body: pin });
  //console.log(req);
  return rp(req);
};

module.exports.removePin = function (pin) {
  // Create Pins
  const id = pin.id;

  const index = "pins";
  const command = "_doc";
  const uri = _prefixIndex(index) + "/" + command + "/" + id;

  const options = {
    method: 'DELETE',
    uri,
    json: true // Automatically stringifies the body to JSON
  };

  // Create Pins

  //debugger
  const req = Object.assign({}, options, { body: pin });
  //console.log(req);
  return rp(req);
};

module.exports.createMapping = function (index, mapping) {
  // Create Mapping
  const uri = _prefixIndex(index);
console.log(uri)
  const options = {
    method: 'PUT',
    uri,
    json: true // Automatically stringifies the body to JSON
  };

  // Create Pins

  //debugger
  const req = Object.assign({}, options, { body: mapping });
  //console.log(req);
  return rp(req);
};

module.exports.removeIndex = function (index) {
  // Remove Specified Index
  const uri = _prefixIndex(index);

  const options = {
    method: 'DELETE',
    uri,
    // content-length":0 bug causing resonse to always fail even if command exeucuted sucessfully
    // "body":"{\"acknowledged\":true}"
    simple: false,
    resolveWithFullResponse: true
  };

  // Create Pins

  //debugger
  const req = Object.assign({}, options);
  //console.log(req);
  return rp(req);
};