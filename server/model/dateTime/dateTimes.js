/*jshint eqnull:true */

'use strict';

import * as mssql from 'mssql';
import * as cp from '../../sqlConnectionPool';
import * as _ from 'lodash';
import {
  DateTime
} from '../../model';

export default class DateTimes {
  // Properties
  // this.dates
  // this.queryCount - probably not needed

  constructor(dateTimes) {
    if (dateTimes) {
      this.set(dateTimes);
    }
  }

  set(dateTimes) {
    if (Array.isArray(dateTimes)) {
      this
        .setDateTimes(dateTimes)
        .setQueryCount(undefined);
    } else if (dateTimes.dateTimes && Number.isInteger(dateTimes.queryCount)) {
      this
        .setDateTimes(dateTimes.dateTimes)
        .setQueryCount(dateTimes.queryCount);
    } else {
      throw "Dates cannot set value of arg";
    }
    return this;
  }

  setDateTimes(dateTimes) {
    if (Array.isArray(dateTimes)) {
      this.dateTimes = dateTimes.map(dt => new DateTime(dt));
    } else {
      throw "arg is not an array";
    }
    return this;
  }

  setQueryCount(queryCount) {
    if (Number.isInteger(queryCount) || queryCount == null) {
      this.queryCount = queryCount;
    } else {
      throw "arg is not an integer, undefined, null";
    }
    return this;
  }

  save() {
    this.dateTimes.forEach(p => {
      return p.save();
    });
    return this;
  }

  static queryByStartEndDate(startDateTime, endDateTime) {
    return _queryMSSQLDateTimesByStartEndDate(startDateTime, endDateTime)
      .then(res => {
        //console.log('queryByStartEndDate', res);
        return new DateTimes(res);
      });
  }

}

function _queryMSSQLDateTimesByStartEndDate(startDateTime, endDateTime) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function(resolve, reject) {
        const StoredProcedureName = 'GetDateTimesByStartEndDate';
        let request = new mssql.Request(conn)
          .input('startDateTime', mssql.DateTime2(7), startDateTime)
          .input('endDateTime', mssql.DateTime2(7), endDateTime);

        //console.log('GetDateTimesByStartEndDate', startDateTime, endDateTime);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          function(err, recordsets, returnValue, affected) {
            let queryCount;
            //console.log('GetDateTimesByStartEndDate', recordsets[0]);
            if (err) {
              reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }

            queryCount = recordsets[0].length;

            resolve({
              dateTimes: recordsets[0],
              queryCount: queryCount
            });
          });
      });
    });
}
