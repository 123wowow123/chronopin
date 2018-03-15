'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PinLikeEmitter = undefined;
exports.createPinLike = createPinLike;
exports.removePinLike = removePinLike;

var _response = require('../response');

var response = _interopRequireWildcard(_response);

var _model = require('../../model');

var _events = require('events');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var PinLikeEmitter = new _events.EventEmitter();

function createPinLike(req, res) {
  var user = req.user,
      pinId = +req.params.id,
      likeBody = typeof req.body.like === "boolean" ? req.body : {
    like: true
  },
      newLike = new _model.Like(likeBody, user, new _model.Pin({
    id: pinId
  }));

  console.log(likeBody);

  return newLike.save().then(function (_ref) {
    var like = _ref.like;

    return _model.Pin.queryById(pinId, user.id);
  }).then(function (_ref2) {
    var pin = _ref2.pin;

    var event = "afterLike";
    PinLikeEmitter.emit(event, pin);
    return pin;
  }).then(response.withResult(res, 201)).catch(response.handleError(res));
}

// mark as removed only
function removePinLike(req, res) {
  var user = req.user,
      pinId = +req.params.id,
      likeBody = req.body,
      newLike = new _model.Like(likeBody, user, new _model.Pin({
    id: pinId
  }));

  return newLike.deleteByPinId().then(function (_ref3) {
    var like = _ref3.like;

    return _model.Pin.queryById(pinId, user.id);
  }).then(function (_ref4) {
    var pin = _ref4.pin;

    var event = "afterUnlike";
    PinLikeEmitter.emit(event, pin);
    return pin;
  }).then(response.withResult(res, 201)).catch(response.handleError(res));
}

exports.PinLikeEmitter = PinLikeEmitter;
//# sourceMappingURL=pin.like.controller.js.map
