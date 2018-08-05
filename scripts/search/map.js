/**
 * Populate ElastiSearch with sample data
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

            // Create Pins
            const uri = 'http://35.197.4.132:9200/pins';

            const options = {
                method: 'PUT',
                uri,
                // body: {
                //     some: 'payload'
                // },
                json: true // Automatically stringifies the body to JSON
            };

            // Create Pins
            let pinMapJSON = JSON.parse(fs.readFileSync(pinMapFilePath, 'utf8'));

            //debugger
            const req = Object.assign({}, options, { body: pinMapJSON });
            //console.log(req);
            let reqPromise = rp(req)
                .then((parsedBody) => {
                    // PUT succeeded...
                    log.success("PUT succeeded", JSON.stringify(req));
                    return parsedBody;
                })
                .catch((err) => {
                    // PUT failed...
                    log.error("PUT Failed", JSON.stringify(err));
                    return err;
                });

            return reqPromise;

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