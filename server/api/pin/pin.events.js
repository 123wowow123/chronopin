/**
 * Pin model events
 */

'use strict';

import {
  EventEmitter
} from 'events';

import {
  PinEmitter,
  PinFavoriteEmitter,
  PinLikeEmitter
} from './pin.controller';

var PinEvents = new EventEmitter();

// Set max event listeners (0 == unlimited)
PinEvents.setMaxListeners(0);

// Model events
var events = {
  'afterFavorite': 'save',
  'afterLike': 'save',
  'afterCreate': 'save',
  'afterUpdate': 'save',
  'afterDestroy': 'remove'
};

// Register the event emitter to the model events
for (var e in events) {
  var event = events[e];
  PinEmitter.on(e, emitEvent(event));
  PinFavoriteEmitter.on(e, emitEvent(event));
  PinLikeEmitter.on(e, emitEvent(event));
  //Pin.hook(e, emitEvent(event));
}

function emitEvent(event) {
  return function(doc, options, done) {
    //crashes node with 2 consecutive emits: github.com/nodejs/node/issues/4261
    //PinEvents.emit(event + ':' + doc.id, doc);
    PinEvents.emit(event, doc);
    //done(null);
  }
}

export default PinEvents;
