'use strict';

import * as _ from 'lodash';
import rp from 'request-promise';

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
    ]
);


export default class FullPin extends BasePin {
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
                return l;
            });

        } else {
            throw "FullPin cannot set value of arg";
        }
        return this;
    }

    save() {
        //return upsertPin(this);
    }

}
