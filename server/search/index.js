'use strict';

const config = require('../config/environment');
const rp = require('request-promise');
//let indices = ['temp'];
const index = 'temp';
const baseSearchUrl = `${config.azureSearch.serviceUrl}/indexes/${index}/docs`;

// https://docs.microsoft.com/en-us/rest/api/searchservice/?redirectedfrom=MSDN
module.exports.pin = function pin(searchText) {
  let options = {
    uri: baseSearchUrl,
    headers: {
      'api-key': config.azureSearch.queryKey
    },
    qs: {
      "api-version": "2016-09-01",
      "search": searchText
    }
  };

  return rp(options);
};
