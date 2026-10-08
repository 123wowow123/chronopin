// Session management over the authenticated API, on localhost or production.
import '../env';
import { parseArgs } from 'node:util';
import { readFile } from 'node:fs/promises';

const { values, positionals } = parseArgs({ allowPositionals: true, options: {
  url: { type: 'string', default: 'http://localhost:3000' },
  region: { type: 'string' }, id: { type: 'string' }, file: { type: 'string' }, revision: { type: 'string' },
} });
const [command = 'list'] = positionals;
const token = process.env.CHRONOPIN_ADMIN_TOKEN;
if (!token) throw new Error('Set CHRONOPIN_ADMIN_TOKEN to an existing admin bearer token');
const origin = new URL(values.url!);
if (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname))) throw new Error('Use HTTPS for remote management');
if (origin.username || origin.password) throw new Error('Credentials belong in CHRONOPIN_ADMIN_TOKEN');
const id = values.id;
if (['list', 'create'].includes(command) && id) throw new Error(`${command} does not accept --id`);
if (command !== 'list' && command !== 'create' && (!id || !/^[1-9]\d*$/.test(id))) throw new Error('Pass --id <venue id>');
let method = 'GET'; let body: unknown;
const endpoint = `/api/admin/restaurant-specials${id ? `/${id}` : ''}`;
const endpointUrl = new URL(endpoint, origin);
if (values.region) endpointUrl.searchParams.set('region', values.region);
if (command === 'create' || command === 'update') {
  if (!values.file) throw new Error('Pass --file <JSON payload>');
  body = JSON.parse(await readFile(values.file, 'utf8'));
  method = command === 'create' ? 'POST' : 'PUT';
} else if (['disable', 'enable'].includes(command)) {
  if (!values.revision || !/^[1-9]\d*$/.test(values.revision) || !Number.isSafeInteger(Number(values.revision))) throw new Error('Pass --revision <current revision>');
  method = 'PATCH'; body = { enabled: command === 'enable', revision: Number(values.revision) };
} else if (!['list', 'get'].includes(command)) throw new Error('Use list, get, create, update, disable, or enable');
const response = await fetch(endpointUrl, { method, redirect: 'error', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
if (!response.ok) throw new Error(`Management API ${response.status}: ${await response.text()}`);
console.log(JSON.stringify(await response.json(), null, 2));
