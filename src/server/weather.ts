// Weather for a pin's place on its start date, from Open-Meteo (no key). The
// endpoint used depends on how far the date is from today:
//
//   forecast  today .. +15 days       the forecast API
//   observed  -91 days .. yesterday   the forecast API, which also serves the
//                                     recent past
//   observed  older                   the historical archive API
//   typical   beyond +15 days         the archive, averaged over the same week
//                                     in each of the last TYPICAL_YEARS years
//
// Numbers are metric (°C, mm, km/h); the page converts for the viewer. The
// forecast API accepts dates from 92 days back to 16 ahead; the bounds below
// stay one day inside that, because the date is asked for with a day of
// padding either side (see dayAt). All date arithmetic here is in UTC.

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_DAYS_AHEAD = 15;
const FORECAST_DAYS_BACK = 91;
const TYPICAL_YEARS = 5;
// Days either side of the date that count toward "typical".
const TYPICAL_WINDOW = 3;
// A day at or above this much precipitation counts as a wet day.
const WET_DAY_MM = 1;

const DAY_MS = 86_400_000;
const DAILY = ['weather_code', 'temperature_2m_max', 'temperature_2m_min', 'precipitation_sum', 'wind_speed_10m_max'];
const TIMEOUT_MS = 10000;
const MAX_CONCURRENT = 3;
const RETRY_AFTER_MS = 1500;

// Forecasts are reissued hourly; the past settles, though the recent past is
// still being corrected for a few days.
const TTL = {
  forecast: 60 * 60 * 1000,
  observed: 24 * 60 * 60 * 1000,
  typical: 7 * 24 * 60 * 60 * 1000,
};
const CACHE_LIMIT = 2000;
// Current conditions at a viewer's place; they move faster than the forecast.
const LOCAL_TTL = 15 * 60 * 1000;
// A time zone's city moves only when the tz database does.
const ZONE_TTL = 30 * 24 * 60 * 60 * 1000;

export type WeatherKind = keyof typeof TTL;

export type PinWeather = {
  kind: WeatherKind;
  date: string;
  timezone: string;
  years?: number;
  weatherCode: number | null;
  temperatureMax: number | null;
  temperatureMin: number | null;
  precipitationSum: number | null;
  precipitationProbability: number | null;
  windSpeedMax: number | null;
};

// Today's weather where the viewer is: current conditions plus the day's
// forecast, in the place's own date.
export type LocalWeather = PinWeather & {
  current: { temperature: number | null; weatherCode: number | null; isDay: boolean };
};

type Place = { latitude: number; longitude: number };
// A place with the name to show for it (the city a time zone is named after).
export type NamedPlace = Place & { name: string };
type DailyRow = Record<string, any>;

// Kept on globalThis so dev reloads share one cache and one request queue.
const state = ((globalThis as any).__chronopinWeather ??= {
  cache: new Map<string, { promise: Promise<unknown>; expires: number }>(),
  active: 0,
  queue: [] as (() => Promise<void>)[],
}) as {
  cache: Map<string, { promise: Promise<unknown>; expires: number }>;
  active: number;
  queue: (() => Promise<void>)[];
};

// Resolves the weather for a pin, or null when it has no coordinates or no
// start date. Rejects when Open-Meteo fails.
export function forPin(pin: Record<string, any> & {
  latitude?: number | null;
  longitude?: number | null;
  utcStartDateTime?: Date | string | null;
  allDay?: boolean | null;
}): Promise<PinWeather | null> {
  const start = pin?.utcStartDateTime ? new Date(pin.utcStartDateTime) : null;
  if (pin?.latitude == null || pin?.longitude == null || !start || isNaN(start.getTime())) {
    return Promise.resolve(null);
  }

  const place = { latitude: +pin.latitude, longitude: +pin.longitude };
  const allDay = !!pin.allDay;
  const kind = kindFor(start);
  const key = [kind, place.latitude.toFixed(2), place.longitude.toFixed(2), start.toISOString(), allDay].join('|');

  return cached(key, TTL[kind], async () => {
    if (kind === 'typical') {
      return typical(place, start, allDay);
    }
    const url = kind === 'observed' && start.getTime() < today() - FORECAST_DAYS_BACK * DAY_MS ? ARCHIVE_URL : FORECAST_URL;
    const day = await dayAt(url, place, start, allDay, kind === 'forecast');
    return day && { kind, ...day };
  });
}

// Resolves the weather now and today at a place (the viewer's, rounded to
// about a kilometre by the caller). Rejects when Open-Meteo fails.
export function forPlace(place: Place): Promise<LocalWeather | null> {
  const key = ['local', place.latitude.toFixed(2), place.longitude.toFixed(2)].join('|');
  return cached(key, LOCAL_TTL, async () => {
    const data = await get(FORECAST_URL, {
      current: 'temperature_2m,weather_code,is_day',
      daily: DAILY.concat('precipitation_probability_max').join(','),
      timezone: 'auto',
      forecast_days: 1,
      ...place,
    });
    const row = rows(data.daily)[0];
    if (!row || !data.current) {
      return null;
    }
    return {
      kind: 'forecast',
      date: row.time,
      timezone: data.timezone as string,
      weatherCode: row.weather_code,
      temperatureMax: row.temperature_2m_max,
      temperatureMin: row.temperature_2m_min,
      precipitationSum: row.precipitation_sum,
      precipitationProbability: row.precipitation_probability_max,
      windSpeedMax: row.wind_speed_10m_max,
      current: {
        temperature: data.current.temperature_2m ?? null,
        weatherCode: data.current.weather_code ?? null,
        isDay: data.current.is_day !== 0,
      },
    };
  });
}

// Roughly where a viewer is, from their IANA time zone: the city the zone is
// named after, geocoded. It is only accurate to a city, which is all a
// forecast needs, and it asks the browser for nothing - so the weather can
// show without a location prompt. Null for a zone that names no place
// (UTC, Etc/GMT+3) or that geocoding does not know.
export function placeForTimeZone(timeZone: string): Promise<NamedPlace | null> {
  const city = timeZone.split('/').pop()?.replace(/_/g, ' ').trim();
  if (!city || !timeZone.includes('/') || /^(Etc|SystemV)\//.test(timeZone)) {
    return Promise.resolve(null);
  }
  return cached(`zone|${timeZone}`, ZONE_TTL, async () => {
    const data = await get(GEOCODE_URL, { name: city, count: 10, language: 'en', format: 'json' });
    const results: any[] = data.results ?? [];
    // Cities share names (Asia/Tripoli, Africa/Tripoli); the one whose own
    // zone matches is the viewer's. Failing that, the best-ranked one.
    const match = results.find((r) => r.timezone === timeZone) ?? results[0];
    if (!match || match.latitude == null || match.longitude == null) {
      return null;
    }
    return {
      // Rounded like a viewer's own coordinates, so both share a lookup.
      latitude: Math.round(match.latitude * 100) / 100,
      longitude: Math.round(match.longitude * 100) / 100,
      name: (match.name as string) || city,
    };
  });
}

function utcDay(ms: number): number {
  return Math.floor(ms / DAY_MS) * DAY_MS;
}

function today(): number {
  return utcDay(Date.now());
}

function ymd(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function kindFor(start: Date): WeatherKind {
  const day = utcDay(start.getTime());
  const t = today();
  if (day > t + FORECAST_DAYS_AHEAD * DAY_MS) {
    return 'typical';
  }
  return day < t ? 'observed' : 'forecast';
}

// The calendar date at the location, given its offset from UTC in seconds.
// An all-day pin is stored at 00:00Z of its date, so its UTC date is the
// date wherever it is.
function localDate(start: Date, offsetSeconds: number, allDay: boolean): number {
  return allDay ? start.getTime() : start.getTime() + offsetSeconds * 1000;
}

// The daily row for the pin's local date. Asks for the UTC date +-1 day,
// then picks the local one using the offset Open-Meteo reports for the place.
async function dayAt(url: string, place: Place, start: Date, allDay: boolean, withProbability: boolean) {
  const utcDate = utcDay(start.getTime());
  const daily = withProbability ? DAILY.concat('precipitation_probability_max') : DAILY;
  const data = await get(url, {
    daily: daily.join(','),
    timezone: 'auto',
    start_date: ymd(utcDate - DAY_MS),
    end_date: ymd(utcDate + DAY_MS),
    ...place,
  });
  const date = ymd(localDate(start, data.utc_offset_seconds || 0, allDay));
  const row = rows(data.daily).find((r) => r.time === date);
  // The archive lags a few days behind, so a missing row is "not yet".
  if (!row || row.temperature_2m_max == null) {
    return null;
  }
  return {
    date,
    timezone: data.timezone as string,
    weatherCode: row.weather_code,
    temperatureMax: row.temperature_2m_max,
    temperatureMin: row.temperature_2m_min,
    precipitationSum: row.precipitation_sum,
    precipitationProbability: withProbability ? row.precipitation_probability_max : null,
    windSpeedMax: row.wind_speed_10m_max,
  };
}

// The same week in each of the last TYPICAL_YEARS complete years, averaged.
// One short request per year: Open-Meteo bills a long date range as many
// calls. The local date is estimated from the longitude here, which the
// week-wide window makes harmless.
async function typical(place: Place, start: Date, allDay: boolean): Promise<PinWeather | null> {
  const local = new Date(localDate(start, Math.round(place.longitude / 15) * 3600, allDay));
  const month = local.getUTCMonth();
  const dayOfMonth = local.getUTCDate();
  const thisYear = new Date(today()).getUTCFullYear();

  const years: number[] = [];
  for (let y = thisYear - TYPICAL_YEARS; y < thisYear; y++) {
    years.push(y);
  }

  const responses = await Promise.all(
    years.map((year) => {
      // Feb 29 falls back to Feb 28 in years without one.
      const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      const center = Date.UTC(year, month, Math.min(dayOfMonth, daysInMonth));
      return get(ARCHIVE_URL, {
        daily: DAILY.join(','),
        timezone: 'auto',
        start_date: ymd(center - TYPICAL_WINDOW * DAY_MS),
        end_date: ymd(center + TYPICAL_WINDOW * DAY_MS),
        ...place,
      });
    }),
  );

  const all = responses.flatMap((data) => rows(data.daily)).filter((r) => r.temperature_2m_max != null);
  if (!all.length) {
    return null;
  }
  return {
    kind: 'typical',
    date: ymd(local.getTime()),
    timezone: responses[0].timezone,
    years: TYPICAL_YEARS,
    // No single condition: the commonest code over a week of past days is
    // nearly always "overcast", which says little.
    weatherCode: null,
    temperatureMax: mean(all.map((r) => r.temperature_2m_max)),
    temperatureMin: mean(all.map((r) => r.temperature_2m_min)),
    precipitationSum: mean(all.map((r) => r.precipitation_sum)),
    // Share of those days that were wet - the closest the past gets to a
    // chance of rain.
    precipitationProbability: Math.round((all.filter((r) => r.precipitation_sum >= WET_DAY_MM).length / all.length) * 100),
    windSpeedMax: mean(all.map((r) => r.wind_speed_10m_max)),
  };
}

// Open-Meteo returns columns ({time: [...], weather_code: [...]}); this turns
// them into one object per day.
function rows(daily: Record<string, any[]> | undefined): DailyRow[] {
  if (!daily || !daily.time) {
    return [];
  }
  return daily.time.map((time, i) => {
    const row: DailyRow = {};
    Object.keys(daily).forEach((k) => {
      row[k] = daily[k][i];
    });
    return row;
  });
}

function mean(values: (number | null | undefined)[]): number | null {
  const known = values.filter((v): v is number => v != null);
  if (!known.length) {
    return null;
  }
  return Math.round((known.reduce((a, b) => a + b, 0) / known.length) * 10) / 10;
}

async function get(baseUrl: string, params: Record<string, string | number>): Promise<any> {
  const query = Object.keys(params)
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&');
  const url = `${baseUrl}?${query}`;
  try {
    return await limited(() => fetchJson(url));
  } catch (err) {
    if ((err as { status?: number }).status !== 429) {
      throw err;
    }
    // Open-Meteo also refuses bursts ("Too many concurrent requests") that
    // the limit below does not fully prevent; one late retry clears them.
    await new Promise((resolve) => setTimeout(resolve, RETRY_AFTER_MS));
    return limited(() => fetchJson(url));
  }
}

async function fetchJson(url: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  const body = await res.json();
  if (!res.ok || body.error) {
    const err = new Error(`GET ${url} failed with ${res.status}: ${body.reason || ''}`) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return body;
}

// Runs at most MAX_CONCURRENT Open-Meteo requests at once, queueing the rest.
// Timeline cards each ask for their pin's weather as they scroll in, and a
// "typical" lookup is TYPICAL_YEARS requests on its own, so without this a
// quick scroll gets refused with 429s.
function limited<T>(run: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    state.queue.push(() => run().then(resolve, reject));
    drain();
  });
}

function drain() {
  while (state.active < MAX_CONCURRENT && state.queue.length) {
    state.active++;
    state.queue.shift()!().finally(() => {
      state.active--;
      drain();
    });
  }
}

// Shares one lookup between everyone viewing the same pin, including requests
// that arrive while it is still in flight. Failures are not kept.
function cached<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
  const hit = state.cache.get(key);
  if (hit && hit.expires > Date.now()) {
    return hit.promise as Promise<T>;
  }

  const promise = load();
  state.cache.delete(key);
  state.cache.set(key, { promise, expires: Date.now() + ttl });
  promise.catch(() => {
    if (state.cache.get(key)?.promise === promise) {
      state.cache.delete(key);
    }
  });

  // Maps keep insertion order, so the first key is the oldest.
  if (state.cache.size > CACHE_LIMIT) {
    state.cache.delete(state.cache.keys().next().value!);
  }
  return promise;
}
