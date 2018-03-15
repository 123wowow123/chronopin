'use strict';

var config = require('../config/environment');
var rp = require('request-promise');
//let indices = ['temp'];
var index = 'temp';
var baseSearchUrl = config.azureSearch.serviceUrl + '/indexes/' + index + '/docs';

// https://docs.microsoft.com/en-us/rest/api/searchservice/?redirectedfrom=MSDN
module.exports.pin = function pin(searchText) {
  var options = {
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
//# sourceMappingURL=index.js.map
