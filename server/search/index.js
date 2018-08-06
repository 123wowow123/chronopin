'use strict';

const config = require('../config/environment');
const rp = require('request-promise');
//let indices = ['temp'];
const index = 'pins';
const baseSearchUrl = `${config.elastiSearch.serviceUrl}/${index}`;

// https://docs.microsoft.com/en-us/rest/api/searchservice/?redirectedfrom=MSDN
module.exports.pins = function (searchText) {
  const command = "_search";
  const uri = baseSearchUrl + "/" + command;
  const searchFields = ["title", "description", "address"];

  let options = {
    method: 'POST',
    uri: uri,
    qs: {
      "query": {
        "multi_match": {
          "query": searchText,
          "fields": searchFields
        }
      }
    }
  };

  return rp(options); //////////////////////////// new mapping needed
};

module.exports.upsertPin = function (pin) {
  // Create Pins
  const id = pin.id;

  const command = "_doc";
  const uri = baseSearchUrl + "/" + command + "/" + id;

  const options = {
    method: 'PUT',
    uri,
    // body: {
    //     some: 'payload'
    // },
    //resolveWithFullResponse: true,
    //simple: false,
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

  const command = "_doc";
  const uri = baseSearchUrl + "/" + command + "/" + id;

  const options = {
    method: 'DELETE',
    uri,
    // body: {
    //     some: 'payload'
    // },
    //resolveWithFullResponse: true,
    //simple: false,
    json: true // Automatically stringifies the body to JSON
  };

  // Create Pins

  //debugger
  const req = Object.assign({}, options, { body: pin });
  //console.log(req);
  return rp(req);
};