'use strict';

import * as _ from 'lodash';
import * as response from '../response';
import {
    Mention
} from '../../model';

export function autocomplete(req, res) {
    let tagString = req.query.q;

    return Mention.autocomplete(tagString)
        .then(response.withResult(res))
        .catch(response.handleError(res));
}