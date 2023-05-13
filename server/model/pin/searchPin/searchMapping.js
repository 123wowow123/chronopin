import { prefixSearchIndex } from './searchHelper';
const rp = require('request-promise');
import * as config from '../../../config/environment';

export default class SearchMapping {

  static createMapping(index, mapping) {
    return createMapping(index, mapping);
  }

}

function createMapping(index, mapping) {
  // Create Mapping
  const uri = prefixSearchIndex(index);
  console.log(uri)
  const options = {
    method: 'PUT',
    uri,
    json: true, // Automatically stringifies the body to JSON
    auth: config.elastiSearch.auth
  };

  //debugger
  const req = Object.assign({}, options, { body: mapping });
  //console.log(req);
  return rp(req);
};