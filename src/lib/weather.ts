// Formatting the weather a pin's API returns (metric) for display.

import type { IconName } from '@/components/ui/Icon';
import type { MessageKey, Translator } from './i18n/translate';

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
const CONDITIONS: Record<number, [MessageKey, IconName]> = {
  0: ['weather.conditions.clear', 'sun'],
  1: ['weather.conditions.mainlyClear', 'sun'],
  2: ['weather.conditions.partlyCloudy', 'cloud'],
  3: ['weather.conditions.overcast', 'cloud'],
  45: ['weather.conditions.fog', 'cloud'],
  48: ['weather.conditions.freezingFog', 'cloud'],
  51: ['weather.conditions.lightDrizzle', 'rain'],
  53: ['weather.conditions.drizzle', 'rain'],
  55: ['weather.conditions.heavyDrizzle', 'rain'],
  56: ['weather.conditions.freezingDrizzle', 'rain'],
  57: ['weather.conditions.freezingDrizzle', 'rain'],
  61: ['weather.conditions.lightRain', 'rain'],
  63: ['weather.conditions.rain', 'rain'],
  65: ['weather.conditions.heavyRain', 'rain'],
  66: ['weather.conditions.freezingRain', 'rain'],
  67: ['weather.conditions.freezingRain', 'rain'],
  71: ['weather.conditions.lightSnow', 'snow'],
  73: ['weather.conditions.snow', 'snow'],
  75: ['weather.conditions.heavySnow', 'snow'],
  77: ['weather.conditions.snowGrains', 'snow'],
  80: ['weather.conditions.lightShowers', 'rain'],
  81: ['weather.conditions.showers', 'rain'],
  82: ['weather.conditions.heavyShowers', 'rain'],
  85: ['weather.conditions.snowShowers', 'snow'],
  86: ['weather.conditions.heavySnowShowers', 'snow'],
  95: ['weather.conditions.thunderstorm', 'bolt'],
  96: ['weather.conditions.thunderstormWithHail', 'bolt'],
  99: ['weather.conditions.thunderstormWithHail', 'bolt'],
};

const HEADINGS = { forecast: 'weather.forecast', observed: 'weather.recorded', typical: 'weather.typical' } as const;

// Viewers in the US read Fahrenheit, inches and mph.
export function usesImperial(): boolean {
  if (typeof navigator === 'undefined') return true;
  const locale = navigator.languages?.[0] || navigator.language || '';
  return /-US$/i.test(locale);
}

export function formatWeather(weather: WeatherJson, imperial: boolean, t: Translator) {
  const temp = (c: number | null) => (c == null ? null : `${Math.round(imperial ? (c * 9) / 5 + 32 : c)}°`);
  const condition = weather.weatherCode != null ? CONDITIONS[weather.weatherCode] : undefined;

  let precipitation: string | null = null;
  if (weather.kind === 'forecast' && weather.precipitationProbability != null) {
    precipitation = t('weather.chanceOfRain', { percent: weather.precipitationProbability });
  } else if (weather.kind === 'typical' && weather.precipitationProbability != null) {
    precipitation = t('weather.wetDays', { percent: weather.precipitationProbability });
  } else if (weather.precipitationSum === 0) {
    precipitation = t('weather.noRain');
  } else if (weather.precipitationSum != null) {
    precipitation = imperial ? `${(weather.precipitationSum / 25.4).toFixed(2)} in` : `${weather.precipitationSum.toFixed(1)} mm`;
  }

  const formatted = {
    kind: weather.kind,
    heading: t(HEADINGS[weather.kind]),
    // Typical weather is an average of past years, with no single condition.
    label: condition ? t(condition[0]) : weather.kind === 'typical' ? t('weather.pastYears', { count: weather.years ?? 0 }) : '',
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
      formatted.wind && t('weather.wind', { speed: formatted.wind }),
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
