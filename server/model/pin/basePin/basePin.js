'use strict';

import * as _ from 'lodash';
import {
    Medium,
    Merchant,
    Location,
    Mention,
    User
} from '../..';

// media
// merchants
// locations
// mentions
export const BasePinProp = [
    'id',
    'parentId',
    'rootThread',
    'title',
    'description',
    'sourceUrl',
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

// user, userId
export default class BasePin {

    constructor(pin, user, prop) {
        this._prop = prop || BasePinProp;
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
                this.user = user;
            }
            else if (pin.user && pin.user instanceof User) {
                this.user = pin.user;
            }
            else if (Number.isInteger(pin.userId)) {
                this.userId = pin.userId;
                this.user.userName = BasePin.getPinUserName(pin);
            }

            this.media = _.get(pin, 'media', [])
                .map(m => {
                    return new Medium(m, this);
                });

            this.merchants = _.get(pin, 'merchants', [])
                .map(m => {
                    return new Merchant(m, this);
                });

            this.locations = _.get(pin, 'locations', [])
                .map(m => {
                    return new Location(m, this);
                });

            const allTags = Mention.scrapeAllMention(this.description);
            this.mentions = (allTags || [])
                .map(m => {
                    return new Mention({ tag: m }, this);
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

    setUser(user) {
        if (user instanceof User) {
            this.user = user;
        }
        else {
            throw "user not instance of User";
        }
        return this;
    }

    findMediumByOriginalUrl(originalUrl) {
        return _.get(this, "media", []).find(m => {
            return m.originalUrl === originalUrl
        });
    }

    addMedium(medium) {
        if (medium instanceof Medium) {
            medium.setPin(this);
            if (!this.media) { this.media = []; };
            this.media.push(medium);
        } else {
            throw "medium not instance of Medium";
        }
        return this;
    }

    unshiftMedium(medium) {
        if (medium instanceof Medium) {
            medium.setPin(this);
            if (!this.media) { this.media = []; };
            this.media.unshift(medium);
        } else {
            throw "medium not instance of Medium";
        }
        return this;
    }

    addMedia(media) {
        (media || []).forEach(m => {
            this.addMedium(new Medium(m));
        })
        return this;
    }

    addMerchants(merchants) {
        (merchants || []).forEach(m => {
            this.addMerchant(new Merchant(m));
        })
        return this;
    }

    addMerchant(merchant) {
        if (merchant instanceof Merchant) {
            merchant.setPin(this);
            if (!this.merchants) { this.merchants = []; };
            this.merchants.push(merchant);
        } else {
            throw "merchant not instance of Merchant";
        }
        return this;
    }

    addLocation(location) {
        if (location instanceof Location) {
            location.setPin(this);
            if (!this.locations) { this.locations = []; };
            this.locations.push(location);
        } else {
            throw "location not instance of Location";
        }
        return this;
    }

    addLocations(locations) {
        (locations || []).forEach(m => {
            this.addLocation(new Location(m));
        })
        return this;
    }

    addMention(mention) {
        if (mention instanceof Mention) {
            mention.setPin(this);
            if (!this.mentions) { this.mentions = []; };
            this.mentions.push(mention);
        } else {
            throw "mention not instance of Mention";
        }
        return this;
    }

    addMentions(mentions) {
        (mentions || []).forEach(m => {
            this.addMention(new Mention(m));
        })
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

    static getPinUserName(pinRow) {
        if (pinRow['User.userName']) {
            return pinRow['User.userName']
        }
        return undefined;;
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

Object.defineProperty(PinPrototype, 'userId', {
    get: function () {
        return _.get(this, 'user.id', null);
    },
    set: function (id) {
        if (this.user && this.user instanceof User) {
            this.user.id = id;
        } else {
            this.user = new User({
                id: id
            });
        }
    },
    enumerable: true,
    configurable: false
});
