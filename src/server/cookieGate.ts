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
// Named bots, signed-in users and visitors who already hold the visitor cookie
// (set by the first pin view) pass, and so does everything but pin pages.
export const GATE_COOKIE = 'cg';
export const GATE_PARAM = 'cg';
export const GATE_MAX_AGE = 30 * 86_400;

export type GateInput = {
  // The path without its language prefix.
  path: string;
  method: string;
  bot: boolean;
  signedIn: boolean;
  hasVisitorCookie: boolean;
  hasGateCookie: boolean;
  hasGateParam: boolean;
};

export type GateAction = 'pass' | 'issue' | 'strip' | 'blocked';

export function cookieGate(input: GateInput): GateAction {
  if (input.method !== 'GET' || input.bot || input.signedIn || input.hasVisitorCookie) return 'pass';
  if (!/^\/pin\/\d+(?:\/|$)/.test(input.path)) return 'pass';
  if (input.hasGateCookie) return input.hasGateParam ? 'strip' : 'pass';
  return input.hasGateParam ? 'blocked' : 'issue';
}
