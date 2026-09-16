import { describe, expect, it } from 'vitest';
import { afterLoginPath, loginHref } from './authRedirect';

describe('afterLoginPath', () => {
  it('goes back to the page that sent the visitor to log in', () => {
    expect(afterLoginPath('/create')).toBe('/create');
    expect(afterLoginPath('/search?q=apple#day')).toBe('/search?q=apple#day');
  });

  it('goes home instead of back to an auth page', () => {
    expect(afterLoginPath('/signup')).toBe('/');
    expect(afterLoginPath('/login?redirect=%2Fcreate')).toBe('/');
    expect(afterLoginPath('/Signup/')).toBe('/');
    expect(afterLoginPath('/logout?referrer=%2F')).toBe('/');
  });

  it('keeps pages that only start like an auth page', () => {
    expect(afterLoginPath('/signups')).toBe('/signups');
  });

  it('never leaves the site', () => {
    expect(afterLoginPath(null)).toBe('/');
    expect(afterLoginPath('')).toBe('/');
    expect(afterLoginPath('https://example.com')).toBe('/');
    expect(afterLoginPath('//example.com')).toBe('/');
    expect(afterLoginPath('/\\example.com')).toBe('/');
  });
});

describe('loginHref', () => {
  it('carries the current page, but not an auth page', () => {
    expect(loginHref('/following')).toBe('/login?redirect=%2Ffollowing');
    expect(loginHref('/signup')).toBe('/login');
    expect(loginHref('/login')).toBe('/login');
    expect(loginHref('/')).toBe('/login');
  });
});
