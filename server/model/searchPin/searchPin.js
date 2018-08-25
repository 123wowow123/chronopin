'use strict';

import * as _ from 'lodash';
import rp from 'request-promise';
import { prefixSearchIndex } from './searchHelper';

import {
    Medium
} from '..';


// media
// favorites - will be converted to bool for client
// likes - will be converted to bool for client
let prop = [
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
    'utcDeletedDateTime',

    'userId', // not using defineProperty like Pin

    // 'favoriteCount',
    // 'likeCount',

    /* SearchPin unique attributes */
    'searchScore',
    'highlight'
];


export default class SearchPin {
    constructor(pin) {
        this.media = [];
        this.favorites = [];
        this.likes = [];

        if (pin) {
            this.set(pin);
        }
    }

    set(pin) {
        if (pin) {
            for (let i = 0; i < prop.length; i++) {
                this[prop[i]] = pin[prop[i]];
            }
            this.media = _.get(pin, 'media', []).map(m => {
                return new Medium(m, this);
            }) || [];

            this.favorites = _.get(pin, 'favorites', []).map(f => {
                return f;
            }) || [];

            this.likes = _.get(pin, 'likes', []).map(l => {
                return l
            }) || [];

        } else {
            throw "SearchPin cannot set value of arg";
        }
        return this;
    }

    save() {
        return upsertPin(this);
    }

    update() {
        return upsertPin(this);
    }

    delete() {
        return removePin(this.id);
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

    static delete(id) {
        return new SearchPin({
            id: id
        }).delete();
    }

    static favoritePin(userId, pin) {
        return favoritePin(userId, pin);
    }

    static unfavoritePin(userId, pin) {
        return unfavoritePin(userId, pin);
    }

    static likePin(userId, pin) {
        return likePin(userId, pin);
    }

    static unlikePin(userId, pin) {
        return unlikePin(userId, pin);
    }
}

/* Favorites Update */

function favoritePin(userId, pin) {
    // Create Pins
    const id = pin.id;

    const index = "pins";
    const command = "_doc";
    const uri = prefixSearchIndex(index) + "/" + command + "/" + id + "/_update";

    const options = {
        method: 'POST',
        uri: uri,
        body: {
            "script": {
                "source": "ctx._source.favorites.add(params.uId)",
                "params": {
                    "uId": userId
                }
            }
        },
        json: true // Automatically stringifies the body to JSON
    };

    console.log(JSON.stringify(options.body.script));
    //debugger
    const req = Object.assign({}, options);
    console.log(req);
    return rp(req);
};

function unfavoritePin(userId, pin) {
    // Create Pins
    const id = pin.id;

    const index = "pins";
    const command = "_doc";
    const uri = prefixSearchIndex(index) + "/" + command + "/" + id + "/_update";

    const options = {
        method: 'POST',
        uri: uri,
        body: {
            "script": {
                "source": "ctx._source.favorites.removeAll(Collections.singleton(params.uId))",
                "params": {
                    "uId": userId
                }
            }
        },
        json: true // Automatically stringifies the body to JSON
    };

    console.log(JSON.stringify(options.body.script));
    //debugger
    const req = Object.assign({}, options);
    console.log(req);
    return rp(req);
};

/* Likes Update */

function likePin(userId, pin) {
    // Create Pins
    const id = pin.id;

    const index = "pins";
    const command = "_doc";
    const uri = prefixSearchIndex(index) + "/" + command + "/" + id + "/_update";

    const options = {
        method: 'POST',
        uri: uri,
        body: {
            "script": "ctx._source.likes.add(params.uId)",
            "params": {
                "uId": userId
            }
        },
        json: true // Automatically stringifies the body to JSON
    };

    //debugger
    const req = Object.assign({}, options);
    //console.log(req);
    return rp(req);
};

function unlikePin(userId, pin) {
    // Create Pins
    const id = pin.id;

    const index = "pins";
    const command = "_doc";
    const uri = prefixSearchIndex(index) + "/" + command + "/" + id + "/_update";

    const options = {
        method: 'POST',
        uri: uri,
        body: {
            "script": {
                "source": "ctx._source.favorites.removeAll(Collections.singleton(params.uId))",
                "params": {
                    "uId": userId
                }
            }
        },
        json: true // Automatically stringifies the body to JSON
    };

    console.log(JSON.stringify(options.body.script));
    //debugger
    const req = Object.assign({}, options);
    console.log(req);
    return rp(req);
};

/* Add & Remove Update */

function upsertPin(pin) {
    // Create Pins
    const id = pin.id;

    const index = "pins";
    const command = "_doc";
    const uri = prefixSearchIndex(index) + "/" + command + "/" + id;

    const options = {
        method: 'PUT',
        uri,
        json: true // Automatically stringifies the body to JSON
    };

    //debugger
    const req = Object.assign({}, options, { body: pin });
    //console.log(req);
    return rp(req);
};

function removePin(id) {
    const index = "pins";
    const command = "_doc";
    const uri = prefixSearchIndex(index) + "/" + command + "/" + id;

    const options = {
        method: 'DELETE',
        uri,
        json: true // Automatically stringifies the body to JSON
    };

    //debugger
    const req = Object.assign({}, options);
    //console.log(req);
    return rp(req);
};