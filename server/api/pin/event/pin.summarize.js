/**
 * Generate the pin's longFormSummary from its source website after the
 * model changes, without blocking the create/update request.
 */

'use strict';

import PinEvents from './pin.events';
import { Pin } from '../../../model';
import { generateSummary } from '../../../summarize';
import * as log from '../../../util/log';

// Restrict model events to listen
const events = [
  'save',
  'update'
];

export function register() {
  for (const event of events) {
    PinEvents.on(event, listener);
  }
}

function listener(pin) {
  return generateSummary(pin)
    .then(longFormSummary => {
      if (!longFormSummary) return;
      return Pin.updateLongFormSummary(pin.id, longFormSummary);
    })
    .catch(err => {
      log.warn('pin.summarize err', log.stringify(err));
    });
}
