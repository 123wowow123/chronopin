/*jshint eqnull:true */

'use strict';

import * as mssql from 'mssql';
import * as cp from '../../sqlConnectionPool';

import {
  User
} from '..';

export default class Users {
  // Properties
  // this.users
  // this.queryCount - probably not needed

  constructor(users) {
    if (users) {
      this.set(users);
    }
  }

  set(users) {
    if (Array.isArray(users)) {
      this
        .setUsers(users)
        .setQueryCount(undefined);
    } else if (users.users && Number.isInteger(users.queryCount)) {
      this
        .setUsers(users.users)
        .setQueryCount(users.queryCount);
    } else {
      throw "Users cannot set value of arg";
    }
    return this;
  }

  setUsers(users) {
    if (Array.isArray(users)) {
      this.users = users.map(u => {
        return new User(u);
      });
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
    return this;
  }

  pick(properties) {
    return new Users(this.users.map(user => {
      return user.pick(properties);
    }));
  }

  static getAll(properties) {
    return _getAllUsersMSSQL()
      .then(({
        users
      }) => {
        return users
          .setQueryCount(users.users.length)
          .pick(properties);
      });
  }
}

function _getAllUsersMSSQL() {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function(resolve, reject) {
        const StoredProcedureName = 'GetAllUserSP';
        let request = new mssql.Request(conn);

        //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, res, returnValue, affected) => {
            let users;
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            users = res.recordset && new Users(res.recordset);
            resolve({
              users: users
            });
          });
      });
    });
}
