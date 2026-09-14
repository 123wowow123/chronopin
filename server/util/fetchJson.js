import fetch from 'node-fetch';

// Rejects on a non-2xx status, as request-promise did, so callers' catch paths still fire.
export function fetchJson(url, { method = 'GET', body } = {}) {
    const options = { method };
    if (body !== undefined) {
        options.body = JSON.stringify(body);
        options.headers = { 'Content-Type': 'application/json' };
    }

    return fetch(url, options)
        .then(res => {
            if (!res.ok) {
                return res.text().then(text => {
                    throw new Error(`${method} ${url} failed with ${res.status}: ${text}`);
                });
            }
            return res.json();
        });
}
