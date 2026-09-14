'use strict';

import * as response from '../response';

import {
  Company
} from '../../model';

/**
 * Every company, by name, with its logo - the pin form's suggestions
 * GET /api/companies
 */
export function index(req, res) {
  return Company.list()
    .then(response.withResult(res))
    .catch(response.handleError(res));
}
