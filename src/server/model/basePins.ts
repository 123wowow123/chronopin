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

  // The earliest and latest pin by start time, or null when there are none.
  minMaxDateTimePin(): { min: P; max: P } | null {
    if (!this.pins.length) {
      return null;
    }
    const firstPin = this.pins[0];
    const lastPin = this.pins[this.pins.length - 1];
    return firstPin.utcStartDateTime < lastPin.utcStartDateTime
      ? { min: firstPin, max: lastPin }
      : { min: lastPin, max: firstPin };
  }
}
