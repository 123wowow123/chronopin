import { describe, expect, it } from 'vitest';
import { dayMinutes, serviceForTitle } from './serviceStatus';

describe('serviceStatus', () => {
  it('sums minutes per state', () => {
    expect(dayMinutes('Down for 9 Hours and 36 Minutes, Warning for 14 Hours and 23 Minutes').minutes).toMatchObject({ down: 576, warning: 863 });
    expect(dayMinutes('Down for 1 Day').state).toBe('down');
    expect(dayMinutes('Up all day').state).toBe('up');
  });
  it('maps model titles to a service', () => {
    expect(serviceForTitle('Claude Opus 5 Released')?.slug).toBe('anthropic');
    expect(serviceForTitle('Google Antigravity launched')?.slug).toBe('google-antigravity');
    expect(serviceForTitle('Qwen 4 released')).toBeNull();
  });
});
