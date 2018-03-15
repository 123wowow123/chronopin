'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PinFavoriteEmitter = undefined;
exports.createPinFavorite = createPinFavorite;
exports.removePinFavorite = removePinFavorite;

var _response = require('../response');

var response = _interopRequireWildcard(_response);

var _model = require('../../model');

var _events = require('events');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var PinFavoriteEmitter = new _events.EventEmitter();

function createPinFavorite(req, res) {

  var user = req.user,
      pinId = +req.params.id,
      favoriteBody = req.body,
      newFavorite = new _model.Favorite(favoriteBody, user, new _model.Pin({
    id: pinId
  }));

  return newFavorite.save().then(function (_ref) {
    var favorite = _ref.favorite;

    return _model.Pin.queryById(pinId, user.id);
  }).then(function (_ref2) {
    var pin = _ref2.pin;

    var event = "afterFavorite";
    PinFavoriteEmitter.emit(event, pin);
    return pin;
  }).then(response.withResult(res, 201)).catch(response.handleError(res));
}

// mark as removed only
function removePinFavorite(req, res) {

  var user = req.user,
      pinId = +req.params.id,
      favoriteBody = req.body,
      newFavorite = new _model.Favorite(favoriteBody, user, new _model.Pin({
    id: pinId
  }));

  return newFavorite.deleteByPinId().then(function (_ref3) {
    var favorite = _ref3.favorite;

    return _model.Pin.queryById(pinId, user.id);
  }).then(function (_ref4) {
    var pin = _ref4.pin;

    var event = "afterUnfavorite";
    PinFavoriteEmitter.emit(event, pin);
    return pin;
  }).then(response.withResult(res, 201)).catch(response.handleError(res));
}

exports.PinFavoriteEmitter = PinFavoriteEmitter;
//# sourceMappingURL=pin.favorite.controller.js.map
