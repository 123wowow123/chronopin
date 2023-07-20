'use strict';

import * as _ from 'lodash';
import * as sql from '../shared/sql'
import * as mapHelper from '../shared/helper'

import {
    BasePin,
    BasePinProp,
    Like,
    Favorite,
    Medium,
    Merchant,
    Location,
    Mention,
    AI
} from '../..';


// media
// merchants
// locations
// favorites - will be converted to bool for client
// likes - will be converted to bool for client
const prop = BasePinProp;

// Used in loading scripts but not in site
export default class FullPin extends BasePin {

    constructor(pin, user) {
        super(pin, user, prop);
    }

    set(pin, user) {
        super.set(pin, user);

        if (pin) {
            this.favorites = _.get(pin, 'favorites', []).map(f => {
                return new Favorite(f, null, this);
            });

            this.likes = _.get(pin, 'likes', []).map(l => {
                return new Like(l, null, this);
            });

        } else {
            throw "FullPin cannot set value of arg";
        }
        return this;
    }

    save() {
        // return AI.getSentiment(this)
        //     .then((res) => {
        //         const score = res.score;
        //         this.setSentimentScore(score);
        //     })
        //     .catch((e)=>{
        //         console.log(e)
        //     })
        //     .finally(() => {
        const savePinPromise = sql.createPinMSSQL(this, this.userId)
            .then(() => {
                // check for duplicates //upsert
                const saveLikePromises = this.likes.map(l => {
                    return new Like({
                        utcCreatedDateTime: l.utcCreatedDateTime,
                        utcUpdatedDateTime: l.utcUpdatedDateTime,
                        like: l.like,
                        userId: l.userId
                    }, null, this).save();
                });
                const saveFavoritePromises = this.favorites.map(f => {
                    return new Favorite({
                        utcCreatedDateTime: f.utcCreatedDateTime,
                        utcUpdatedDateTime: f.utcUpdatedDateTime,
                        userId: f.userId
                    }, null, this).save();
                });
                const saveMediumPromises = this.media.map(m => {
                    return new Medium(m, this).save();
                });
                const saveMerchantsPromises = this.merchants.map((m, i) => {
                    return new Merchant(m, this).save();
                });
                const saveLocationsPromises = this.locations.filter(m => m.address).map((m, i) => {
                    return new Location(m, this).save();
                });
                const saveMentionsPromises = this.mentions.map(m => {
                    return new Mention(m, this).save();
                });

                return Promise.all([
                    ...saveLikePromises,
                    ...saveFavoritePromises,
                    ...saveMediumPromises,
                    ...saveMerchantsPromises,
                    ...saveLocationsPromises,
                    ...saveMentionsPromises,
                ]);
            });
        return savePinPromise;
        // })
    }

    static mapPinRowsToPin(pinRows) {
        let pin = new FullPin(pinRows[0]);
        pin.media = _mapPinRowsToMedia(pinRows);
        pin.favorites = _mapPinRowsToFavorites(pinRows);
        pin.likes = _mapPinRowsToLikes(pinRows);
        pin.merchants = _mapPinRowsToMerchants(pinRows);
        pin.locations = _mapPinRowsToLocations(pinRows);
        pin.mentions = _mapPinRowsToMentions(pinRows);
        return new FullPin(pin);
    }
}



function _mapPinRowsToMedia(pinRows) {
    return mapHelper.mapSubObjectFromQuery('Media', 'id', pinRows);
}

function _mapPinRowsToFavorites(pinRows) {
    return mapHelper.mapSubObjectFromQuery('Favorites', 'userId', pinRows);
}

function _mapPinRowsToLikes(pinRows) {
    return mapHelper.mapSubObjectFromQuery('Likes', 'userId', pinRows);
}

function _mapPinRowsToMerchants(pinRows) {
    return mapHelper.mapSubObjectFromQuery('Merchant', 'id', pinRows);
}

function _mapPinRowsToLocations(pinRows) {
    return mapHelper.mapSubObjectFromQuery('Location', 'id', pinRows);
}

function _mapPinRowsToMentions(pinRows) {
    return mapHelper.mapSubObjectFromQuery('Mention', 'tag', pinRows);
}