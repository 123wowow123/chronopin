import { afterEach, describe, expect, it, vi } from 'vitest';
import { appleProfileFrom, signInLanding } from './oauth';

describe('appleProfileFrom', () => {
  const claims = { sub: '001234.9f3ac4d.1517', email: 'sam@example.com', email_verified: 'true' };

  it('takes the name from the form Apple posts on the first authorisation', () => {
    const profile = appleProfileFrom(claims, '{"name":{"firstName":"Sam","lastName":"Reyes"},"email":"sam@example.com"}');
    expect(profile).toEqual({
      id: '001234.9f3ac4d.1517',
      name: { givenName: 'Sam', familyName: 'Reyes' },
      emails: [{ value: 'sam@example.com', verified: true }],
      photos: [],
      _json: claims,
    });
  });

  it('leaves the name empty on every later sign-in, when Apple posts none', () => {
    const profile = appleProfileFrom(claims, null);
    expect(profile.name).toEqual({ givenName: undefined, familyName: undefined });
    expect(profile.emails).toEqual([{ value: 'sam@example.com', verified: true }]);
  });

  it('reads email_verified as a boolean as well as a string', () => {
    expect(appleProfileFrom({ ...claims, email_verified: true }, null).emails[0].verified).toBe(true);
    expect(appleProfileFrom({ ...claims, email_verified: false }, null).emails[0].verified).toBe(false);
  });

  it('keeps a relay address, which is the only one a hidden-email account has', () => {
    const relay = { ...claims, email: 'k2m9x7@privaterelay.appleid.com' };
    expect(appleProfileFrom(relay, null).emails[0].value).toBe('k2m9x7@privaterelay.appleid.com');
  });

  it('survives a user field that is not JSON, and a sign-in with no email', () => {
    expect(appleProfileFrom(claims, 'not json').name).toEqual({ givenName: undefined, familyName: undefined });
    expect(appleProfileFrom({ sub: 'x' }, null).emails).toEqual([]);
  });
});

describe('signInLanding', () => {
  it('asks a new account for what no provider shares', () => {
    expect(signInLanding('/', true)).toBe('/signup/details?redirect=%2F');
    expect(signInLanding('/pin/12/a-launch', true)).toBe('/signup/details?redirect=%2Fpin%2F12%2Fa-launch');
  });

  it('never asks somebody signing in again', () => {
    expect(signInLanding('/', false)).toBe('/');
    expect(signInLanding('/pin/12/a-launch', false)).toBe('/pin/12/a-launch');
  });
});

describe('signInProviders', () => {
  const keys = ['GOOGLE_ID', 'GOOGLE_SECRET', 'FACEBOOK_ID', 'FACEBOOK_SECRET', 'APPLE_ID', 'APPLE_TEAM_ID', 'APPLE_KEY_ID', 'APPLE_KEY'];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  afterEach(() => {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    vi.resetModules();
  });

  // config.ts reads the environment once, when it is first imported.
  async function providersWith(env: Record<string, string>) {
    for (const k of keys) delete process.env[k];
    Object.assign(process.env, env);
    vi.resetModules();
    return (await import('./oauth')).signInProviders();
  }

  it('offers none without keys', async () => {
    expect(await providersWith({})).toEqual([]);
  });

  it('offers a provider only once both its id and secret are set', async () => {
    expect(await providersWith({ GOOGLE_ID: 'g-id' })).toEqual([]);
    expect(await providersWith({ GOOGLE_ID: 'g-id', GOOGLE_SECRET: 'g-secret', FACEBOOK_ID: 'f-id', FACEBOOK_SECRET: 'f-secret' })).toEqual(['google', 'facebook']);
  });

  it('needs the Services ID, team, key id and key for Apple', async () => {
    expect(await providersWith({ APPLE_ID: 'com.chronopin.web', APPLE_TEAM_ID: 'T', APPLE_KEY_ID: 'K' })).toEqual([]);
    expect(await providersWith({ APPLE_ID: 'com.chronopin.web', APPLE_TEAM_ID: 'T', APPLE_KEY_ID: 'K', APPLE_KEY: 'pem' })).toEqual(['apple']);
  });
});
