'use strict';

(function () {

  // WMO weather codes, as Open-Meteo reports them, to a label and a Font
  // Awesome 4 icon.
  const CONDITIONS = {
    0: ['Clear', 'fa-sun-o'],
    1: ['Mainly clear', 'fa-sun-o'],
    2: ['Partly cloudy', 'fa-cloud'],
    3: ['Overcast', 'fa-cloud'],
    45: ['Fog', 'fa-cloud'],
    48: ['Freezing fog', 'fa-cloud'],
    51: ['Light drizzle', 'fa-tint'],
    53: ['Drizzle', 'fa-tint'],
    55: ['Heavy drizzle', 'fa-tint'],
    56: ['Freezing drizzle', 'fa-tint'],
    57: ['Freezing drizzle', 'fa-tint'],
    61: ['Light rain', 'fa-tint'],
    63: ['Rain', 'fa-tint'],
    65: ['Heavy rain', 'fa-tint'],
    66: ['Freezing rain', 'fa-tint'],
    67: ['Freezing rain', 'fa-tint'],
    71: ['Light snow', 'fa-snowflake-o'],
    73: ['Snow', 'fa-snowflake-o'],
    75: ['Heavy snow', 'fa-snowflake-o'],
    77: ['Snow grains', 'fa-snowflake-o'],
    80: ['Light showers', 'fa-tint'],
    81: ['Showers', 'fa-tint'],
    82: ['Heavy showers', 'fa-tint'],
    85: ['Snow showers', 'fa-snowflake-o'],
    86: ['Heavy snow showers', 'fa-snowflake-o'],
    95: ['Thunderstorm', 'fa-bolt'],
    96: ['Thunderstorm with hail', 'fa-bolt'],
    99: ['Thunderstorm with hail', 'fa-bolt']
  };

  const HEADINGS = {
    forecast: 'Forecast',
    observed: 'Recorded',
    typical: 'Typical'
  };

  // The API is metric; viewers in the US read Fahrenheit, inches and mph.
  function _usesImperial() {
    const locale = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    return /-US$/i.test(locale);
  }

  function _format(weather, imperial) {
    const temp = c => c == null ? null : Math.round(imperial ? c * 9 / 5 + 32 : c) + '°';
    const condition = CONDITIONS[weather.weatherCode];

    let precipitation = null;
    if (weather.kind === 'forecast' && weather.precipitationProbability != null) {
      precipitation = weather.precipitationProbability + '% chance of rain';
    } else if (weather.kind === 'typical' && weather.precipitationProbability != null) {
      precipitation = 'Wet ' + weather.precipitationProbability + '% of days';
    } else if (weather.precipitationSum === 0) {
      precipitation = 'No rain';
    } else if (weather.precipitationSum != null) {
      precipitation = imperial ?
        (weather.precipitationSum / 25.4).toFixed(2) + ' in' :
        weather.precipitationSum.toFixed(1) + ' mm';
    }

    return {
      kind: weather.kind,
      heading: HEADINGS[weather.kind],
      // Typical weather is an average of past years, which has no single
      // condition, so it gets a thermometer and says what it is instead.
      label: condition ? condition[0] : (weather.kind === 'typical' ? 'Past ' + weather.years + ' years, same week' : ''),
      icon: condition ? condition[1] : 'fa-thermometer-half',
      high: temp(weather.temperatureMax),
      low: temp(weather.temperatureMin),
      unit: imperial ? 'F' : 'C',
      precipitation,
      wind: weather.windSpeedMax == null ? null :
        Math.round(imperial ? weather.windSpeedMax / 1.609 : weather.windSpeedMax) + (imperial ? ' mph' : ' km/h')
    };
  }

  // Weather at a pin's location on its start date, formatted for display.
  // Shared by the pin page's strip and the timeline cards' icon, and cached
  // per pin, date and place for the life of the page: the same pin can be on
  // the timeline, in search results and on its own page.
  class PinWeatherService {
    constructor($q, pinWebService) {
      this.$q = $q;
      this.pinWebService = pinWebService;
      this._requests = {};
    }

    // Whether there is anything to look up: a location and a start date.
    hasPlaceAndDate(id, start, latitude, longitude) {
      return !!id && !!start && latitude != null && latitude !== '' && longitude != null && longitude !== '';
    }

    // Resolves the formatted weather, or null when there is none or the
    // lookup fails - it is extra context, never worth an error.
    forPin(id, start, latitude, longitude) {
      if (!this.hasPlaceAndDate(id, start, latitude, longitude)) {
        return this.$q.resolve(null);
      }
      const key = [id, start, latitude, longitude].join('|');
      if (!this._requests[key]) {
        this._requests[key] = this.pinWebService.weather(id)
          .then(res => res.status === 200 && res.data ? _format(res.data, _usesImperial()) : null)
          .catch(() => {
            delete this._requests[key];
            return null;
          });
      }
      return this._requests[key];
    }
  }

  angular.module('chronopinNodeApp')
    .service('pinWeatherService', PinWeatherService);
})();
