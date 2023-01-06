import config from '../../config/environment';
import moment from 'moment';
import * as _ from 'lodash';
import * as response from '../response';
import * as mssql from 'mssql';

// import * as initData from '../../../scripts/data';
// import * as initDB from '../../../scripts/db';

import {
  DateTimes
} from '../../model';

const pageSize = config.pagination.pageSize || 25;

export function getDateTimes(startDateTime, endDateTime) {
  return DateTimes.queryByStartEndDate(startDateTime, endDateTime);
}

// Gets a list of DateTime
export function index(req, res) {
  // need to cast req.query.last_pin_id to int
  let start = req.query.start,
    end = req.query.end,
    startDateTime = new Date(start),
    endDateTime = new Date(end);

  return getDateTimes(startDateTime, endDateTime)
    .then(response.withResult(res))
    .catch(response.handleError(res));
}