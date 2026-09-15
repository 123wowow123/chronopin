// Google and Facebook sign-in: the OAuth 2.0 authorization-code flow, with a
// random state in a short-lived cookie to tie the callback to the browser
// that started it. The callback paths are the ones passport used
// (/auth/<provider>/callback), so the apps registered with both providers
// need no changes.

import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { signToken, tokenCookie } from './auth';
import config from './config';
import { publicOrigin } from './http';
import User, { facebookMapper, googleMapper } from './model/user';
import log from './util/log';

export type Provider = 'google' | 'facebook';

const STATE_COOKIE = 'oauth_state';
// The @handle the sign-up page stored before sending the user to the provider.
const HANDLE_COOKIE = 'handle';

type ProviderConfig = {
  authorizeUrl: string;
  scope: string;
  clientID: string;
  clientSecret: string;
  callbackPath: string;
};

const PROVIDERS: Record<Provider, ProviderConfig> = {
  google: {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scope: 'openid email profile',
    clientID: config.google.clientID,
    clientSecret: config.google.clientSecret,
    callbackPath: '/auth/google/callback',
  },
  facebook: {
    authorizeUrl: 'https://www.facebook.com/dialog/oauth',
    scope: 'email,public_profile',
    clientID: config.facebook.clientID,
    clientSecret: config.facebook.clientSecret,
    callbackPath: '/auth/facebook/callback',
  },
};

// DOMAIN (production) or the host the request arrived on (local development).
function callbackUrl(request: NextRequest, provider: Provider) {
  const configured = provider === 'google' ? config.google.callbackURL : config.facebook.callbackURL;
  return /^https?:\/\//.test(configured) ? configured : publicOrigin(request) + PROVIDERS[provider].callbackPath;
}

// Redirects to the provider's consent page.
export async function startSignIn(request: NextRequest, provider: Provider): Promise<Response> {
  const p = PROVIDERS[provider];
  const state = randomBytes(24).toString('base64url');
  (await cookies()).set({
    name: STATE_COOKIE,
    value: `${provider}:${state}`,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/auth',
    maxAge: 600,
  });

  const url = new URL(p.authorizeUrl);
  url.searchParams.set('client_id', p.clientID);
  url.searchParams.set('redirect_uri', callbackUrl(request, provider));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', p.scope);
  url.searchParams.set('state', state);
  return Response.redirect(url, 302);
}

// Handles the provider's redirect back: checks state, trades the code for the
// profile, finds or creates the user, and signs them in.
export async function finishSignIn(request: NextRequest, provider: Provider): Promise<Response> {
  const origin = publicOrigin(request);
  const fail = (reason: string) => {
    log.warn(`${provider} sign-in failed:`, reason);
    return Response.redirect(`${origin}/signup`, 302);
  };

  const jar = await cookies();
  const expected = jar.get(STATE_COOKIE)?.value;
  jar.delete({ name: STATE_COOKIE, path: '/auth' });

  const params = request.nextUrl.searchParams;
  const code = params.get('code');
  if (!code || !expected || expected !== `${provider}:${params.get('state')}`) {
    return fail(params.get('error') || 'state mismatch or missing code');
  }

  try {
    const redirectUri = callbackUrl(request, provider);
    const profile = provider === 'google' ? await googleProfile(code, redirectUri) : await facebookProfile(code, redirectUri);
    const user = await findOrCreateUser(provider, profile, jar.get(HANDLE_COOKIE)?.value);
    jar.set(tokenCookie(await signToken(user.id, user.role)));
    return Response.redirect(`${origin}/`, 302);
  } catch (err) {
    return fail((err as Error).message);
  }
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
    client_secret: p.clientSecret,
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
  tokenUrl.searchParams.set('client_secret', p.clientSecret);
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

// The existing user with the profile's email, with any empty fields filled
// from the profile; or a new user.
async function findOrCreateUser(provider: Provider, profile: Profile, handle: string | undefined): Promise<User> {
  const email = profile.emails[0]?.value;
  if (!email) {
    throw new Error(`${provider} did not share an email address`);
  }
  const { user: existing } = await User.getByEmail(email);
  const mapper = provider === 'google' ? googleMapper : facebookMapper;
  const { user, updatedFields } = mapper(existing, profile, handle);

  if (existing) {
    if (updatedFields.length) {
      log.info(`${provider} sign-in filled in:`, Object.keys(Object.assign({}, ...updatedFields)).join(', '));
      await user.patchWithoutPassword();
    }
    return user;
  }

  user.role = 'user';
  user.provider = provider;
  await user.save();
  return user;
}
