// A cookie gate in front of pin pages (2026-10-17). A swarm of ~500 addresses
// each fetched a pin or two, mostly with no Referer, and rendering them
// starved the 2-vCPU VM. A scraper that keeps no cookies now costs a cheap
// redirect instead of a page render; a browser follows it without noticing.
//
//   no cookie, no ?cg      -> 'issue': 307 to the same URL with ?cg=1, setting the cookie
//   ?cg and the cookie     -> 'strip': 307 to the URL without ?cg (so no shared link carries it)
//   ?cg and no cookie      -> 'blocked': a client that keeps no cookies is not looped
//   the cookie, no ?cg     -> 'pass'
//
// Named bots and signed-in users pass, and so does everything but pin pages
// and searches with a query (2026-10-22: a crawler walked ~2,600 distinct
// tag:/company: searches in 30 minutes, each a fresh tag-count query).
//
// The cookie's value is an id the server made, signed (gateId / gateIdOf), so
// each client has its own identity for the per-cookie pin budget
// (botLimit.pinRetryAfter) and a made-up cookie does not pass. The visitor
// cookie (vid, set by the first pin view) no longer passes on its own: a
// scraper could send any value; a real visitor only meets one extra redirect.
export const GATE_COOKIE = 'cg';
export const GATE_PARAM = 'cg';
export const GATE_MAX_AGE = 30 * 86_400;

async function hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(`cg:${secret}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
  return Array.from(sig.slice(0, 12), (b) => b.toString(16).padStart(2, '0')).join('');
}

// A new client id with its signature: "<24 hex>.<24 hex>".
export async function gateId(secret: string): Promise<string> {
  const id = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('');
  return `${id}.${await hmac(id, secret)}`;
}

// The id inside a gate cookie value, or null when the value is missing or not
// one this server signed.
export async function gateIdOf(value: string | undefined, secret: string): Promise<string | null> {
  const m = /^([0-9a-f]{24})\.([0-9a-f]{24})$/.exec(value ?? '');
  if (!m) return null;
  return (await hmac(m[1], secret)) === m[2] ? m[1] : null;
}

export type GateInput = {
  // The path without its language prefix.
  path: string;
  method: string;
  bot: boolean;
  signedIn: boolean;
  hasGateCookie: boolean;
  hasGateParam: boolean;
  // Whether the URL carries a search query (?q=): only those searches are gated.
  hasQuery?: boolean;
};

export type GateAction = 'pass' | 'issue' | 'strip' | 'blocked';

export function cookieGate(input: GateInput): GateAction {
  if (input.method !== 'GET' || input.bot || input.signedIn) return 'pass';
  const gated = /^\/pin\/\d+(?:\/|$)/.test(input.path) || (input.path === '/search' && input.hasQuery);
  if (!gated) return 'pass';
  if (input.hasGateCookie) return input.hasGateParam ? 'strip' : 'pass';
  return input.hasGateParam ? 'blocked' : 'issue';
}
