/**
 * Broadcast updates to client when the model changes
 */

'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

exports.register = register;

var _pin = require('./pin.events');

var _pin2 = _interopRequireDefault(_pin);

var _log = require('../../log');

var log = _interopRequireWildcard(_log);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Model events to emit
var events = ['favorite', 'unfavorite', 'like', 'unlike', 'save', 'update', 'remove'];

function register(socket) {
  // Bind model events to socket events
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = (0, _getIterator3.default)(events), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var event = _step.value;

      var listener = createListener('pin:' + event, socket);

      _pin2.default.on(event, listener);
      socket.on('disconnect', removeListener(event, listener));
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }
}

function createListener(event, socket) {
  return function (doc) {
    log.info(event, log.stringify(doc));
    socket.emit(event, doc);
  };
}

function removeListener(event, listener) {
  return function () {
    _pin2.default.removeListener(event, listener);
  };
}
//# sourceMappingURL=pin.socket.js.map
