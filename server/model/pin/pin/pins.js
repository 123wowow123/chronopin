/*jshint eqnull:true */

'use strict';

import * as mssql from 'mssql';
import * as cp from '../../../sqlConnectionPool';
import * as _ from 'lodash';

import {
  BasePins,
  Pin
} from '../..';

export default class Pins extends BasePins {
  // Properties
  // this.pins
  // this.queryCount

  constructor(pins) {
    super(pins);
  }

  setPins(pins) {
    if (Array.isArray(pins)) {
      this.pins = Pins.mapPinsMedia(pins);

      // need to sort properly
      this.pins = _.chain(this.pins)
        .sortBy('id')
        .sortBy('utcStartDateTime')
        .value();

    } else {
      throw "arg is not an array";
    }
    return this;
  }

  static mapPinsMedia(pinRows) {
    let pins = [],
      groupedPinRows;

    groupedPinRows = _.groupBy(pinRows, row => {
      return row.id;
    });

    _.forEach(groupedPinRows, pinRows => {
      let pin = new Pin(pinRows[0]);
      pin = Pin.mapPinMedia(pin, pinRows);
      pins.push(pin);
    });

    // need to sort properly
    pins = _.chain(pins)
      .sortBy('id')
      .sortBy('utcStartDateTime')
      .value();

    return pins;
  }

  static queryForwardByDate(fromDateTime, userId, lastPinId, pageSize) {
    return _queryMSSQLPins(true, fromDateTime, userId, lastPinId, 0, pageSize)
      .then(res => {
        //console.log('queryForwardByDate', res);
        return new Pins(res);
      });
  }

  static queryBackwardByDate(fromDateTime, userId, lastPinId, pageSize) {
    return _queryMSSQLPins(false, fromDateTime, userId, lastPinId, 0, pageSize)
      .then(res => {
        //console.log('queryBackwardByDate', res);
        return new Pins(res);
      });
  }

  static queryInitialByDate(fromDateTime, userId, pageSizePrev, pageSizeNext) {
    return _queryMSSQLPinsInitial(fromDateTime, userId, pageSizePrev, pageSizeNext)
      .then(res => {
        //console.log('queryInitialByDate', res);
        return new Pins(res);
      });
  }

  static queryForwardByDateFilterByHasFavorite(fromDateTime, userId, lastPinId, pageSize) {
    return _queryMSSQLPinsFilterByHasFavorite(true, fromDateTime, userId, lastPinId, 0, pageSize)
      .then(res => {
        //console.log('queryForwardByDateFilterByHasFavorite', res);
        return new Pins(res);
      });
  }

  static queryBackwardByDateFilterByHasFavorite(fromDateTime, userId, lastPinId, pageSize) {
    return _queryMSSQLPinsFilterByHasFavorite(false, fromDateTime, userId, lastPinId, 0, pageSize)
      .then(res => {
        //console.log('queryBackwardByDateFilterByHasFavorite', res);
        return new Pins(res);
      });
  }

  static queryInitialByDateFilterByHasFavorite(fromDateTime, userId, pageSizePrev, pageSizeNext) {
    return _queryMSSQLPinsInitialFilterByHasFavorite(fromDateTime, userId, pageSizePrev, pageSizeNext)
      .then(res => {
        //console.log('queryInitialByDateFilterByHasFavorite', res);
        return new Pins(res);
      });
  }

  static queryPinByIds(pins) {
    return _queryMSSQPinByIds(pins)
      .then(res => {
        //console.log('queryInitialByDateFilterByHasFavorite', res);
        return new Pins(res);
      });
  }

  static queryPinByIdsFilterByHasFavorite(pins, userId) {
    return _queryPinByIdsFilterByHasFavorite(pins, userId)
      .then(res => {
        //console.log('queryInitialByDateFilterByHasFavorite', res);
        return new Pins(res);
      });
  }

}

function _queryMSSQLPins(queryForward, fromDateTime, userId, lastPinId, offset, pageSize) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function (resolve, reject) {
        let StoredProcedureName;
        let request = new mssql.Request(conn)
          .input('offset', mssql.Int, offset)
          .input('pageSize', mssql.Int, pageSize)
          .input('userId', mssql.Int, userId)
          .input('fromDateTime', mssql.DateTime2(7), fromDateTime)
          .input('lastPinId', mssql.Int, lastPinId)
          .output('queryCount', mssql.Int);

        //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

        if (queryForward) {
          StoredProcedureName = 'GetPinsWithFavoriteAndLikeNext';
          request.execute(`[dbo].[${StoredProcedureName}]`,
            function (err, res, returnValue, affected) {
              let queryCount;
              //console.log('GetPinsWithFavoriteAndLikeNext', res.recordset);
              if (err) {
                return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
              }
              // ToDo: doesn't always return value
              try {
                //console.log('returnValue', returnValue); // always return 0
                queryCount = res.output.queryCount;
                //console.log('queryCount', queryCount);
              } catch (e) {
                queryCount = 0;
              }
              //console.log('_queryMSSQLPins', res.recordset);
              resolve({
                pins: res.recordset,
                queryCount: queryCount
              });
            });
        } else {
          StoredProcedureName = 'GetPinsWithFavoriteAndLikePrev';
          request.execute(`[dbo].[${StoredProcedureName}]`,
            function (err, res, returnValue, affected) {
              let queryCount;
              if (err) {
                return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
              }
              // ToDo: doesn't always return value
              try {
                //console.log('returnValue', returnValue); // always return 0
                queryCount = res.output.queryCount;
              } catch (e) {
                queryCount = 0;
              }

              resolve({
                pins: res.recordset,
                queryCount: queryCount
              });
            });
        }
      });
    });
}

function _queryMSSQLPinsInitial(fromDateTime, userId, pageSizePrev, pageSizeNext) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function (resolve, reject) {
        const StoredProcedureName = 'GetPinsWithFavoriteAndLikeInitial';
        let request = new mssql.Request(conn)
          .input('pageSizePrev', mssql.Int, pageSizePrev)
          .input('pageSizeNext', mssql.Int, pageSizeNext)
          .input('userId', mssql.Int, userId)
          .input('fromDateTime', mssql.DateTime2(7), fromDateTime)
          .output('queryCount', mssql.Int);

        //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          function (err, res, returnValue, affected) {
            let queryCount;
            //console.log('GetPinsWithFavoriteAndLikeNext', res[0]);
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            // ToDo: doesn't always return value
            try {
              //console.log('returnValue', returnValue); // always return 0
              queryCount = res.output.queryCount;
              //console.log('queryCount', queryCount);
            } catch (e) {
              queryCount = 0;
            }

            resolve({
              pins: res.recordset,
              queryCount: queryCount
            });
          });
      });
    });
}


function _queryMSSQLPinsFilterByHasFavorite(queryForward, fromDateTime, userId, lastPinId, offset, pageSize) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function (resolve, reject) {
        let StoredProcedureName;
        let request = new mssql.Request(conn)
          .input('offset', mssql.Int, offset)
          .input('pageSize', mssql.Int, pageSize)
          .input('userId', mssql.Int, userId)
          .input('fromDateTime', mssql.DateTime2(7), fromDateTime)
          .input('lastPinId', mssql.Int, lastPinId)
          .output('queryCount', mssql.Int);

        //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

        if (queryForward) {
          StoredProcedureName = 'GetPinsWithFavoriteAndLikeNextFilterByHasFavorite';
          request.execute(`[dbo].[${StoredProcedureName}]`,
            function (err, res, returnValue, affected) {
              let queryCount;
              //console.log('GetPinsWithFavoriteAndLikeNext', res.recordset);
              if (err) {
                return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
              }
              // ToDo: doesn't always return value
              try {
                //console.log('returnValue', returnValue); // always return 0
                queryCount = res.output.queryCount;
                //console.log('queryCount', queryCount);
              } catch (e) {
                queryCount = 0;
              }
              //console.log('_queryMSSQLPins', res.recordset);
              resolve({
                pins: res.recordset,
                queryCount: queryCount
              });
            });
        } else {
          StoredProcedureName = 'GetPinsWithFavoriteAndLikePrevFilterByHasFavorite';
          request.execute(`[dbo].[${StoredProcedureName}]`,
            function (err, res, returnValue, affected) {
              let queryCount;
              if (err) {
                return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
              }
              // ToDo: doesn't always return value
              try {
                //console.log('returnValue', returnValue); // always return 0
                queryCount = res.output.queryCount;
              } catch (e) {
                queryCount = 0;
              }

              resolve({
                pins: res.recordset,
                queryCount: queryCount
              });
            });
        }
      });
    });
}

function _queryMSSQLPinsInitialFilterByHasFavorite(fromDateTime, userId, pageSizePrev, pageSizeNext) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function (resolve, reject) {
        const StoredProcedureName = 'GetPinsWithFavoriteAndLikeInitialFilterByHasFavorite';
        let request = new mssql.Request(conn)
          .input('pageSizePrev', mssql.Int, pageSizePrev)
          .input('pageSizeNext', mssql.Int, pageSizeNext)
          .input('userId', mssql.Int, userId)
          .input('fromDateTime', mssql.DateTime2(7), fromDateTime)
          .output('queryCount', mssql.Int);

        //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          function (err, res, returnValue, affected) {
            let queryCount;
            //console.log('GetPinsWithFavoriteAndLikeNext', res.recordset);
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            // ToDo: doesn't always return value
            try {
              //console.log('returnValue', returnValue); // always return 0
              queryCount = res.output.queryCount;
              //console.log('queryCount', queryCount);
            } catch (e) {
              queryCount = 0;
            }

            resolve({
              pins: res.recordset,
              queryCount: queryCount
            });
          });
      });
    });
}


function _queryMSSQPinByIds(pins) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function (resolve, reject) {
        const StoredProcedureName = 'GetPinByIds';

        const tvp = new mssql.Table()
        tvp.columns.add('tId', mssql.Int);
        pins.getAllIds().forEach(id => {
          tvp.rows.add(id) // Values are in same order as columns.
        });

        let request = new mssql.Request(conn)
          .input('TableIds', tvp)
          .output('queryCount', mssql.Int);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          function (err, res, returnValue, affected) {
            let queryCount;
            //console.log('GetPinsWithFavoriteAndLikeNext', res.recordset);
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            // ToDo: doesn't always return value
            try {
              //console.log('returnValue', returnValue); // always return 0
              queryCount = res.output.queryCount;
              //console.log('queryCount', queryCount);
            } catch (e) {
              queryCount = 0;
            }

            resolve({
              pins: res.recordset,
              queryCount: queryCount
            });
          });
      });
    });
}

function _queryPinByIdsFilterByHasFavorite(pins, userId) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function (resolve, reject) {
        const StoredProcedureName = 'GetPinByIdsFilterByHasFavorite';

        const tvp = new mssql.Table()
        tvp.columns.add('tId', mssql.Int);
        pins.getAllIds().forEach(id => {
          tvp.rows.add(id) // Values are in same order as columns.
        });

        let request = new mssql.Request(conn)
          .input('TableIds', tvp)
          .input('userId', mssql.Int, userId)
          .output('queryCount', mssql.Int);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          function (err, res, returnValue, affected) {
            let queryCount;
            //console.log('GetPinsWithFavoriteAndLikeNext', res.recordset);
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            // ToDo: doesn't always return value
            try {
              //console.log('returnValue', returnValue); // always return 0
              queryCount = res.output.queryCount;
              //console.log('queryCount', queryCount);
            } catch (e) {
              queryCount = 0;
            }

            resolve({
              pins: res.recordset,
              queryCount: queryCount
            });
          });
      });
    });
}