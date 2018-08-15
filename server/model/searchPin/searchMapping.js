import { prefixSearchIndex } from './searchHelper';

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
    json: true // Automatically stringifies the body to JSON
  };

  //debugger
  const req = Object.assign({}, options, { body: mapping });
  //console.log(req);
  return rp(req);
};