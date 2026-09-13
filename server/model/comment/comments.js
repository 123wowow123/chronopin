'use strict';

import * as mssql from 'mssql';
import * as cp from '../../sqlConnectionPool';

import {
  Comment
} from '..';

export default class Comments {
  // Properties
  // this.comments

  constructor(comments) {
    if (comments) {
      this.set(comments);
    }
  }

  set(comments) {
    if (Array.isArray(comments)) {
      this.setComments(comments);
    } else {
      throw "Comments cannot set value of arg";
    }
    return this;
  }

  setComments(comments) {
    if (Array.isArray(comments)) {
      this.comments = comments.map(c => {
        return new Comment(c);
      });
    } else {
      throw "arg is not an array";
    }
    return this;
  }

  // Re-inserts each comment with its original id preserved (CreateComment
  // uses IDENTITY_INSERT when given one - see that SP), so parentCommentId
  // chains still resolve correctly afterward with no remapping needed.
  // Sequential like BasePins.save(), so a parent always lands before a
  // reply that references it.
  save() {
    return (this.comments || [])
      .reduce((prev, c) => prev.then(() => c.save()), Promise.resolve());
  }

  static getByPinId(pinId) {
    return _getCommentsByPinIdMSSQL(pinId);
  }

  static getAll() {
    return _getAllCommentsMSSQL();
  }
}

function _getAllCommentsMSSQL() {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function (resolve, reject) {
        const StoredProcedureName = 'GetAllComments';
        let request = new mssql.Request(conn);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, res, returnValue, affected) => {
            let comments;
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            comments = new Comments(res.recordset || []);
            resolve({
              comments: comments
            });
          });
      });
    }).catch(err => {
      console.log("getAllCommentsMSSQL catch err", err);
      throw err;
    });
}

function _getCommentsByPinIdMSSQL(pinId) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function (resolve, reject) {
        const StoredProcedureName = 'GetCommentsByPinId';
        let request = new mssql.Request(conn)
          .input('pinId', mssql.Int, pinId);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, res, returnValue, affected) => {
            let comments;
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            comments = new Comments(res.recordset || []);
            resolve({
              comments: comments
            });
          });
      });
    }).catch(err => {
      console.log("getCommentsByPinIdMSSQL catch err", err);
      throw err;
    });
}
