import { describe, expect, it } from 'vitest';
import { dayMinutes, parseStatuspage, serviceForTitle } from './serviceStatus';

describe('serviceStatus', () => {
  it('sums minutes per state', () => {
    expect(dayMinutes('Down for 9 Hours and 36 Minutes, Warning for 14 Hours and 23 Minutes').minutes).toMatchObject({ down: 576, warning: 863 });
    expect(dayMinutes('Down for 1 Day').state).toBe('down');
    expect(dayMinutes('Up all day').state).toBe('up');
  });
  it('maps model titles to a service', () => {
    expect(serviceForTitle('Claude Opus 5 Released')?.slug).toBe('anthropic');
    expect(serviceForTitle('Google Antigravity launched')?.slug).toBe('google-antigravity');
    expect(serviceForTitle('Cursor 3.0 Released')?.slug).toBe('cursor');
    expect(serviceForTitle('Qwen 4 released')).toBeNull();
  });
});

describe('parseStatuspage', () => {
  const now = Date.parse('2026-11-08T12:00:00Z');
  it('computes uptime from major incidents and reads the current state', () => {
    const r = parseStatuspage(
      { status: { indicator: 'major', description: 'Major Outage' }, incidents: [{ name: 'API down', created_at: '2026-11-08T10:00:00Z' }] },
      { incidents: [
        { name: 'API down', impact: 'major', created_at: '2026-11-08T10:00:00Z', resolved_at: null },
        { name: 'Slow', impact: 'minor', created_at: '2026-11-01T00:00:00Z', resolved_at: '2026-11-01T01:00:00Z' },
      ] },
      'anthropic', 'Anthropic', 'status.claude.com', now,
    )!;
    expect(r.status).toBe('down');
    expect(r.source).toBe('official');
    expect(r.downMinutes).toBe(120);
    expect(r.degradedMinutes).toBe(60);
    expect(r.days).toHaveLength(30);
    expect(r.incidents[0].severity).toBe('down');
    expect(r.headline).toContain('API down');
  });
  it('rejects an unexpected payload', () => {
    expect(parseStatuspage({}, {}, 'x', 'X', 'h')).toBeNull();
  });
});
