/*jshint eqnull:true */

'use strict';

import * as db from '../../db';
import * as _ from 'lodash';
import {
  DateTime
} from '..';

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
    let promises = this.dateTimes.map(p => {
      return p.save();
    });
    return Promise.all(promises);
  }

  static queryByStartEndDate(startDateTime, endDateTime) {
    return _queryByStartEndDate(startDateTime, endDateTime)
      .then(res => {
        //console.log('queryByStartEndDate', res);
        return new DateTimes(res);
      });
  }

}

// Dates starting in [startDateTime, endDateTime).
function _queryByStartEndDate(startDateTime, endDateTime) {
  return db.query(`
    SELECT *
    FROM "DateTime" AS "d"
    WHERE $1 <= "d"."utcStartDateTime" AND $2 > "d"."utcStartDateTime"
    ORDER BY "d"."utcStartDateTime", "d"."id"`, [startDateTime, endDateTime])
    .then(rows => {
      return {
        dateTimes: rows,
        queryCount: rows.length
      };
    });
}
