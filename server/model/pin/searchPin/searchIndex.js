import { prefixSearchIndex } from './searchHelper';
import rp from 'request-promise';
import * as config from '../../../config/environment';

export default class SearchIndex {

  static removeIndex(index) {
    return removeIndex(index);
  }

}

function removeIndex(index) {
  // Remove Specified Index
  const uri = prefixSearchIndex(index);

  const options = {
    method: 'DELETE',
    uri,
    // content-length":0 bug causing resonse to always fail even if command exeucuted sucessfully
    // "body":"{\"acknowledged\":true}"
    simple: false,
    resolveWithFullResponse: true,
    auth: config.elastiSearch.auth
  };

  //debugger
  const req = Object.assign({}, options);
  //console.log(req);
  return rp(req);
};