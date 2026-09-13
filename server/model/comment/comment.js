'use strict';

import * as mssql from 'mssql';
import * as cp from '../../sqlConnectionPool';
import * as _ from 'lodash';
import {
  User,
  BasePin
} from '..';

// _user, userId, _pin, pinId
let prop = [
  'id',
  'text',
  'parentCommentId',
  'utcCreatedDateTime',
  'utcUpdatedDateTime',
  //'utcDeletedDateTime'
];

export default class Comment {
  constructor(comment, user, pin) {
    if (comment) {
      this.set(comment, user, pin);
    }
  }

  set(comment, user, pin) {
    if (comment) {
      for (let i = 0; i < prop.length; i++) {
        this[prop[i]] = comment[prop[i]];
      }

      if (user && user instanceof User) {
        this._user = user;
      }
      else if (comment._user && comment._user instanceof User) {
        this._user = comment._user;
      }
      else if (Number.isInteger(comment.userId)) {
        this.userId = comment.userId;
        if (comment['User.userName']) {
          this._user.userName = comment['User.userName'];
        }
      }

      if (pin instanceof BasePin) {
        this._pin = pin;
      }
      else if (comment._pin && comment._pin instanceof BasePin) {
        this._pin = comment._pin;
      }
      else if (Number.isInteger(comment.pinId)) {
        this.pinId = comment.pinId;
      }

    } else {
      throw "Comment cannot set value of arg";
    }
    return this;
  }

  save() {
    return _create(this, this.userId, this.pinId)
      .catch(err => {
        console.log(`Comment '${this.id}' save err:`, err);
        throw err;
      });
  }

  // Only succeeds within the SP's edit window and for the comment's own author.
  update() {
    return _update(this)
      .catch(err => {
        console.log(`Comment '${this.id}' update err:`, err);
        throw err;
      });
  }

  delete() {
    return _deleteMSSQL(this)
      .catch(err => {
        console.log(`Comment '${this.id}' delete err:`, err);
        throw err;
      });
  }

  setUser(user) {
    this._user = user;
    this.userId = user.id;
    return this;
  }

  setPin(pin) {
    this._pin = pin;
    this.pinId = pin.id;
    return this;
  }

  toJSON() {
    // omits own and inherited properties with null values
    let json = _.omitBy(this, (value, key) => {
      return key.startsWith('_')
        || _.isNull(value);
    });
    json.userName = _.get(this, '_user.userName');
    return json;
  }

  static queryById(id) {
    return _queryMSSQLCommentById(id);
  }

  static delete(id, userId) {
    return new Comment({
      id: id
    }, new User({
      id: userId
    })).delete();
  }
}

const CommentPrototype = Comment.prototype;

Object.defineProperty(CommentPrototype, '_user', {
  enumerable: false,
  configurable: false,
  writable: true
});

Object.defineProperty(CommentPrototype, 'userId', {
  get: function () {
    return this._user && this._user.id;
  },
  set: function (id) {
    if (this._user) {
      this._user.id = id;
    } else {
      this._user = new User({
        id: id
      });
    }
  },
  enumerable: true,
  configurable: false
});

Object.defineProperty(CommentPrototype, '_pin', {
  enumerable: false,
  configurable: false,
  writable: true
});

Object.defineProperty(CommentPrototype, 'pinId', {
  get: function () {
    return this._pin && this._pin.id;
  },
  set: function (id) {
    if (this._pin) {
      this._pin.id = id;
    } else {
      this._pin = new BasePin({
        id: id
      });
    }
  },
  enumerable: true,
  configurable: false
});

function _create(commentIn, userId, pinId) {
  return _createMSSQL(commentIn, userId, pinId)
    .then(({
      comment
    }) => {
      commentIn.set(comment);
      return {
        comment: commentIn
      };
    });
}

function _update(commentIn) {
  return _updateMSSQL(commentIn)
    .then(({
      updated,
      utcUpdatedDateTime
    }) => {
      if (updated) {
        commentIn.utcUpdatedDateTime = utcUpdatedDateTime;
      }
      return {
        comment: commentIn,
        updated: updated
      };
    });
}

function _queryMSSQLCommentById(id) {
  return cp.getConnection()
    .then(conn => {
      return new Promise((resolve, reject) => {
        const StoredProcedureName = 'GetComment';
        let request = new mssql.Request(conn)
          .input('id', mssql.Int, id)
          .execute(`[dbo].[${StoredProcedureName}]`, (err, res, returnValue, affected) => {
            let comment;
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            if (res.recordset.length) {
              comment = new Comment(res.recordset[0]);
            } else {
              comment = undefined;
            }
            resolve({
              comment: comment
            });
          });
      });
    }).catch(err => {
      console.log("queryMSSQLCommentById catch err", err);
      throw err;
    });
}

function _createMSSQL(comment, userId, pinId) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function (resolve, reject) {
        const StoredProcedureName = 'CreateComment';
        let request = new mssql.Request(conn)
          .input('text', mssql.NVarChar(4000), comment.text)
          .input('userId', mssql.Int, userId)
          .input('pinId', mssql.Int, pinId)
          .input('parentCommentId', mssql.Int, comment.parentCommentId)
          .input('utcCreatedDateTime', mssql.DateTime2(7), comment.utcCreatedDateTime)
          .input('utcUpdatedDateTime', mssql.DateTime2(7), comment.utcUpdatedDateTime)
          // Passing comment.id here (rather than leaving it unset) is what
          // lets CreateComment preserve the original id when restoring from
          // a backup - see the SP for why that matters. A fresh comment has
          // no id yet, so this is undefined/null and the SP generates one.
          .output('id', mssql.Int, comment.id);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, res, returnValue, affected) => {
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            comment.id = res.output.id;

            resolve({
              comment: comment
            });
          });
      });
    });
}

function _updateMSSQL(comment) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function (resolve, reject) {
        const StoredProcedureName = 'UpdateComment';
        let request = new mssql.Request(conn)
          .input('id', mssql.Int, comment.id)
          .input('userId', mssql.Int, comment.userId)
          .input('text', mssql.NVarChar(4000), comment.text)
          .output('utcUpdatedDateTime', mssql.DateTime2(7));

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, res, returnValue, affected) => {
            let utcUpdatedDateTime;
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            try {
              utcUpdatedDateTime = res.output.utcUpdatedDateTime;
            } catch (e) {
              console.log(`[dbo].[${StoredProcedureName}]`, e);
            }
            resolve({
              updated: !!utcUpdatedDateTime,
              utcUpdatedDateTime: utcUpdatedDateTime
            });
          });
      });
    });
}

function _deleteMSSQL(comment) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function (resolve, reject) {
        const StoredProcedureName = 'DeleteComment';
        let request = new mssql.Request(conn)
          .input('id', mssql.Int, comment.id)
          .input('userId', mssql.Int, comment.userId)
          .output('utcDeletedDateTime', mssql.DateTime2(7));

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, res, returnValue, affected) => {
            let utcDeletedDateTime;
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            try {
              utcDeletedDateTime = res.output.utcDeletedDateTime;
            } catch (e) {
              console.log(`[dbo].[${StoredProcedureName}]`, e);
            }
            comment.utcDeletedDateTime = utcDeletedDateTime;
            resolve({
              utcDeletedDateTime: utcDeletedDateTime,
              comment: comment
            });
          });
      });
    });
}
