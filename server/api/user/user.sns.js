/**
 * Broadcast updates to SNS when the model changes
 */

'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.register = register;

var _user = require('./user.events');

var _user2 = _interopRequireDefault(_user);

var _environment = require('../../config/environment');

var _environment2 = _interopRequireDefault(_environment);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Model events to emit
var events = [{
  name: 'save',
  arn: _environment2.default.aws.sns.adminNewUserTopicArn,
  transform: function transform(data) {
    data.to = _environment2.default.admin.notification.email;
    return data;
  }
}];

function register(sns) {
  // Bind model events to SNS publish
  for (var i = 0, eventsLength = events.length; i < eventsLength; i++) {
    var event = events[i];
    var listener = createListener(event.arn, sns, event.transform);

    _user2.default.on(event.name, listener);
  }
}

function createListener(arn, sns, transform) {
  return function (data) {
    if (typeof transform === 'function') {
      sns.publish(arn, transform(data));
    } else {
      sns.publish(arn, data);
    }
  };
}

function removeListener(event, listener) {
  return function () {
    _user2.default.removeListener(event, listener);
  };
}
//# sourceMappingURL=user.sns.js.map
