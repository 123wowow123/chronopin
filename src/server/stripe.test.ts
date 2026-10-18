import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { formEncode, verifyStripeSignature } from './stripe';

const secret = 'whsec_test';
const body = '{"id":"evt_1"}';
const sign = (t: number, payload = body, key = secret) => `t=${t},v1=${createHmac('sha256', key).update(`${t}.${payload}`).digest('hex')}`;

describe('verifyStripeSignature', () => {
  it('accepts a signature made with the secret', () => {
    expect(verifyStripeSignature(body, sign(1000), secret, 1000)).toBe(true);
  });
  it('refuses a changed body, a wrong secret, a missing header and a stale timestamp', () => {
    expect(verifyStripeSignature(body + ' ', sign(1000), secret, 1000)).toBe(false);
    expect(verifyStripeSignature(body, sign(1000, body, 'whsec_other'), secret, 1000)).toBe(false);
    expect(verifyStripeSignature(body, null, secret, 1000)).toBe(false);
    expect(verifyStripeSignature(body, sign(1000), secret, 1000 + 301)).toBe(false);
    expect(verifyStripeSignature(body, sign(1000), '', 1000)).toBe(false);
  });
  it('accepts any of several v1 signatures', () => {
    expect(verifyStripeSignature(body, `${sign(1000, body, 'old')},${sign(1000).split(',')[1]}`, secret, 1000)).toBe(true);
  });
});

describe('formEncode', () => {
  it('writes nested objects and arrays in Stripe bracket syntax', () => {
    const text = formEncode({ mode: 'subscription', line_items: [{ quantity: 1, price_data: { currency: 'usd' } }], skip: undefined }).toString();
    expect(decodeURIComponent(text)).toBe('mode=subscription&line_items[0][quantity]=1&line_items[0][price_data][currency]=usd');
  });
});
