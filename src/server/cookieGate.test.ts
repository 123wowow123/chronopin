import { describe, expect, it } from 'vitest';
import { cookieGate, gateId, gateIdOf, type GateInput } from './cookieGate';

const base: GateInput = { path: '/pin/12/some-title', method: 'GET', bot: false, signedIn: false, hasGateCookie: false, hasGateParam: false };

describe('cookieGate', () => {
  it('issues a cookie to a first visit and strips the marker when it returns', () => {
    expect(cookieGate(base)).toBe('issue');
    expect(cookieGate({ ...base, hasGateCookie: true, hasGateParam: true })).toBe('strip');
    expect(cookieGate({ ...base, hasGateCookie: true })).toBe('pass');
  });
  it('does not loop a client that keeps no cookies', () => {
    expect(cookieGate({ ...base, hasGateParam: true })).toBe('blocked');
  });
  it('lets through bots, signed-in users, other pages and other methods', () => {
    expect(cookieGate({ ...base, bot: true })).toBe('pass');
    expect(cookieGate({ ...base, signedIn: true })).toBe('pass');
    expect(cookieGate({ ...base, path: '/map' })).toBe('pass');
    expect(cookieGate({ ...base, path: '/pin/12' })).toBe('issue');
    expect(cookieGate({ ...base, method: 'POST' })).toBe('pass');
  });
});

describe('gate ids', () => {
  it('verifies an id this server signed and nothing else', async () => {
    const value = await gateId('s3cret');
    const id = await gateIdOf(value, 's3cret');
    expect(id).toMatch(/^[0-9a-f]{24}$/);
    expect(value.startsWith(id!)).toBe(true);
    expect(await gateIdOf(value, 'other')).toBeNull();
    expect(await gateIdOf('1', 's3cret')).toBeNull();
    expect(await gateIdOf(undefined, 's3cret')).toBeNull();
    expect(await gateIdOf(`${id}.${'0'.repeat(24)}`, 's3cret')).toBeNull();
  });
  it('makes a new id each time', async () => {
    expect(await gateId('s')).not.toBe(await gateId('s'));
  });
});
