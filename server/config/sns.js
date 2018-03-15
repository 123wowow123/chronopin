/**
 * sns configuration
 */
'use strict';

// When disconnects.. perform this

Object.defineProperty(exports, "__esModule", {
    value: true
});

exports.default = function (sns) {
    // Call onConnect.
    onConnect(sns);
};

function onDisconnect(sns) {}

// When connects.. perform this
function onConnect(sns) {
    // Insert sns to below list
    require('../api/user/user.sns').register(sns);
}
//# sourceMappingURL=sns.js.map
