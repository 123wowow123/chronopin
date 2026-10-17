import { describe, expect, it } from 'vitest';
import { cookieGate, type GateInput } from './cookieGate';

const base: GateInput = { path: '/pin/12/some-title', method: 'GET', bot: false, signedIn: false, hasVisitorCookie: false, hasGateCookie: false, hasGateParam: false };

describe('cookieGate', () => {
  it('issues a cookie to a first visit and strips the marker when it returns', () => {
    expect(cookieGate(base)).toBe('issue');
    expect(cookieGate({ ...base, hasGateCookie: true, hasGateParam: true })).toBe('strip');
    expect(cookieGate({ ...base, hasGateCookie: true })).toBe('pass');
  });
  it('does not loop a client that keeps no cookies', () => {
    expect(cookieGate({ ...base, hasGateParam: true })).toBe('blocked');
  });
  it('lets through bots, signed-in users, known visitors, other pages and other methods', () => {
    expect(cookieGate({ ...base, bot: true })).toBe('pass');
    expect(cookieGate({ ...base, signedIn: true })).toBe('pass');
    expect(cookieGate({ ...base, hasVisitorCookie: true })).toBe('pass');
    expect(cookieGate({ ...base, path: '/map' })).toBe('pass');
    expect(cookieGate({ ...base, path: '/pin/12' })).toBe('issue');
    expect(cookieGate({ ...base, method: 'POST' })).toBe('pass');
  });
});
