import _ from 'lodash';
import * as db from '../db';
import type { Row } from '../db';
import BasePin, { BasePinProp } from './basePin';
import BasePins from './basePins';
import Favorite from './favorite';
import Like from './like';
import Medium from './medium';
import Merchant from './merchant';
import PinReference from './pinReference';
import type User from './user';
import { createPin, mapSubObjectFromQuery } from './pinShared';

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
    await createPin(this, this.userId);
    // Media and merchants one at a time, so they get ids in the order the pin
    // lists them and a backup restores in the same order.
    for (const m of this.media) {
      await new Medium(m, this).save();
    }
    for (const m of this.merchants) {
      await new Merchant(m, this).save();
    }
    for (const r of this.references) {
      await new PinReference(r, this).save();
    }
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

  // Every pin after (fromDateTime, lastPinId), for backups. Soft-deleted pins
  // are included, so a backup restores them as deleted rather than losing them.
  static async queryForwardByDate(fromDateTime: Date | string, lastPinId: number, pageSize: number) {
    const rows = await db.query(
      `
        SELECT "Pin".*
        FROM "PinBaseView" AS "Pin"
        WHERE "Pin"."utcStartDateTime" > $1
          OR ("Pin"."utcStartDateTime" = $1 AND "Pin"."id" > $2)
        ORDER BY "Pin"."utcStartDateTime", "Pin"."id", "Pin"."Media.id", "Pin"."Merchant.id"
        LIMIT $3`,
      [fromDateTime, lastPinId || 0, pageSize],
    );
    return new FullPins({ pins: rows });
  }
}
