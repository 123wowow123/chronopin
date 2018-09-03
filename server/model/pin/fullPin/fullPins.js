/*jshint eqnull:true */

'use strict';

import * as mssql from 'mssql';
import * as cp from '../../../sqlConnectionPool';
import * as _ from 'lodash';

import {
    BasePins
} from '../..';

//save //queryForwardByDate

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

    static mapPinRowsToPins(pinRows) {
        let pins,
            groupedPinRows;

        groupedPinRows = _.groupBy(pinRows, row => {
            return row.id;
        });

        pins = Object.entries(groupedPinRows)
            .map(([key, value]) => {
                return Pin.mapPinRowsToPin(value);
            });

        // need to sort properly
        pins = _.chain(pins)
            .sortBy('id')
            .sortBy('utcStartDateTime')
            .value();

        return new FullPins(pins);
    }

    static queryForwardByDate(fromDateTime, userId, lastPinId, pageSize) {
        return _queryMSSQLPinsWithSubArrays(fromDateTime, userId, lastPinId, 0, pageSize)
            .then(res => {
                return new FullPins(res);
            });
    }
}

function _queryMSSQLPinsWithSubArrays(fromDateTime, lastPinId, offset, pageSize) {
    return cp.getConnection()
        .then(conn => {
            return new Promise((resolve, reject) => {
                let StoredProcedureName;
                let request = new mssql.Request(conn)
                    .input('offset', mssql.Int, offset)
                    .input('pageSize', mssql.Int, pageSize)
                    .input('fromDateTime', mssql.DateTime2(7), fromDateTime)
                    .input('lastPinId', mssql.Int, lastPinId);

                StoredProcedureName = 'GetPinsWithFavoriteAndLikeArrayNext';
                request.execute(`[dbo].[${StoredProcedureName}]`,
                    (err, recordsets, returnValue, affected) => {
                        if (err) {
                            reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
                        }

                        resolve({
                            pins: recordsets[0]
                        });
                    });

            });
        });
}
