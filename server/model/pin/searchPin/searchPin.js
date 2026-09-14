'use strict';

import * as _ from 'lodash';
import { faissRequest } from './faiss';

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


export default class SearchPin extends BasePin {

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

    static resetIndex() {
        return resetIndex();
    }
}

function upsertPin(pin) {
    return faissRequest('POST', '/add', {
        id: pin.id,
        title: pin.title,
        description: pin.description
    });
}

function removePin(id) {
    return faissRequest('DELETE', '/remove', { id });
}

// Empties the whole index, before a reseed.
function resetIndex() {
    return faissRequest('DELETE', '/reset');
}
