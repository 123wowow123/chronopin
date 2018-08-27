'use strict';

import * as _ from 'lodash';
import rp from 'request-promise';
import { prefixSearchIndex } from './searchHelper';

import {
    BasePin,
    BasePinProp
} from '../..';


// media
// favorites - will be converted to bool for client
// likes - will be converted to bool for client
const prop = BasePinProp.concat(
    [
        'userId', // not using defineProperty like Pin

        // 'favoriteCount',
        // 'likeCount',

        /* SearchPin unique attributes */
        'searchScore',
        'highlight'
    ]
);


export default class SearchPin extends BasePin {
    constructor(pin) {
        super(pin);

        this.favorites = [];
        this.likes = [];

        if (pin) {
            this.set(pin);
        }
    }

    set(pin) {
        super.set(pin);

        if (pin) {
            this.favorites = _.get(pin, 'favorites', []).map(f => {
                return f;
            });

            this.likes = _.get(pin, 'likes', []).map(l => {
                return l
            });

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