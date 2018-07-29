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

import * as log from '../../server/util/log';

import rp from 'request-promise';

let INDEX;

// Setup
module.exports.setup = function (seedOpt) {
    INDEX = seedOpt.index;
    return this;
}

module.exports.remove = function () {

    return Promise.resolve('Start DELETE Search Data')
        .then(() => {

            if (!INDEX) {
                throw new Error('Missing INDEX value')
            }

            // DELETE Uri
            const uri = `http://35.197.4.132:9200/${INDEX}`;

            const options = {
                method: 'DELETE',
                uri,
                // content-length":0 bug causing resonse to always fail even if command exeucuted sucessfully
                // "body":"{\"acknowledged\":true}"
                simple: false,
                resolveWithFullResponse: true
            };

            // DELETE INDEX
            return rp(options)
                .then((parsedBody) => {
                    if (parsedBody.statusCode != 200) {
                        // DELETE failed...
                        log.error("DELETE Failed", JSON.stringify(parsedBody));
                        throw Error(parsedBody.body);
                    }

                    // DELETE succeeded...
                    log.success("DELETE processed", JSON.stringify(parsedBody));
                    return parsedBody;
                })
            // .catch((err) => {
            //     // DELETE failed...
            //     console.log("DELETE Failed", JSON.stringify(err));
            //     throw err;
            // });

        })
        .then(() => {
            log.info(`Delete Search "${INDEX}" INDEX  Complete`);
        });
}