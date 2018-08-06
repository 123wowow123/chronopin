/**
 * Populate ElastiSearch with mapping
 */

'use strict';

//debugger;

import {
    User,
    Users,
    Pin,
    Pins,
    Medium,
    DateTime,
    DateTimes
} from '../../server/model';

import * as search from '../../server/search';

import fs from 'fs';
import azureBlob from '../../server/azure-blob';
import rp from 'request-promise';
import _ from 'lodash';
import * as log from '../../server/util/log';

let cp,
    Request,
    pinMapFilePath;


// Setup
module.exports.setup = function (seedOpt) {
    cp = seedOpt.cp;
    Request = cp.Request;
    pinMapFilePath = seedOpt.pinMapFilePath;

    return this;
}

module.exports.map = function () {

    return Promise.resolve('Start Map Search Data')
        .then(() => {
            // Create Pins Mapping
            const index = "pins";

            let pinMap = JSON.parse(fs.readFileSync(pinMapFilePath, 'utf8'));

            return search.createMapping(index, pinMap)
                .then((parsedBody) => {
                    // POST succeeded...
                    log.success("Create succeeded", JSON.stringify(parsedBody));
                    return parsedBody;
                })
                .catch((err) => {
                    // POST failed...
                    log.error("Create Failed", JSON.stringify(err));
                    return err;
                });

        })
        .then(() => {
            log.info('Search Map Load Complete');
        });
}

//https://www.elastic.co/guide/en/elasticsearch/reference/master/_index_and_query_a_document.html

// PUT /customer/_doc/1?pretty
// {
//   "name": "John Doe"
// }

// ToDo:
// search holidays
// search users