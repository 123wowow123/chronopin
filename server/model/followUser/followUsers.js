'use strict';

import * as mssql from 'mssql';
import * as cp from '../../sqlConnectionPool';
import _ from 'lodash';
import {
  FollowUser
} from '..';

let prop = [
  'id',
  'userId',
  'followingUserId',
  'utcCheckedDateTime',
  'utcCreatedDateTime'
];

export default class FollowUsers {
  // Properties
  // this.followUsers

  constructor(followUsers) {
    if (followUsers) {
      this.set(followUsers);
    }
  }

  set(followUsers) {
    if (Array.isArray(followUsers)) {
      this
        .setFollowUsers(followUsers);
    } else if (followUsers.followUsers) {
      this
        .setFollowUsers(followUsers.followUsers);
    } else {
      throw "FollowUsers cannot set value of arg";
    }
    return this;
  }

  setFollowUsers(followUsers) {
    if (Array.isArray(followUsers)) {
      this.followUsers = followUsers.map(u => {
        return new FollowUser(u);
      });
    } else {
      throw "arg is not an array";
    }
    return this;
  }

  save() {
    return Promise.all(
      this.followUsers.map(followUsers => {
        return followUsers.save()
      }));
  }

  static getAll(properties) {
    return _getAllFollowUsersMSSQL()
      .then(({
        followUsers
      }) => {
        return followUsers;
      });
  }
}

function _getAllFollowUsersMSSQL() {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function (resolve, reject) {
        const StoredProcedureName = 'GetAllFollowUsersSP';
        let request = new mssql.Request(conn);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, res, returnValue, affected) => {
            let followUsers;
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            followUsers = res.recordset && new FollowUsers(res.recordset);
            resolve({
              followUsers
            });
          });
      });
    });
}