/**
 * Broadcast updates to client when the model changes
 */

'use strict';

import PinEvents from './pin.events';
import * as log from '../../util/log';

// Model events to emit
const events = [
  'favorite',
  'unfavorite',

  'like',
  'unlike',

  'save',
  'update',
  'remove'
];

export function register(socket) {
  // Bind model events to socket events
  for (const event of events) {
    const listener = createListener('pin:' + event, socket);

    PinEvents.on(event, listener);
    socket.on('disconnect', removeListener(event, listener));
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
    PinEvents.removeListener(event, listener);
  };
}
