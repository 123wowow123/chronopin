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
} from './../pin.controller';

const PinEvents = new EventEmitter();

// Set max event listeners (0 == unlimited)
PinEvents.setMaxListeners(0);

// Restrict model events to listen
const events = {
  'afterFavorite': 'favorite',
  'afterUnfavorite': 'unfavorite',

  'afterLike': 'like',
  'afterUnlike': 'unlike',

  'afterCreate': 'save',
  'afterUpdate': 'update',
  'afterDestroy': 'remove'
};

// Register the event emitter to the model events
for (const [k, v] of Object.entries(events)) {
  PinEmitter.on(k, emitEvent(v));
  PinFavoriteEmitter.on(k, emitEvent(v));
  PinLikeEmitter.on(k, emitEvent(v));
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
