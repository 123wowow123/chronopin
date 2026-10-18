import _ from 'lodash';
import * as db from '../db';
import type { Row } from '../db';

const prop = [
  'id',
  'title',
  'description',
  'sourceUrl',
  'address',
  'tip',
  'utcStartDateTime',
  'utcEndDateTime',
  'allDay',
  'alwaysShow',
  'utcCreatedDateTime',
  'utcUpdatedDateTime',
  'searchScore',
];

// A marker on the timeline that is not a pin: holidays, solstices, equinoxes.
export default class DateTime {
  [key: string]: any;
  declare id: number;

  constructor(dateTime?: Row | null) {
    if (dateTime) {
      this.set(dateTime);
    }
  }

  set(dateTime: Row): this {
    for (const key of prop) {
      this[key] = dateTime[key];
    }
    return this;
  }

  async save() {
    try {
      const values = [
        this.title, this.description, this.sourceUrl, this.address, this.tip,
        this.utcStartDateTime, this.utcEndDateTime,
        this.allDay == null ? false : this.allDay,
        this.alwaysShow == null ? false : this.alwaysShow,
        this.utcCreatedDateTime || new Date(), this.utcUpdatedDateTime,
      ].map((value) => (value === undefined ? null : value));

      const rows = await db.query(
        `
        INSERT INTO "DateTime" ("title", "description", "sourceUrl", "address", "tip", "utcStartDateTime",
          "utcEndDateTime", "allDay", "alwaysShow", "utcCreatedDateTime", "utcUpdatedDateTime")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING "id"`,
        values,
      );
      this.id = rows[0].id;
      return { dateTime: this };
    } catch (err) {
      console.log(`DateTime '${this.title}' save err:`, err);
      throw err;
    }
  }

  toJSON(): Row {
    return _.omitBy(this, _.isNull);
  }

  // Dates starting in [startDateTime, endDateTime).
  static async queryByStartEndDate(startDateTime: Date, endDateTime: Date): Promise<DateTime[]> {
    const rows = await db.query(
      `
    SELECT *
    FROM "DateTime" AS "d"
    WHERE $1 <= "d"."utcStartDateTime" AND $2 > "d"."utcStartDateTime"
    ORDER BY "d"."utcStartDateTime", "d"."id"`,
      [startDateTime, endDateTime],
    );
    return rows.map((row) => new DateTime(row));
  }
}

export class MediumType {
  static async create(type: string) {
    const rows = await db.query(`INSERT INTO "MediumType" ("type") VALUES ($1) RETURNING "id"`, [type]);
    return { id: rows[0].id as number, type };
  }
}
