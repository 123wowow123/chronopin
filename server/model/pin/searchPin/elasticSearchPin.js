'use strict';

import * as _ from 'lodash';
const rp = require('request-promise');
import { prefixSearchIndex } from './searchHelper';
import * as config from '../../../config/environment';

import {
    BasePin,
    BasePinProp
} from '../..';


// media
// favorites - will be converted to bool for client
// likes - will be converted to bool for client
const prop = BasePinProp.concat(
    [
        //'userId', // not using defineProperty like Pin

        // 'favoriteCount',
        // 'likeCount',

        /* SearchPin unique attributes */
        'searchScore',
        'highlight'
    ]
);


export default class ElasticSearchPin extends BasePin {

    constructor(pin, user) {
        super(pin, user, prop);
    }

    set(pin, user) {
        super.set(pin, user);

        if (pin) {
            this.favorites = _.get(pin, 'favorites', []).map(f => {
                return f.userId;
            });

            this.likes = _.get(pin, 'likes', []).map(l => {
                return l.userId
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

function favoriteElasticSearchPin(userId, pin) {
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
        json: true, // Automatically stringifies the body to JSON
        auth: config.elastiSearch.auth
    };

    console.log(JSON.stringify(options.body.script));
    //debugger
    const req = Object.assign({}, options);
    console.log(req);
    return rp(req);
};

function unfavoriteElasticSearchPin(userId, pin) {
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
        json: true, // Automatically stringifies the body to JSON
        auth: config.elastiSearch.auth
    };

    console.log(JSON.stringify(options.body.script));
    //debugger
    const req = Object.assign({}, options);
    console.log(req);
    return rp(req);
};

/* Likes Update */

function likeElasticSearchPin(userId, pin) {
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
        json: true, // Automatically stringifies the body to JSON
        auth: config.elastiSearch.auth
    };

    //debugger
    const req = Object.assign({}, options);
    //console.log(req);
    return rp(req);
};

function unlikeElasticSearchPin(userId, pin) {
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
        json: true, // Automatically stringifies the body to JSON
        auth: config.elastiSearch.auth
    };

    console.log(JSON.stringify(options.body.script));
    //debugger
    const req = Object.assign({}, options);
    console.log(req);
    return rp(req);
};

/* Add & Remove Update */

function upsertElasticSearchPin(pin) {
    // Create Pins
    const id = pin.id;

    const index = "pins";
    const command = "_doc";
    const uri = prefixSearchIndex(index) + "/" + command + "/" + id;

    const options = {
        method: 'PUT',
        uri,
        json: true, // Automatically stringifies the body to JSON
        auth: config.elastiSearch.auth
    };

    //debugger
    const req = Object.assign({}, options, { body: pin });
    //console.log(req);
    return rp(req);
};

function removeElasticSearchPin(id) {
    const index = "pins";
    const command = "_doc";
    const uri = prefixSearchIndex(index) + "/" + command + "/" + id;

    const options = {
        method: 'DELETE',
        uri,
        json: true, // Automatically stringifies the body to JSON
        auth: config.elastiSearch.auth
    };

    //debugger
    const req = Object.assign({}, options);
    //console.log(req);
    return rp(req);
};