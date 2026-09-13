'use strict';

import * as db from '../../db';
import {
  User,
  BasePin
} from '..';

// _user, userId, _pin, pinId
let prop = [
  'id',
  'like',
  'utcCreatedDateTime',
  'utcUpdatedDateTime',
  //'utcDeletedDateTime'
];

export default class Like {
  constructor(like, user, pin) {
    if (like) {
      this.set(like, user, pin);
    }
  }

  set(like, user, pin) {
    if (like) {
      for (let i = 0; i < prop.length; i++) {
        this[prop[i]] = like[prop[i]];
      }

      if (user && user instanceof User) {
        this._user = user;
      }
      else if (like._user && like._user instanceof User) {
        this._user = like._user;
      }
      else if (Number.isInteger(like.userId)) {
        this.userId = like.userId;
      }

      if (pin instanceof BasePin) {
        this._pin = pin;
      }
      else if (like._pin && like._pin instanceof BasePin) {
        this._pin = like._pin;
      }
      else if (Number.isInteger(like.pinId)) {
        this.pinId = like.pinId;
      }

    } else {
      throw "Like cannot set value of arg";
    }
    return this;
  }

  save() {
    return _upsert(this, this.userId, this.pinId)
      .catch(err => {
        console.log(`Like '${this.id}' save err:`, err);
        throw err;
      });
  }

  update() {
    return _upsert(this, this.userId, this.pinId)
      .catch(err => {
        console.log(`Like '${this.id}' update err:`, err);
        throw err;
      });
  }

  delete() {
    return _delete(this);
  }

  deleteByPinId() {
    return _deleteByPinId(this);
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
    return _.omitBy(this, (value, key) => {
      return key.startsWith('_')
        || _.isNull(value);
    });
  }

  static queryById(id) {
    return _queryById(id);
  }

  static delete(id) {
    return new Like({
      id: id
    }).delete();
  }
}

const LikePrototype = Like.prototype;

Object.defineProperty(LikePrototype, '_user', {
  enumerable: false,
  configurable: false,
  writable: true
});

Object.defineProperty(LikePrototype, 'userId', {
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

Object.defineProperty(LikePrototype, '_pin', {
  enumerable: false,
  configurable: false,
  writable: true
});

Object.defineProperty(LikePrototype, 'pinId', {
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

// Saving the same user and pin again revives the existing row rather than
// adding a second one.
function _upsert(likeIn, userId, pinId) {
  return _upsertRow(likeIn, userId, pinId)
    .then(({
      like
    }) => {
      likeIn.set(like);
      return {
        like: likeIn
      };
    });
}

function _queryById(id) {
  return db.query(`
    SELECT "id", "like", "userId", "pinId", "utcCreatedDateTime"
    FROM "Like"
    WHERE "id" = $1`, [id])
    .then(rows => {
      return {
        like: rows.length ? new Like(rows[0]) : undefined
      };
    })
    .catch(err => {
      console.log("Like queryById err", err);
      throw err;
    });
}

function _upsertRow(like, userId, pinId) {
  const values = [like.like, userId, pinId, like.utcCreatedDateTime || new Date(), like.utcUpdatedDateTime, like.utcDeletedDateTime]
    .map(value => value === undefined ? null : value);
  return db.query(`
    INSERT INTO "Like" ("like", "userId", "pinId", "utcCreatedDateTime", "utcUpdatedDateTime", "utcDeletedDateTime")
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT ("userId", "pinId") DO UPDATE SET
        "like" = EXCLUDED."like",
        "utcUpdatedDateTime" = now(),
        "utcDeletedDateTime" = NULL
    RETURNING "id"`, values)
    .then(rows => {
      like.id = rows[0].id;
      return {
        like: like
      };
    });
}

// Soft deletes.
function _delete(like) {
  return db.query(
    `UPDATE "Like" SET "utcDeletedDateTime" = now() WHERE "id" = $1 RETURNING "utcDeletedDateTime"`,
    [like.id])
    .then(rows => _deleted(like, rows));
}

function _deleteByPinId(like) {
  return db.query(
    `UPDATE "Like" SET "utcDeletedDateTime" = now() WHERE "pinId" = $1 AND "userId" = $2 RETURNING "utcDeletedDateTime"`,
    [like.pinId, like.userId])
    .then(rows => _deleted(like, rows));
}

function _deleted(like, rows) {
  const utcDeletedDateTime = rows.length ? rows[0].utcDeletedDateTime : undefined;
  like.utcDeletedDateTime = utcDeletedDateTime;
  return {
    utcDeletedDateTime: utcDeletedDateTime,
    like: like
  };
}
