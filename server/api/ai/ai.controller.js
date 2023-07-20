'use strict';

import * as _ from 'lodash';
import * as response from '../response';
import {
    AI,
    Pin
} from '../../model';

export function sentiment(req, res) {
    let user = req.user,
        // userId = +req.user.id,
        pin = new Pin(req.body);

    return AI.getSentiment(pin)
        .then(response.withResult(res))
        .catch(response.handleError(res));
}