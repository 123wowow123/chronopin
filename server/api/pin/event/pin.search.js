/**
 * Update Seach document when the model changes
 */

'use strict';

import PinEvents from './pin.events';
import * as log from '../../../util/log';

// Restrict model events to listen
const events = [
  'favorite',
  'unfavorite',

  'like',
  'unlike',

  'save',
  'update',
  
  'remove'
];

export function register(controller) {
  // Bind model events to socket events
  for (const event of events) {
    const listener = createListener('search:' + event, controller);

    PinEvents.on(event, listener);
    // socket.on('disconnect', removeListener(event, listener));
  }
}

function createListener(event, controller) {
  return (doc, userId) => {
    log.info(event, log.stringify(doc));
    controller.emit(event, doc, userId);
  };
}

function removeListener(event, listener) {
  return () => {
    PinEvents.removeListener(event, listener);
  };
}
