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

// _user, userId, media
export default class BasePin {

    _prop = BasePinProp;

    constructor(pin, user, prop) {
        this._prop = prop;
        if (pin) {
            this.set(pin, user);
        }
    }

    set(pin, user) {
        if (pin) {
            this._prop.forEach(key => {
                this[key] = pin[key];
            });

            if (user && user instanceof User) {
                this._user = user;
            }
            else if (pin._user && pin._user instanceof User) {
                this._user = pin._user;
            }

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
        return _.omitBy(this, (value, key) => {
            return key.startsWith('_')
                || _.isNull(value)
                || (Array.isArray(value) && !value.length);
        });
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

const PinPrototype = BasePin.prototype;

Object.defineProperty(PinPrototype, '_user', {
    enumerable: false,
    configurable: false,
    writable: true
});

Object.defineProperty(PinPrototype, 'userId', {
    get: () => {
        return _.get(this, '_user.id', null);
    },
    set: (id) => {
        if (this._user && this._user instanceof User) {
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
