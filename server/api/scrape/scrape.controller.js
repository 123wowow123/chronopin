/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/scrape/:id              ->  get web page content
 */

'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getContent = getContent;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _scrape = require('../../scrape');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function respondWithResult(res, statusCode) {
  statusCode = statusCode || 200;
  return function (entity) {
    //console.log('respondWithResult:', entity);
    if (entity) {
      res.status(statusCode).json(entity);
    }
  };
}

function handleEntityNotFound(res) {
  return function (entity) {
    if (!entity) {
      res.status(404).end();
      return null;
    }
    return entity;
  };
}

function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function (err) {
    res.status(statusCode).send(err);
  };
}

// Scrape web page
function getContent(req, res) {
  var pageUrl = req.query.url;
  return (0, _scrape.scrape)(pageUrl).then(respondWithResult(res, 200)).catch(handleError(res));
}
//# sourceMappingURL=scrape.controller.js.map
