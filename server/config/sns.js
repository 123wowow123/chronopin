/**
 * sns configuration
 */
'use strict';

// When disconnects.. perform this
function onDisconnect(sns) { }

// When connects.. perform this
function onConnect(sns) {
    // Insert sns to below list
    require('../api/user/user.sns').register(sns);
}

export default function (sns) {
    // Call onConnect.
    onConnect(sns);
}

