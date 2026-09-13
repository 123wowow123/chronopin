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
  'utcCreatedDateTime',
  'utcUpdatedDateTime',
  //'utcDeletedDateTime'
];

export default class Favorite {
  constructor(favorite, user, pin) {

    if (favorite) {
      this.set(favorite, user, pin);
    }
  }

  set(favorite, user, pin) {
    if (favorite) {
      for (let i = 0; i < prop.length; i++) {
        this[prop[i]] = favorite[prop[i]];
      }

      if (user && user instanceof User) {
        this._user = user;
      }
      else if (favorite._user && favorite._user instanceof User) {
        this._user = favorite._user;
      }
      else if (Number.isInteger(favorite.userId)) {
        this.userId = favorite.userId;
      }

      if (pin instanceof BasePin) {
        this._pin = pin;
      }
      else if (favorite._pin && favorite._pin instanceof BasePin) {
        this._pin = favorite._pin;
      }
      else if (Number.isInteger(favorite.pinId)) {
        this.pinId = favorite.pinId;
      }

    } else {
      throw "Favorite cannot set value of arg";
    }
    return this;
  }

  save() {
    return _upsert(this, this.userId, this.pinId)
      .catch(err => {
        console.log(`Favorite '${this.id}' save err:`, err);
        throw err;
      });
  }

  update() {
    return _upsert(this, this.userId, this.pinId)
      .catch(err => {
        console.log(`Favorite '${this.id}' update err:`, err);
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
    return new Favorite({
      id: id
    }).delete();
  }
}

const FavoritePrototype = Favorite.prototype;

Object.defineProperty(FavoritePrototype, '_user', {
  enumerable: false,
  configurable: false,
  writable: true
});

Object.defineProperty(FavoritePrototype, 'userId', {
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

Object.defineProperty(FavoritePrototype, '_pin', {
  enumerable: false,
  configurable: false,
  writable: true
});

Object.defineProperty(FavoritePrototype, 'pinId', {
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
function _upsert(favoriteIn, userId, pinId) {
  return _upsertRow(favoriteIn, userId, pinId)
    .then(({
      favorite
    }) => {
      favoriteIn.set(favorite);
      return {
        favorite: favoriteIn
      };
    });
}

function _queryById(id) {
  return db.query(`
    SELECT "id", "userId", "pinId", "utcCreatedDateTime"
    FROM "Favorite"
    WHERE "id" = $1`, [id])
    .then(rows => {
      return {
        favorite: rows.length ? new Favorite(rows[0]) : undefined
      };
    })
    .catch(err => {
      console.log("Favorite queryById err", err);
      throw err;
    });
}

function _upsertRow(favorite, userId, pinId) {
  const values = [userId, pinId, favorite.utcCreatedDateTime || new Date(), favorite.utcUpdatedDateTime, favorite.utcDeletedDateTime]
    .map(value => value === undefined ? null : value);
  return db.query(`
    INSERT INTO "Favorite" ("userId", "pinId", "utcCreatedDateTime", "utcUpdatedDateTime", "utcDeletedDateTime")
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT ("userId", "pinId") DO UPDATE SET
        "utcUpdatedDateTime" = now(),
        "utcDeletedDateTime" = NULL
    RETURNING "id"`, values)
    .then(rows => {
      favorite.id = rows[0].id;
      return {
        favorite: favorite
      };
    });
}

// Soft deletes.
function _delete(favorite) {
  return db.query(
    `UPDATE "Favorite" SET "utcDeletedDateTime" = now() WHERE "id" = $1 RETURNING "utcDeletedDateTime"`,
    [favorite.id])
    .then(rows => _deleted(favorite, rows));
}

function _deleteByPinId(favorite) {
  return db.query(
    `UPDATE "Favorite" SET "utcDeletedDateTime" = now() WHERE "pinId" = $1 AND "userId" = $2 RETURNING "utcDeletedDateTime"`,
    [favorite.pinId, favorite.userId])
    .then(rows => _deleted(favorite, rows));
}

function _deleted(favorite, rows) {
  const utcDeletedDateTime = rows.length ? rows[0].utcDeletedDateTime : undefined;
  favorite.utcDeletedDateTime = utcDeletedDateTime;
  return {
    utcDeletedDateTime: utcDeletedDateTime,
    favorite: favorite
  };
}
