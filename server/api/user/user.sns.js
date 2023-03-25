/**
 * Broadcast updates to SNS when the model changes
 */

'use strict';

import UserEvents from './user.events';
import config from '../../config/environment';

// Model events to emit
let events = [{
  name: 'save',
  arn: config.aws.sns.adminNewUserTopicArn,
  transform: (data) => {
    data.to = config.admin.notification.email;
    return data;
  }
}];

export function register(sns) {
  // Bind model events to SNS publish
  for (let i = 0, eventsLength = events.length; i < eventsLength; i++) {
    let event = events[i];
    // let listener = createListener(event.arn, sns, event.transform);

    // UserEvents.on(event.name, listener);
  }
}


function createListener(arn, sns, transform) {
  return (data) => {
    if (typeof transform === 'function') {
      sns.publish(arn, transform(data));
    }
    else {
      sns.publish(arn, data);
    }
  };
}

function removeListener(event, listener) {
  return () => {
    UserEvents.removeListener(event, listener);
  };
}
