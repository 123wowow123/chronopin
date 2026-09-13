/*jshint eqnull:true */

'use strict';

import * as db from '../../../db';
import * as _ from 'lodash';

import {
    BasePins,
    FullPin
} from '../..';

//save //queryForwardByDate


// Used in loading scripts but not in site
export default class FullPins extends BasePins {
    // Properties
    // this.pins
    // this.queryCount

    constructor(pins) {
        super(pins);
    }

    setPins(pins) {
        if (Array.isArray(pins)) {
            this.pins = FullPins.mapPinRowsToPins(pins);
        } else {
            throw "arg is not an array";
        }
        return this;
    }

    setPinsFromArray(pins) {
        this.pins = pins.map(p => {
            return new FullPin(p);
        });
        return this;
    }

    static mapPinRowsToPins(pinRows) {
        let pins,
            groupedPinRows;

        groupedPinRows = _.groupBy(pinRows, row => {
            return row.id;
        });

        pins = Object.entries(groupedPinRows)
            .map(([key, value]) => {
                return FullPin.mapPinRowsToPin(value);
            });

        // need to sort properly
        pins = _.chain(pins)
            .sortBy('id')
            .sortBy('utcStartDateTime')
            .value();

        return pins;
    }

    static queryForwardByDate(fromDateTime, userId, lastPinId, pageSize) {
        return _queryPinsWithSubArrays(fromDateTime, lastPinId, pageSize)
            .then(res => {
                return new FullPins(res);
            });
    }
}

// Every pin after (fromDateTime, lastPinId), for backups. Soft-deleted pins
// are included, so a backup restores them as deleted rather than losing them.
function _queryPinsWithSubArrays(fromDateTime, lastPinId, pageSize) {
    return db.query(`
        SELECT "Pin".*
        FROM "PinBaseView" AS "Pin"
        WHERE "Pin"."utcStartDateTime" > $1
          OR ("Pin"."utcStartDateTime" = $1 AND "Pin"."id" > $2)
        ORDER BY "Pin"."utcStartDateTime", "Pin"."id", "Pin"."Media.id", "Pin"."Merchant.id"
        LIMIT $3`,
        [fromDateTime, lastPinId || 0, pageSize])
        .then(rows => {
            return {
                pins: rows
            };
        });
}
