/**
 * User model events
 */

'use strict';

import {
  EventEmitter
} from 'events';

import {
  UserEmitter
} from './user.controller';

var UserEvents = new EventEmitter();

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
  UserEmitter.on(e, emitEvent(event));
}

function emitEvent(event) {
  return function(doc, options, done) {
    //debugger;
    //crashes node with 2 consecutive emits: github.com/nodejs/node/issues/4261
    //PinEvents.emit(event + ':' + doc.id, doc);
    UserEvents.emit(event, doc);
    //done(null);
  }
}

export default UserEvents;
