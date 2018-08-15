'use strict';

import * as _ from 'lodash';
import rp from 'request-promise';
import { prefixSearchIndex } from './searchHelper';

import {
    Medium
} from '..';


// _user, userId, media, highlight
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

    'favorites', // will be converted to bool for client
    'likes', // will be converted to bool for client

    /* SearchPin unique attributes */
    'searchScore',
    'highlight'
];


export default class SearchPin {
    constructor(pin) {
        this.media = [];

        if (pin) {
            this.set(pin);
        }
    }

    set(pin) {
        if (pin) {
            for (let i = 0; i < prop.length; i++) {
                this[prop[i]] = pin[prop[i]];
            }
            this.media = pin.media && pin.media.map(m => {
                return new Medium(m, this);
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

    static favoritePin(userId, searchText) {
        return favoritePin(userId, searchText);
    }

    static unfavoritePin(userId, searchText) {
        return unfavoritePin(userId, searchText);
    }

    static likePin(userId, searchText) {
        return likePin(userId, searchText);
    }

    static unlikePin(userId, searchText) {
        return unlikePin(userId, searchText);
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