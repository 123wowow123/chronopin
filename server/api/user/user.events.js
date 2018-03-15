/**
 * User model events
 */

'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _events = require('events');

var _user = require('./user.controller');

var UserEvents = new _events.EventEmitter();

// Set max event listeners (0 == unlimited)
UserEvents.setMaxListeners(0);

// Model events
var events = {
  'afterCreate': 'save',
  'afterUpdate': 'save',
  'afterDestroy': 'remove'
};

// Register the event emitter to the model events
for (var e in events) {
  var event = events[e];
  _user.UserEmitter.on(e, emitEvent(event));
}

function emitEvent(event) {
  return function (doc, options, done) {
    //debugger;
    //crashes node with 2 consecutive emits: github.com/nodejs/node/issues/4261
    //PinEvents.emit(event + ':' + doc.id, doc);
    UserEvents.emit(event, doc);
    //done(null);
  };
}

exports.default = UserEvents;
//# sourceMappingURL=user.events.js.map
