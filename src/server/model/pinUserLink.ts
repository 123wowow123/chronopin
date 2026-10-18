import _ from 'lodash';
import type { Row } from '../db';
import BasePin from './basePin';
import User from './user';

// Shared shape of the rows that tie a user to a pin (Like, Favorite,
// Comment): own columns copied from `prop`, plus userId/pinId accessors that
// read through to the linked user and pin objects. The accessors live on the
// prototype and are enumerable, so userId and pinId are part of the JSON.
export default abstract class PinUserLink {
  [key: string]: any;
  declare _user?: User;
  declare _pin?: BasePin;
  declare id: number;
  declare userId: number | undefined;
  declare pinId: number | undefined;

  protected abstract get props(): string[];

  constructor(row?: Row | null, user?: User | null, pin?: BasePin | null) {
    if (row) {
      this.set(row, user, pin);
    }
  }

  set(row: Row, user?: User | null, pin?: BasePin | null): this {
    if (!row) {
      throw new Error(`${this.constructor.name} cannot set value of arg`);
    }
    for (const key of this.props) {
      this[key] = row[key];
    }

    if (user && user instanceof User) {
      this._user = user;
    } else if (row._user && row._user instanceof User) {
      this._user = row._user;
    } else if (Number.isInteger(row.userId)) {
      this.userId = row.userId;
      this.afterUserId(row);
    }

    if (pin instanceof BasePin) {
      this._pin = pin;
    } else if (row._pin && row._pin instanceof BasePin) {
      this._pin = row._pin;
    } else if (Number.isInteger(row.pinId)) {
      this.pinId = row.pinId;
    }
    return this;
  }

  // Hook for rows that carry joined user columns.
  protected afterUserId(_row: Row) {}

  setUser(user: User): this {
    this._user = user;
    return this;
  }

  setPin(pin: BasePin): this {
    this._pin = pin;
    return this;
  }

  toJSON(): Row {
    return _.omitBy(this, (value, key) => key.startsWith('_') || _.isNull(value) || key === 'props');
  }
}

Object.defineProperty(PinUserLink.prototype, 'userId', {
  get(this: PinUserLink) {
    return this._user && this._user.id;
  },
  set(this: PinUserLink, id: number) {
    if (this._user) {
      this._user.id = id;
    } else {
      this._user = new User({ id });
    }
  },
  enumerable: true,
  configurable: false,
});

Object.defineProperty(PinUserLink.prototype, 'pinId', {
  get(this: PinUserLink) {
    return this._pin && this._pin.id;
  },
  set(this: PinUserLink, id: number) {
    if (this._pin) {
      this._pin.id = id;
    } else {
      this._pin = new BasePin({ id });
    }
  },
  enumerable: true,
  configurable: false,
});
