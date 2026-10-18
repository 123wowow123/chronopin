import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function load() {
  vi.resetModules();
  delete (globalThis as any).__chronopinWeather;
  return import('./weather');
}

const ok = {
  utc_offset_seconds: 0,
  timezone: 'UTC',
  daily: {
    time: ['2026-10-09', '2026-10-10', '2026-10-11'],
    weather_code: [1, 1, 1],
    temperature_2m_max: [20, 21, 22],
    temperature_2m_min: [10, 11, 12],
    precipitation_sum: [0, 0, 0],
    wind_speed_10m_max: [5, 5, 5],
    precipitation_probability_max: [0, 0, 0],
  },
};

describe('weather', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-10T12:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('does not ask Open-Meteo about dates the archive does not cover', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const { forPin } = await load();
    const pin = { latitude: 40, longitude: -75, utcStartDateTime: '1914-08-15T00:00:00Z' };
    await expect(forPin(pin)).resolves.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('stops asking once the daily quota is reached, until the next UTC midnight', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ error: true, reason: 'Daily API request limit exceeded.' }), { status: 429 }));
    vi.stubGlobal('fetch', fetch);
    const { forPin, quotaExhausted } = await load();
    const a = { latitude: 40, longitude: -75, utcStartDateTime: '2026-10-11T00:00:00Z' };
    const b = { latitude: 41, longitude: -75, utcStartDateTime: '2026-10-12T00:00:00Z' };
    await expect(forPin(a)).rejects.toThrow();
    expect(quotaExhausted()).toBe(true);
    const calls = fetch.mock.calls.length;
    await expect(forPin(b)).rejects.toThrow();
    expect(fetch.mock.calls.length).toBe(calls);
    vi.setSystemTime(new Date('2026-10-11T00:01:00Z'));
    expect(quotaExhausted()).toBe(false);
  });

  it('keeps a failure briefly instead of asking again on every view', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ error: true, reason: 'boom' }), { status: 500 }));
    vi.stubGlobal('fetch', fetch);
    const { forPin } = await load();
    const pin = { latitude: 40, longitude: -75, utcStartDateTime: '2026-10-11T00:00:00Z' };
    await expect(forPin(pin)).rejects.toThrow();
    await expect(forPin(pin)).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.setSystemTime(new Date('2026-10-10T12:02:00Z'));
    await expect(forPin(pin)).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('caches a successful lookup', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify(ok), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    const { forPin } = await load();
    const pin = { latitude: 40, longitude: -75, utcStartDateTime: '2026-10-11T00:00:00Z', allDay: true };
    expect((await forPin(pin))?.temperatureMax).toBe(22);
    await forPin(pin);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
