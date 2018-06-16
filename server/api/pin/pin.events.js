/**
 * Pin model events
 */

'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _events = require('events');

var _pin = require('./pin.controller');

var PinEvents = new _events.EventEmitter();

// Set max event listeners (0 == unlimited)
PinEvents.setMaxListeners(0);

// Model events
var events = {
  'afterFavorite': 'favorite',
  'afterUnfavorite': 'unfavorite',

  'afterLike': 'like',
  'afterUnlike': 'unlike',

  'afterCreate': 'save',
  'afterUpdate': 'update',
  'afterDestroy': 'remove'
};

// Register the event emitter to the model events
for (var e in events) {
  var event = events[e];
  _pin.PinEmitter.on(e, emitEvent(event));
  _pin.PinFavoriteEmitter.on(e, emitEvent(event));
  _pin.PinLikeEmitter.on(e, emitEvent(event));
  //Pin.hook(e, emitEvent(event));
}

function emitEvent(event) {
  return function (doc, options, done) {
    //crashes node with 2 consecutive emits: github.com/nodejs/node/issues/4261
    //PinEvents.emit(event + ':' + doc.id, doc);
    PinEvents.emit(event, doc);
    //done(null);
  };
}

exports.default = PinEvents;
//# sourceMappingURL=pin.events.js.map
