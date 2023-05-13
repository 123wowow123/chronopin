/*jshint eqnull:true */

'use strict';

import * as _ from 'lodash';

export default class BasePins {
    // Properties
    // this.pins
    // this.queryCount

    constructor(pins) {
        if (pins) {
            this.set(pins);
        }
    }

    set(pins) {
        if (Array.isArray(pins)) {
            this
                .setPinsFromArray(pins)
                .setQueryCount(undefined);
        } else if (pins.pins) {
            this
                .setPins(pins.pins)
                .setQueryCount(pins.queryCount);
        } else {
            throw "Pins cannot set value of arg";
        }
        return this;
    }

    setPins(pins) {
        throw new Error("Not Implemented");
    }

    setPinsFromArray(pins) {
        throw new Error("Not Implemented");
    }

    setQueryCount(queryCount) {
        if (Number.isInteger(queryCount) || queryCount == null) {
            this.queryCount = queryCount;
        } else {
            throw "arg is not an integer, undefined, null";
        }
        return this;
    }

    save() {
        const promises = this.pins
            .reduce((prev, p) => prev.then(() => p.save()), Promise.resolve());
        return promises;
    }

    getAllIds() {
        return this.pins.map(p => p.id)
    }

    minMaxDateTimePin() {
        // empty array returns null
        if (!this || !this.pins.length) {
            return null;
        }
        //console.log('_minMaxDateTimePin', results);
        let firstPin = this.pins[0],
            lastPin = this.pins[this.pins.length - 1],
            minPin,
            maxPin;
        if (firstPin.utcStartDateTime < lastPin.utcStartDateTime) {
            minPin = firstPin;
            maxPin = lastPin;
        } else {
            minPin = lastPin;
            maxPin = firstPin;
        }
        return {
            min: minPin,
            max: maxPin
        };
    }

    static setPinsFromArray(pins) {
        const constructor = this.constructor,
            instance = new constructor();
        return instance.setPinsFromArray(pins);
    }

    static queryForwardByDate(fromDateTime, userId, lastPinId, pageSize) {
        throw new Error("Not Implemented");
    }

    static queryBackwardByDate(fromDateTime, userId, lastPinId, pageSize) {
        throw new Error("Not Implemented");
    }

    static queryInitialByDate(fromDateTime, userId, pageSizePrev, pageSizeNext) {
        throw new Error("Not Implemented");
    }

    static queryForwardByDateFilterByHasFavorite(fromDateTime, userId, lastPinId, pageSize) {
        throw new Error("Not Implemented");
    }

    static queryBackwardByDateFilterByHasFavorite(fromDateTime, userId, lastPinId, pageSize) {
        throw new Error("Not Implemented");
    }

    static queryInitialByDateFilterByHasFavorite(fromDateTime, userId, pageSizePrev, pageSizeNext) {
        throw new Error("Not Implemented");
    }

}