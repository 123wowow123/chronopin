'use strict';

import * as db from '../../db';
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

  // Only succeeds within the edit window and for the comment's own author.
  update() {
    return _update(this)
      .catch(err => {
        console.log(`Comment '${this.id}' update err:`, err);
        throw err;
      });
  }

  delete() {
    return _delete(this)
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
    return _queryById(id);
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
  return _insert(commentIn, userId, pinId)
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
  return _updateText(commentIn)
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

// How long after posting a comment its author may still edit it.
const EDIT_WINDOW_MINUTES = 5;

const COMMENT_COLUMNS = `"id", "text", "userId", "pinId", "parentCommentId", "utcCreatedDateTime", "utcUpdatedDateTime"`;

function _queryById(id) {
  return db.query(`
    SELECT ${COMMENT_COLUMNS}
    FROM "Comment"
    WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [id])
    .then(rows => {
      return {
        comment: rows.length ? new Comment(rows[0]) : undefined
      };
    })
    .catch(err => {
      console.log("Comment queryById err", err);
      throw err;
    });
}

// A comment that already has an id (restoring a backup) keeps it, so
// parentCommentId chains still resolve after a reseed.
function _insert(comment, userId, pinId) {
  const hasId = comment.id != null;
  const columns = ['text', 'userId', 'pinId', 'parentCommentId', 'utcCreatedDateTime', 'utcUpdatedDateTime'];
  const values = [comment.text, userId, pinId, comment.parentCommentId,
    comment.utcCreatedDateTime || new Date(), comment.utcUpdatedDateTime]
    .map(value => value === undefined ? null : value);
  if (hasId) {
    columns.unshift('id');
    values.unshift(comment.id);
  }

  return db.query(`
    INSERT INTO "Comment" (${columns.map(c => `"${c}"`).join(', ')})
    VALUES (${values.map((v, i) => `$${i + 1}`).join(', ')})
    RETURNING "id"`, values)
    .then(rows => {
      comment.id = rows[0].id;
      return hasId ? db.query(
        `SELECT setval(pg_get_serial_sequence('"Comment"', 'id'), GREATEST((SELECT MAX("id") FROM "Comment"), 1))`) : undefined;
    })
    .then(() => {
      return {
        comment: comment
      };
    });
}

// Only the author, only while the comment is live, and only within the edit
// window. updated is false when any of those fail.
function _updateText(comment) {
  return db.query(`
    UPDATE "Comment"
    SET "text" = $3, "utcUpdatedDateTime" = now()
    WHERE "id" = $1
      AND "userId" = $2
      AND "utcDeletedDateTime" IS NULL
      AND "utcCreatedDateTime" >= now() - make_interval(mins => $4)
    RETURNING "utcUpdatedDateTime"`,
    [comment.id, comment.userId, comment.text, EDIT_WINDOW_MINUTES])
    .then(rows => {
      const utcUpdatedDateTime = rows.length ? rows[0].utcUpdatedDateTime : undefined;
      return {
        updated: !!utcUpdatedDateTime,
        utcUpdatedDateTime: utcUpdatedDateTime
      };
    });
}

// A soft delete, by the author only. utcDeletedDateTime is set on the
// comment even when nothing matched, as it always has been.
function _delete(comment) {
  const utcDeletedDateTime = new Date();
  return db.query(`
    UPDATE "Comment" SET "utcDeletedDateTime" = $3
    WHERE "id" = $1 AND "userId" = $2`,
    [comment.id, comment.userId, utcDeletedDateTime])
    .then(() => {
      comment.utcDeletedDateTime = utcDeletedDateTime;
      return {
        utcDeletedDateTime: utcDeletedDateTime,
        comment: comment
      };
    });
}
