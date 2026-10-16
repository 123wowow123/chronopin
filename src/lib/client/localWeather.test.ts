import { afterEach, expect, it, vi } from 'vitest';

vi.mock('react', () => ({
  useSyncExternalStore: (subscribe: (listener: () => void) => () => void, snapshot: () => unknown) => {
    subscribe(() => {});
    return snapshot();
  },
}));
vi.mock('./session', () => ({ sessionUser: async () => null }));
vi.mock('./timeZone', () => ({ browserTimeZone: () => 'America/Los_Angeles' }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

it('recovers from a weather outage without asking for denied location access', async () => {
  const getCurrentPosition = vi.fn();
  vi.stubGlobal('navigator', {
    geolocation: { getCurrentPosition },
    permissions: { query: async () => ({ state: 'denied' }) },
  });
  const weather = { place: 'Los Angeles' };
  const fetch = vi.fn()
    .mockResolvedValueOnce(new Response(null, { status: 502 }))
    .mockResolvedValueOnce(Response.json(weather));
  vi.stubGlobal('fetch', fetch);

  const { useLocalWeather, refreshLocalWeather } = await import('./localWeather');
  useLocalWeather();
  await vi.waitFor(() => expect(useLocalWeather().status).toBe('off'));

  refreshLocalWeather();
  await vi.waitFor(() => expect(useLocalWeather()).toEqual({ status: 'ready', weather }));
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch).toHaveBeenLastCalledWith('/api/weather?tz=America%2FLos_Angeles');
  expect(getCurrentPosition).not.toHaveBeenCalled();
});
