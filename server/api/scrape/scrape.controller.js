/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/scrape/:id              ->  get web page content
 */

'use strict';

import _ from 'lodash';
import { scrape } from '../../scrape'

function respondWithResult(res, statusCode) {
  statusCode = statusCode || 200;
  return function(entity) {
    //console.log('respondWithResult:', entity);
    if (entity) {
      res.status(statusCode).json(entity);
    }
  };
}

function handleEntityNotFound(res) {
  return function(entity) {
    if (!entity) {
      res.status(404).end();
      return null;
    }
    return entity;
  };
}

function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function(err) {
    res.status(statusCode).send(err);
  };
}


// Scrape web page
export function getContent(req, res) {
  var pageUrl = req.query.url;
  return scrape(pageUrl)
    .then(respondWithResult(res, 200))
    .catch(handleError(res));
}
