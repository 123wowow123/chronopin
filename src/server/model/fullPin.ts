import _ from 'lodash';
import * as db from '../db';
import type { Row } from '../db';
import BasePin, { BasePinProp } from './basePin';
import BasePins from './basePins';
import Favorite from './favorite';
import Like from './like';
import Medium, { saveAllToPin } from './medium';
import Merchant from './merchant';
import PinRating from './pinRating';
import PinReference from './pinReference';
import type User from './user';
import { advanceIdSequence, createPin, mapSubObjectFromQuery } from './pinShared';

// A pin with everything attached (likes and favourites too), for the backup
// and seed scripts. The site itself never loads these.
export class FullPin extends BasePin {
  declare favorites: Favorite[];
  declare likes: Like[];

  constructor(pin?: Row | null, user?: User | null) {
    super(pin, user, BasePinProp);
  }

  set(pin: Row, user?: User | null): this {
    super.set(pin, user);
    this.favorites = _.get(pin, 'favorites', []).map((f: Row) => new Favorite(f, null, this));
    this.likes = _.get(pin, 'likes', []).map((l: Row) => new Like(l, null, this));
    return this;
  }

  async save() {
    await createPin(this, this.userId, { advanceSequence: false });
    // One statement per kind rather than one per row, each keeping the order
    // the pin lists them in so a backup restores with the same ids it had.
    await saveAllToPin(this.media.map((m: Row) => new Medium(m, this)), this.id);
    await Merchant.saveAll(this.merchants.map((m: Row) => new Merchant(m, this)), this.id);
    await PinReference.saveAll(this.references.map((r: Row) => new PinReference(r, this)));
    await PinRating.saveAll((this.ratings || []).map((rt: Row) => new PinRating(rt, this)));
    return Promise.all([
      ...this.likes.map((l) =>
        new Like(
          {
            utcCreatedDateTime: l.utcCreatedDateTime,
            utcUpdatedDateTime: l.utcUpdatedDateTime,
            like: l.like,
            userId: l.userId,
          },
          null,
          this,
        ).save(),
      ),
      ...this.favorites.map((f) =>
        new Favorite(
          {
            utcCreatedDateTime: f.utcCreatedDateTime,
            utcUpdatedDateTime: f.utcUpdatedDateTime,
            userId: f.userId,
          },
          null,
          this,
        ).save(),
      ),
    ]);
  }

  static mapPinRowsToPin(pinRows: Row[]): FullPin {
    const pin: Row = new FullPin(pinRows[0]);
    pin.media = mapSubObjectFromQuery('Media', 'id', pinRows);
    pin.favorites = mapSubObjectFromQuery('Favorites', 'userId', pinRows);
    pin.likes = mapSubObjectFromQuery('Likes', 'userId', pinRows);
    pin.merchants = mapSubObjectFromQuery('Merchant', 'id', pinRows);
    return new FullPin(pin);
  }
}

export class FullPins extends BasePins<FullPin> {
  // Each pin keeps the id it was backed up with, which leaves the identity
  // sequence behind; moving it past them is a MAX(id) scan, so it happens
  // once here rather than after every pin.
  async save() {
    await super.save();
    await advanceIdSequence('Pin');
  }

  setPins(pins: Row[]): this {
    if (!Array.isArray(pins)) {
      throw new Error('arg is not an array');
    }
    this.pins = FullPins.mapPinRowsToPins(pins);
    return this;
  }

  setPinsFromArray(pins: Row[]): this {
    this.pins = pins.map((p) => new FullPin(p));
    return this;
  }

  static mapPinRowsToPins(pinRows: Row[]): FullPin[] {
    const grouped = _.groupBy(pinRows, (row) => row.id);
    const pins = Object.values(grouped).map((rows) => FullPin.mapPinRowsToPin(rows));
    return _.sortBy(_.sortBy(pins, 'id'), 'utcStartDateTime');
  }

  // Every pin, for backups. Soft-deleted ones are included, so a backup
  // restores them as deleted rather than losing them.
  //
  // This used to walk forward from a date, and the backup started it at the
  // Unix epoch - so every pin that starts before 1970 was quietly left out of
  // seedPins.json and would not have survived a db:reset. The timeline is a
  // record of when things happened, so it reaches back millennia: 47 pins
  // were being dropped, the Great Pyramid and Stonehenge among them. A backup
  // wants all of them and there is nothing to page against, so there is no
  // cursor here any more.
  static async queryAll() {
    const rows = await db.query(
      `
        SELECT "Pin".*
        FROM "PinBaseView" AS "Pin"
        ORDER BY "Pin"."utcStartDateTime", "Pin"."id", "Pin"."Media.id", "Pin"."Merchant.id"`,
    );
    return new FullPins({ pins: rows });
  }
}
