// Formatting the weather a pin's API returns (metric) for display.

import type { IconName } from '@/components/ui/Icon';

export type WeatherJson = {
  kind: 'forecast' | 'observed' | 'typical';
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

// WMO weather codes, as Open-Meteo reports them.
const CONDITIONS: Record<number, [string, IconName]> = {
  0: ['Clear', 'sun'],
  1: ['Mainly clear', 'sun'],
  2: ['Partly cloudy', 'cloud'],
  3: ['Overcast', 'cloud'],
  45: ['Fog', 'cloud'],
  48: ['Freezing fog', 'cloud'],
  51: ['Light drizzle', 'rain'],
  53: ['Drizzle', 'rain'],
  55: ['Heavy drizzle', 'rain'],
  56: ['Freezing drizzle', 'rain'],
  57: ['Freezing drizzle', 'rain'],
  61: ['Light rain', 'rain'],
  63: ['Rain', 'rain'],
  65: ['Heavy rain', 'rain'],
  66: ['Freezing rain', 'rain'],
  67: ['Freezing rain', 'rain'],
  71: ['Light snow', 'snow'],
  73: ['Snow', 'snow'],
  75: ['Heavy snow', 'snow'],
  77: ['Snow grains', 'snow'],
  80: ['Light showers', 'rain'],
  81: ['Showers', 'rain'],
  82: ['Heavy showers', 'rain'],
  85: ['Snow showers', 'snow'],
  86: ['Heavy snow showers', 'snow'],
  95: ['Thunderstorm', 'bolt'],
  96: ['Thunderstorm with hail', 'bolt'],
  99: ['Thunderstorm with hail', 'bolt'],
};

const HEADINGS = { forecast: 'Forecast', observed: 'Recorded', typical: 'Typical' };

// Viewers in the US read Fahrenheit, inches and mph.
export function usesImperial(): boolean {
  if (typeof navigator === 'undefined') return true;
  const locale = navigator.languages?.[0] || navigator.language || '';
  return /-US$/i.test(locale);
}

export function formatWeather(weather: WeatherJson, imperial: boolean) {
  const temp = (c: number | null) => (c == null ? null : `${Math.round(imperial ? (c * 9) / 5 + 32 : c)}°`);
  const condition = weather.weatherCode != null ? CONDITIONS[weather.weatherCode] : undefined;

  let precipitation: string | null = null;
  if (weather.kind === 'forecast' && weather.precipitationProbability != null) {
    precipitation = `${weather.precipitationProbability}% chance of rain`;
  } else if (weather.kind === 'typical' && weather.precipitationProbability != null) {
    precipitation = `Wet ${weather.precipitationProbability}% of days`;
  } else if (weather.precipitationSum === 0) {
    precipitation = 'No rain';
  } else if (weather.precipitationSum != null) {
    precipitation = imperial ? `${(weather.precipitationSum / 25.4).toFixed(2)} in` : `${weather.precipitationSum.toFixed(1)} mm`;
  }

  const formatted = {
    kind: weather.kind,
    heading: HEADINGS[weather.kind],
    // Typical weather is an average of past years, with no single condition.
    label: condition ? condition[0] : weather.kind === 'typical' ? `Past ${weather.years} years, same week` : '',
    icon: (condition ? condition[1] : 'thermometer') as IconName,
    high: temp(weather.temperatureMax),
    low: temp(weather.temperatureMin),
    unit: imperial ? 'F' : 'C',
    precipitation,
    wind:
      weather.windSpeedMax == null
        ? null
        : `${Math.round(imperial ? weather.windSpeedMax / 1.609 : weather.windSpeedMax)}${imperial ? ' mph' : ' km/h'}`,
  };
  return {
    ...formatted,
    summary: [
      formatted.heading + (formatted.label ? `: ${formatted.label}` : ''),
      [formatted.high, formatted.low].filter(Boolean).join(' / ') + formatted.unit,
      formatted.precipitation,
      formatted.wind && `Wind ${formatted.wind}`,
    ]
      .filter(Boolean)
      .join(' · '),
  };
}

// One request per pin for the life of the page, shared by every place it shows.
const requests = new Map<number, Promise<WeatherJson | null>>();

export function loadWeather(pinId: number): Promise<WeatherJson | null> {
  let request = requests.get(pinId);
  if (!request) {
    request = fetch(`/api/pins/${pinId}/weather`)
      .then((res) => (res.status === 200 ? (res.json() as Promise<WeatherJson>) : null))
      .catch(() => {
        requests.delete(pinId);
        return null;
      });
    requests.set(pinId, request);
  }
  return request;
}
