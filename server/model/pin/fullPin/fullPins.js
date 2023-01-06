/*jshint eqnull:true */

'use strict';

import * as mssql from 'mssql';
import * as cp from '../../../sqlConnectionPool';
import * as _ from 'lodash';

import {
    BasePins,
    FullPin
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
        return _queryMSSQLPinsWithSubArrays(fromDateTime, userId, lastPinId, pageSize)
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
                    (err, res, returnValue, affected) => {
                        if (err) {
                            reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
                        }

                        resolve({
                            pins: res.recordset
                        });
                    });

            });
        });
}
