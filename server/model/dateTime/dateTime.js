'use strict';

import * as mssql from 'mssql';
import * as cp from '../../sqlConnectionPool';
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
    return _createMSSQL(this)
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

  // update() {
  //   return _updateMSSQL(this);
  // }

  // delete() {
  //   return _deleteMSSQL(this);
  // }

  toJSON() {
    // omits own and inherited properties with null values
    return _.omitBy(this, _.isNull);
  }

  // static queryById(id) {
  //   return _queryMSSQLDateTimeById(id);
  // }

  static delete(id) {
    return new DateTime({
      id: id
    }).delete();
  }
}

// function _queryMSSQLDateTimeById(id) {
//   return cp.getConnection()
//     .then(conn => {
//       //console.log("queryMSSQLDateById then err", err)
//       return new Promise((resolve, reject) => {
//         const StoredProcedureName = 'GetDateTime';
//         let request = new mssql.Request(conn)
//           .input('dateTimeId', mssql.Int, dateTimeId)
//           .execute(`[dbo].[${StoredProcedureName}]`, (err, res, returnValue, affected) => {
//             let dateTime;
//             if (err) {
//               reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
//             }
//             if (res.recordset.length) {
//               dateTime = new DateTime(res.recordset[0]);
//             } else {
//               dateTime = undefined;
//             }
//             resolve({
//               dateTime: dateTime
//             });
//           });
//       });
//     }).catch(err => {
//       // ... connect error checks
//       console.log("queryMSSQLDateTimeById catch err", err);
//       throw err;
//     });
// }

function _createMSSQL(dateTime) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function(resolve, reject) {
        const StoredProcedureName = 'CreateDateTime';
        let request = new mssql.Request(conn)
          .input('title', mssql.NVarChar(1024), dateTime.title)
          .input('description', mssql.NVarChar(4000), dateTime.description)
          .input('sourceUrl', mssql.NVarChar(4000), dateTime.sourceUrl)
          .input('address', mssql.NVarChar(4000), dateTime.address)
          .input('tip', mssql.NVarChar(4000), dateTime.tip)
          .input('utcStartDateTime', mssql.DateTime2(0), dateTime.utcStartDateTime)
          .input('utcEndDateTime', mssql.DateTime2(0), dateTime.utcEndDateTime)
          .input('allDay', mssql.Bit, dateTime.allDay)
          .input('alwaysShow', mssql.Bit, dateTime.alwaysShow)
          .input('utcCreatedDateTime', mssql.DateTime2(7), dateTime.utcCreatedDateTime)
          .input('utcUpdatedDateTime', mssql.DateTime2(7), dateTime.utcUpdatedDateTime)
          .output('id', mssql.Int);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, res, returnValue, affected) => {
            let id;
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            // ToDo: doesn't always return value
            try {
              //console.log('returnValue', returnValue); // always return 0
              dateTime.id = res.output.id;

              //console.log('queryCount', queryCount);
            } catch (e) {
              throw e;
            }

            resolve({
              dateTime: dateTime
            });

          });
      });
    });
}

// function _updateMSSQL(dateTime) {
//   return cp.getConnection()
//     .then(conn => {
//       return new Promise(function(resolve, reject) {
//         const StoredProcedureName = 'UpdateDateTime';
//         let request = new mssql.Request(conn)
//           .input('id', mssql.Int, dateTime.id)
//           .input('title', mssql.NVarChar(1024), dateTime.title)
//           .input('description', mssql.NVarChar(4000), dateTime.description)
//           .input('sourceUrl', mssql.NVarChar(4000), dateTime.sourceUrl)
//           .input('address', mssql.NVarChar(4000), dateTime.address)
//           .input('tip', mssql.NVarChar(4000), dateTime.tip)
//           .input('utcStartDateTime', mssql.DateTime2(7), dateTime.utcStartDateTime)
//           .input('utcEndDateTime', mssql.DateTime2(7), dateTime.utcEndDateTime)
//           .input('allDay', mssql.Bit, dateTime.allDay)
//           .input('utcCreatedDateTime', mssql.DateTime2(7), dateTime.utcCreatedDateTime)
//           .input('utcUpdatedDateTime', mssql.DateTime2(7), dateTime.utcUpdatedDateTime)
//           .output('id', mssql.Int);
//
//         request.execute(`[dbo].[${StoredProcedureName}]`,
//           (err, res, returnValue, affected) => {
//             if (err) {
//               reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
//             }
//             // Todo: updated date time need to be updated on model
//             resolve({
//               dateTime: dateTime
//             });
//           });
//       });
//     });
// }

// function _deleteMSSQL(dateTime) {
//   return cp.getConnection()
//     .then(conn => {
//       return new Promise(function(resolve, reject) {
//         const StoredProcedureName = 'UpdateDateTime';
//         let request = new mssql.Request(conn)
//           .input('id', mssql.Int, dateTime.id)
//           .output('utcDeletedDateTime', mssql.DateTime2(7));
//
//         request.execute(`[dbo].[${StoredProcedureName}]`,
//           (err, res, returnValue, affected) => {
//             let utcDeletedDateTime;
//             if (err) {
//               reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
//             }
//             try {
//               //console.log('returnValue', returnValue); // always return 0
//               utcDeletedDateTime = request.parameters.utcDeletedDateTime.value;
//               //console.log('queryCount', queryCount);
//             } catch (e) {
//               console.log(`[dbo].[${StoredProcedureName}]`, e);
//             }
//             dateTime.utcDeletedDateTime = utcDeletedDateTime;
//             resolve({
//               utcDeletedDateTime: utcDeletedDateTime,
//               dateTime: dateTime
//             });
//           });
//       });
//     });
// }
