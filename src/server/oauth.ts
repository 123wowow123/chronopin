// Google, Facebook and Apple sign-in: the OAuth 2.0 authorization-code flow,
// with a random state in a short-lived cookie to tie the callback to the
// browser that started it. The callback paths are the ones passport used
// (/auth/<provider>/callback), so the apps registered with both of the older
// providers need no changes.
//
// Apple differs in three ways, and the shape below bends around them: its
// client secret is a JWT this server signs per sign-in, it posts the callback
// back instead of redirecting to it, and everything it knows about the person
// arrives in the id_token rather than from a userinfo endpoint.

import { randomBytes } from 'node:crypto';
import { createRemoteJWKSet, importPKCS8, type JWTPayload, jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { afterLoginPath } from '@/lib/authRedirect';
import { signToken, tokenCookie } from './auth';
import config from './config';
import { publicOrigin } from './http';
import User, { appleMapper, facebookMapper, googleMapper } from './model/user';
import log from './util/log';

export type Provider = 'google' | 'facebook' | 'apple';

const STATE_COOKIE = 'oauth_state';
// The @handle the sign-up page stored before sending the user to the provider.
const HANDLE_COOKIE = 'handle';
// The page the login page was asked to go back to (OAuthButtons).
const AFTER_LOGIN_COOKIE = 'after_login';
const APPLE_ISSUER = 'https://appleid.apple.com';

type ProviderConfig = {
  authorizeUrl: string;
  scope: string;
  clientID: string;
  callbackURL: string;
  callbackPath: string;
  // Apple posts the callback from appleid.apple.com rather than redirecting
  // the browser to it with the code in the query string - which asking for a
  // name or an email requires. A cross-site POST carries no SameSite=Lax
  // cookie, so the state and the handle have to travel as None instead.
  formPost?: boolean;
};

const PROVIDERS: Record<Provider, ProviderConfig> = {
  google: {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scope: 'openid email profile',
    clientID: config.google.clientID,
    callbackURL: config.google.callbackURL,
    callbackPath: '/auth/google/callback',
  },
  facebook: {
    authorizeUrl: 'https://www.facebook.com/dialog/oauth',
    scope: 'email,public_profile',
    clientID: config.facebook.clientID,
    callbackURL: config.facebook.callbackURL,
    callbackPath: '/auth/facebook/callback',
  },
  apple: {
    authorizeUrl: `${APPLE_ISSUER}/auth/authorize`,
    scope: 'name email',
    clientID: config.apple.clientID,
    callbackURL: config.apple.callbackURL,
    callbackPath: '/auth/apple/callback',
    formPost: true,
  },
};

const MAPPERS = { google: googleMapper, facebook: facebookMapper, apple: appleMapper };

// DOMAIN (production) or the host the request arrived on (local development).
// Apple registers only https URLs and rejects localhost outright, so its
// sign-in works against a real domain (or a tunnel) rather than `next dev`.
function callbackUrl(request: NextRequest, provider: Provider) {
  const { callbackURL, callbackPath } = PROVIDERS[provider];
  return /^https?:\/\//.test(callbackURL) ? callbackURL : publicOrigin(request) + callbackPath;
}

// Redirects to the provider's consent page.
export async function startSignIn(request: NextRequest, provider: Provider): Promise<Response> {
  const p = PROVIDERS[provider];
  const state = randomBytes(24).toString('base64url');
  (await cookies()).set({
    name: STATE_COOKIE,
    value: `${provider}:${state}`,
    httpOnly: true,
    sameSite: p.formPost ? 'none' : 'lax',
    secure: p.formPost || process.env.NODE_ENV === 'production',
    path: '/auth',
    maxAge: 600,
  });

  const url = new URL(p.authorizeUrl);
  url.searchParams.set('client_id', p.clientID);
  url.searchParams.set('redirect_uri', callbackUrl(request, provider));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', p.scope);
  url.searchParams.set('state', state);
  if (p.formPost) {
    url.searchParams.set('response_mode', 'form_post');
  }
  return Response.redirect(url, 302);
}

// Handles the provider's redirect back: checks state, trades the code for the
// profile, finds or creates the user, and signs them in.
export async function finishSignIn(request: NextRequest, provider: Provider): Promise<Response> {
  const origin = publicOrigin(request);
  // 303 after a posted callback, so the browser follows it with a GET.
  const status = request.method === 'POST' ? 303 : 302;
  const fail = (reason: string) => {
    log.warn(`${provider} sign-in failed:`, reason);
    return Response.redirect(`${origin}/signup`, status);
  };

  const jar = await cookies();
  const expected = jar.get(STATE_COOKIE)?.value;
  jar.delete({ name: STATE_COOKIE, path: '/auth' });
  // Checked again here: a cookie is as easy to write as a query string.
  const next = afterLoginPath(jar.get(AFTER_LOGIN_COOKIE)?.value);
  jar.delete({ name: AFTER_LOGIN_COOKIE, path: '/' });

  const params = await callbackParams(request);
  const code = params.get('code');
  if (!code || !expected || expected !== `${provider}:${params.get('state')}`) {
    return fail(params.get('error') || 'state mismatch or missing code');
  }

  try {
    const redirectUri = callbackUrl(request, provider);
    const profile = await fetchProfile(provider, code, redirectUri, params);
    const { user, created } = await findOrCreateUser(provider, profile, jar.get(HANDLE_COOKIE)?.value);
    jar.set(tokenCookie(await signToken(user.id, user.role)));
    return Response.redirect(`${origin}${signInLanding(next, created)}`, status);
  } catch (err) {
    return fail((err as Error).message);
  }
}

// Where a finished sign-in goes. None of the three providers share a birthday
// or a phone number, so a brand-new account passes through the questions the
// sign-up form would have asked, on the way to wherever it was headed;
// skipping them is a click. Only a first sign-in sees it - signing in again
// must never nag. next has already been through afterLoginPath, and the page
// puts it through again.
export function signInLanding(next: string, created: boolean): string {
  return created ? `/signup/details?redirect=${encodeURIComponent(next)}` : next;
}

// The code and state arrive in the query string, or - from Apple's form_post
// callback - in the posted form, where the name rides along with them.
async function callbackParams(request: NextRequest): Promise<URLSearchParams> {
  if (request.method !== 'POST') {
    return request.nextUrl.searchParams;
  }
  const params = new URLSearchParams();
  for (const [key, value] of await request.formData()) {
    if (typeof value === 'string') {
      params.append(key, value);
    }
  }
  return params;
}

// Profiles are normalised to the passport shape the mappers in
// model/user.ts read: { id, name: { givenName, familyName },
// emails: [{ value, verified }], photos: [{ value }], _json }.
type Profile = {
  id: string;
  name: { givenName?: string; familyName?: string };
  emails: { value?: string; verified?: boolean }[];
  photos: { value?: string }[];
  _json: Record<string, unknown>;
};

function fetchProfile(provider: Provider, code: string, redirectUri: string, params: URLSearchParams): Promise<Profile> {
  switch (provider) {
    case 'google':
      return googleProfile(code, redirectUri);
    case 'facebook':
      return facebookProfile(code, redirectUri);
    case 'apple':
      return appleProfile(code, redirectUri, params.get('user'));
  }
}

async function postForm(url: string, body: Record<string, string>) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams(body),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`token exchange failed: ${res.status} ${JSON.stringify(data.error ?? data)}`);
  }
  return data;
}

async function getJson(url: string, accessToken: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`profile request failed: ${res.status}`);
  }
  return data;
}

async function googleProfile(code: string, redirectUri: string): Promise<Profile> {
  const p = PROVIDERS.google;
  const token = await postForm('https://oauth2.googleapis.com/token', {
    code,
    client_id: p.clientID,
    client_secret: config.google.clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  const info = await getJson('https://openidconnect.googleapis.com/v1/userinfo', token.access_token);
  return {
    id: info.sub,
    name: { givenName: info.given_name, familyName: info.family_name },
    emails: [{ value: info.email, verified: info.email_verified }],
    photos: [{ value: info.picture }],
    _json: info,
  };
}

async function facebookProfile(code: string, redirectUri: string): Promise<Profile> {
  const p = PROVIDERS.facebook;
  const tokenUrl = new URL('https://graph.facebook.com/oauth/access_token');
  tokenUrl.searchParams.set('client_id', p.clientID);
  tokenUrl.searchParams.set('client_secret', config.facebook.clientSecret);
  tokenUrl.searchParams.set('redirect_uri', redirectUri);
  tokenUrl.searchParams.set('code', code);
  const tokenRes = await fetch(tokenUrl);
  const token = await tokenRes.json();
  if (!tokenRes.ok || token.error) {
    throw new Error(`token exchange failed: ${tokenRes.status}`);
  }
  const me = await getJson(
    'https://graph.facebook.com/me?fields=id,first_name,last_name,email,picture.type(large)',
    token.access_token,
  );
  return {
    id: me.id,
    name: { givenName: me.first_name, familyName: me.last_name },
    emails: me.email ? [{ value: me.email }] : [],
    photos: me.picture?.data?.url ? [{ value: me.picture.data.url }] : [],
    _json: me,
  };
}

// Apple's public signing keys, fetched once and cached by jose.
const appleKeys = createRemoteJWKSet(new URL(`${APPLE_ISSUER}/auth/keys`));

async function appleProfile(code: string, redirectUri: string, userField: string | null): Promise<Profile> {
  const token = await postForm(`${APPLE_ISSUER}/auth/token`, {
    code,
    client_id: config.apple.clientID,
    client_secret: await appleClientSecret(),
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  const { payload } = await jwtVerify(token.id_token, appleKeys, {
    issuer: APPLE_ISSUER,
    audience: config.apple.clientID,
  });
  return appleProfileFrom(payload, userField);
}

// Apple takes a signed assertion where the others take a static secret: an
// ES256 JWT for the Services ID, signed with the .p8 key from the developer
// account. It may last six months, but signing a short-lived one per sign-in
// means nothing reusable is ever stored or logged.
async function appleClientSecret(): Promise<string> {
  const { clientID, teamID, keyID, privateKey } = config.apple;
  if (!teamID || !keyID || !privateKey) {
    throw new Error('APPLE_TEAM_ID, APPLE_KEY_ID and APPLE_KEY must all be set');
  }
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyID })
    .setIssuer(teamID)
    .setIssuedAt()
    .setExpirationTime('10m')
    .setAudience(APPLE_ISSUER)
    .setSubject(clientID)
    .sign(await importPKCS8(privateKey, 'ES256'));
}

// Apple has no userinfo endpoint: the id_token carries everything except the
// name, which it posts beside the code on the very first authorisation and
// never sends again. A person who chose "Hide My Email" has a relay address
// here, which is stable and deliverable but is not the address they use
// elsewhere. There is never a picture.
export function appleProfileFrom(claims: JWTPayload, userField: string | null): Profile {
  let name: { firstName?: string; lastName?: string } = {};
  if (userField) {
    try {
      name = JSON.parse(userField)?.name ?? {};
    } catch {
      log.warn('apple sign-in: the posted user field was not JSON');
    }
  }
  const email = typeof claims.email === 'string' ? claims.email : undefined;
  return {
    id: String(claims.sub),
    name: { givenName: name.firstName, familyName: name.lastName },
    // email_verified comes back as a boolean from some Apple builds and the
    // string "true" from others.
    emails: email ? [{ value: email, verified: String(claims.email_verified) === 'true' }] : [],
    photos: [],
    _json: claims as Record<string, unknown>,
  };
}

// The existing user with the profile's email, with any empty fields filled
// from the profile; or a new user. `created` says which, for the caller that
// asks a new account for what the provider could not give it.
async function findOrCreateUser(
  provider: Provider,
  profile: Profile,
  handle: string | undefined,
): Promise<{ user: User; created: boolean }> {
  const email = profile.emails[0]?.value;
  if (!email) {
    throw new Error(`${provider} did not share an email address`);
  }

  // Apple's subject outlives the address it came with - a relay address is not
  // the one the account was opened with, and either can be edited on the
  // profile page later - so match on that first and fall back to the email.
  let existing: User | undefined;
  if (provider === 'apple') {
    ({ user: existing } = await User.getByAppleId(profile.id));
  }
  if (!existing) {
    ({ user: existing } = await User.getByEmail(email));
  }

  const { user, updatedFields } = MAPPERS[provider](existing, profile, handle);

  if (existing) {
    if (updatedFields.length) {
      log.info(`${provider} sign-in filled in:`, Object.keys(Object.assign({}, ...updatedFields)).join(', '));
      await user.patchWithoutPassword();
    }
    return { user, created: false };
  }

  user.role = 'user';
  user.provider = provider;
  await fillRequiredFields(user, email);
  await user.save();
  return { user, created: true };
}

// userName, firstName and lastName are NOT NULL, and a social profile need not
// carry any of them: the login page asks for no @handle, and Apple sends a
// name only on the first authorisation - and only if the person leaves it in.
// A new account gets a handle from the email address and blank names, which
// the profile page can fill in later.
async function fillRequiredFields(user: User, email: string) {
  user.firstName ??= '';
  user.lastName ??= '';
  if (!user.userName) {
    user.userName = await freeHandle(email);
  }
}

// @handle from the address, with a number appended until it is nobody else's.
async function freeHandle(email: string): Promise<string> {
  const base = email.split('@')[0].replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 30) || 'pinner';
  for (let suffix = 0; suffix < 20; suffix += 1) {
    const candidate = `@${base}${suffix || ''}`;
    const { user } = await User.getUserByUserName(candidate);
    if (!user) {
      return candidate;
    }
  }
  return `@${base}${randomBytes(4).toString('hex')}`;
}
