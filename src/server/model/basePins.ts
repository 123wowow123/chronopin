import type { Row } from '../db';
import type BasePin from './basePin';

export default class BasePins<P extends BasePin = BasePin> {
  [key: string]: any;
  declare pins: P[];
  declare queryCount: number | undefined;

  constructor(pins?: Row[] | { pins: Row[]; queryCount?: number } | null) {
    if (pins) {
      this.set(pins);
    }
  }

  set(pins: Row[] | { pins: Row[]; queryCount?: number }): this {
    if (Array.isArray(pins)) {
      this.setPinsFromArray(pins).setQueryCount(undefined);
    } else if (pins.pins) {
      this.setPins(pins.pins).setQueryCount(pins.queryCount);
    } else {
      throw new Error('Pins cannot set value of arg');
    }
    return this;
  }

  setPins(_pins: Row[]): this {
    throw new Error('Not Implemented');
  }

  setPinsFromArray(_pins: Row[]): this {
    throw new Error('Not Implemented');
  }

  setQueryCount(queryCount: number | null | undefined): this {
    if (Number.isInteger(queryCount) || queryCount == null) {
      this.queryCount = queryCount ?? undefined;
    } else {
      throw new Error('arg is not an integer, undefined, null');
    }
    return this;
  }

  async save() {
    for (const p of this.pins) {
      await p.save();
    }
  }

  getAllIds(): number[] {
    return this.pins.map((p) => p.id);
  }

  // The earliest and latest pin, or null when there are none. Ordered by
  // (start, id), the pair a page's cursors are made of: comparing starts alone
  // left a page that begins and ends on the same instant - a day of all-day
  // pins, which all start at midnight UTC - reporting its two ends the wrong
  // way round, and the page after it then walked back over pins it had
  // already shown.
  minMaxDateTimePin(): { min: P; max: P } | null {
    if (!this.pins.length) {
      return null;
    }
    const firstPin = this.pins[0];
    const lastPin = this.pins[this.pins.length - 1];
    return isBefore(firstPin, lastPin) ? { min: firstPin, max: lastPin } : { min: lastPin, max: firstPin };
  }
}

// Whether a comes before b by (start, id). The starts are compared as
// instants: on some paths they arrive as Date objects, and two Dates for the
// same moment are never ===, which would lose the tie-break to the id.
function isBefore(a: BasePin, b: BasePin): boolean {
  const at = new Date(a.utcStartDateTime).getTime();
  const bt = new Date(b.utcStartDateTime).getTime();
  return at < bt || (at === bt && a.id < b.id);
}
