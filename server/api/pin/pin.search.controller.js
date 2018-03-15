'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.searchPin = searchPin;

var _response = require('../response');

var response = _interopRequireWildcard(_response);

var _model = require('../../model');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function searchPin(req, res) {
  var user = req.user,
      pinId = +req.params.id,
      searchText = req.query.q,
      hasFavorite = !!req.query.hasFavorite;

  //console.log('searchPin:', searchText);
  if (hasFavorite) {
    userId = +user.id;
    return _model.Pins.querySearchFilterByHasFavorite(searchText, userId).then(response.withResult(res, 200)).catch(response.handleError(res));
  } else {
    return _model.Pins.querySearch(searchText).then(response.withResult(res, 200)).catch(response.handleError(res));
  }
}
//# sourceMappingURL=pin.search.controller.js.map
