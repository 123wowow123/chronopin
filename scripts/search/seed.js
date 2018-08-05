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
    pinFilePath,
    aphelionFilePath,
    solsticeFilePath,
    equinoxFilePath,
    perihelionFilePath;


// Setup
module.exports.setup = function (seedOpt) {
    cp = seedOpt.cp;
    Request = cp.Request;
    pinFilePath = seedOpt.pinfile;
    aphelionFilePath = seedOpt.aphelionfile;
    solsticeFilePath = seedOpt.solsticefile;
    equinoxFilePath = seedOpt.equinoxfile;
    perihelionFilePath = seedOpt.perihelionfile;

    return this;
}

module.exports.seed = function () {

    return Promise.resolve('Start Load Search Data')
        .then(() => {

            // Create Pins
            const uri = 'http://35.197.4.132:9200/pins/_doc/';

            const options = {
                method: 'POST',
                uri,
                // body: {
                //     some: 'payload'
                // },
                json: true // Automatically stringifies the body to JSON
            };

            // Create Pins
            let pinsJSON = JSON.parse(fs.readFileSync(pinFilePath, 'utf8'));
            let pins = new Pins(pinsJSON);
            let pinsPromise = pins.pins.map(p => {

                //debugger
                const req = Object.assign({}, options, { body: p });
                //console.log(req);
                return rp(req)
                    .then((parsedBody) => {
                        // POST succeeded...
                        log.success("POST succeeded", JSON.stringify(req));
                        return parsedBody;
                    })
                    .catch((err) => {
                        // POST failed...
                        log.error("POST Failed", JSON.stringify(err));
                        return err;
                    });

            });

            return Promise.all(pinsPromise);

        })
        .then(() => {
            log.info('Search Data Load Complete');
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