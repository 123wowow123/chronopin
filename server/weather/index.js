'use strict';

import fetch from 'node-fetch';
import moment from 'moment';

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
// padding either side (see _dayAt).

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';
const FORECAST_DAYS_AHEAD = 15;
const FORECAST_DAYS_BACK = 91;
const TYPICAL_YEARS = 5;
// Days either side of the date that count toward "typical".
const TYPICAL_WINDOW = 3;
// A day at or above this much precipitation counts as a wet day.
const WET_DAY_MM = 1;

const DAILY = ['weather_code', 'temperature_2m_max', 'temperature_2m_min', 'precipitation_sum', 'wind_speed_10m_max'];
const TIMEOUT_MS = 10000;
const MAX_CONCURRENT = 3;
const RETRY_AFTER_MS = 1500;
let _active = 0;
const _queue = [];

// Forecasts are reissued hourly; the past settles, though the recent past is
// still being corrected for a few days.
const TTL = {
  forecast: 60 * 60 * 1000,
  observed: 24 * 60 * 60 * 1000,
  typical: 7 * 24 * 60 * 60 * 1000
};
const CACHE_LIMIT = 2000;
const _cache = new Map();

// Resolves the weather for a pin, or null when it has no coordinates or no
// start date. Rejects when Open-Meteo fails.
export function forPin(pin) {
  const latitude = pin && pin.latitude;
  const longitude = pin && pin.longitude;
  const start = pin && pin.utcStartDateTime && moment.utc(pin.utcStartDateTime);
  if (latitude == null || longitude == null || !start || !start.isValid()) {
    return Promise.resolve(null);
  }

  const place = { latitude: +latitude, longitude: +longitude };
  const kind = _kindFor(start);
  const key = [kind, place.latitude.toFixed(2), place.longitude.toFixed(2), start.toISOString(), !!pin.allDay].join('|');

  return _cached(key, TTL[kind], () => {
    if (kind === 'typical') {
      return _typical(place, start, !!pin.allDay);
    }
    const url = kind === 'observed' && start.isBefore(_today().subtract(FORECAST_DAYS_BACK, 'days')) ?
      ARCHIVE_URL : FORECAST_URL;
    return _dayAt(url, place, start, !!pin.allDay, kind === 'forecast')
      .then(day => day && Object.assign({ kind }, day));
  });
}

function _today() {
  return moment.utc().startOf('day');
}

function _kindFor(start) {
  const day = start.clone().startOf('day');
  const today = _today();
  if (day.isAfter(today.clone().add(FORECAST_DAYS_AHEAD, 'days'))) {
    return 'typical';
  }
  return day.isBefore(today) ? 'observed' : 'forecast';
}

// The calendar date at the location, given its offset from UTC in seconds.
// An all-day pin is stored at 00:00Z of its date, so its UTC date is the
// date wherever it is.
function _localDate(start, offsetSeconds, allDay) {
  return allDay ? start.clone() : start.clone().add(offsetSeconds, 'seconds');
}

// The daily row for the pin's local date. Asks for the UTC date +-1 day,
// then picks the local one using the offset Open-Meteo reports for the place.
function _dayAt(url, place, start, allDay, withProbability) {
  const utcDate = start.clone().startOf('day');
  const daily = withProbability ? DAILY.concat('precipitation_probability_max') : DAILY;
  return _get(url, Object.assign({
    daily: daily.join(','),
    timezone: 'auto',
    start_date: utcDate.clone().subtract(1, 'day').format('YYYY-MM-DD'),
    end_date: utcDate.clone().add(1, 'day').format('YYYY-MM-DD')
  }, place))
    .then(data => {
      const date = _localDate(start, data.utc_offset_seconds || 0, allDay).format('YYYY-MM-DD');
      const rows = _rows(data.daily);
      const row = rows.find(r => r.time === date);
      // The archive lags a few days behind, so a missing row is "not yet".
      if (!row || row.temperature_2m_max == null) {
        return null;
      }
      return {
        date,
        timezone: data.timezone,
        weatherCode: row.weather_code,
        temperatureMax: row.temperature_2m_max,
        temperatureMin: row.temperature_2m_min,
        precipitationSum: row.precipitation_sum,
        precipitationProbability: withProbability ? row.precipitation_probability_max : null,
        windSpeedMax: row.wind_speed_10m_max
      };
    });
}

// The same week in each of the last TYPICAL_YEARS complete years, averaged.
// One short request per year: Open-Meteo bills a long date range as many
// calls. The local date is estimated from the longitude here, which the
// week-wide window makes harmless.
function _typical(place, start, allDay) {
  const local = _localDate(start, Math.round(place.longitude / 15) * 3600, allDay);
  const month = local.month();
  const dayOfMonth = local.date();
  const thisYear = _today().year();

  const years = [];
  for (let y = thisYear - TYPICAL_YEARS; y < thisYear; y++) {
    years.push(y);
  }

  return Promise.all(years.map(year => {
    // Feb 29 falls back to Feb 28 in years without one.
    const center = moment.utc({ year, month, date: 1 }).date(Math.min(dayOfMonth, moment.utc({ year, month }).daysInMonth()));
    return _get(ARCHIVE_URL, Object.assign({
      daily: DAILY.join(','),
      timezone: 'auto',
      start_date: center.clone().subtract(TYPICAL_WINDOW, 'days').format('YYYY-MM-DD'),
      end_date: center.clone().add(TYPICAL_WINDOW, 'days').format('YYYY-MM-DD')
    }, place));
  }))
    .then(responses => {
      const rows = [].concat(...responses.map(data => _rows(data.daily)))
        .filter(r => r.temperature_2m_max != null);
      if (!rows.length) {
        return null;
      }
      return {
        kind: 'typical',
        date: local.format('YYYY-MM-DD'),
        timezone: responses[0].timezone,
        years: TYPICAL_YEARS,
        // No single condition: the commonest code over a week of past days
        // is nearly always "overcast", which says little.
        weatherCode: null,
        temperatureMax: _mean(rows.map(r => r.temperature_2m_max)),
        temperatureMin: _mean(rows.map(r => r.temperature_2m_min)),
        precipitationSum: _mean(rows.map(r => r.precipitation_sum)),
        // Share of those days that were wet - the closest the past gets to a
        // chance of rain.
        precipitationProbability: Math.round(rows.filter(r => r.precipitation_sum >= WET_DAY_MM).length / rows.length * 100),
        windSpeedMax: _mean(rows.map(r => r.wind_speed_10m_max))
      };
    });
}

// Open-Meteo returns columns ({time: [...], weather_code: [...]}); this turns
// them into one object per day.
function _rows(daily) {
  if (!daily || !daily.time) {
    return [];
  }
  return daily.time.map((time, i) => {
    const row = {};
    Object.keys(daily).forEach(k => {
      row[k] = daily[k][i];
    });
    return row;
  });
}

function _mean(values) {
  const known = values.filter(v => v != null);
  if (!known.length) {
    return null;
  }
  return Math.round(known.reduce((a, b) => a + b, 0) / known.length * 10) / 10;
}

function _get(baseUrl, params) {
  const query = Object.keys(params)
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&');
  const url = `${baseUrl}?${query}`;
  return _limited(() => _fetchJson(url))
    .catch(err => {
      if (err.status !== 429) {
        throw err;
      }
      // Open-Meteo also refuses bursts ("Too many concurrent requests") that
      // the limit below does not fully prevent; one late retry clears them.
      return new Promise(resolve => setTimeout(resolve, RETRY_AFTER_MS))
        .then(() => _limited(() => _fetchJson(url)));
    });
}

function _fetchJson(url) {
  return fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    .then(res => res.json().then(body => {
      if (!res.ok || body.error) {
        const err = new Error(`GET ${url} failed with ${res.status}: ${body.reason || ''}`);
        err.status = res.status;
        throw err;
      }
      return body;
    }));
}

// Runs at most MAX_CONCURRENT Open-Meteo requests at once, queueing the rest.
// Timeline cards each ask for their pin's weather as they scroll in, and a
// "typical" lookup is TYPICAL_YEARS requests on its own, so without this a
// quick scroll gets refused with 429s.
function _limited(run) {
  return new Promise((resolve, reject) => {
    _queue.push(() => run().then(resolve, reject));
    _drain();
  });
}

function _drain() {
  while (_active < MAX_CONCURRENT && _queue.length) {
    _active++;
    _queue.shift()().finally(() => {
      _active--;
      _drain();
    });
  }
}

// Shares one lookup between everyone viewing the same pin, including requests
// that arrive while it is still in flight. Failures are not kept.
function _cached(key, ttl, load) {
  const hit = _cache.get(key);
  if (hit && hit.expires > Date.now()) {
    return hit.promise;
  }

  const promise = load();
  _cache.delete(key);
  _cache.set(key, { promise, expires: Date.now() + ttl });
  promise.catch(() => {
    if (_cache.get(key) && _cache.get(key).promise === promise) {
      _cache.delete(key);
    }
  });

  // Maps keep insertion order, so the first key is the oldest.
  if (_cache.size > CACHE_LIMIT) {
    _cache.delete(_cache.keys().next().value);
  }
  return promise;
}
