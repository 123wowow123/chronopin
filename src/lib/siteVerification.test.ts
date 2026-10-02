import { describe, expect, it } from 'vitest';
import { DEFAULT_SITE_VERIFICATION, parseSiteVerification } from './siteVerification';

describe('siteVerification', () => {
  it('defaults to the Impact tag Ian supplied', () => {
    expect(DEFAULT_SITE_VERIFICATION).toEqual({ name: 'impact-site-verification', value: '3a0c6dad-91ba-4058-81b4-2edaa4e1283d' });
  });

  it('accepts a name and a value', () => {
    expect(parseSiteVerification({ name: 'impact-site-verification', value: 'abc-123' })).toEqual({
      setting: { name: 'impact-site-verification', value: 'abc-123' },
    });
  });

  it('trims whitespace and turns blank strings into null', () => {
    expect(parseSiteVerification({ name: '  foo-bar  ', value: '  ' })).toEqual({ setting: { name: 'foo-bar', value: null } });
  });

  it('rejects a name with characters a meta tag name would not have', () => {
    expect(parseSiteVerification({ name: '<script>', value: 'x' })).toHaveProperty('problem');
    expect(parseSiteVerification({ name: 'has space', value: 'x' })).toHaveProperty('problem');
  });

  it('rejects anything else, so a bad row falls back to the default', () => {
    for (const bad of [null, undefined, [], 'abc', { name: 1 }, { value: 1 }, { name: 'x'.repeat(201) }]) {
      expect(parseSiteVerification(bad)).toHaveProperty('problem');
    }
  });
});
