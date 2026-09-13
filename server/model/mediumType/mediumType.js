'use strict';

import * as db from '../../db';
import * as _ from 'lodash';

const prop = [
  'id',
  'type'
];

export default class MediumType {
  constructor(mediumType) {

    if (mediumType) {
      this.set(mediumType);
    }
  }

  set(mediumType) {
    if (mediumType) {
      for (let i = 0; i < prop.length; i++) {
        this[prop[i]] = mediumType[prop[i]];
      }
    } else {
      throw "medium cannot set value of arg";
    }

    return this;
  }

  save() {
    return _create(this)
      .then((newMediumType) => {
        return this.set(newMediumType.mediumType);
      });
  }

  toJSON() {
    // omits own and inherited properties with null values
    return _.omitBy(this, (value, key) => {
      return key.startsWith('_')
        || _.isNull(value);
    });
  }
}

function _create(mediumType) {
  return db.query(`INSERT INTO "MediumType" ("type") VALUES ($1) RETURNING "id"`, [mediumType.type])
    .then(rows => {
      mediumType.id = rows[0].id;
      return {
        mediumType: mediumType
      };
    });
}
