/**
 * search configuration
 */
'use strict';

// When disconnects.. perform this
function onDisconnect(search) { }

// When connects.. perform this
function onConnect(search) {
    // Insert search event emimer to below list
    require('../api/pin/event/pin.search').register(search);
}

export default function (search) {
    // Call onConnect.
    onConnect(search);
}

