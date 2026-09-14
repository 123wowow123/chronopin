import { fetchJson } from '../../../util/fetchJson';
import * as config from '../../../config/environment';

export function faissRequest(method, path, body) {
    return fetchJson(`${config.faiss.serviceUrl}/faiss${path}`, { method, body });
}
