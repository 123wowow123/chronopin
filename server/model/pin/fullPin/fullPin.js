'use strict';

import * as _ from 'lodash';
import * as sql from '../shared/sql'
import * as mapHelper from '../shared/helper'

import {
    BasePin,
    BasePinProp,
    Like
} from '../..';


// media
// favorites - will be converted to bool for client
// likes - will be converted to bool for client
const prop = BasePinProp.concat(
    [
        // 'userId', // not using defineProperty like Pin
    ]
);


export default class FullPin extends BasePin {

    constructor(pin, user) {
        super(pin, user, prop);
    }

    set(pin, user) {
        super.set(pin, user);

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
        const savePinPromise = sql.createPinMSSQL(this, this.userId)
            .then(() => {
                // check for duplicates //upsert
                const saveLikePromises = this.likes.map(l => {
                    return new Like({
                        utcCreatedDateTime: l.utcCreatedDateTime,
                        like: l.like,
                        user: l._user,
                        pin: this.pin
                    }).save();
                });
                const saveFavoritePromises = this.favorites.map(f => {
                    return new Favorite({
                        utcCreatedDateTime: f.utcCreatedDateTime,
                        user: f._user,
                        pin: this.pin
                    }).save();
                });
                return Promise.all([saveLikePromises, saveFavoritePromises]);
            });
        return savePinPromise;
    }

    static mapPinRowsToPin(pinRows) {
        let pin = new FullPin(pinRows[0]);
        pin.media = pin.mapPinMedia(pinRows);
        pin.favorites = pin.mapPinMedia(pinRows);
        pin.likes = pin.mapPinLikes(pinRows);
        return new FullPin(pin);
    }

    static mapPinMedia(pinRows) {
        return mapHelper.mapSubObjectFromQuery('Media', 'id', pinRows);
    }

    static mapPinFavorites(pinRows) {
        return mapHelper.mapSubObjectFromQuery('Favorites', 'userId', pinRows);
    }

    static mapPinLikes(pinRows) {
        return mapHelper.mapSubObjectFromQuery('Likes', 'userId', pinRows);
    }

}
