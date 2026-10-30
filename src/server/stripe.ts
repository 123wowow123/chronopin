// Stripe's HTTP API for the ad-free plan (https://docs.stripe.com/api).
// No SDK, like src/server/email.ts: a form-encoded POST each way, and the
// webhook signature is an HMAC checked here. Without STRIPE_SECRET_KEY nothing
// is sent and `stripeConfigured()` is false, so the plan is simply not offered.

import { createHmac, timingSafeEqual } from 'node:crypto';
import config from './config';
import { HttpError } from './util/httpError';
import log from './util/log';

const API = 'https://api.stripe.com/v1';
const TIMEOUT_MS = 15000;
// Stripe's own default: a signature older than this is a replay.
const TOLERANCE_SECONDS = 300;

export const AD_FREE_PRICE_CENTS = 300;
export const PREMIUM_PRICE_CENTS = 2000;
// Ad-free + Premium together: $2 under the two bought separately ($3 + $20).
export const BUNDLE_PRICE_CENTS = 2100;

// Chinese users can pay the same plans in yuan, a fixed price each (about the
// dollar price, rounded) so nobody is billed a moving exchange rate. Amounts are
// in fen. Stripe takes cards in CNY. WeChat Pay was approved on 2026-10-30 (the
// first review was denied on 2026-10-29), but it cannot fund a subscription, so
// the recurring plans below stay card-only.
export type CheckoutCurrency = 'usd' | 'cny';
export const CHECKOUT_PRICES: Record<CheckoutCurrency, { adFree: number; premium: number; bundle: number }> = {
  usd: { adFree: AD_FREE_PRICE_CENTS, premium: PREMIUM_PRICE_CENTS, bundle: BUNDLE_PRICE_CENTS },
  cny: { adFree: 2100, premium: 14000, bundle: 14700 },
};

// Any other dollar price in yuan: the plans above are all seven yuan to the
// dollar (300 -> 2100, 2000 -> 14000), so heavy-user and ad prices follow it.
export const cnyFen = (usdCents: number) => usdCents * 7;

export async function checkoutCurrency(request: Request): Promise<CheckoutCurrency> {
  return (await checkoutChoice(request)).currency;
}

// What the buyer picked: the currency, and whether to pay one month with
// WeChat Pay (always yuan, never renewing) instead of subscribing.
export async function checkoutChoice(request: Request): Promise<{ currency: CheckoutCurrency; wechat: boolean }> {
  const body = await request.json().catch(() => null);
  const wechat = body?.method === 'wechat';
  return { currency: wechat || body?.currency === 'cny' ? 'cny' : 'usd', wechat };
}

export function stripeConfigured(): boolean {
  return !!config.stripe.secretKey;
}

// Stripe's bracket syntax for nested form fields: { a: { b: 1 } } -> a[b]=1.
export function formEncode(value: Record<string, unknown>, prefix = '', out: URLSearchParams = new URLSearchParams()): URLSearchParams {
  for (const [key, entry] of Object.entries(value)) {
    if (entry === undefined || entry === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (typeof entry === 'object') formEncode(entry as Record<string, unknown>, name, out);
    else out.append(name, String(entry));
  }
  return out;
}

export async function stripeRequest<T = Record<string, any>>(method: 'GET' | 'POST' | 'DELETE', path: string, body?: Record<string, unknown>): Promise<T> {
  const { secretKey } = config.stripe;
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not set');
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers: { Authorization: `Bearer ${secretKey}`, ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
      body: body ? formEncode(body).toString() : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    log.error(`Stripe ${method} ${path} unreachable:`, (err as Error).message);
    throw new HttpError(503, 'Payments are temporarily unavailable. Please try again shortly.');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // The detail is for the log; the person just sees that payments are down.
    log.error(`Stripe refused ${method} ${path} (${res.status}): ${String(data?.error?.message ?? '').slice(0, 300)}`);
    throw new HttpError(res.status >= 500 || res.status === 429 ? 503 : 502, 'Payments are temporarily unavailable. Please try again shortly.');
  }
  return data as T;
}

// The Stripe-Signature header is "t=<unix>,v1=<hmac>[,v1=...]", the HMAC being
// SHA-256 over "<t>.<raw body>" keyed with the endpoint's whsec_ secret.
export function verifyStripeSignature(rawBody: string, header: string | null, secret: string, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  if (!header || !secret) return false;
  const parts = header.split(',').map((part) => part.trim().split('='));
  const timestamp = parts.find(([key]) => key === 't')?.[1];
  const signatures = parts.filter(([key]) => key === 'v1').map(([, value]) => value);
  if (!timestamp || !signatures.length || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > TOLERANCE_SECONDS) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest();
  return signatures.some((signature) => {
    const given = Buffer.from(signature, 'hex');
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
