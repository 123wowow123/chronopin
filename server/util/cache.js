let cache = {};
export function getWithExpiry(key) {
    const item = cache[key]
    // if the item doesn't exist, return null
    if (!item) {
        return undefined
    }
    const now = new Date()
    // compare the expiry time of the item with the current time
    if (now.getTime() > item.expiry) {
        // If the item is expired, delete the item from storage
        // and return null
        cache[key] = undefined;
        return undefined
    }
    return item.value;
}

// TTL value in milliseconds default 1h
export function setWithExpiry(key, value, ttl = 3600000) {
    const now = new Date()

    // `item` is an object which contains the original value
    // as well as the time when it's supposed to expire
    const item = {
        value: value,
        expiry: now.getTime() + ttl,
    }
    cache[key] = item;
    return item.value;
}

export function clearKey(key) {
    cache[key] = undefined;
}

export const key = {
    mainPinData: 'mainPinData'
}