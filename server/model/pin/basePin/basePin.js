'use strict';

import * as _ from 'lodash';
import {
    Medium
} from '../..';

// media
export const BasePinProp = [
    'id',
    'title',
    'description',
    'sourceUrl',
    'address',
    'priceLowerBound',
    'priceUpperBound',
    'price',
    'tip',
    'utcStartDateTime',
    'utcEndDateTime',
    'allDay',
    'utcCreatedDateTime',
    'utcUpdatedDateTime',
    'utcDeletedDateTime'
];

export default class BasePin {
    constructor(pin) {

        this.media = [];

        if (pin) {
            this.set(pin);
        }
    }

    set(pin) {
        if (pin) {
            BasePinProp.forEach(key => {
                this[key] = pin[key];
            });

            this.media = _.get(pin, 'media', [])
                .map(m => {
                    return new Medium(m, this);
                });

        } else {
            throw "Pin cannot set value of arg";
        }
        return this;
    }

    save() {
        throw new Error("Not Implemented");
    }

    update() {
        throw new Error("Not Implemented");
    }

    delete() {
        throw new Error("Not Implemented");
    }

    addMedium(medium) {
        if (medium instanceof Medium) {
            medium.setPin(this);
            this.media.push(medium);
        } else {
            throw "medium not instance of Medium";
        }
        return this;
    }

    toJSON() {
        // omits own and inherited properties with null values
        return _.omitBy(this, _.isNull);
    }

    static queryById(pinId, userId) {
        throw new Error("Not Implemented");
    }

    static delete(id) {
        const PinType = (this).constructor;
        return new PinType({
            id: id
        }).delete();
    }
    
}
