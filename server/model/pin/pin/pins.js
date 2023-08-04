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
      this.pins = Pins.mapPinJoins(pins);

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

  setPinsSortBy(pins, sortId, reverse) {
    if (Array.isArray(pins)) {
      this.pins = Pins.mapPinJoins(pins, sortId, reverse);
    } else {
      throw "arg is not an array";
    }
    return this;
  }

  static mapPinJoins(pinRows, sortId, reverse) {
    let pins = [],
      groupedPinRows;

    groupedPinRows = _.groupBy(pinRows, row => {
      return row.id;
    });

    _.forEach(groupedPinRows, pinRows => {
      let pin = new Pin(pinRows[0]);
      pin = Pin.mapPinJoins(pin, pinRows);
      pins.push(pin);
    });

    if (sortId) {
      pins = _.chain(pins)
        .sortBy(sortId)
        .value();
    } else {
      // need to sort properly
      pins = _.chain(pins)
        .sortBy('id')
        .sortBy('utcStartDateTime')
        .value();
    }

    return reverse ? pins.reverse() : pins;
  }

  static queryForwardByDate(fromDateTime, userId, lastPinId, pageSize, followingOnly) {
    return _queryMSSQLPins(true, fromDateTime, userId, lastPinId, 0, pageSize, followingOnly)
      .then(res => {
        return new Pins(res);
      });
  }

  static queryBackwardByDate(fromDateTime, userId, lastPinId, pageSize, followingOnly) {
    return _queryMSSQLPins(false, fromDateTime, userId, lastPinId, 0, pageSize, followingOnly)
      .then(res => {
        return new Pins(res);
      });
  }

  static queryInitialByDate(fromDateTime, userId, pageSizePrev, pageSizeNext) {
    return _queryMSSQLPinsInitial(fromDateTime, userId, pageSizePrev, pageSizeNext)
      .then(res => {
        return new Pins(res);
      });
  }

  static queryForwardByDateFilterByHasFavorite(fromDateTime, userId, lastPinId, pageSize, followingOnly) {
    return _queryMSSQLPinsFilterByHasFavorite(true, fromDateTime, userId, lastPinId, 0, pageSize, followingOnly)
      .then(res => {
        return new Pins(res);
      });
  }

  static queryBackwardByDateFilterByHasFavorite(fromDateTime, userId, lastPinId, pageSize, followingOnly) {
    return _queryMSSQLPinsFilterByHasFavorite(false, fromDateTime, userId, lastPinId, 0, pageSize, followingOnly)
      .then(res => {
        return new Pins(res);
      });
  }

  static queryInitialByDateFilterByHasFavorite(fromDateTime, userId, pageSizePrev, pageSizeNext, followingOnly) {
    return _queryMSSQLPinsInitialFilterByHasFavorite(fromDateTime, userId, pageSizePrev, pageSizeNext, followingOnly)
      .then(res => {
        return new Pins(res);
      });
  }

  static queryPinByIds(userId, pins) {
    return _queryMSSQPinByIds(userId, pins)
      .then(res => {
        return new Pins(res);
      });
  }

  static queryPinByIdsFilterByHasFavorite(pins, userId) {
    return _queryPinByIdsFilterByHasFavorite(pins, userId)
      .then(res => {
        return new Pins(res);
      });
  }

  static getThreadPins(pinId) {
    return _queryPinByIdsAndOrderedByThread(pinId)
      .then(res => {
        return new Pins().setPinsSortBy(res.pins, 'reverseOrder', true);
      });
  }

  static getFirstThreadPins(pinId) {
    return _queryPinByIdsAndOrderedByThread(pinId)
      .then(res => {
        const pins = new Pins().setPinsSortBy(res.pins, 'reverseOrder', true);
        return pins.getFirstPin();
      });
  }

  static queryPinByTags(userId, allTags, followingOnly) {
    return _queryPinByTags(userId, allTags, followingOnly)
      .then(res => {
        return new Pins(res);
      });
  }

  static queryPinByTagsHasFavorite(userId, allTags, followingOnly) {
    return _queryPinByTagsHasFavorite(userId, allTags, followingOnly)
      .then(res => {
        return new Pins(res);
      });
  }

}

function _queryMSSQLPins(queryForward, fromDateTime, userId, lastPinId, offset, pageSize, followingOnly) {
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
          .input('followingOnly', mssql.Bit, followingOnly)
          .output('queryCount', mssql.Int);

        if (queryForward) {
          StoredProcedureName = 'GetPinsWithFavoriteAndLikeNext';
          request.execute(`[dbo].[${StoredProcedureName}]`,
            function (err, res, returnValue, affected) {
              let queryCount;
              if (err) {
                return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
              }
              // ToDo: doesn't always return value
              try {
                queryCount = res.output.queryCount;
              } catch (e) {
                queryCount = 0;
              }
              return resolve({
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
                queryCount = res.output.queryCount;
              } catch (e) {
                queryCount = 0;
              }

              return resolve({
                pins: res.recordset,
                queryCount: queryCount
              });
            });
        }
      });
    });
}

function _queryMSSQLPinsInitial(fromDateTime, userId, pageSizePrev, pageSizeNext, followingOnly) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function (resolve, reject) {
        const StoredProcedureName = 'GetPinsWithFavoriteAndLikeInitial';
        let request = new mssql.Request(conn)
          .input('pageSizePrev', mssql.Int, pageSizePrev)
          .input('pageSizeNext', mssql.Int, pageSizeNext)
          .input('userId', mssql.Int, userId)
          .input('fromDateTime', mssql.DateTime2(7), fromDateTime)
          .input('followingOnly', mssql.Bit, followingOnly)
          .output('queryCount', mssql.Int);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          function (err, res, returnValue, affected) {
            let queryCount;
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            // ToDo: doesn't always return value
            try {
              queryCount = res.output.queryCount;
            } catch (e) {
              queryCount = 0;
            }

            return resolve({
              pins: res.recordset,
              queryCount: queryCount
            });
          });
      });
    });
}


function _queryMSSQLPinsFilterByHasFavorite(queryForward, fromDateTime, userId, lastPinId, offset, pageSize, followingOnly) {
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
          .input('followingOnly', mssql.Bit, followingOnly)
          .output('queryCount', mssql.Int);

        if (queryForward) {
          StoredProcedureName = 'GetPinsWithFavoriteAndLikeNextFilterByHasFavorite';
          request.execute(`[dbo].[${StoredProcedureName}]`,
            function (err, res, returnValue, affected) {
              let queryCount;
              if (err) {
                return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
              }
              // ToDo: doesn't always return value
              try {
                queryCount = res.output.queryCount;
              } catch (e) {
                queryCount = 0;
              }
              return resolve({
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
                queryCount = res.output.queryCount;
              } catch (e) {
                queryCount = 0;
              }

              return resolve({
                pins: res.recordset,
                queryCount: queryCount
              });
            });
        }
      });
    });
}

function _queryMSSQLPinsInitialFilterByHasFavorite(fromDateTime, userId, pageSizePrev, pageSizeNext, followingOnly) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function (resolve, reject) {
        const StoredProcedureName = 'GetPinsWithFavoriteAndLikeInitialFilterByHasFavorite';
        let request = new mssql.Request(conn)
          .input('pageSizePrev', mssql.Int, pageSizePrev)
          .input('pageSizeNext', mssql.Int, pageSizeNext)
          .input('userId', mssql.Int, userId)
          .input('fromDateTime', mssql.DateTime2(7), fromDateTime)
          .input('followingOnly', mssql.Bit, followingOnly)
          .output('queryCount', mssql.Int);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          function (err, res, returnValue, affected) {
            let queryCount;
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            // ToDo: doesn't always return value
            try {
              queryCount = res.output.queryCount;
            } catch (e) {
              queryCount = 0;
            }

            return resolve({
              pins: res.recordset,
              queryCount: queryCount
            });
          });
      });
    });
}


function _queryMSSQPinByIds(userId, pins) {
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
          .input('userId', mssql.Int, userId)
          .output('queryCount', mssql.Int);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          function (err, res, returnValue, affected) {
            let queryCount;
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            // ToDo: doesn't always return value
            try {
              queryCount = res.output.queryCount;
            } catch (e) {
              queryCount = 0;
            }

            return resolve({
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
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            // ToDo: doesn't always return value
            try {
              queryCount = res.output.queryCount;
            } catch (e) {
              queryCount = 0;
            }

            return resolve({
              pins: res.recordset,
              queryCount: queryCount
            });
          });
      });
    });
}

function _queryPinByIdsAndOrderedByThread(pinId) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function (resolve, reject) {
        const StoredProcedureName = 'GetPinByIdsAndOrderedByThread';

        let request = new mssql.Request(conn)
          .input('pinId', mssql.Int, pinId);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          function (err, res, returnValue, affected) {
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            return resolve({
              pins: res.recordset
            });
          });
      });
    });
}

function _queryPinByTags(userId, tags, followingOnly) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function (resolve, reject) {
        const StoredProcedureName = 'GetPinByTags';

        const tvp = new mssql.Table()
        tvp.columns.add('tag', mssql.NVarChar(255));
        const tvpUser = new mssql.Table()
        tvpUser.columns.add('tag', mssql.NVarChar(255));

        tags
          .filter(tag => {
            return !tag.startsWith('@');
          })
          .forEach(tag => {
            tvp.rows.add(tag) // Values are in same order as columns.
          });

        tags
          .filter(tag => {
            return tag.startsWith('@');
          })
          .forEach(tag => {
            tvpUser.rows.add(tag) // Values are in same order as columns.
          });


        let request = new mssql.Request(conn)
          .input('TableTags', tvp)
          .input('TableUserTags', tvpUser)
          .input('userId', mssql.Int, userId)
          .input('followingOnly', mssql.Bit, followingOnly)
          .output('queryCount', mssql.Int);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          function (err, res, returnValue, affected) {
            let queryCount;
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            try {
              queryCount = res.output.queryCount;
            } catch (e) {
              queryCount = 0;
            }

            return resolve({
              pins: res.recordset,
              queryCount: queryCount
            });
          });
      });
    });
}

function _queryPinByTagsHasFavorite(userId, allTags, followingOnly) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function (resolve, reject) {
        const StoredProcedureName = 'GetPinByTagsFilterByHasFavorite';

        const tvp = new mssql.Table()
        tvp.columns.add('tag', mssql.NVarChar(255));
        const tvpUser = new mssql.Table()
        tvpUser.columns.add('tag', mssql.NVarChar(255));

        allTags
          .filter(tag => {
            return !tag.startsWith('@');
          })
          .forEach(tag => {
            tvp.rows.add(tag) // Values are in same order as columns.
          });

        allTags
          .filter(tag => {
            return tag.startsWith('@');
          })
          .forEach(tag => {
            tvpUser.rows.add(tag) // Values are in same order as columns.
          });

        let request = new mssql.Request(conn)
          .input('TableTags', tvp)
          .input('TableUserTags', tvpUser)
          .input('userId', mssql.Int, userId)
          .input('followingOnly', mssql.Bit, followingOnly)
          .output('queryCount', mssql.Int);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          function (err, res, returnValue, affected) {
            let queryCount;
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            try {
              queryCount = res.output.queryCount;
            } catch (e) {
              queryCount = 0;
            }

            return resolve({
              pins: res.recordset,
              queryCount: queryCount
            });
          });
      });
    });
}