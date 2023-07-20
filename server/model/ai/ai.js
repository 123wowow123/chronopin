'use strict';

import * as _ from 'lodash';
const rp = require('request-promise');
import * as config from '../../config/environment';


const serviceUrl = config.faiss.serviceUrl;
const faissUri = `${serviceUrl}`

export default class AI {

    static getSentiment(pin) {
        return _getSentiment(pin);
    }
}

/* Favorites Update */

function _getSentiment(pin) {
    // Create Pins
    const uri = faissUri + "/sentiment"
    const options = {
        method: 'POST',
        uri,
        json: true, // Automatically stringifies the body to JSON
    };

    //debugger
    const req = Object.assign({}, options, {
        body: {
            title: pin.title,
            description: pin.description,
            media: pin.media
        }
    });
    return rp(req);
};