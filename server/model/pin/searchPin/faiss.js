import fetch from 'node-fetch';
import * as config from '../../../config/environment';

export function faissRequest(method, path, body) {
    const options = { method };
    if (body !== undefined) {
        options.body = JSON.stringify(body);
        options.headers = { 'Content-Type': 'application/json' };
    }

    return fetch(`${config.faiss.serviceUrl}/faiss${path}`, options)
        .then(res => {
            if (!res.ok) {
                return res.text().then(text => {
                    throw new Error(`FAISS ${method} ${path} failed with ${res.status}: ${text}`);
                });
            }
            return res.json();
        });
}
