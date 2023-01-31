'use strict';

import * as mssql from 'mssql';
import * as cp from '../../sqlConnectionPool';
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
    return _createMediumTypeMSSQL(this)
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

function _createMediumTypeMSSQL(mediumType) {
  return cp.getConnection()
    .then(conn => {
      return new Promise((resolve, reject) => {
        const StoredProcedureName = 'CreateMediumType';
        let request = new mssql.Request(conn)
          .input('type', mssql.NVarChar(255), mediumType.type)
          .output('id', mssql.Int);

        //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, res, returnValue, affected) => {
            let queryCount, id;
            //console.log('GetPinsWithFavoriteAndLikeNext', res.recordset);
            if (err) {
              reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            // ToDo: doesn't always return value
            try {
              //console.log('returnValue', returnValue); // always return 0
              id = res.output.id;
              //console.log('queryCount', queryCount);
            } catch (e) {
              id = 0;
            }
            mediumType.id = id;
            resolve({
              mediumType: mediumType
            });
          });
      });
    });
}