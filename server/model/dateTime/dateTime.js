'use strict';

import * as db from '../../db';
import * as _ from 'lodash';

let prop = [
  'id',
  'title',
  'description',
  'sourceUrl',
  'address',
  'tip',
  'utcStartDateTime',
  'utcEndDateTime',
  'allDay',
  'alwaysShow',
  'utcCreatedDateTime',
  'utcUpdatedDateTime',
  'searchScore'
];

export default class DateTime {
  constructor(dateTime) {
    if (dateTime) {
      this.set(dateTime);
    }
  }

  set(dateTime) {
    if (dateTime) {
      for (let i = 0; i < prop.length; i++) {
        this[prop[i]] = dateTime[prop[i]];
      }
    } else {
      throw "DateTime cannot set value of arg";
    }
    return this;
  }

  save() {
    return _create(this)
      .then(({
        dateTime
      }) => {
        this.set(dateTime);
        return {
          dateTime: this
        };
      })
      .catch(err => {
        console.log(`DateTime '${this.title}' save err:`);
        console.log(`DateTime '${this.id}' save err:`, err);
        throw err;
      });
  }

  toJSON() {
    // omits own and inherited properties with null values
    return _.omitBy(this, _.isNull);
  }

  static delete(id) {
    return new DateTime({
      id: id
    }).delete();
  }
}

function _create(dateTime) {
  const values = [
    dateTime.title, dateTime.description, dateTime.sourceUrl, dateTime.address, dateTime.tip,
    dateTime.utcStartDateTime, dateTime.utcEndDateTime,
    dateTime.allDay == null ? false : dateTime.allDay,
    dateTime.alwaysShow == null ? false : dateTime.alwaysShow,
    dateTime.utcCreatedDateTime || new Date(), dateTime.utcUpdatedDateTime
  ].map(value => value === undefined ? null : value);

  return db.query(`
    INSERT INTO "DateTime" ("title", "description", "sourceUrl", "address", "tip", "utcStartDateTime",
      "utcEndDateTime", "allDay", "alwaysShow", "utcCreatedDateTime", "utcUpdatedDateTime")
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING "id"`, values)
    .then(rows => {
      dateTime.id = rows[0].id;
      return {
        dateTime: dateTime
      };
    });
}
