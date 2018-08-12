/*jshint eqnull:true */

'use strict';

import * as mssql from 'mssql';
import * as cp from '../../sqlConnectionPool';
import * as search from '../../search';
import * as _ from 'lodash';

import {
  Pin
} from '..';

export default class Pins {
  // Properties
  // this.pins
  // this.queryCount - probably not needed

  constructor(pins) {
    if (pins) {
      this.set(pins);
    }
  }

  set(pins) {
    if (Array.isArray(pins)) {
      this
        .setPins(pins)
        .setQueryCount(undefined);
    } else if (pins.pins && Number.isInteger(pins.queryCount)) {
      this
        .setPins(pins.pins)
        .setQueryCount(pins.queryCount);
    } else {
      throw "Pins cannot set value of arg";
    }
    return this;
  }

  setPins(pins) {
    if (Array.isArray(pins)) {
      // ToDo: should check if pins are pinRows from sql
      this.pins = Pins.mapPinsMedia(pins);
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
    const promises = this.pins.map(p => {
      return p.save();
    });
    return Promise.all(promises);
  }

  addSearchScores(searchScores) {
    this.pins.forEach(pin => {
      let foundSearchScore = searchScores.find((current, index) => {
        return +current.id === pin.id;
      })
      if (foundSearchScore) {
        pin.searchScore = foundSearchScore["@search.score"];
      }
    });
    return this;
  }

  minMaxDateTimePin() {
    // empty array returns null
    if (!this || !this.pins.length) {
      return null;
    }
    //console.log('_minMaxDateTimePin', results);
    let firstPin = this.pins[0],
      lastPin = this.pins[this.pins.length - 1],
      minPin,
      maxPin;
    if (firstPin.utcStartDateTime < lastPin.utcStartDateTime) {
      minPin = firstPin;
      maxPin = lastPin;
    } else {
      minPin = lastPin;
      maxPin = firstPin;
    }
    return {
      min: minPin,
      max: maxPin
    };
  }

  static mapPinsMedia(pinRows) {
    let pins = [],
      groupedPinRows;

    groupedPinRows = _.groupBy(pinRows, row => {
      return row.id;
    });

    _.forEach(groupedPinRows, pinRows => {
      let pin = Pin.mapPinMedia(pinRows);
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

  static querySearch(searchText) {
    return search.pins(searchText)
      .then(res => {
        // console.log('querySearch - search match:', serpJson);
        return _queryMSSQLPinsBySearchText(res.hits.hits)
          .then(({ pins: serpPin }) => {
            // console.log('querySearch', res);
            let pins = new Pins(serpPin);
            pins.addSearchScores(res.hits.hits);
            return pins;
          });
      });
  }

  static querySearchFilterByHasFavorite(searchText, userId) {
    return search.pin(searchText)
      .then(res => {
        // console.log('querySearch - search match:', serpJson);
        return _queryMSSQLPinsBySearchTextFilterByHasFavorite(res.hits.hits, userId)
          .then(({ pins: serpPin }) => {
            // console.log('querySearch', res);
            let pins = new Pins(serpPin);
            pins.addSearchScores(res.hits.hits);
            return pins;
          });
      });
  }

}

function _mapMediaFromQuery(pin) {
  let mediaObj = {},
    hasProp;
  for (var prop in pin) {
    if (pin.hasOwnProperty(prop) && prop.startsWith('Media.')) {
      mediaObj[prop.substring(6)] = pin[prop];
      hasProp = true;
    }
  }
  if (hasProp) {
    return [mediaObj];
  }
  return undefined;
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
            function (err, recordsets, returnValue, affected) {
              let queryCount;
              //console.log('GetPinsWithFavoriteAndLikeNext', recordsets[0]);
              if (err) {
                reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
              }
              // ToDo: doesn't always return value
              try {
                //console.log('returnValue', returnValue); // always return 0
                queryCount = request.parameters.queryCount.value;
                //console.log('queryCount', queryCount);
              } catch (e) {
                queryCount = 0;
              }
              //console.log('_queryMSSQLPins', recordsets[0]);
              resolve({
                pins: recordsets[0],
                queryCount: queryCount
              });
            });
        } else {
          StoredProcedureName = 'GetPinsWithFavoriteAndLikePrev';
          request.execute(`[dbo].[${StoredProcedureName}]`,
            function (err, recordsets, returnValue, affected) {
              let queryCount;
              if (err) {
                reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
              }
              // ToDo: doesn't always return value
              try {
                //console.log('returnValue', returnValue); // always return 0
                queryCount = request.parameters.queryCount.value;
              } catch (e) {
                queryCount = 0;
              }

              resolve({
                pins: recordsets[0],
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
          function (err, recordsets, returnValue, affected) {
            let queryCount;
            //console.log('GetPinsWithFavoriteAndLikeNext', recordsets[0]);
            if (err) {
              reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            // ToDo: doesn't always return value
            try {
              //console.log('returnValue', returnValue); // always return 0
              queryCount = request.parameters.queryCount.value;
              //console.log('queryCount', queryCount);
            } catch (e) {
              queryCount = 0;
            }

            resolve({
              pins: recordsets[0],
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
            function (err, recordsets, returnValue, affected) {
              let queryCount;
              //console.log('GetPinsWithFavoriteAndLikeNext', recordsets[0]);
              if (err) {
                reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
              }
              // ToDo: doesn't always return value
              try {
                //console.log('returnValue', returnValue); // always return 0
                queryCount = request.parameters.queryCount.value;
                //console.log('queryCount', queryCount);
              } catch (e) {
                queryCount = 0;
              }
              //console.log('_queryMSSQLPins', recordsets[0]);
              resolve({
                pins: recordsets[0],
                queryCount: queryCount
              });
            });
        } else {
          StoredProcedureName = 'GetPinsWithFavoriteAndLikePrevFilterByHasFavorite';
          request.execute(`[dbo].[${StoredProcedureName}]`,
            function (err, recordsets, returnValue, affected) {
              let queryCount;
              if (err) {
                reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
              }
              // ToDo: doesn't always return value
              try {
                //console.log('returnValue', returnValue); // always return 0
                queryCount = request.parameters.queryCount.value;
              } catch (e) {
                queryCount = 0;
              }

              resolve({
                pins: recordsets[0],
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
          function (err, recordsets, returnValue, affected) {
            let queryCount;
            //console.log('GetPinsWithFavoriteAndLikeNext', recordsets[0]);
            if (err) {
              reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            // ToDo: doesn't always return value
            try {
              //console.log('returnValue', returnValue); // always return 0
              queryCount = request.parameters.queryCount.value;
              //console.log('queryCount', queryCount);
            } catch (e) {
              queryCount = 0;
            }

            resolve({
              pins: recordsets[0],
              queryCount: queryCount
            });
          });
      });
    });
}


function _queryMSSQLPinsBySearchText(searchMatches) {
  //console.log('_queryMSSQLPinsBySearchText', searchIds)
  const tvp = new mssql.Table();
  tvp.columns.add('tId', mssql.Int)

  searchMatches.forEach(match => {
    // tvp.columns.add(id, sql.Int);
    tvp.rows.add(+match._id);
  })

  return cp.getConnection()
    .then(conn => {
      return new Promise(function (resolve, reject) {
        let StoredProcedureName;
        let request = new mssql.Request(conn)
          .input('TableIds', mssql.TVP, tvp)
          .output('queryCount', mssql.Int);

        //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

        StoredProcedureName = 'GetPinByIds';
        request.execute(`[dbo].[${StoredProcedureName}]`,
          function (err, recordsets, returnValue, affected) {
            let queryCount;
            //console.log('GetPinsWithFavoriteAndLikeNext', recordsets[0]);
            if (err) {
              reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            // ToDo: doesn't always return value
            try {
              //console.log('returnValue', returnValue); // always return 0
              queryCount = request.parameters.queryCount.value;
              //console.log('queryCount', queryCount);
            } catch (e) {
              queryCount = 0;
            }
            //console.log('_queryMSSQLPins', recordsets[0]);
            resolve({
              pins: recordsets[0],
              queryCount: queryCount
            });
          });

      });
    });
}

function _queryMSSQLPinsBySearchTextFilterByHasFavorite(searchMatches, userId) {
  //console.log('_queryMSSQLPinsBySearchText', searchIds)
  const tvp = new mssql.Table();
  tvp.columns.add('tId', mssql.Int)

  searchMatches.forEach(match => {
    // tvp.columns.add(id, sql.Int);
    tvp.rows.add(+match._id);
  })

  return cp.getConnection()
    .then(conn => {
      return new Promise(function (resolve, reject) {
        let StoredProcedureName;
        let request = new mssql.Request(conn)
          .input('TableIds', mssql.TVP, tvp)
          .input('userId', mssql.Int, userId)
          .output('queryCount', mssql.Int);

        //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

        StoredProcedureName = 'GetPinByIdsFilterByHasFavorite';
        request.execute(`[dbo].[${StoredProcedureName}]`,
          function (err, recordsets, returnValue, affected) {
            let queryCount;
            //console.log('GetPinsWithFavoriteAndLikeNext', recordsets[0]);
            if (err) {
              reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            // ToDo: doesn't always return value
            try {
              //console.log('returnValue', returnValue); // always return 0
              queryCount = request.parameters.queryCount.value;
              //console.log('queryCount', queryCount);
            } catch (e) {
              queryCount = 0;
            }
            //console.log('_queryMSSQLPins', recordsets[0]);
            resolve({
              pins: recordsets[0],
              queryCount: queryCount
            });
          });

      });
    });
}
