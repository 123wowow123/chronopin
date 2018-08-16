/**
 * Populate ElastiSearch with sample data
 */

'use strict';

//debugger;

import {
    SearchPins
} from '../../server/model';

import fs from 'fs';
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
            let pinsJSON = JSON.parse(fs.readFileSync(pinFilePath, 'utf8'));
            let pins = new SearchPins(pinsJSON);
            return pins.save()
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