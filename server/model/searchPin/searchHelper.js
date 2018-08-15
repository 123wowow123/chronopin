import * as config from '../../config/environment';

const indexPrefix = config.elastiSearch.indexPrefix; //will be empty string on prod
const address = config.elastiSearch.serviceUrl;

/* ElasticSearch Helper */

export function prefixSearchIndex(index) {
    return `${address}/${indexPrefix}${index}`;
};